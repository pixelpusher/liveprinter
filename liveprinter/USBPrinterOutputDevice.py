##
# from https://github.com/Ultimaker/Cura/blob/master/plugins/USBPrinting/USBPrinterOutputDevice.py
#


from AutoDetectBaudJob import AutoDetectBaudJob

from serial import Serial, SerialException, SerialTimeoutException
from threading import Thread, Event
from time import time, sleep
from queue import Queue
from enum import IntEnum
from typing import Union, Optional, List
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
## 
class PrinterResponse():
    def __init__(self, **fields):
        self._time = time()
        self._type = fields['type']
        self._command = fields['command']
        self._properties = {}

        for key,val in fields.items(): 
            if key != "type" and key != "command":
                self._properties[key] = val;
        
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
    
    def __repr__(self):
        return self.toDict()

    def __str__(self):
        return str(self.toDict())

    
# TEST
pr = PrinterResponse(**{
    'type': "temperature",
    'command': "M105",
    'bed': 200,
    'bed_target': 201,
    'hotend': 180,
    'hotend_target': 181
    })

Logger.log("d", "{}".format(pr))

##  The current processing state of the backend.
class ConnectionState(IntEnum):
    closed = 0
    connecting = 1
    connected = 2
    busy = 3
    error = 4

class USBPrinter(OutputDevice):
    def __init__(self, serial_port: str, baud_rate: Optional[int] = None, serial_obj: Optional[Serial] = None):
        super().__init__(serial_port)
        self.setName("USB printing")
        self.setShortDescription("Print via USB")
        self.setDescription("Print via USB")
        self.setIconName("print")

        self._serial = serial_obj  # type: Optional[Serial]
        self._serial_port = serial_port
        self._address = serial_port

        self._timeout = 3

        self._connection_state = ConnectionState.closed
        self._last_command_time = -3000; # none received yet

        # List of gcode lines to be printed
        # should this be a threaded queue?
        self._gcode = [] # type: List[str]
        self._last_gcode_line = ""  # last line sent to the printer
        self._lines_printed = 0 # total number of lines printed

        self._use_auto_detect = True

        self._baud_rate = baud_rate

        self._all_baud_rates = [115200, 250000, 230400, 57600, 38400, 19200, 9600]

        # Instead of using a timer, we really need the update to be as a thread, as reading from serial can block.
        self._update_thread = Thread(target=self._update, daemon = True)

        self._last_temperature_request = None  # type: Optional[int]

        self._hotendTemperature = None # type: Optional[int]

        self._bedTemperature = None # type: Optional[int]

        self._targetHotendTemperature = None # type: Optional[int]

        self._targetBedTemperature = None # type: Optional[int]

        self._is_printing = False  # A print is being sent.

        ## Set when print is started in order to check running time.
        self._print_start_time = None  # type: Optional[int]
        self._print_estimated_time = None  # type: Optional[int]

        self._accepts_commands = True

        self._paused = False

        # Queue for commands that need to be sent.
        self._command_queue = Queue()
        # Event to indicate that an "ok" was received from the printer after sending a command.
        self._command_received = Event()
        self._command_received.set()

        # Queue for messages from the printer.
        self._responses_queue = Queue()


    ##  Start a print based on a g-code.
    #   \param gcode_list List with gcode (strings).
    def _printGCode(self, gcode_list: List[str]):

        self._gcode.extend(gcode_list);

        # Reset line number. If this is not done, first line is sometimes ignored
        self._gcode.insert(0, "M110")
        self._lines_printed = 0
        
        for i in range(0, 4):  # Push first 4 entries before accepting other inputs
            self._sendNextGcodeLine()
                
        if not self._is_printing:
            self._print_start_time = time()
            # FIXME: make this meaningful
            self._print_estimated_time = time()

        self._is_printing = True
        self._paused = False
        self.writeFinished.emit(self)

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
        if self._baud_rate is None:
            if self._use_auto_detect:
                auto_detect_job = AutoDetectBaudJob(self._serial_port)
                auto_detect_job.start()
                auto_detect_job.finished.connect(self._autoDetectFinished)
            return
        if self._serial is None:
            try:
                self._serial = Serial(str(self._serial_port), self._baud_rate, timeout=self._timeout, writeTimeout=self._timeout)
                self._connection_state = ConnectionState.connected
            except SerialException:
                Logger.log("w", "An exception occured while trying to create serial connection")
                self._connection_state = ConnectionState.error
                return
        ###### TODO: get real number of extruders
        # num_extruders = container_stack.getProperty("machine_extruder_count", "value")
        num_extruders = 1
        # start main communications thread
        self._update_thread.start()

    def close(self):
        #super().close()
        if self._serial is not None:
            self._serial.close()

        # Re-create the thread so it can be started again later.
        self._update_thread = Thread(target=self._update, daemon=True)
        self._serial = None

    ##  Send a command to printer.
    def sendCommand(self, command: Union[str, bytes]):
        if not self._command_received.is_set():
            self._command_queue.put(command)
        else:
            self._sendCommand(command)
    def _sendCommand(self, command: Union[str, bytes]):
        if self._serial is None or self._connection_state != ConnectionState.connected:
            return

        if type(command == str):
            command = command.encode()
        if not command.endswith(b"\n"):
            command += b"\n"
        try:
            self._last_command_time = time();
            self._command_received.clear()
            self._serial.write(command)
        except SerialTimeoutException:
            Logger.log("w", "Timeout when sending command to printer via USB.")
            self._command_received.set()

    ## start sending a list of GCode to the printer
    def startGCodeList(self, gcode_list: List[str]):
        self._printGCode(gcode_list)

    ## get last printer response, and mark as received if second arg is true
    def getLastResponse(self, consume:bool = False):
        if not self._responses_queue.empty():
            response = self._responses_queue.get();
            if consume:
                self._responses_queue.task_done()
            return response
        else:
            return False


    ## threaded update function
    def _update(self):
        while self._connection_state == ConnectionState.connected:
            # did we handle the response from the printer?
            handled = False

            try:
                line = self._serial.readline()
            except:
                continue

            # FIXME: stop using temp requests all the time and write proper call/response that checks against last command
            if self._last_temperature_request is None or time() > self._last_temperature_request + self._timeout:
                # Timeout, or no request has been sent at all.
                self._command_received.set() # We haven't really received the ok, but we need to send a new command

                self.sendCommand("M105")
                self._last_temperature_request = time()

                #if self._firmware_name is None:
                #    self.sendCommand("M115")

            if line.startswith(b"echo:"):
                handled = True
                printer_info = re.findall(b"echo\:(.+)?", line)
                for info in printer_info:
                    # if len(printer_info) > 0:
                    self._responses_queue.put(PrinterResponse("info",info))
                    Logger.log("d","info:{}".format(info))

            if b"ok T:" in line or line.startswith(b"T:") or b"ok B:" in line or line.startswith(b"B:"):  # Temperature message. 'T:' for extruder and 'B:' for bed
                #Logger.log("d", "temp response: {}".format(line))
                extruder_temperature_matches = re.findall(b"T(\d*): ?([\d\.]+) ?\/?([\d\.]+)?", line)
                # Update all temperature values
                # line looks like:  b'ok T:24.7 /0.0 B:23.4 /0.0 @:0 B@:0\n'
                # OR b'T:176.1 E:0 W:?\n'
                if len(extruder_temperature_matches) > 0:
                    match = extruder_temperature_matches[0]
                    ### NOTE: hot end (tool number) is the first match (0)
                    self._hotendTemperature = float(match[1])
                    self._responses_queue.put(PrinterResponse("hotend_temp",match[1]))
                    Logger.log("d", "hotend temp:{}".format(match[1]))
                    
                    if match[2]: 
                        self._targetHotendTemperature = float(match[2])
                        self._responses_queue.put(PrinterResponse("hotend_target_temp",match[2]))
                        Logger.log("d", "hotend target temp:{}".format(match[2]))
                    handled = True
                
                bed_temperature_matches = re.findall(b"B: ?([\d\.]+) ?\/?([\d\.]+)?", line)

                #for match in bed_temperature_matches:
                #    Logger.log("d", "bed temp: {match}".format(match=match))

                if len(bed_temperature_matches) > 0:
                    match = bed_temperature_matches[0]
                    self._responses_queue.put(PrinterResponse("bed_temp",match[0]))
                    self._responses_queue.put(PrinterResponse("bed_target_temp",match[1]))
                    self._bedTemperature = match[0]
                    self._targetBedTemperature = match[1]

                    # Logger.log("d", "bed temp:{}".format(self._bedTemperature))
                    handled = True

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

            if b"FIRMWARE_NAME:" in line:
                #self._setFirmwareName(line)
                self._responses_queue.put(PrinterResponse("firmware",line))
                Logger.log('d', "Printer firmware:{}".format(line))
                handled = True
                pass

            if b"ok" in line:
                self._command_received.set()
                handled = True
                # Logger.log('d', "Reponse OK:{}".format(line))
                if not self._command_queue.empty():
                    self._sendCommand(self._command_queue.get())
                    self._command_queue.task_done(); # mark task as finished in queue
                if self._is_printing:
                    if self._paused:
                        pass  # Nothing to do!
                    else:
                        self._sendNextGcodeLine()

            if self._is_printing:
                if line.startswith(b'!!'):
                    self._responses_queue.put(PrinterResponse("fatal_error",line))
                    Logger.log('e', "Printer signals fatal error. Cancelling print. {}".format(line))
                    handled = True
                    self.cancelPrint()

                # TODO: handle this better - just resend last command! No need for the magic bits
                elif b"resend" in line.lower() or b"rs" in line:
                    # A resend can be requested either by Resend, resend or rs.
                    handled = True
                    try:
                        self._lines_printed = int(line.replace(b"N:", b" ").replace(b"N", b" ").replace(b":", b" ").split()[-1])
                    except:
                        if b"rs" in line:
                            # In some cases of the RS command it needs to be handled differently.
                            self._lines_printed = int(line.split()[1])
            if not handled:
                if line:
                    Logger.log('w', "Printer response not handled: {}".format(line))
            else:
                # update lines printed
                self._lines_printed += 1

    def setConnectionState(self, state: ConnectionState):
        self._connection_state = state

    def getConnectionState(self):
        return self._connection_state

    def pausePrint(self):
        self._paused = True

    def resumePrint(self):
        self._paused = False

    def cancelPrint(self):
        self._lines_printed = 0
        self._gcode.clear()
        self._printers[0].updateActivePrintJob(None)
        self._is_printing = False
        self._is_paused = False

        # Turn off temperatures, fan and steppers
        self._sendCommand("M140 S0")
        self._sendCommand("M104 S0")
        self._sendCommand("M107")

        # Home XY to prevent nozzle resting on aborted print
        # Don't home bed because it may crash the printhead into the print on printers that home on the bottom
        self.printers[0].homeHead()
        self._sendCommand("M84")

    def _sendNextGcodeLine(self):
        if len(self._gcode < 1):
            self._is_printing = False
            return
        line = self._gcode.pop(); # last line

        # FIXME: handles comments, but these should have been removed in the front end
        #if ";" in line:
        #    line = line[:line.find(";")]
        # again, should have been done already
        #line = line.strip()

        # Don't send empty lines. But we do have to send something, so send M105 instead.
        # Don't send the M0 or M1 to the machine, as M0 and M1 are handled as an LCD menu pause.
        #if line == "" or line == "M0" or line == "M1":
        #    line = "M105"

        checksum = functools.reduce(lambda x, y: x ^ y, map(ord, "N%d%s" % (self._lines_printed, line)))
        self.sendCommand("N%d%s*%d" % (self._lines_printed, line, checksum))

        progress = len(self._gcode)
        elapsed_time = int(time() - self._print_start_time)
        estimated_time = self._print_estimated_time