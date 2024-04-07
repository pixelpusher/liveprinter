#
# The Printer device
#
# by Evan Raskob <evanraskob@gmail.com> 2019-2020
# See main license for details.
#
from tornado import gen
from serial import Serial, SerialException, SerialTimeoutException
# import dummyserial
import time
import re
from typing import Union
import functools
from ConnectionState import ConnectionState
import logging
import os

class SerialDevice():
    def __init__(self, **kwdargs):
        logpath = kwdargs['logpath']
        self._serial = None
        self._serial_port = None
        self._baud_rate = 250000
        self._timeout = 0.8 # in s
        self.settle_time = 0.005 # used between serial commands to let the firmware "settle"
        self.retry_time = 0.1 # in s, time to wait in between retries
        self.max_retries = 600 # means about 60 seconds of total waiting, helpful for longer bed leveling ops
        self.connection_state = ConnectionState.closed
        self.commands_sent = 0 # needed for keeping track of them
        self.busy = False # whether it is processing commands or not
        
        self.ok_count = 0 # count ok responses received

        self.gcode_logger = logging.getLogger("{name}.gcode".format(name=__name__))
        self.serial_logger = logging.getLogger("{name}.serial".format(name=__name__))
        self.gcode_logger.setLevel(logging.INFO)
        self.gcode_logger.propagate = False
        self.serial_logger.setLevel(logging.ERROR)

        # create file handler which logs even debug messages
        gcode_fh = logging.FileHandler(os.path.join(logpath, "gcode-{time}.log".format(time=time.time())))
        serial_fh = logging.FileHandler(os.path.join(logpath, "serial-{time}.log".format(time=time.time())))
        # create formatter and add it to the handlers
        formatter = logging.Formatter(";%(asctime)s:\n%(message)s")
        gcode_fh.setFormatter(formatter)
        formatter = logging.Formatter('%(asctime)s::%(name)s.%(funcName)s[%(lineno)s]: %(message)s')
        serial_fh.setFormatter(formatter)
       
        self.gcode_logger.addHandler(gcode_fh)
        self.serial_logger.addHandler(serial_fh)
        self.serial_logger.debug('starting')
 
    def set_log_level(self, level):
        # self.serial_logger.critical("{debug}/{info}".format(debug=logging.DEBUG, info=logging.INFO))
        debug_level = level
        if not (debug_level == logging.DEBUG or debug_level == logging.INFO or debug_level == logging.ERROR or debug_level == logging.WARN):
            self.serial_logger.error("Bad debug level in set_log_level: {}".format(repr(level)))
            raise ValueError("Bad debug level in set_log_level: {}".format(repr(level)))
        
        self.serial_logger.setLevel(debug_level)

    def set_gcode_log_level(self, level):
        # self.serial_logger.critical("{debug}/{info}".format(debug=logging.DEBUG, info=logging.INFO))
        
        log_level = level
        if not (log_level == logging.DEBUG or log_level == logging.INFO or log_level == logging.ERROR or log_level == logging.WARN):
            self.serial_logger.error("Bad debug level in set_gcode_log_level:{vvv} {expect}".format(vvv=repr(level), expect=logging.DEBUG))
            raise ValueError("Bad debug level in set_gcode_log_level: {}".format(repr(level)))
        
        self.gcode_logger.setLevel(log_level)

    #
    # async connect - returns a future
    #
    async def async_connect(self):
        result = []

        # if self._serial_port == "/dev/null": # fake serial port
        #     self._serial = dummyserial.Serial(str(self._serial_port), self._baud_rate, timeout=self._timeout, writeTimeout=self._timeout)
        #     self.connection_state = ConnectionState.connected
        #     result.append("FIRMWARE VERSION: DUMMY")
        #     self.serial_logger.debug("[SerialDevice async connect] DUMMY SERIAL OPEN")

        #     return result
        # else:
        
        self.serial_logger.debug("self port: ::{}::".format(self._serial_port))

        self.commands_sent = 1 # reset on each connection
        try:
            self._serial = Serial(str(self._serial_port), self._baud_rate, timeout=self._timeout, writeTimeout=self._timeout)
            if self._serial.is_open:
                self.serial_logger.debug("SERIAL OPEN")
                self.connection_state = ConnectionState.connected
                result.append("open")
            else:
                self.serial_logger.debug("SERIAL NOT OPEN")
                self.connection_state = ConnectionState.closed
                result.append("closed")
        except SerialException as e:
            print("An exception occured while trying to create serial connection: {}".format(repr(e)))
            result.append("nope")
            self.connection_state = ConnectionState.closed
            self.serial_logger.error("An exception occurred while trying to create serial connection: {}".format(repr(e)))
            #raise
        else:
            # the printer is quite chatty on startup, but takes a second or so
            # to reboot when connected
            newline = ""
            timeout = 10 # max time to wait in seconds
            start_time = time.time()
            got_something = False

            while self.busy:
                gen.sleep(self.retry_time)

            self.busy = True # async mutex
            
            retry_count = 0

            while time.time() - start_time < timeout:
                new_line = await self.read_response()
                new_line = str(new_line).rstrip('\n\r')
                if new_line != "":
                    result.append(new_line)
                    got_something = True
                else:
                    if retry_count > 3:
                        if got_something:
                            result.append('DONE')
                            break # we're done, already got everything!
                        else:
                            retry_count += 1
                            result.append('WAITING...')
                            await gen.sleep(self.retry_time)
                    else:
                        # just chill for a bit
                        await gen.sleep(self.retry_time)
            self.busy = False # async mutex
            self.serial_logger.debug('connected to printer')
        return result

    async def disconnect(self):
        if self.connection_state == ConnectionState.connected:
            self._serial.close()
            self.connection_state = ConnectionState.closed
        return self.connection_state


    #
    # Send a GCODE command and get result.  If parse_results, try and interpret
    # the results as a dict()
    #
    async def send_command(self, cmd:Union[str,bytes], parse_results:bool=False):
        result = []
        if self._serial is None:
            result.append("Serial port not open")
            return result

        # spin lock??        
        while self.busy:
            await gen.sleep(self.settle_time)

        self.busy = True

        # all commands have a response, wait for it
        no_response = True
        
        max_loop_timeout = 12000 # timeout for this whole function, for safety - 40 secs between moves...  might need to be higher
        start_time = time.time()
        current_time = 0


        while no_response and current_time < max_loop_timeout:
            
            current_time = time.time() - start_time

            #if self.commands_sent > 100:
            #    # reset line number!
            #    cmd_reset = "M110 N1"
            #    checksum = functools.reduce(lambda x, y: x ^ y, map(ord, "N%d%s" %
            #    (self.commands_sent, cmd_reset)))
            #    cmd_to_send = str("N%d%s*%d" % (self.commands_sent, cmd_reset,
            #    checksum)).encode()
            #    if not cmd_to_send.endswith(b"\n"):
            #        cmd_to_send += b"\n"
            #    await self.send_raw_command(cmd_to_send)
            #    self.commands_sent = 1

            # log to file
            self.gcode_logger.info("{code}".format(code=str(cmd)))

            self.serial_logger.debug("{line},{code}".format(line=self.commands_sent, code=str(cmd)))
            send_tries = 0
            max_send_tries = 50
            retry_attempts = 5
            
            # wait to send - might take time
            while True:
                # if we've exceeded tries, just break out with error
                if send_tries > max_send_tries:
                    self.serial_logger.error("Serial communication timeout: try {tries}: sending:{line}::{commmand}".format(tries=send_tries, line=self.commands_sent, commmand=cmd_to_send))
                    result.append("ERROR: Serial communication timed out whilst sending {command}:{current}".format(command=cmd_to_send, current=self.commands_sent))
                    return result

                if self._serial_port == "/dev/null": # fake serial port
                    cmd_to_send = str(cmd).encode()
                else:
                    checksum = functools.reduce(lambda x, y: x ^ y, map(ord, "N%d%s" % (self.commands_sent, cmd)))
                    cmd_to_send = str("N%d%s*%d" % (self.commands_sent, cmd, checksum)).encode()
                if not cmd_to_send.endswith(b"\n"):
                    cmd_to_send += b"\n"
            
                self.serial_logger.debug("try {tries}: sending:{line}::{commmand}".format(tries=send_tries, line=self.commands_sent, commmand=cmd_to_send))
                try:
                    send_tries += 1
                    self._serial.write(cmd_to_send)    
                    self._serial.flush() # do it now!
                except SerialTimeoutException as e:
                    self.serial_logger.error(e)
                    self.serial_logger.error("Serial timeout whilst sending {command}:{current}".format(command=cmd_to_send, current=self.commands_sent))
                    result.append("Serial communication timed out whilst sending {command}:{current}".format(command=cmd_to_send, current=self.commands_sent))
                    return result
                except SerialException as e:
                    self.serial_logger.error(e)
                    self.serial_logger.error("Fatal error: Serial exception sending  {command}:{current}".format(command=cmd_to_send, current=self.commands_sent))
                    result.append("Serial exception whilst sending {command}:{current}".format(command=cmd_to_send, current=self.commands_sent))
                    return result
                else:
                    # success!
                    break

            self.serial_logger.debug('done sending, now receiving')
            # read line -- async, sleeping if waiting
            # response = ...

            newline = ""        
            line = "" # line received from serial, to parse

            # loop through all serial data

            # retry a number of times if no response -- safety check to avoid infinite loop
            retries = self.max_retries 
            
            while True:
                # check for timeout
                current_time = time.time() - start_time

                if current_time > max_loop_timeout:
                    result.append("ERROR: serial response timeout")
                    self.serial_logger.error("serial response timeout waiting for result")
                    return result
                    #break # exit loop

                new_line = await self.read_response()
                if new_line != "":
                    line = str(new_line)
                    lowerline = line.lower()

                    if retries < 1:
                        result.append("FATAL ERROR: too many retries")
                        self.serial_logger.error("too many retries waiting for result")
                        return result
                        # break

                    # Check for RESEND
                    if 'resend' in lowerline or lowerline.startswith('rs'):

                        # A resend can be requested either by Resend, resend or
                        # rs.
                        retries = retries - 1 # probably will fail anyway
                        error_msg = "Printer signals resend: {line} (for {cmd} - current line) {current}".format(line=line.rstrip('\n\r'), cmd=cmd, current=self.commands_sent)
                        self.serial_logger.error("{msg}".format(msg=error_msg))

                        # sleep it off, might be busy
                        await gen.sleep(self.retry_time)


                    # Cold extrusion or something else - means line didn't take
                    # so don't update line number-- 'echo: cold extrusion
                    # prevented'
                    elif line.startswith("echo:"):                              
                        no_response = False # received something

                        echo_matches = re.findall("echo: ?(.+)", line)
                        if len(echo_matches) > 0:
                            result.append(echo_matches[0])
                        else:
                            result.append(line)

                    elif 'line number' in lowerline:
                        # next line will be resend, do nothing
                        error_msg = "Line error: {line} (for {cmd} - current line) {current}".format(line=line.rstrip('\n\r'), cmd=cmd, current=self.commands_sent)
                        self.serial_logger.error("{msg}".format(msg=error_msg))
                        await gen.sleep(self.retry_time) # wait, might mean printer is busy
                        retries -= 1
                        continue
                    
                    elif 'checksum' in lowerline:
                        # next line will be resend, do nothing
                        # likely caused by motor moving error in firmware
                        error_msg = "Checksum error: {line} (for {cmd} - current line) {current}".format(line=line.rstrip('\n\r'), cmd=cmd, current=self.commands_sent)
                        self.serial_logger.error("{msg}".format(msg=error_msg))
                        await gen.sleep(self.retry_time)
                        retries -= 1
                        continue

                    else:
                        no_response = False # received something

                        # Otherwise, attempt to parse the response from the printer into
                        # something sensible.
                        # This can be tricky, given all the Marlin versions...

                        # if not parsing, return whatever we got
                        if not parse_results:
                            done = False
                            if lowerline.startswith('ok'):
                                self.ok_count += 1
                                done = True
                            self.serial_logger.debug("Appending {line}::{cmd}".format(line=line.rstrip('\n\r'), cmd=cmd))
                            result.append(line.rstrip('\n\r'))
                            
                            ## G commands are only one line
                            if str(cmd).startswith("G") or done or self._serial_port == '/dev/null':
                                break
                            else:
                                self.serial_logger.debug("multipart response required, reading again")
                                retries -= 1

                        # Temperature message.  'T:' for extruder and 'B:' for bed
                        elif "ok T:" in line or line.startswith("T:") or "ok B:" in line or line.startswith("B:"):
                            self.ok_count += 1
                            response_props = dict()

                            self.serial_logger.debug("temp response: {}".format(line))
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
                            break
                            # END TEMP PARSING

                        else:   
                            # DEFAULT RESPONSE if not matched - JUST SEND BACK TO FRONT END
                            result.append(line.rstrip('\n\r'))
                            # DEBUG
                            self.serial_logger.debug("couldn\'t parse, forwarding: {line}".format(line=line.rstrip('\n\r').escape()))

                            ## G commands are only one line
                            if str(cmd).startswith("G"):
                                break
                            else:
                                retries -= 1
                                self.serial_logger.debug("multipart response required, reading again")

                # nothing received via serial
                else:
                    self.serial_logger.info('wating: retry {tries}/10'.format(tries=retries))

                    if retries < 1:
                        break
                    retries -= 1
                    await gen.sleep(self.retry_time)

        self.commands_sent += 1
          
        # end parsing results
        # self.commands_queued -= 1
        self.busy = False
        self.serial_logger.debug('done sending. {cmds}/{oks}'.format(cmds=self.commands_sent, oks=self.ok_count))
        return result
    
    #
    # send a command to the serial port, return array of responses
    #
    async def send_raw_command(self, command, timeout=40):
        result = []
        newline = ""
        max_loop_timeout = timeout # 40 secs between moves...  might need to be higher
        start_time = time.time()
        current_time = 0

        self._serial.write(command)    
        self._serial.flush() # do it now!

        while True:
            # check for timeout
            current_time = time.time() - start_time
            if current_time > max_loop_timeout:
                result.append("serial response timeout")
                break # exit loop

            new_line = await self.read_response()
            
            if new_line != "":
                line = str(new_line)
                lowerline = line.lower()

                # DEFAULT RESPONSE if not matched - JUST SEND BACK TO FRONT END
                result.append(line.rstrip('\n\r'))
                self.serial_logger.info("result not parsed {cmd}, {line}".format(cmd=command,line=line))
                break
                # end parsing results

            else:
                # DEBUG
                self.serial_logger.debug("Waiting on command: {}".format(command))
                # await gen.sleep(0.05) # should this be gen.sleep() or just
                # sleep??  Should it block?
                time.sleep(self.retry_time)

        return result


    async def read_response(self):
        line = ""
        try:
            line = self._serial.readline()
            # print("SerialDevice(324):line: {}".format(line))
        except SerialException as se:
            line = repr(se)
            print("SerialDevice(370) [except] line: {}".format(line))
            self.serial_logger.error("370, line: {}".format(line))
            # raise

        # only process if there's something to process
        if line != "":              
            # this format seems to work best for cross-platform Marlin printers
            line = line.decode('cp437')
            # print("SerialDevice(334): line: {}".format(line))

        return line