#!/usr/bin/env python
# ---------------------------------------------------------------------------------------------------------------------
# Copyright 2019 Evan Raskob <evanraskob@gmail.com>
# ---------------------------------------------------------------------------------------------------------------------
# Licensed under the AGPL 3+
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
# License for the specific language governing permissions and limitations
# under the License.
# ---------------------------------------------------------------------------------------------------------------------
# LivePrinter server.  Uses AJAX and JSON RPC to communicate with a
# Marlin-based 3D printer via a web-based code editor
# ---------------------------------------------------------------------------------------------------------------------
# Notes:
# ---------------------------------------------------------------------------------------------------------------------
# to test the AJAX/JSONRPC API by itself:
# run this file using python 3.7+
# open http://localhost:8888/jsontest for web interface
# or directly test json API by:
#
# curl --insecure --data '{ "jsonrpc": "2.0", "id": 5, "method":
# "set-serial-port","params": [ "dummy", 125000]}'
# http://localhost:8888/jsonrpc
# curl --insecure --data '{ "jsonrpc": "2.0", "id": 6, "method":
# "get-serial-ports","params": []}' http://localhost:8888/jsonrpc
#
#
# python -m serial.tools.list_ports will print a list of available ports.  It
# is also possible to add a regexp as first argument and the list will only
# include entries that matched.
# pySerial includes a small console based terminal program called
# serial.tools.miniterm.  It ca be started with python -m serial.tools.miniterm
# <port_name>
# (use option -h to get a listing of all options).
# ---------------------------------------------------------------------------------------------------------------------

import os
import random
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
from tornado import gen
from serial import Serial, SerialException, SerialTimeoutException, portNotOpenError, writeTimeoutError
import serial.tools.list_ports
import dummyserial
from tornado.options import define, options
import functools
from tornado_jsonrpc2.handler import JSONRPCHandler
from tornado_jsonrpc2.exceptions import MethodNotFound
import time
import re
from typing import Union, Optional, List
from ConnectionState import ConnectionState
from SerialDevice import SerialDevice
import logging
import tornado.log


define("port", default=8888, help="run on the given port", type=int)

# create logger for this module
# logger = tornado.log.access_log

logger = tornado.log.app_log

logger.setLevel(logging.DEBUG)
# create file handler which logs even debug messages
server_log = logging.FileHandler(
    os.path.join(
        os.path.dirname(__file__), 
        "logs", 
        "server-{time}.log".format(time=time.time())
        )
    )

server_log.setLevel(logging.DEBUG)
# create formatter and add it to the handlers
formatter = logging.Formatter('%(asctime)s::%(name)s.%(funcName)s[%(lineno)s]: %(message)s')
server_log.setFormatter(formatter)
# add the handlers to the logger
logger.addHandler(server_log)


class TestHandler(tornado.web.RequestHandler):
    def initialize(self, **kwargs):
        self.printer = kwargs["printer"]

    async def get(self):
        result = await self.printer.async_connect()
        self.write("Hello, world: {}".format(repr(result)))

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        try:
            self.render("index.html")
        except Exception as e:
            logger.error("ERROR in GET: {}".format(repr(e)))
        
class JsonTestHandler(tornado.web.RequestHandler):
    def check_xsrf_cookie(self):
        pass

    def get(self):
        logger.info("TEMPLATE PATH: {}".format(self.get_template_path()))
        try:
            self.render("test.html")
        except Exception as e:
            logger.error("ERROR in GET: {}".format(repr(e)))


class JsonQueueTestHandler(tornado.web.RequestHandler):
    def check_xsrf_cookie(self):
        pass

    def get(self):
        logger.info("TEMPLATE PATH: {}".format(self.get_template_path()))
        try:
            self.render("test-bottleneck.html")
        except Exception as e:
            logger.error("ERROR in GET: {}".format(repr(e)))


