##
# from https://github.com/Ultimaker/Cura/blob/master/plugins/USBPrinting/USBPrinterOutputDevice.py
#


from AutoDetectBaudJob import AutoDetectBaudJob

from serial import Serial, SerialException, SerialTimeoutException
from threading import Lock, Thread, Event
from time import time, sleep
from queue import Queue, Empty
from enum import IntEnum
from typing import Union, Optional, List
from PrinterModel import PrinterModel
from UM.Logger import Logger
from UM.OutputDevice import OutputDevice

import re
import functools  # Used for reduce
import os
from enum import IntEnum  # For the connection state tracking.
from datetime import datetime

##  Message from the printer, with timestamp
## Type is yet to be codified... now it is: info, temperature
## Command is the last GCode command sent to elicit this response form the printer
## for temperature requests, type = "temperature" and fields are hotend, hotend_target, bed, bed_target
## errors are type error with a message prop containing the message
## basic ok response (for successfully printed lines) are type "ok" with nothing else
## firmware info is type firmware with a firmware prop containing firmware string (maybe this should be info)
##
## 
class PrinterResponse():
    def __init__(self, **fields):
        self._time = time()
        self._type = fields['type']
        self._command = fields['command']
        self._properties = {}

        for key,val in fields.items(): 
            if key != "type" and key != "command":
                self._properties[key] = val
        
    def getTime(self):
        return self._time

    def getType(self):
        return self._type

    def toDict(self):
        return {
                'type': self._type,
                'time': self._time,
                'command': self._command, 
                'properties': self._properties
                }

    def toJSONRPC(self):
        json = {
                'jsonrpc': '2.0',
                'id': 3, 
                'method': self._type,
                'params': {
                    'time': self._time,
                    'command': self._command
                    }
                }
        for key,val in self._properties.items(): 
            json['params'][key] = val
        
        return json
    
    def __repr__(self):
        return self.toDict()

    def __str__(self):
        return str(self.toDict())

    
# TEST
#pr = PrinterResponse(**{
#    'type': "temperature",
#    'command': "M105",
#    'bed': 200,
#    'bed_target': 201,
#    'hotend': 180,
#    'hotend_target': 181
#    })

#Logger.log("d", "{}".format(pr))

##  The current processing state of the backend.
class ConnectionState(IntEnum):
    closed = 0
    connecting = 1
    connected = 2
    busy = 3
    error = 4


# for later use (driver-specific regexp):
#motion: 'G0', // G0, G1, G2, G3, G38.2, G38.3, G38.4, G38.5, G80
#wcs: 'G54', // G54, G55, G56, G57, G58, G59
#plane: 'G17', // G17: xy-plane, G18: xz-plane, G19: yz-plane
#units: 'G21', // G20: Inches, G21: Millimeters
#distance: 'G90', // G90: Absolute, G91: Relative
#feedrate: 'G94', // G93: Inverse time mode, G94: Units per minute
#program: 'M0', // M0, M1, M2, M30
#spindle: 'M5', // M3: Spindle (cw), M4: Spindle (ccw), M5: Spindle off
#coolant: 'M9' // M7: Mist coolant, M8: Flood coolant, M9: Coolant off, [M7,M8]: Both on


