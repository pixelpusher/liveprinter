Retraction variables and heuristics for LivePrinter
===================================================

_Last modified 2021-May-22_

This document explains how LivePrinter handles retractions. This heuristic was developed as a result of user testing and self-reflection during the development of the software, performances and experiments. The code that implements these heuristics can be found in the _liveprinter.printer.js_ file at https://github.com/pixelpusher/liveprinter/blob/master/js/liveprinter.printer.js.

Note
----------

by default, LivePrinter retracts after each move unless specified otherwise. This is to support step-by-step drawing, which is how beginners and first-time users are expected to use LivePrinter. This will considerably slow down complex drawing commands. More advanced users who wish to create more complex shapes using continuous drawing can simply turn it off and on again at will and the system will try to make sure that the filament is always unretracted before continuing to draw, no matter what.

Variables
----------

* **autoRetract** (true by default) -- controls automatic retraction. Set true/false
* **retractLength** (async, set --> updateFirmwareSettings)
* **retractSpeed** (async, set --> updateFirmwareSettings)
* **currentRetraction** -- length of retraction (0 if not retracted, else positive)
* **extraRetract** -- a little extra to retract each time, maybe due to some material getting lost when the filament grinds down against the motor or flattens in the extruder

General drawing heuristics
---------------------------

1. draw: options, when retract, etc.

Descriptions of key functions
-----------------------------

Here are some step-by-step descriptions of the workings of some key functions referenced in this document:

* **sendFirmwareRetractSettings** -- sends GCode to set Marlin's firmware auto-retraction, with parameters _length_ and _speed_
* **unretract (length, speed)**
  1. check if filament is currently retracted (currentRetraction < 0)
     * no: quit
     * yes:
        1. check if speed is within printer bounds
           1. no: quit
           2. yes:
              1. Calculate and store the new filament position _e_ as the old position plus the retraction _length_ specified in the function arguments, plus an additional (optional) amount to compensate for filament flattening and grinding: ``this.e += this.retractLength + this.extraUnretract;``
              2. check if we are using firmware retraction (as opposed to software)
                 1. no: asynchronously send the GCode to move the filament to the new position using a standard move-with-extrusion operation _G1_:  ``await this.gcodeEvent("G1 " + "E" + this.e.toFixed(4) + " F" + this._retractSpeed.toFixed(4));``
                 2. yes:
                    1. has speed changed, or is this retraction length different than retractLength?
                       1. no: do nothing
                       2. yes: this.sendFirmwareRetractSettings()
                    2. asynchronously send firmware unretract GCode: ``await this.gcodeEvent("G11");``
                    3. reset internal current retraction variable to 0 (i.e. filament not retracted)
* **retract (length, speed)**
  1. check if filament is currently unretracted (currentRetraction > 0)
     * no: quit
     * yes:
        1. check if speed is within printer bounds
           1. no: quit
           2. yes:
              1. this.currentRetraction = this.retractLength;
              2. this.e -= this.retractLength;
              3. check if we are using firmware retraction (as opposed to software)
                 1. no: ``await this.gcodeEvent("G1 " + "E" + this.e.toFixed(4) + " F" + this._retractSpeed.toFixed(4));``
                 2. yes:
                    1. has speed changed, or is this retraction length different than retractLength?
                       1. no: do nothing
                       2. yes: this.sendFirmwareRetractSettings()
                    2. send firmware unretract: ``await this.gcodeEvent("G10");``
