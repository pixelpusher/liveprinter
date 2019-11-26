#
# The Printer device
#
# by Evan Raskob <evanraskob@gmail.com> 2019-2020 
# See main license for details.
#
from tornado import gen
from serial import Serial, SerialException, SerialTimeoutException, portNotOpenError, writeTimeoutError
import time
import re
from typing import Union, Optional, List
import functools
from ConnectionState import ConnectionState


class SerialDevice():
    def __init__(self):
        self._serial = None
        self._serial_port = None
        self._baud_rate = 250000
        self._timeout = 0.8 # 100 ms
        self.connection_state = ConnectionState.closed
        self.commands_sent = 0 # needed for keeping track of them
        self.commands_queued = 0 # how many on the printer
        self.max_commands_to_queue = 3 
        self.busy = False # whether it is processing commands or not

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

            while self.busy:
                gen.sleep(0.05)

            self.busy = True # async mutex

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
                        await gen.sleep(0.25)
            self.busy = False # async mutex

        return result

    async def disconnect(self):
        self._serial.close()
        self.connection_state = ConnectionState.closed
        return self.connection_state


    #
    # Send a GCODE command and get result. If parse_results, try and interpret the results as a dict()
    #
    async def send_command(self, cmd:Union[str,bytes], parse_results:bool=False):
        if self._serial is None:
            raise ValueError("Serial port not open")
        
        while self.busy:
                gen.sleep(0.01)
        self.busy = True

        while self.commands_queued >= self.max_commands_to_queue:
            gen.sleep(0.01)

        self.commands_sent += 1
        
        #if self.commands_sent > 100:
        #    # reset line number!
        #    cmd_reset = "M110 N1"
        #    checksum = functools.reduce(lambda x, y: x ^ y, map(ord, "N%d%s" % (self.commands_sent, cmd_reset)))
        #    cmd_to_send = str("N%d%s*%d" % (self.commands_sent, cmd_reset, checksum)).encode()
        #    if not cmd_to_send.endswith(b"\n"):
        #        cmd_to_send += b"\n"
        #    await self.send_raw_command(cmd_to_send)
        #    self.commands_sent = 1

        if self._serial_port is "/dev/null":
            cmd_to_send = str(cmd).encode()
        else:
            checksum = functools.reduce(lambda x, y: x ^ y, map(ord, "N%d%s" % (self.commands_sent, cmd)))
            cmd_to_send = str("N%d%s*%d" % (self.commands_sent, cmd, checksum)).encode()
        if not cmd_to_send.endswith(b"\n"):
            cmd_to_send += b"\n"
        print("sending:{line}:{commmand}".format(line=self.commands_sent, commmand=cmd_to_send))
        try:
            self._serial.write(cmd_to_send)    
            self._serial.flush() # do it now!
        except SerialTimeoutException:
            raise ValueError("Serial communication timed out whilst sending command")
        except SerialException:
            raise            
        else:

            self.commands_queued += 1

            # read line -- async, sleeping if waiting
            # response = ...
            result = []
            newline = ""
            attempts = 5
            max_loop_timeout = 40 # 40 secs between moves... might need to be higher
            start_time = time.time()
            current_time = 0
           
            line = "" # line received from serial, to parse

            # loop through all serial data

            while True:

                # check for timeout
                current_time = time.time() - start_time
                if current_time > max_loop_timeout:
                    result.append("serial response timeout")
                    raise ValueError(result)
                    break # exit loop

                new_line = await self.read_response()
                if new_line is not "":
                    line = str(new_line)
                    lowerline = line.lower()

                    if attempts < 1:
                        result.append("too many retries")
                        raise ValueError(result)
                        break

                    # Check for RESEND
                    if 'resend' in lowerline or lowerline.startswith('rs'):
                        # A resend can be requested either by Resend, resend or rs.
                        attempts -= 1
                        error_msg = "Printer signals resend:{line} for {cmd}".format(line=line, cmd=cmd)
                        result.append(error_msg)
                        print(error_msg)

                        # try again!
                        try:
                            self._serial.write(cmd_to_send)    
                            self._serial.flush() # do it now!
                        except SerialTimeoutException:
                            raise ValueError("Serial communication timed out whilst sending command")
                        except:
                            raise

                    # Cold extrusion or something else - means line didn't take so don't update line number-- 'echo: cold extrusion prevented'
                    elif line.startswith("echo:"):                              

                        echo_matches = re.findall("echo: ?(.+)", line)
                        if len(echo_matches) > 0:
                            result.append(echo_matches[0])
                        else:
                            result.append(line)
                        # don't break! more to read
                    
                    else:
                        # we've received something, break loop
                        break
                
                # nothing received via serial
                else:
                    print("Waiting on command: {}".format(cmd))
                    gen.sleep(0.01)


            # Otherwise, attempt to parse the response from the printer into something sensible.
            # This can be tricky, given all the Marlin versions...

            # if not parsing, return whatever we got
            if not parse_results:
                print("Appending {line}::{cmd}".format(line=line, cmd=cmd))
                result.append(line.rstrip('\n\r'))
                
            # Temperature message.  'T:' for extruder and 'B:' for bed
            elif "ok T:" in line or line.startswith("T:") or "ok B:" in line or line.startswith("B:"):                          
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
            else:   
                # DEFAULT RESPONSE if not matched - JUST SEND BACK TO FRONT END
                result.append(line.rstrip('\n\r'))
                # print("result not parsed {cmd}, {line}".format(cmd=cmd,line=line))

            # end parsing results
            self.commands_queued -= 1
            self.busy = False
            return result
    
    #
    # send a command to the serial port, return array of responses
    #
    async def send_raw_command(self, command, timeout=40):
        result = []
        newline = ""
        max_loop_timeout = timeout # 40 secs between moves... might need to be higher
        start_time = time.time()
        current_time = 0

        self._serial.write(command)    
        self._serial.flush() # do it now!

        while True:
            # check for timeout
            current_time = time.time() - start_time
            if current_time > max_loop_timeout:
                result.append("serial response timeout")
                break; # exit loop

            new_line = await self.read_response()
            
            if new_line is not "":
                line = str(new_line)
                lowerline = line.lower()

                # DEFAULT RESPONSE if not matched - JUST SEND BACK TO FRONT END
                result.append(line.rstrip('\n\r'))
                print("result not parsed {cmd}, {line}".format(cmd=command,line=line))
                break;
                # end parsing results

            else:
                print("Waiting on command: {}".format(command))
                # await gen.sleep(0.05) # should this be gen.sleep() or just sleep?? Should it block?
                time.sleep(0.01)

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