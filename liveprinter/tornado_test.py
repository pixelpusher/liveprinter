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

import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
from serial import Serial, SerialException, SerialTimeoutException
import serial.tools.list_ports
import dummyserial
from tornado.options import define, options
import functools
from tornado_jsonrpc2.handler import JSONRPCHandler
from tornado_jsonrpc2.exceptions import MethodNotFound
import time
from enum import IntEnum




'''
to test:
curl --insecure --data '{ "jsonrpc": "2.0", "id": 5, "method": "set-serial-port","params": [ "dummy", 125000]}' http://localhost:8888/jsonrpc
curl --insecure --data '{ "jsonrpc": "2.0", "id": 6, "method": "get-serial-ports","params": []}' http://localhost:8888/jsonrpc
'''



define("port", default=8888, help="run on the given port", type=int)


class MainHandler(tornado.web.RequestHandler):
    def initialize(self, **kwargs):
        self.printer = kwargs["printer"]

    async def get(self):
        result = await self.printer.async_connect()
        self.write("Hello, world: {}".format(repr(result)))

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
    def __init__(self, loop):
        self._serial = None
        self._serial_port = None
        self._baud_rate = 250000
        self._timeout = 2
        self._event_loop = loop
        self.connection_state = ConnectionState.closed

    #
    # async connect - returns a future
    #
    async def async_connect(self):
        result = None

        if self._serial is None:
                try:
                    self._serial = Serial(str(self._serial_port), self._baud_rate, timeout=self._timeout, writeTimeout=self._timeout)
                    if self._serial.is_open:
                        print ("SERIAL OPEN")
                        printer.connection_state = ConnectionState.connected
                        result = "open"
                    else:
                        print("SERIAL NOT OPEN")
                        self.connection_state = ConnectionState.closed
                        result = "closed"
                except SerialException as e:
                    print("An exception occured while trying to create serial connection: {}".format(repr(e)))
                    result = "nope"
                    self.connection_state = ConnectionState.closed
        return result


def use_dummy_serial_port(printer:USBSerial):
    if printer._serial_port is not "/dev/null" and printer._serial is None:
        printer._serial_port ="/dev/null"
        printer._serial = dummyserial.Serial(
            port= printer._serial_port,
            baudrate= printer._baud_rate,
            ds_responses={
                '.*M105.*': lambda : b'ok T:%.2f /190.0 B:%.2f /24.0 @:0 B@:0\n' % (random.uniform(170,195),random.uniform(20,35)),
                '.*M115.*': b'FIRMWARE_NAME:DUMMY\n',
                '.*M114.*': lambda : b'X:%.2fY:%.2fZ:%.2fE:%.2f Count X: 2.00Y:3.00Z:4.00\n' % (random.uniform(0,200), random.uniform(0,200), random.uniform(0,200), random.uniform(0,200) ),   # position request
                '.*G.*': b'ok\n',
                #'^N.*': b'ok\n',
                '^XXX': b'!!\n'
                            }
        )
    printer.connection_state = ConnectionState.connected



#
# set the serial port of the printer and connect.
# return the port name if successful, otherwise "error" as the port
#
async def json_handle_set_serial_port(printer, *args):  
    for i in args:
        print("{}".format(i))
    port = args[0]
    baud_rate = int(args[1])
    if baud_rate < 1: 
        baud_rate = options.baud_rate

    reponse = {
            'jsonrpc': '2.0',
            'id': 5, 
            'method': 'serial-port-set',
            'params': {
                'time': time.time()*1000,
                'message': [port, baud_rate]
                }
            }

    print("setting serial port: {}".format(port))
    response = [port, baud_rate]

    if port.lower().startswith("dummy"):
        use_dummy_serial_port(printer)
    else:        
        # TODO: check if printer serial ports are different!!
        #if (printer.getConnectionState() == ConnectionState.connected):
        #    printer.close()
        
        printer._serial_port = port
        printer.setBaudRate(baud_rate)

        try:
            await printer.async_connect()

        except SerialException:
            print("ERROR: could not connect to serial port")
            reponse = "ERROR: could not connect to serial port {}".format(port)

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



def main():
    tornado.options.parse_command_line()

    loop = tornado.ioloop.IOLoop.current()
    printer = USBSerial(loop)

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
        else:
            raise MethodNotFound("{}".format(request.method))

    application = tornado.web.Application([
        (r"/", MainHandler, dict(printer=printer)),
        # (r"/jsonrpc", JSONHandler),
        (r"/jsonrpc", JSONRPCHandler, dict(response_creator=r_creator)),
    ])
    http_server = tornado.httpserver.HTTPServer(application)
    http_server.listen(options.port)


    tornado.ioloop.IOLoop.current().start()


if __name__ == "__main__":
    main()