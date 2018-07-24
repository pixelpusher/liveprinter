'''
LivePrinter server.  Uses websockets and JSON RPC to communicate with a 
USBPrinter via a cmd shell (REPL)
'''

from cmd import Cmd
import sys
import os
import uuid
import json
import functools
import multiprocessing
from time import time
import serial
import dummyserial
import logging
from serial import Serial, SerialException, PARITY_ODD, PARITY_NONE
import serial.tools.list_ports
import re
import random
from tornado import gen
import tornado.httpserver
from tornado.ioloop import IOLoop, PeriodicCallback
import tornado.websocket
from tornado.web import Application, RequestHandler, StaticFileHandler
from jsonrpc import JSONRPCResponseManager, Dispatcher, dispatcher
import json

from tornado.options import define, options
from USBPrinterOutputDevice import USBPrinter, ConnectionState
from WebSocketHandler import WebSocketHandler
from UM.Logger import Logger

# tornado options
define("http-port", default=8888, help="port to listen on", type=int)
define('debug', default=True, help='Run in debug mode')

def list_ports():
    choice_port = []
    ports = []

    for n, (portname, desc, hwid) in enumerate(sorted(serial.tools.list_ports.comports())):
                choice_port.append(u'{} - {}'.format(portname, desc))
                ports.append(portname)
                print("__Found serial ports:\n")
                print("%d: %s" % (n,portname))
    return ports


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        # self.write("Hello, world")
        # self.render("index.html")
        self.render("index.html", messages=WebSocketHandler.cache)
        

##
# Websockets stuff
# This should be a JSON-RPC form - http://www.jsonrpc.org/specification#request_object
# or 
#

def broadcast_message(message):
    '''
    Broadcast message to websocket clients.
    Adds 'jsonrpc' field required to satisfy the JSON-RPC 2.0 spec.
    '''
    if message['jsonrpc'] is None:
        message['jsonrpc'] = "2.0"
    for client in WebSocketHandler.clients:
        message = json.dumps(message)
        # double quotes are JSON standard
        client.write_message(message)
        Logger.log("i","broadcasting to client: {}".format(message))

## handle printer response queue: PrinterResponse obj with time, type, messages[]
## decide whether to notify clients
# @gen.coroutine
def process_printer_reponses(printer:USBPrinter):
    #while True:
    response = printer.getLastResponse()  # PrinterReponse object
    if response:
        Logger.log("i", "RESPONSE: {}".format(response))   
        printer.lastReponseHandled()
        broadcast_message(response.toJSONRPC())
        Logger.log("i", "TEST")

## 
# get json gcode (as a list of strings) from json-rpc dispatcher and 
# sent to the printer to be executed.
# returns a json string to be sent to front-end websockets clients
# see http://www.jsonrpc.org/specification#request_object
# expects:
    #message = {
    #    'jsonrpc': '2.0',
    #    'id': 1, 
    #    'method': 'gcode',
    #    'params': [list of multiline gcode],
    #    }
    #};
#
# returns for broadcast to ALL clients (see http://www.jsonrpc.org/specification#response_object):
#
# message = {
#    'jsonrpc': '2.0',
#    'id': **uuid**,
#    'result': {    ## only include this field if the response was successful
#       'gcode': *optional* [list of multiline gcode]
#       'html': [list of HTML-formatted G-Code received by the server for broadcast to clients],
#       }
#    'error': {  ## only include this field if an error occurred
#       'code': 1,  ## TODO: error codes 
#       'message': ERROR STRING IF THERE WAS AN ERROR', 
#       'data': *optional* but might have {'html': *html formatted code*} field ,
#       }
#    }
# }
# 
#

def json_handle_gcode(printer:USBPrinter, *argv):

    command_list = []
    newline = re.compile(r'\n')

    for arg in argv:
        # check for newlines, if none this is a single command
        if newline.search(arg):
            command_list.extend(arg.splitlines())
        else:    
            command_list.append(arg)

        # Logger.log("d", "json arg {} {}".format(type(arg), arg))

    json = None
   
    try:
        printer.sendGCodeList(command_list)

        json = {
                'jsonrpc': '2.0',
                'id': 4, 
                'method': "gcode",
                'params': {
                    'time': time(),
                    'message': command_list
                    }
                }
    except Exception as e:
        # TODO: fix this to be a real error type so it gets sent to the clients properly
       Logger.log("e", "could not send commands to the printer {} : {}".format(repr(e),str(command_list)))
       raise ValueError("could not send commands to the printer {} : {}".format(repr(e),str(command_list)))
    
    return json


def json_handle_responses(printer:USBPrinter, *argv):
    try:
        response = printer.getLastResponse()  # PrinterReponse object
    except Exception as e:
        # TODO: fix this to be a real error type so it gets sent to the clients properly
       Logger.log("e", "could get responses from printer {}".format(repr(e)))
       response = None

    if response is not None:
        Logger.log("i", "RESPONSE: {}".format(response))
        printer.lastReponseHandled()
        return response.toJSONRPC()
        
    
    return None


