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
import serial
from serial import Serial, SerialException, PARITY_ODD, PARITY_NONE
import serial.tools.list_ports
import tornado.httpserver
from tornado.ioloop import IOLoop, PeriodicCallback
import tornado.websocket
from tornado.web import Application, RequestHandler, StaticFileHandler
from jsonrpc import JSONRPCResponseManager, Dispatcher, dispatcher

from tornado.options import define, options
from USBPrinterOutputDevice import *
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
    message['jsonrpc'] = '2.0'
    for client in WebSocketHandler.clients:
        Logger.log("i","broadcasting to client: {}".format(message))
        client.write_message(message)

## handle printer response queue: PrinterResponse obj with time, type, messages[]
## decide whether to notify clients
def process_printer_reponses(printer:USBPrinter):
    if printer.getConnectionState() == ConnectionState.connected:
        while True:
            response = printer.getLastResponse(True)
            if response == False:
                break
            else:
                message = {

                    }
                broadcast_message("{}".format(response.toString()))

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

def json_handle_gcode(params, printer:USBPrinter):

    command_list = []
    result = {}

    try: 
        command_list = params.splitlines()
        Logger.log('i', "split lines: {}".format(command_list))
    except:
        # probably a list?
        Logger.log('i', "treating {} as list".format(params))
        for line in params:
            command_list.append(line.rstrip())
    
    try:
        printer.startGCodeList(command_list)
        result['gcode'] = command_list

    except Exception as e:
        # TODO: fix this to be a real error type so it gets sent to the clients properly
       raise ValueError("could not send commands to the printer {} : {}".format(repr(e),str(command_list)))
       Logger.log("e", "could not send commands to the printer {} : {}".format(repr(e),str(command_list)))
    
    return result;




#
# start this thing up!
#

if __name__ == '__main__':
    use_dummy_serial = True
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
                'M105\n': b'ok T:24.7 /0.0 B:23.4 /0.0 @:0 B@:0\n',
                'M115\n': b'FIRMWARE_NAME:DUMMY',
                'XXX\n': b'!!'
                          }
        )
    else:
        serialport = list_ports()

    printer = USBPrinter(serialport, 250000, serial_obj)
    printer.connect()
    
    # set up mappings for JSONRPC
    dispatcher.add_dict({"gcode": lambda msg: json_handle_gcode(msg, printer)})
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
    #app = Application(handlers=handlers, debug=options.debug)
    #app = Application(handlers)
    httpServer = tornado.httpserver.HTTPServer(app)
    httpServer.listen(options.http_port)
    tornado.ioloop.IOLoop.current().start()

    # TODO: ioloop for watchdog
    #main_loop.start()

  
    # Create event loop and periodic callbacks
    # PeriodicCallback(lambda: process_printer_reponses(printer), 50).start()
    