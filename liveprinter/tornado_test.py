#!/usr/bin/env python
#
# Copyright 2009 Facebook
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may
# not use this file except in compliance with the License. You may obtain
# a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.


# python -m serial.tools.list_ports will print a list of available ports. It is also possible to add a regexp as first argument and the list will only include entries that matched.
# pySerial includes a small console based terminal program called serial.tools.miniterm. It ca be started with python -m serial.tools.miniterm <port_name> 
# (use option -h to get a listing of all options).

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
from enum import IntEnum
from typing import Union, Optional, List
from printerreponse import PrinterResponse




'''
to test:

open http://localhost:8888/jsontest for web interface

or directly test json API by:

curl --insecure --data '{ "jsonrpc": "2.0", "id": 5, "method": "set-serial-port","params": [ "dummy", 125000]}' http://localhost:8888/jsonrpc
curl --insecure --data '{ "jsonrpc": "2.0", "id": 6, "method": "get-serial-ports","params": []}' http://localhost:8888/jsonrpc
'''



define("port", default=8888, help="run on the given port", type=int)


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
            print("ERROR in GET: {}".format(repr(e)))
        
class JsonTestHandler(tornado.web.RequestHandler):
    def check_xsrf_cookie(self):
        pass

    def get(self):
        print("TEMPLATE PATH: {}".format(self.get_template_path()))
        try:
            self.render("test.html")
        except Exception as e:
            print("ERROR in GET: {}".format(repr(e)))


# won't work!
#class JSONHandler(tornado.web.RequestHandler):

#    async def jsonresponse(self, message):
#        return JSONRPCResponseManager.handle(message, dispatcher)

#    async def post(self) -> None:
#        if self.request.body:
#            result = await self.jsonresponse(self.request.body)
#            self.write("{}".format(result.json))
#        else:
#            self.write("NO BODY".format(repr(result)))
        


##  The current processing state of the backend.
class ConnectionState(IntEnum):
    closed = 0
    connecting = 1
    connected = 2
    busy = 3
    error = 4


#
# list all serial ports
#
async def list_ports():
    choice_port = []
    ports = []

    for n, (portname, desc, hwid) in enumerate(sorted(serial.tools.list_ports.comports())):
                choice_port.append(u'{} - {}'.format(portname, desc))
                ports.append(portname)
                print("__Found serial ports:\n")
                print("%d: %s" % (n,portname))
    return ports