#
# list all serial ports
#
async def list_ports():
    choice_port = []
    ports = []

    for n, (portname, desc, hwid) in enumerate(sorted(serial.tools.list_ports.comports())):
                choice_port.append(u'{} - {}'.format(portname, desc))
                ports.append(portname)
                logger.debug("__Found serial ports:\n")
                logger.debug("%d: %s" % (n,portname))
    return ports


def use_dummy_serial_port(printer:SerialDevice):
    if printer._serial_port is not "/dev/null" and printer._serial is None:

        # FIXME
        # not great, should be async!!!

        def delayed_string(result:Union[str,bytes]):
            # print ("delayed string {}".format(time.time()))
            time.sleep(random.uniform(0.05,0.5))
            # print ("delayed string {}".format(time.time()))
            return result

        printer._serial_port = "/dev/null"
        printer._serial = dummyserial.Serial(port= printer._serial_port,
            baudrate= printer._baud_rate,
            ds_responses={
                'N?[0-9]*(M105).*': lambda : b'ok T:%.2f /190.0 B:%.2f /24.0 @:0 B@:0\nok\n' % (random.uniform(170,195),random.uniform(20,35)),
                'N?[0-9]*M115.*': b'FIRMWARE_NAME:DUMMY\nok\n',
                'N?[0-9]*M114.*': lambda : b'X:%.2fY:%.2fZ:%.2fE:%.2f Count X: 2.00Y:3.00Z:4.00\nok\n' % (random.uniform(0,200), random.uniform(0,200), random.uniform(0,200), random.uniform(0,200)),   # position request
                'N?[0-9]*G.*': lambda : delayed_string(b'ok\n'),
                'N?[0-9]*M400.*': lambda : delayed_string(b'ok\nok\n'),
                'N?[0-9]*M207.*': lambda : delayed_string(b'ok\nok\n'),
                'N?[0-9]*M208.*': lambda : delayed_string(b'ok\nok\n'),
                'N?[0-9]*M10[0-46-9].*': lambda : delayed_string(b'ok\nok\n'),
                "N?[0-9]*(M[0-9]+).*" : lambda : delayed_string(b'ok\nok\n'), # catch all M codes
                '^XXX': b'!!\n',
                })
        if not printer._serial.is_open:
            printer._serial.open()
    printer.connection_state = ConnectionState.connected


    
#
# set the serial port of the printer and connect.
# return the port name if successful, otherwise "error" as the port
#
async def json_handle_gcode(printer, *args):  
    for i in args:
        logger.debug("{}".format(i))
        logger.debug("json_handle_gcode::start::{}".format(i))

    gcode = args[0]
    parse_results = False
    if len(args) is 2:
        parse_results = args[1]

    try:
        result = await printer.send_command(gcode, parse_results)
    except Exception as e:
        logger.error("json_handle_gcode::error (see serial logs)::{err}".format(err=e))
        
    logger.debug("json_handle_gcode::handled")
    return result


#
# set line number
# return the line number if successful, otherwise -1
#
async def json_handle_line_number(printer, *args):
    printer.commands_sent = int(args[0])
    response = [printer.commands_sent]
    return response

#
# set the serial port of the printer and connect.
# return the port name if successful, otherwise "error" as the port
#
async def json_handle_set_serial_port(printer, *args):  
    response = ""
    for i in args:
        logger.debug("{}".format(i))
    port = args[0]
    baud_rate = int(args[1])
    if baud_rate < 1: 
        baud_rate = options.baud_rate

    logger.debug("setting serial port: {}".format(port))

    printer._baud_rate = baud_rate

    if port.lower().startswith("dummy"):
        if (printer.connection_state is ConnectionState.connected):
            printer.connection_state = ConnectionState.closed
            printer._serial.close()
        
        logger.debug("setting dummy serial port: {}".format(port))

        printer._baud_rate = baud_rate
        use_dummy_serial_port(printer)
    else:
        # TODO: check if printer serial ports are different!!
        if (printer.connection_state is ConnectionState.connected):
            await printer.disconnect()
        
        printer._serial_port = port
        printer._baud_rate = baud_rate

    try:
        received = await printer.async_connect()

    except SerialException:
        response = ["ERROR: could not connect to serial port {}".format(port)]
        logger.error(response[0])
        # raise Exception(response)
    else:
        response = [{
                'time': time.time() * 1000,
                'port': [port, baud_rate],
                'messages': received
                }]
    return response

