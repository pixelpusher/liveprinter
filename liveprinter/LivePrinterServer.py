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
from serial import Serial, SerialException, PARITY_ODD, PARITY_NONE
import serial.tools.list_ports
import re
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
    return ports[0]


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
            #FIXME - don't add a list!
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
# start this thing up!
#

if __name__ == '__main__':
    use_dummy_serial = False
    serialport = None
    serial_obj = None
    baudrate = 250000

    if use_dummy_serial:
        import dummyserial
        serialport ="/dev/null"
        serial_obj = dummyserial.Serial(
            port=serialport,
            baudrate=baudrate,
            ds_responses={
                '.*M105.*': b'ok T:24.7 /0.0 B:23.4 /0.0 @:0 B@:0\n',
                '.*M115.*': b'FIRMWARE_NAME:DUMMY',
                '.*M114.*': b'X:0 Y:0 Z:0',  # position request
                '.*G.*': b'ok',
                #'^N.*': b'ok',
                '^XXX': b'!!'
                          }
        )
    else:
        # serialport = list_ports()
        serialport = '/dev/cu.usbmodem1411'

    printer = USBPrinter(serialport, 250000, serial_obj)
    printer.connect()
    
    # set up mappings for JSONRPC
    dispatcher.add_dict({"gcode": lambda *msg: json_handle_gcode(printer, *msg)})

    dispatcher.add_dict({"response": lambda *msg: json_handle_responses(printer, *msg)})

    # for testing:
    # self.dispatcher = Dispatcher({"gcode": lambda c: printer.startGCodeList(c.splitlines()) })


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
    # printer_event_processor = tornado.ioloop.PeriodicCallback(
    #    lambda: process_printer_reponses(printer), 1500)
    # printer_event_processor.start()
    main_loop.start()

    # IOLoop.current().spawn_callback(process_printer_reponses, printer)

    #tornado.ioloop.IOLoop.current().start()

  
    