class USBSerial():
    def __init__(self):
        self._serial = None
        self._serial_port = None
        self._baud_rate = 250000
        self._timeout = 0.020 # 0.20 ms
        self.connection_state = ConnectionState.closed
        self.commands_sent = 0 # needed for keeping track of them

    #
    # async connect - returns a future
    #
    async def async_connect(self):
        result = ""
        self.commands_sent = 0 # reset on each connection
        try:
            self._serial = Serial(str(self._serial_port), self._baud_rate, timeout=self._timeout, writeTimeout=self._timeout)
            if self._serial.is_open:
                print ("SERIAL OPEN")
                self.connection_state = ConnectionState.connected
                result = "open"
            else:
                print("SERIAL NOT OPEN")
                self.connection_state = ConnectionState.closed
                result = "closed"
        except SerialException as e:
            print("An exception occured while trying to create serial connection: {}".format(repr(e)))
            result = "nope"
            self.connection_state = ConnectionState.closed
            raise
        else:
            # the printer is quite chatty on startup, but takes a second or so to reboot when connected
            result = []
            newline = ""
            timeout = 5 # max time to wait in seconds
            start_time = time.time()
            got_something = False
           
            while time.time() - start_time < timeout:
                new_line = await self.read_response()
                new_line = str(new_line).rstrip('\n\r')
                print("got::{}::".format(new_line))
                if new_line is not "":
                    result.append(new_line)
                    got_something = True
                else:
                    if got_something:
                        break # we're done, already got everything!
                    else:
                        # just chill for a bit
                        time.sleep(0.25)
        return result

    async def disconnect(self):
        self._serial.close()
        self.connection_state = ConnectionState.closed
        return True


    #
    # send a command and get result
    #
    async def send_command(self, cmd:Union[str,bytes]):
        if self._serial is None:
            raise ValueError("Serial port not open")
        self.commands_sent += 1
        
        if self._serial_port is "/dev/null":
            cmd_to_send = str(cmd).encode()
        else:
            checksum = functools.reduce(lambda x, y: x ^ y, map(ord, "N%d%s" % (self.commands_sent, cmd)))
            cmd_to_send = str("N%d%s*%d" % (self.commands_sent, cmd, checksum)).encode()
        if not cmd_to_send.endswith(b"\n"):
            cmd_to_send += b"\n"
        print("sending: {}".format(cmd_to_send))
        try:
            self._serial.write(cmd_to_send)    
            self._serial.flush() # do it now!
        except SerialTimeoutException:
            raise ValueError("Serial communication timed out whilst sending command")
        except SerialException:
            raise            
        else:
            # read line -- async, sleeping if waiting
            # response = ...
            result = []
            newline = ""
            while True:
                new_line = await self.read_response()
                if new_line is not "":
                    line = str(new_line)
                    lowerline = line.lower()

                    # PARSE RESPONSES BY MARLIN/FIRMWARE VERSION

                    # TODO: handle this better - just resend last command!  No
                    # need for the magic bits
                    # Loop a few times and sleep until sent...

                    if 'resend' in lowerline or lowerline.startswith('rs'):
                        # A resend can be requested either by Resend, resend or
                        # rs.
                        error_msg = "Printer signals resend. {}".format(line)
                        result.append(error_msg)
                        print(error_msg)

                    # TEMPERATURE
                    elif "ok T:" in line or line.startswith("T:") or "ok B:" in line or line.startswith("B:"):  # Temperature message.  'T:' for extruder and 'B:' for bed
                        
                        response_props = dict();

                        print("temp response: {}".format(line))
                        extruder_temperature_matches = re.findall("T(\d*): ?([\d\.]+) ?\/?([\d\.]+)?", line)
                        # Update all temperature values
                        # line looks like: b'ok T:24.7 /0.0 B:23.4 /0.0 @:0
                        # B@:0\n'
                        # OR b'T:176.1 E:0 W:?\n'
                        if len(extruder_temperature_matches) > 0:
                            match = extruder_temperature_matches[0]
                            ### NOTE: hot end (tool number) is the first match
                            ### (0)
                            response_props["hotend"] = match[1]
                    
                            if match[2]:                         
                                response_props["hotend_target"] = match[2]
                
                        bed_temperature_matches = re.findall("B: ?([\d\.]+) ?\/?([\d\.]+)?", line)

                        if len(bed_temperature_matches) > 0:
                            match = bed_temperature_matches[0]
                            response_props["bed"] = match[0]
                            response_props["bed_target"] = match[1]
                        result.append(response_props)
                    # END TEMP PARSING


                    # DEFAULT RESPONSE - JUST SEND BACK TO FRONT END
                    else:
                        result.append(line.rstrip('\n\r'))

                # nothing received via serial - timeout
                elif len(result) is not 0:
                    break; # if we have something, break out of here!
                else:
                    await gen.sleep(0.05)

            return result


    async def read_response(self):
        line = ""
        try:
            line = self._serial.readline()
            print("line: {}".format(line))
        except SerialException as se:
            line = repr(se)
            print("[except] line: {}".format(line))
            raise

        # only process if there's something to process
        if line is not "":              
            # this format seems to work best for cross-platform Marlin printers
            line = line.decode('cp437')
        return line