#
# set the serial port of the printer and connect.
# return the port name if successful, otherwise "error" as the port
#
def json_handle_set_serial_port(printer:USBPrinter, port:str):
    json = None
    Logger.log("i", "setting serial port: {}".format(port))


    if port.lower().startswith("dummy"):
         use_dummy_serial_port(printer)
         json = {
            'jsonrpc': '2.0',
            'id': 5, 
            'method': 'serial-port-set',
            'params': {
                'time': time(),
                'message': port
                }
            }
    else:
        printer._serial_port = port

        try:
            printer.connect()
            json = {
                'jsonrpc': '2.0',
                'id': 5, 
                'method': 'serial-port-set',
                'params': {
                    'time': time(),
                    'message': port
                    }
                }
        except SerialException:
           Logger.log("e", "could not connect to serial port")
           json = {
                    'jsonrpc': '2.0',
                    'id': 5, 
                    'method': 'serial-port-set',
                    'params': {
                        'time': time(),
                        'message': "error"
                        }
                  }

    return json

#
# handle request for printer state:
#closed = 0
#connecting = 1
#connected = 2
#busy = 3
#error = 4)
#
def json_handle_printerstate(printer:USBPrinter, *argv):
    
    json = None

    try:
        connectionState = printer.getConnectionState()

        json = {
                'jsonrpc': '2.0',
                'id': 5, 
                'method': 'printerstate',
                'params': {
                    'time': time(),
                    'message': connectionState.name
                    }
                }
    except Exception as e:
        # TODO: fix this to be a real error type so it gets sent to the clients properly
       Logger.log("e", "could not get printer state: {}".format(repr(e)))
       raise ValueError("could not get printer state: {}".format(repr(e)))
    
    return json


#
# Handle request for serial ports from front end
#
def json_handle_portslist(*msg):

    try:
        ports = list_ports()

        json = {
                'jsonrpc': '2.0',
                'id': 6, 
                'method': "serial-ports-list",
                'params': {
                    'time': time(),
                    'message': ports
                    }
                }
    except Exception as e:
        # TODO: fix this to be a real error type so it gets sent to the clients properly
       Logger.log("e", "could not get serial ports list: {}".format(repr(e)))
       raise ValueError("could not get  serial ports list: {}".format(repr(e)))
    
    return json


def use_dummy_serial_port(printer:USBPrinter):
    printer._serial_port ="/dev/null"
    printer._serial = dummyserial.Serial(
        port= printer._serial_port,
        baudrate= printer._baud_rate,
        ds_responses={
            '.*M105.*': lambda : b'ok T:%a /190.0 B:%a /24.0 @:0 B@:0\n' % (random.uniform(170,195),random.uniform(20,35)),
            '.*M115.*': b'FIRMWARE_NAME:DUMMY\n',
            '.*M114.*': b'X:0 Y:0 Z:0\n',  # position request
            '.*G.*': b'ok\n',
            #'^N.*': b'ok\n',
            '^XXX': b'!!\n'
                        }
    )
    printer.setConnectionState(ConnectionState.connected)


#
# start this thing up!
#

if __name__ == '__main__':

    #_logger = logging.getLogger(__name__)
    #if not _logger.handlers:
    #    _logger.setLevel(logging.ERROR)
    #    #console_handler = logging.StreamHandler()
    #    #console_handler.setLevel(logging.ERROR)
    #    #console_handler.setFormatter(dummyserial.constants.LOG_FORMAT)
    #    #_logger.addHandler(console_handler)
    #    _logger.propagate = False

    #Logger.addLogger(_logger)

    # set up unconnected printer
    printer = USBPrinter(None, 250000)

    #use_dummy_serial = True
    #
    #if use_dummy_serial:
    #    use_dummy_serial_port(printer)
    #else:
        # printer._serial_port =  list_ports()[0]
        # printer._serial_port = '/dev/cu.usbmodem1411'
        # printer.connect()


    # set up mappings for JSONRPC

    # send raw gcode:
    dispatcher.add_dict({"gcode": lambda *msg: json_handle_gcode(printer, *msg)})
    dispatcher.add_dict({"get-printer-state": lambda *msg: json_handle_printerstate(printer, *msg)})
    dispatcher.add_dict({"get-serial-ports": lambda *msg: json_handle_portslist(*msg)})
    dispatcher.add_dict({"set-serial-port": lambda port: json_handle_set_serial_port(printer, port)})

    # printer API:

    # dispatcher.add_dict({"extrude": lambda *msg: json_handle_extrude(printer, *msg)})
    # dispatcher.add_dict({"extrudeto": lambda *msg: json_handle_extrudeto(printer, *msg)})
    # dispatcher.add_dict({"move": lambda *msg: json_handle_move(printer, *msg)})
    # dispatcher.add_dict({"moveto": lambda *msg: json_handle_moveto(printer, *msg)})

    # get last printer response:
    dispatcher.add_dict({"response": lambda *msg: json_handle_responses(printer, *msg)})


    # Initialize web server.
    # Backend handler is always required.
    handlers = [
        (r"/", MainHandler),
        (r"/json", WebSocketHandler),
        ]
    settings = dict(
            cookie_secret="__TODO:_GENERATE_YOUR_OWN_RANDOM_VALUE_HERE__",
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            xsrf_cookies=True,
    )
    Logger.log("d",settings)
    app = Application(handlers=handlers, debug=options.debug, **settings)

    # Create event loop and periodic callbacks
    httpServer = tornado.httpserver.HTTPServer(app)
    httpServer.listen(options.http_port)
    #httpServer.bind(options.http_port)
    #httpServer.start(0)

    main_loop = tornado.ioloop.IOLoop.instance()
    main_loop.start()