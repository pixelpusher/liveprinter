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

## Wrap the autocomplete functions to modify the "text" parameter.
#  The text parameter is normally the last "parameter" given to a function, this means it is split on spaces and quotes.
#  We want the full parameter list, as a single string.
#  As the result from the autocomplete functions needs to match this original parameter, and not the full string we need to do some mangling on input and output.
def autocompleteFullParameters(func):
    @functools.wraps(func)
    def f(self, text, line, begidx, endidx):
        full_begin_index = line.find(" ") + 1
        full_text = line[full_begin_index:endidx]
        output = func(self, full_text)
        output = [n[begidx - full_begin_index:] for n in output]
        return output
    return f


class LivePrinterServer(Cmd):

    def __init__(self, printer: USBPrinter):
        Cmd.__init__(self)
        self.serialPort = None
        self._printer = printer
        self._commands = []

    @autocompleteFullParameters
    def complete_select(self, text):
        return self.__completeFromList(text, self.__SERVICES)
 
    def do_send(self, args):
        self._printer.sendCommand(args)
    
    def do_queue(self, args):
        self._commands.append(args)

    def do_sendqueue(self, args):
        # send a shallow copy of commands
        self._printer.startGCodeList(self._commands)
        self._commands.clear()

    def do_getQueueSize(self, args):
        Logger.log("w", "{}".format(self._printer.getQueueSize()))

    def do_quit(self, args):
        self._printer.close()
        '''quit the shell'''
        raise SystemExit

    def __completeFromList(self, text, items):
        results = []
        for service in items:
            if service.startswith(text):
                results.append(service)
        return results



class MainHandler(tornado.web.RequestHandler):
    def get(self):
        # self.write("Hello, world")
        # self.render("index.html")
        self.render("index.html", messages=WebSocketHandler.cache)
        

##
# Websockets stuff
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
                broadcast_message("{}".format(response.toString()))

        ## 
# get json gcode from json-rpc dispatcher and 
# sent to the printer to be executed.
# returns a json string to be sent to front-end websockets clients
#
#expects:
    #message = {
    #    'jsonrpc': '2.0',
    #    'id': 1,
    #    'method': 'gcode',
    #    'params': **multiline gcode**,
    #    }
    #};
#
# returns:
# message = {
#    'id': **uuid**,
#   'gcode': {
#       'html': **multiline gcode to display on front end**,
#    }
# }
# 
#

def json_handle_gcode(params, printer:USBPrinter):

    command_list = []

    try: 
        command_list = params.splitlines()
    except:
        # probably a list?
        for line in params:
            command_list.append(line.splitlines())
    
    try:
        printer.startGCodeList(command_list)
    except Exception as e:
        Logger.log("e", "could not send commands to the printer {} : {}".format(repr(e),str(command_list)))

    clients_response = {
            'id': str(uuid.uuid4()),
            'gcode': command_list,
        };

    return clients_response;




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

    printer_server = LivePrinterServer(printer)
    
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

    printer_server.prompt = 'liveprint> '
    
    printer_server.cmdloop('starting...')
    

    # Create event loop and periodic callbacks
    # PeriodicCallback(lambda: process_printer_reponses(printer), 50).start()
    