def use_dummy_serial_port(printer:USBSerial):
    if printer._serial_port is not "/dev/null" and printer._serial is None:

        def delayed_string(result:Union[str,bytes]):
            # print ("delayed string {}".format(time.time()))
            time.sleep(random.uniform(0.05,0.5))
            # print ("delayed string {}".format(time.time()))
            return result

        printer._serial_port ="/dev/null"
        printer._serial = dummyserial.Serial(
            port= printer._serial_port,
            baudrate= printer._baud_rate,
            ds_responses={
                '.*M105.*': lambda : b'ok T:%.2f /190.0 B:%.2f /24.0 @:0 B@:0\n' % (random.uniform(170,195),random.uniform(20,35)),
                '.*M115.*': b'FIRMWARE_NAME:DUMMY\n',
                '.*M114.*': lambda : b'X:%.2fY:%.2fZ:%.2fE:%.2f Count X: 2.00Y:3.00Z:4.00\n' % (random.uniform(0,200), random.uniform(0,200), random.uniform(0,200), random.uniform(0,200) ),   # position request
                '.*G.*': lambda : delayed_string(b'ok\n'),
                '.*M400.*': lambda : delayed_string(b'ok\n'),
                #'^N.*': b'ok\n',
                '^XXX': b'!!\n'
                            }
        )
    printer.connection_state = ConnectionState.connected


    
#
# set the serial port of the printer and connect.
# return the port name if successful, otherwise "error" as the port
#
async def json_handle_gcode(printer, *args):  
    for i in args:
        print("{}".format(i))

    gcode = args[0]
    try:
        result = await printer.send_command(gcode)
    except:
        raise
    return result

#
# set the serial port of the printer and connect.
# return the port name if successful, otherwise "error" as the port
#
async def json_handle_set_serial_port(printer, *args):  
    response = ""
    for i in args:
        print("{}".format(i))
    port = args[0]
    baud_rate = int(args[1])
    if baud_rate < 1: 
        baud_rate = options.baud_rate

    print("setting serial port: {}".format(port))

    if port.lower().startswith("dummy"):
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
            response = "ERROR: could not connect to serial port {}".format(port)
            print(response)
            raise Exception(response)
        else:
            response = [{
                    'time': time.time()*1000,
                    'port': [port, baud_rate],
                    'messages': received
                    }]
    return response


#
# Handle request for serial ports from front end
#
async def json_handle_portslist():

    try:
        ports = await list_ports()
    except Exception as e:
        # TODO: fix this to be a real error type so it gets sent to the clients properly
       print("could not get serial ports list: {}".format(repr(e)))
       raise ValueError("could not get  serial ports list: {}".format(repr(e)))

    ports.append("dummy")
    
    return {'ports': ports, 'time': time.time()*1000 }


async def json_handle_printer_state(printer):
    
    json = None

    try:
        connectionState = printer.connection_state
        serial_port_name = printer._serial_port
        if printer._serial_port is "/dev/null":
           serial_port_name = "dummy"
           
        json = {
                'jsonrpc': '2.0',
                'id': 3, 
                'method': 'printerstate',
                'params': {
                    'time': time.time()*1000,
                    'message': [connectionState.name, serial_port_name]
                    }
                }
    except Exception as e:
        # TODO: fix this to be a real error type so it gets sent to the clients properly
       print("could not get printer state: {}".format(repr(e)))
       raise ValueError("could not get printer state: {}".format(str(e)))
    
    return json


def main():
    tornado.options.parse_command_line()

    loop = tornado.ioloop.IOLoop.current()
    printer = USBSerial()

    serial_port_func = functools.partial(json_handle_set_serial_port, printer)


    # dispatcher.add_dict({"set-serial-port": serial_port_func })

    #----------------------------------------
    # THIS DEFINES THE JSON-RPC API:
    #----------------------------------------
    async def r_creator(request):
        params = request.params

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

        else:
            raise MethodNotFound("{}".format(request.method))

    settings = dict(
            cookie_secret="__TODO:_GENERATE_YOUR_OWN_RANDOM_VALUE_HERE__",
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            xsrf_cookies=False,
        )
    handlers = [
        (r"/", MainHandler),
        (r"/test", TestHandler, dict(printer=printer)),
        (r"/jsontest", JsonTestHandler),
        # (r"/jsonrpc", JSONHandler),
        (r"/jsonrpc", JSONRPCHandler, dict(response_creator=r_creator)),
        ]
    application = tornado.web.Application(handlers=handlers, debug=True, **settings)
    http_server = tornado.httpserver.HTTPServer(application)
    http_server.listen(options.port)


    tornado.ioloop.IOLoop.current().start()


if __name__ == "__main__":
    main()