#
# Disconnect current serial port
# return the conenction state name (closed, open, etc.)
#
async def json_handle_close_serial(printer, *args):  
    response = ""
    if printer._serial is not None and printer._serial.is_open:
        if printer._serial_port is "/dev/null":
            printer._serial.close()
            printer.connection_state = ConnectionState.closed
            response = printer.connection_state.name
        else:
            result = await printer.disconnect() # connection_state
            response = result.name
    else:
        state = ConnectionState.closed
        response = state.name
    return [response]

#
# Handle request for serial ports from front end
#
async def json_handle_portslist():
    result = []
    try:
        ports = await list_ports()
    except Exception as e:
        # TODO: fix this to be a real error type so it gets sent to the clients
        # properly
       logger.error("could not get serial ports list: {}".format(repr(e)))
       result = ["ERROR: could not get  serial ports list: {error}".format(error=repr(e)) ]
       # raise ValueError()
    else:
        ports.append("dummy")
        result = [{'ports': ports, 'time': time.time() * 1000 }]
    return result


#
# return the name of the serial port and connection state
#
async def json_handle_printer_state(printer):
    
    response = []

    connectionState = printer.connection_state
    serial_port_name = printer._serial_port

    if printer._serial_port is "/dev/null":
        serial_port_name = "dummy"
    response.append({
        'time': time.time() * 1000,
        'port': serial_port_name,
        'baud': str(printer._baud_rate),
        'state': connectionState.name
        })
    return response


def main():
    settings = dict(cookie_secret="__TODO:_GENERATE_YOUR_OWN_RANDOM_VALUE_HERE__",
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            logs_path=os.path.join(os.path.dirname(__file__), "logs"),
            xsrf_cookies=False,)
    
    printer = SerialDevice(logpath=settings['logs_path'])

    serial_port_func = functools.partial(json_handle_set_serial_port, printer)

    #----------------------------------------
    # THIS DEFINES THE JSON-RPC API:
    #----------------------------------------
    async def r_creator(request):
        params = request.params
        logger.debug("JSONRPC request: {}".format(request))

        if request.method == "set-serial-port":
            result = await serial_port_func(*params)
            return result
        elif request.method == "get-serial-ports":
            result = await json_handle_portslist()
            return result
        elif request.method == "send-gcode":
            result = await json_handle_gcode(printer, *params)
            return result
        elif request.method == "get-printer-state":
            result = await json_handle_printer_state(printer)
            return result
        elif request.method == "close-serial-port":
            result = await json_handle_close_serial(printer)
            return result
        elif request.method == "set-line":
            result = await json_handle_line_number(printer, *params)
            return result

        else:
            logger.error("Method not found: request.method")
            # raise MethodNotFound("{}".format(request.method))
            request.params = ["ERROR: Method not found"]
            return request

    handlers = [(r"/", MainHandler),
        (r"/test", TestHandler, dict(printer=printer)),
        (r"/jsontest", JsonTestHandler),
        (r"/jsonqtest", JsonQueueTestHandler),
        # (r"/jsonrpc", JSONHandler),
        (r"/jsonrpc", JSONRPCHandler, dict(response_creator=r_creator)),]
    
    application = tornado.web.Application(handlers=handlers, debug=True, **settings)
    
    http_server = tornado.httpserver.HTTPServer(application)

    tornado.options.parse_command_line()
    logger.debug(settings['logs_path'])
    loop = tornado.ioloop.IOLoop.current()

    http_server.listen(options.port)

    tornado.ioloop.IOLoop.current().start()


if __name__ == "__main__":
    main()