class USBPrinter(OutputDevice):
    def __init__(self, serial_port: str, baud_rate: Optional[int] = None, serial_obj: Optional[Serial] = None):
        super().__init__(serial_port)
        self.setName("USB printing")
        self.setShortDescription("Print via USB")
        self.setDescription("Print via USB")
        self.setIconName("print")

        self._serial = serial_obj  # type: Optional[Serial]
        self._serial_port = serial_port

        self._timeout = 3

        self._connection_state = ConnectionState.closed
        self._last_command_time = -3000; # none received yet
        self._lock = Lock() # to sync threads around connectionstate

        self._last_command = None  # last line sent to the printer
        self._lines_printed = 1 # total number of lines printed

        self._use_auto_detect = True

        self._baud_rate = baud_rate

        self._all_baud_rates = [115200, 250000, 230400, 57600, 38400, 19200, 9600]

        # Instead of using a timer, we really need the update to be as a thread, as reading from serial can block.
        self._update_thread = Thread(target=self._update, daemon = True)

        ## Set when print is started in order to check running time.
        self._print_start_time = None  # type: Optional[int]
        self._print_estimated_time = None  # type: Optional[int]
        self._commands_on_printer = 0 # commands currently queued on printer

        self._accepts_commands = True

        self._paused = False

        # Queue for commands that need to be sent.
        self._command_queue = Queue()
        # Event to indicate that an "ok" was received from the printer after sending a command.

        # Queue for messages from the printer.
        self._responses_queue = Queue()

        # if we were passed a serial object, assume it it legitimate until an error occurs
        if self._serial is not None:
            self.setConnectionState(ConnectionState.connected)

        # printer specific data
        self._model = PrinterModel()
        # TODO: use Quarternions for axis/angle: https://github.com/infusion/Quaternion.js
        # or self.travelSpeed = { "direction": 30, "angle": [0,30,0] }; // in mm/s3


        # start main communications thread
        self._update_thread.start()

    def _autoDetectFinished(self, job: AutoDetectBaudJob):
        result = job.getResult()
        if result is not None:
            self.setBaudRate(result)
            Logger.log("d", "Set baudrate to {result}") 
            self.connect()  # Try to connect (actually create serial, etc)

    def setBaudRate(self, baud_rate: int):
        if baud_rate not in self._all_baud_rates:
            Logger.log("w", "Not updating baudrate to {baud_rate} as it's an unknown baudrate".format(baud_rate=baud_rate))
            return

        self._baud_rate = baud_rate

    def getQueueSize(self):
        return  self._command_queue.unfinished_tasks;

    def connect(self):
        Logger.log("i", "connecting")

        if self.getConnectionState() is ConnectionState.closed:
            self.setConnectionState(ConnectionState.connecting)
            if self._baud_rate is None:
                if self._use_auto_detect:
                    auto_detect_job = AutoDetectBaudJob(self._serial_port)
                    auto_detect_job.start()
                    auto_detect_job.finished.connect(self._autoDetectFinished)
                return
            if self._serial is None:
                try:
                    self._serial = Serial(str(self._serial_port), self._baud_rate, timeout=self._timeout, writeTimeout=self._timeout)
                    self.setConnectionState(ConnectionState.connected)
                except SerialException:
                    Logger.log("w", "An exception occured while trying to create serial connection")
                    ##FIXME - send printer response
                    self.setConnectionState(ConnectionState.error)
                    raise SerialException("could not open serial port {}: {}".format(self._serial_port, repr(e)))
                    return

    def close(self):
        #super().close()
        if self._serial is not None:
            self._serial.close()
        self.setConnectionState(ConnectionState.closed)
        # Re-create the thread so it can be started again later.
        self._update_thread = Thread(target=self._update, daemon=True)
        self._serial = None

    ##  Send a command to printer (put in threaded commands queue).
    ## Commands are actually sent via serial in the threaded update function.     
    def sendCommand(self, command: Union[str, bytes]):
        self._last_command_time = time();
        self._command_queue.put(command, block=True)
 
    ## send a list of GCode to the printer
    def sendGCodeList(self, gcode_list: List):
        for command in gcode_list:
            self.sendCommand(command)

    ## get last printer response, and mark as received if second arg is true
    def getLastResponse(self):
        # Logger.log("i", "gettings tasks {}".format(self._responses_queue.unfinished_tasks))
        
        # Theoretically, this should just throw an Empty error if no tasks
        # but instead it blocks?
        if self._responses_queue.unfinished_tasks < 1:
            return None

        response = None
        
        try:
            response = self._responses_queue.get(block=0, timeout=0.01)
            #Logger.log("i", "got task {}".format(time()))
        except Empty:
            Logger.log("i", "Queue empty")
            response = None
        
        return response

    def lastReponseHandled(self):
        #Logger.log("i", "TASK DONE")
        #Logger.log("i", "tasks left: {}".format(self._responses_queue.unfinished_tasks))
        
        try:
            self._responses_queue.task_done()
        except ValueError as ve:
            Logger.log("i", "unfinished tasks called too many times: {}".format(ve))

    def _commandHandled(self):
        # update lines printed
        self._command_queue.task_done(); # mark task as finished in queue
        self._commands_on_printer = self._commands_on_printer - 1

        # self._last_command = None #FIXME: why did I do this...
        return True

    def _serialSendCommand(self, cmd:Union[str,bytes], resend=False):
            # note last command sent
            self._last_command = cmd
            # checksum = is this necessary?
            # FIXME: removed for now because of errors in handling
            checksum = functools.reduce(lambda x, y: x ^ y, map(ord, "N%d%s" % (self._lines_printed, cmd)))
            send_command = str("N%d%s*%d" % (self._lines_printed, cmd, checksum))
                            
            if type(send_command == str):
                send_command = send_command.encode()
            if not send_command.endswith(b"\n"):
                send_command += b"\n"
                            
            try:
                if not resend:
                    self._commands_on_printer = self._commands_on_printer + 1
                    self._lines_printed += 1
                self._serial.write(send_command)
            except SerialTimeoutException:
                response = PrinterResponse(**{"type":"error", 
                                                "message":"Timeout when sending command to printer via USB.",
                                                'command': self._last_command})
                self._responses_queue.put(response)
                if not resend:
                    self._commands_on_printer -= 1
                    self._lines_printed -= 1
                Logger.log("w", "Timeout when sending command to printer via USB.")


    ## threaded update function.
    ## Each time this is run, read from serial port and handle the response from the printer.
    ## A PrinterResponse object goes on the responses queue containing the result.
    ## If a resend is requested, send the last command again
    ## At the end, if not paused, send the next command in the queue
    # 
    def _update(self):
        while True:
            # this is a locking function
            connected = self.getConnectionState()

            if connected == ConnectionState.connected:
                handled = False

                # properties of the printer response to report back to the server
                response_props = {'command': self._last_command}

                ###
                ### process any new commands to send - TODO: consider limits on commands
                ###
                if self.getPaused():
                    break  # Nothing to do!

                elif self._command_queue.unfinished_tasks > 0 and self._commands_on_printer < 4:
                    Logger.log("i", "handling next command {} {}".format(self._lines_printed,self._command_queue.unfinished_tasks))
                    command = self._command_queue.get(block=True)
                            
                    if command is not None:
                        if self._last_command is command:
                            # WHY ARE THESE THE SAME? SHOULD NOT HAPPEN.
                            Logger.log("i", "COMMANDS ARE THE SAME, SKIPPING: {} {}".format(command, self._last_command))
                        else:
                            # actually send command via serial
                            self._serialSendCommand(command)
                       
                    #else:
                    #    Logger.log("i", "no unfinished tasks")

                ###
                ### Process printer responses
                ###
                try:
                    line = self._serial.readline()
                except:
                    line = ""

                # only process if there's something to process
                if line:                        
                    # process (parse) response from printer

                    if line.startswith(b'!!'):
                        response_props["type"] = "error"
                        response_props["message"] = "Printer signals fatal error!"
                        Logger.log('e', "Printer signals fatal error. Pausing print. {}".format(line))
                        handled = self._commandHandled()
                        self.pausePrint() # pause for error
                        # done, don't process anything else
                        

                    # TODO: handle this better - just resend last command! No need for the magic bits
                    elif b'resend' in line.lower() or line.startswith(b'rs'):
                        resend = True
                        # A resend can be requested either by Resend, resend or rs.
                        Logger.log('e', "Printer signals resend. {}".format(line))
                        response_props["type"] = "resend"
                        response_props["message"] = "Printer signals resend. {}".format(line.decode('utf-8'))
                    
                        #try:
                        #    self._lines_printed = int(line.replace(b"N:", b" ").replace(b"N", b" ").replace(b":", b" ").split()[-1])
                        #except:
                        #    if b"rs" in line:
                        #        # In some cases of the RS command it needs to be handled differently.
                        #        self._lines_printed = int(line.split()[1])

                        Logger.log("w", "RESEND")
                        self._serialSendCommand(self._last_command, True)


                    elif line.startswith(b"echo:"):
                        # Not handled because this is just if it's turned on
                        response_props['type'] = 'info'
                        printer_info = re.findall("echo\:(.+)?", line.decode('utf-8'))
                        for info in printer_info:
                            response_props['message'] = info
                        # handled = self._commandHandled()

                    elif line.startswith(b"Compiled:"):
                        # Not handled because this is just if it's turned on
                        response_props['type'] = 'info'
                        response_props['message'] = line.decode('utf-8')
                        # handled = self._commandHandled()

                    elif line.startswith(b"start"):
                        # Not handled because this is just if it's turned on
                        response_props['type'] = 'start'
                        response_props['message'] = line.decode('utf-8')
                        # handled = self._commandHandled()
                        
                    elif b"ok T:" in line or line.startswith(b"T:") or b"ok B:" in line or line.startswith(b"B:"):  # Temperature message. 'T:' for extruder and 'B:' for bed
                        response_props["type"] = "temperature"
                        lineString = line.decode('utf-8')
                        #Logger.log("d", "temp response: {}".format(line))
                        extruder_temperature_matches = re.findall("T(\d*): ?([\d\.]+) ?\/?([\d\.]+)?", lineString)
                        # Update all temperature values
                        # line looks like:  b'ok T:24.7 /0.0 B:23.4 /0.0 @:0 B@:0\n'
                        # OR b'T:176.1 E:0 W:?\n'
                        if len(extruder_temperature_matches) > 0:
                            match = extruder_temperature_matches[0]
                            ### NOTE: hot end (tool number) is the first match (0)                   
                            response_props["hotend"]=match[1]
                    
                            if match[2]:                         
                                response_props["hotend_target"] = match[2]
                
                        bed_temperature_matches = re.findall("B: ?([\d\.]+) ?\/?([\d\.]+)?", lineString)

                        if len(bed_temperature_matches) > 0:
                            match = bed_temperature_matches[0]
                            response_props["bed"] = match[0]
                            response_props["bed_target"] = match[1]
                            
                        handled = self._commandHandled()

                        # LEGACY CODE, FOR FUTURE REFERENCE...
                        #for match, extruder in zip(extruder_temperature_matches, self._printers[0].extruders):
                        #    if match[1]:
                        #        hotendTemperature(float(match[1]))
                        #    if match[2]:
                        #        extruder.updateTargetHotendTemperature(float(match[2]))

                        #bed_temperature_matches = re.findall(b"B: ?([\d\.]+) ?\/?([\d\.]+)?", line)
                        #if bed_temperature_matches:
                        #    match = bed_temperature_matches[0]
                        #    if match[0]:
                        #        self._printers[0].updateBedTemperature(float(match[0]))
                        #    if match[1]:
                        #        self._printers[0].updateTargetBedTemperature(float(match[1]))

                    elif b"FIRMWARE_NAME:" in line:
                        # TODO: possibly pre-parse this instead of sending whole line
                        response_props["type"] = "firmware"
                        response_props["message"] = line.decode('utf-8')
                        handled = self._commandHandled()

                    # position response for position update
                    # b'X:0.00Y:0.00Z:0.00E:0.00 Count X: 0.00Y:0.00Z:0.00\n'
                    elif line.startswith(b'X:'):
                        stringline = line.decode('utf-8')
                        matches = re.findall('([x|y|z|e]):([0-9\.\-]+)+', stringline.lower())
                        # Match 1
                        # 1. X
                        # 2. 0.00
                        # parse it properly
                        
                        response_props["type"] = "position"
                        # first 4 matches are position, other 2 are steps
                        # axis, value
                        for i in range(4):
                            response_props[str(matches[i][0])] = str(matches[i][1])
                        handled = self._commandHandled()
                        
                    # handle any basic ok's
                    elif line.lower().startswith(b'ok'):
                        response_props["type"] = "ok"
                        response_props["message"] = "ok"
                        handled = self._commandHandled()
                        #Logger.log('i', "ok received: {}".format(line)) 

                    # ERROR! BAD.
                    elif line.lower().startswith(b'error'):
                        response_props["type"] = "error"
                        response_props["message"] = line.decode('utf-8')
                        Logger.log('e', "Error from printer: {}".format(response_props["message"]))
                        
                        
                    ##### Done parsing, now send waiting commands
                    # now, really not handled
                    else:
                        Logger.log('w', "WARN: Printer response not handled: {}".format(line))
                        response_props["type"] = "info"
                        response_props["message"] = line.decode('utf-8')
                        # self.pausePrint() # pause for error
                        # TODO: do something else here??

                        
                    # send response to queue so GUI can pick it up later
                    response = PrinterResponse(**response_props)
                    # Logger.log("d","response: {}".format(response))
                    self._responses_queue.put(response, block=True)

            sleep( 0.005 ) # yield to others

    
    ## these are thread-safe because the update thread uses them
    def setConnectionState(self, state: ConnectionState):
        self._lock.acquire()
        self._connection_state = state
        self._lock.release()

    def getConnectionState(self):
        self._lock.acquire()
        state = self._connection_state
        self._lock.release()
        return state

    def pausePrint(self):
        self._lock.acquire()
        self._paused = True
        self._lock.release()

    def resumePrint(self):
        self._lock.acquire()
        self._paused = False
        self._lock.release()

    def getPaused(self):
        self._lock.acquire()
        state = self._paused
        self._lock.release()
        return state
