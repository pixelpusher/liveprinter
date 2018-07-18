// LIVEPRINTER - a livecoding system for live CNC manufacturing
//-------------------------------------------------------------
// Copyright 2018 Evan Raskob
//
// Licensed under the GNU Affero 3.0 License (the "License"); you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
//     https://www.gnu.org/licenses/gpl-3.0.en.html
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

(function () {
    "use strict";

    $(document).ready(function () {
        if (!window.console) window.console = {};
        if (!window.console.log) window.console.log = function () { };

        (function () {
            // dangerous?
            // need to pass to scripts somehow
            if (!window.scope) {
                window.scope = Object.create(null);
            }
            var scope = window.scope;

            var outgoingQueue = []; // messages for the server

            var Scheduler = {
                ScheduledEvents: [],
                audioContext: new AudioContext(),
                schedulerInterval: 40,
                timerID: null,

                clearEvents: function () {
                    Scheduler.ScheduledEvents = [];
                },

                /*
                * arguments properties:
                * timeOffset: ms offset to schedule this for
                * func: function
                * repeat: true/false whether to reschedule
                */
                scheduleEvent: function (args) {
                    Scheduler.ScheduledEvents.push({
                        'time': Scheduler.audioContext.currentTime + args.timeOffset,
                        'timeOffset': args.timeOffset,
                        'func': args.func,
                        'repeat': args.repeat
                    });
                },

                startScheduler: function () {
                    console.log("scheduler starting at time: " + Scheduler.audioContext.currentTime);

                    function scheduler(nextTime) {
                        let time = Scheduler.audioContext.currentTime;
                        let i = 0;
                        // run events -- this could be done better with map/filter
                        if (Scheduler.ScheduledEvents)
                            while (i < Scheduler.ScheduledEvents.length && Scheduler.ScheduledEvents.length > 0) {
                                //console.log("processing events at time " + time);
                                let event = Scheduler.ScheduledEvents[0];
                                //console.log(event);
                                if (event.time >= time) {
                                    //console.log("running event at time:" + time);
                                    event.func(time);
                                    Scheduler.ScheduledEvents.shift();
                                    if (event.repeat) {
                                        Scheduler.scheduleEvent(event);
                                    }
                                }
                                i++;
                            }

                        // run it again
                        Scheduler.timerID = setTimeout(scheduler, Scheduler.schedulerInterval, time + Scheduler.schedulerInterval);
                    }
                    Scheduler.timerID = setTimeout(scheduler, Scheduler.schedulerInterval, Scheduler.schedulerInterval);
                }
            };

            Scheduler.startScheduler();

            // Scheduler.scheduleEvent({
            //     timeOffset: 2000,
            //     func: function() { console.log("EVENT"); } ,
            //     repeat: true,
            // });

            //////////////////////////////////////////////////////////////////////////////////////////
            // Codemirror:
            // https://codemirror.net/doc/manual.html
            //////////////////////////////////////////////////////////////////////////////////////////

            // config options
            //CodeMirror.defaults.value = "\n\n\n";
            CodeMirror.defaults.lineWrapping = true;
            CodeMirror.defaults.lineNumbers = true;
            //CodeMirror.defaults.autofocus = true;
            CodeMirror.defaults.undoDepth = 100;

            var ed_trigger = function (ed) {
                runCode();
                console.log("trigger");
            };

            // start CodeMirror
            var CodeEditor = CodeMirror.fromTextArea(document.getElementById("code-editor"), {
                lineNumbers: true,
                styleActiveLine: true,
                lineWrapping: true,
                mode: "javascript",
                lint: {
                    globalstrict: true,
                    strict: false,
                    esversion: 6
                  },
                gutters: ["CodeMirror-lint-markers"],
                extraKeys: {
                    "Ctrl-Enter": ed_trigger,
                    "Cmd-Enter": ed_trigger
                }
            });


            // borrowed from https://github.com/cncjs/gcode-parser/blob/master/src/index.js (MIT License)
            // See http://linuxcnc.org/docs/html/gcode/overview.html#gcode:comments
            // Comments can be embedded in a line using parentheses () or for the remainder of a lineusing a semi-colon. The semi-colon is not treated as the start of a comment when enclosed in parentheses.
            const stripComments = (() => {
                const re1 = new RegExp(/\s*\([^\)]*\)/g); // Remove anything inside the parentheses
                const re2 = new RegExp(/\s*;.*/g); // Remove anything after a semi-colon to the end of the line, including preceding spaces
                //const re3 = new RegExp(/\s+/g);
                return (line => line.replace(re1, '').replace(re2, '')); //.replace(re3, ''));
            })();

            //if (!lines) return;
            //gcode = [];
            //var i;
            //for (i = 0; i < lines.length; i++) {
            //    if (lines[i].match(/^(G0|G1|G90|G91|G92|M82|M83|G28)/i)) gcode.push(lines[i]);
            //}
            //lines = [];


            function codeToJSON(gcode)
            {
                if (typeof gcode === 'string') gcode = [stripComments(gcode)];

                if (typeof gcode === 'object' && Array.isArray(gcode)) {
                    let message = {
                        'jsonrpc': '2.0',
                        'id': 1,
                        'method': 'gcode',
                        'params': gcode,
                    };

                    let message_json = JSON.stringify(message);
                    // debugging
                    //console.log(message_json);

                    return message_json;

                    //socketHandler.socket.send(message_json);
                }
                else throw new Error("invalid gcode in sendGCode[" + typeof text + "]:" + text);

                return null;
            }

            function sendGCode(gcode) {
                let message = codeToJSON(gcode);
                socketHandler.socket.send(message);
            }

            // queue to be run after OK -- for movements, etc.
            // only if necessary... send if nothing is already in the queue
            function queueGCode(gcode) {
                let message = codeToJSON(gcode);
                if (outgoingQueue.length > 0)
                    outgoingQueue.push(message);
                else
                    socketHandler.socket.send(message);
            }


            function runCode() {
                let code = CodeEditor.getSelection();
                let cursor = CodeEditor.getCursor();

                // parse first??
                let validCode = true;

                if (!code) {
                    // info level
                    //console.log("no selections");
                    code = CodeEditor.getLine(cursor.line);
                    CodeEditor.setSelection({ line: cursor.line, ch: 0 }, { line: cursor.line, ch: code.length });
                }

                // run code
                //if (validCode) {
                try {
                    globalEval(code, cursor.line+1);
                } catch (e) {
                    doError(e);
                }
            }

            var socketHandler = {
                socket: null,
                listeners: [], // listeners for json rpc calls

                start: function () {
                    $("#info > ul").empty();
                    $("#errors > ul").empty();
                    $("#commands > ul").empty();

                    var url = "ws://" + location.host + "/json";
                    socketHandler.socket = new WebSocket(url);
                    console.log('opening socket');
                    socketHandler.socket.onmessage = function (event) {
                        //console.log(event.data);
                        let jsonRPC = JSON.parse(event.data);
                        //console.log(jsonRPC);
                        socketHandler.handleJSONRPC(jsonRPC);
                        socketHandler.showMessage(event.data);
                    };

                    // runs when printer connection is established via websockets
                    socketHandler.socket.onopen = function () {

                        // TEST
                        // printer.extrude({
                        //     'x': 20,
                        //     'y': 30,
                        //     'z': 10,
                        // });

                        //sendGCode("G92");
                        //sendGCode("G28");

                        var node = $("<li>PRINTER CONNECTED</li>");
                        node.hide();
                        $("#info").append(node);
                        node.slideDown();
                    };
                },

                showMessage: function (message) {
                    var existing = $("#m" + message.id);
                    if (existing.length > 0) return;
                    var node = $(message.html);
                    node.hide();
                    $("#inbox").append(node);
                    node.slideDown();
                },

                handleError: function (errorJSON) {
                    // TODO:
                    console.log("JSON RPC ERROR: " + errorJSON);
                },

                handleJSONRPC: function (jsonRPC) {
                    // call all listeners
                    //console.log("socket:");
                    //console.log(jsonRPC);
                    socketHandler.listeners.map(listener => { if (listener[jsonRPC.method]) { listener[jsonRPC.method](jsonRPC.params); } });
                },

                //
                // add a listener to the queue of jsonrpc event listeners
                // must have a function for jsonrpc event method name which takes appropriate params json object
                registerListener: function (listener) {
                    socketHandler.listeners.push(listener);
                },

                removeListener: function (listener) {
                    socketHandler.listeners = socketHandler.listeners.filter(l => (l !== listener));
                }
            };

            // TEST

            //var testListener = {
            //    "info": function (params) {
            //        console.log("INFO:");
            //        console.log(params);
            //    }
            //};

            //socketHandler.registerListener(testListener);



            // CodeMirror stuff

            var WORD = /[\w$]+/g, RANGE = 500;

            CodeMirror.registerHelper("hint", "anyword", function (editor, options) {
                var word = options && options.word || WORD;
                var range = options && options.range || RANGE;
                var cur = editor.getCursor(), curLine = editor.getLine(cur.line);
                var start = cur.ch, end = start;
                while (end < curLine.length && word.test(curLine.charAt(end)))++end;
                while (start && word.test(curLine.charAt(start - 1)))--start;
                var curWord = start !== end && curLine.slice(start, end);

                var list = [], seen = {};
                function scan(dir) {
                    var line = cur.line, end = Math.min(Math.max(line + dir * range, editor.firstLine()), editor.lastLine()) + dir;
                    for (; line !== end; line += dir) {
                        var text = editor.getLine(line), m;
                        word.lastIndex = 0;
                        while (m = word.exec(text)) {
                            if ((!curWord || m[0].indexOf(curWord) === 0) && !seen.hasOwnProperty(m[0])) {
                                seen[m[0]] = true;
                                list.push(m[0]);
                            }
                        }
                    }
                }
                scan(-1);
                scan(1);
                return { list: list, from: CodeMirror.Pos(cur.line, start), to: CodeMirror.Pos(cur.line, end) };
            });


            /**
             * Movement API
             *
             * */

            // basic properties and functions for the physical printer like speeds, dimensions, extrusion settings
            // will be merged into the back end shortly and removed from this file
            //
            class Printer {

                ///////
                // Printer API /////////////////
                ///////

                constructor() {
                    this.x = 0; // x position in mm
                    this.y = 0; // y position in mm
                    this.z = 0; // z position in mm
                    this.e = 0; //filament position in mm

                    this.targetX = 0; // x position in mm
                    this.targetY = 0; // y position in mm
                    this.targetZ = 0; // z position in mm
                    this.targetE = 0; //filament position in mm

                    this.lastSpeed = -1.0;

                    this.travelSpeed = { 'x': 5, 'y': 5, 'z': 0 }; // in mm/s

                    this.currentRetraction = 0; // length currently retracted
                    this.retractLength = 2; // in mm - amount to retract after extrusion
                    this.retractSpeed = 30; //mm/s

                    // TODO: use Quarternions for axis/angle: https://github.com/infusion/Quaternion.js

                    // or this.travelSpeed = { "direction": 30, "angle": [0,30,0] }; // in mm/s

                    // TODO: not sure about this being valid - maybe check for max speed?
                    this._printSpeed = Printer.defaultPrintSpeed;
                    this._model = Printer.UM2plus; // default
                    this.layerHeight = 0.2; // thickness of a 3d printed extrudion, mm by default
                    this.mode = -1; // 0 is absolute, 1 is relative (temporarily).  -1 forces reset
                }

                //
                // set printer model - should be one definined in this class!
                //
                set model(m) {
                    // TODO: check valid model
                    this._model = m;
                    // if invalid, throw exception
                }
                get model() { return this._model; }

                set printSpeed(s) {
                    let maxs = Printer.maxPrintSpeed[this._model];
                    this._printSpeed = Math.min(s, parseInt(maxs.x)); // pick in x direction...
                }

                get printSpeed() { return this._printSpeed; }

                /**
                 * extrude from the printer head, withing bounds
                 * @param {Object} params Parameters dictionary containing either x,y,z keys or direction/angle (radians) keys.
                 *      Optional bounce (Boolean) key if movement should bounce off sides.
                 */
                extrudeto(params) {
                    let __x = (params.x !== undefined) ? params.x : this.x;
                    let __y = (params.y !== undefined) ? params.y : this.y;
                    let __z = (params.z !== undefined) ? params.z : this.z;

                    __x = parseFloat(__x);
                    __y = parseFloat(__y);
                    __z = parseFloat(__z);

                    let _speed = parseFloat((params.speed !== undefined) ? params.speed : this.printSpeed);
                    let _layerHeight = parseFloat((params.thickness !== undefined) ? params.thickness : this.layerHeight);

                    this.printSpeed = _speed;

                    //
                    let onlyMove = (this.e == params.e);
                    let extrusionSpecified = !onlyMove && (params.e !== undefined);

                    console.log(onlyMove);

                    // TODO: handle *bounce* (much more complicated!)

                    // clip to printer size for safety
                    //console.log(Printer.bedSize);
                    //console.log(this.model);

                    let _bedSize = Printer.bedSize[this.model];
                    __x = Math.min(__x, _bedSize["x"]);
                    __y = Math.min(__y, _bedSize["y"]);
                    __z = Math.min(__z, _bedSize["z"]);

                    let dx = this.x - __x;
                    let dy = this.y - __y;
                    let dz = this.z - __z;
                    let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    let moveTime = dist / _speed; // in sec

                    console.log("time: " + moveTime + " / dist:" + dist);
                    let nozzleSpeed = {};
                    nozzleSpeed.x = dx / moveTime;
                    nozzleSpeed.y = dy / moveTime;
                    nozzleSpeed.z = dz / moveTime;

                    // sanity check:
                    //let speedCheck = Math.sqrt(nozzleSpeed.x * nozzleSpeed.x + nozzleSpeed.y * nozzleSpeed.y + nozzleSpeed.z * nozzleSpeed.z);
                    //console.log("speed check: " + speedCheck + "/" + _speed);

                    // TODO: check for maximum speed!

                    //  nozzle_speed{mm/s} = (radius_filament^2) * PI * filament_speed{mm/s} / layer_height^2

                    //  filament_speed{mm/s} = layer_height^2 * nozzle_speed{mm/s}/(radius_filament^2)*PI
                    this.targetE = this.e;

                    if (!onlyMove) // only if we need to move
                    {
                        if (extrusionSpecified)
                        {
                            // if filament length was specified, use that.
                            // Otherwise calculate based on layer height
                            this.targetE = parseFloat(params.e); // TODO: not sure if this is good idea yet)

                        }
                        // otherwise, calculate filament length needed based on layerheight, etc.
                        else
                        {
                            let filamentRadius = Printer.filamentDiameter[this.model] / 2;

                            // for extrusion into free space
                            // apparently, some printers take the filament into account (so this is in mm3)
                            // this was helpful: https://github.com/Ultimaker/GCodeGenJS/blob/master/js/gcode.js
                            let filamentLength = dist*_layerHeight*_layerHeight;//(Math.PI*filamentRadius*filamentRadius);

                            if (!Printer.extrusionInmm3[this.model]) {
                                filamentLength /= (filamentRadius * filamentRadius * Math.PI);
                            }

                            let filamentSpeed = filamentLength / moveTime;

                            console.log("filament speed: " + filamentSpeed);
                            console.log("filament distance : " + filamentLength + "/" + dist);
                            //console.log("e type=" + typeof this.e);

                            this.targetE = this.e + filamentLength;
                            //console.log("E:" + this.targetE);
                        }
                    }

                    // update target position for printer head, to send as gcode
                    this.targetX = __x.toFixed(4);
                    this.targetY = __y.toFixed(4);
                    this.targetZ = __z.toFixed(4);



                    // TODO:
                    // schedule callback function to update state variables like layerheight,
                    // etc? But, query printer for physical vars

                    // gcode to send to printer
                    // https://github.com/Ultimaker/Ultimaker2Marlin

                    if (this.mode != 0) {
                        // mode change
                        this.mode = 0;
                        sendGCode("G90"); // abs coordinates
                    }

                    //unretract first if needed
                    if (!onlyMove && this.currentRetraction)
                    {
                        this.targetE += this.currentRetraction;
                        // account for previous retraction
                        sendGCode("G1 " + "E" + (this.currentRetraction+this.e).toFixed(4)+ " F" + this.retractSpeed*60);
                        this.currentRetraction = 0;
                    }

                    // G1 - Coordinated Movement X Y Z E
                    let moveCode = ["G1"];
                    moveCode.push("X" + this.targetX);
                    moveCode.push("Y" + this.targetY);
                    moveCode.push("Z" + this.targetZ);
                    moveCode.push("E" + this.targetE.toFixed(4));
                    moveCode.push("F" + this.printSpeed*60); // mm/min as opposed to seconds
                    sendGCode(moveCode.join(" "));

                    // RETRACT
                    if (!onlyMove && this.retractLength)
                    {
                        this.currentRetraction = this.retractLength;
                        this.targetE = parseFloat(this.targetE) - this.currentRetraction;

                        sendGCode("G1 " + "E" + this.targetE.toFixed(4) + " F" + this.retractSpeed*60);
                    }
                    // FIXME: sort out position updates in a sensible way...
                    //queueGCode("M114"); // get position after move (X:0 Y:0 Z:0 E:0)

                    this.e = parseFloat(this.targetE);
                    this.x = parseFloat(this.targetX);
                    this.y = parseFloat(this.targetY);
                    this.z = parseFloat(this.targetZ);
                } // end extrudeto

                //
                // relative extrusion
                //
                extrude(params) {
                    let __x = (params.x !== undefined) ? params.x : 0;
                    let __y = (params.y !== undefined) ? params.y : 0;
                    let __z = (params.z !== undefined) ? params.z : 0;

                    // make relative
                    __x = this.x + parseFloat(__x);
                    __y = this.y + parseFloat(__y);
                    __z = this.z + parseFloat(__z);

                    params.x = __x;
                    params.y = __y;
                    params.z = __z;

                    if (params.e !== undefined) params.e = (parseFloat(params.e)+this.e);
                    //console.log(params);

                    this.extrudeto(params);
                } // end extrudeto

                // PRINTER API
                // relative movement
                //
                move(params) {
                    params.e = 0; // no filament extrusion
                    this.extrude(params);
                } // end move

                // PRINTER API
                // abs movement
                //
                moveto(params) {
                    params.e = this.e; // keep filament at current position
                    this.extrudeto(params);
                 } // end moveto

                // end Printer class
            };


            // TODO: this is dumb.  SHould be in another data model class called "printer model"

            // supported printers
            Printer.UM2 = "UM2";
            Printer.UM2plus = "UM2plus";
            Printer.UM3 = "UM3";
            Printer.REPRAP = "REP";

            Printer.PRINTERS = [Printer.UM2, Printer.UM3, Printer.REPRAP];

            // dictionary of first GCODE sent to printer at start
            Printer.GCODE_HEADERS = {
                UM2: [
                    ";FLAVOR:UltiGCode",
                    ";TIME:1",
                    ";MATERIAL:1",
                ],
                UM2plus: [
                    ";FLAVOR:UltiGCode",
                    ";TIME:1",
                    ";MATERIAL:1",
                ],
                UM3: [
                    ";START_OF_HEADER",
                    ";HEADER_VERSION:0.1",
                    ";FLAVOR:Griffin",
                    ";GENERATOR.NAME:GCodeGenJS",
                    ";GENERATOR.VERSION:?",
                    ";GENERATOR.BUILD_DATE:2016-11-26",
                    ";TARGET_MACHINE.NAME:Ultimaker Jedi",
                    ";EXTRUDER_TRAIN.0.INITIAL_TEMPERATURE:200",
                    ";EXTRUDER_TRAIN.0.MATERIAL.VOLUME_USED:1",
                    ";EXTRUDER_TRAIN.0.NOZZLE.DIAMETER:0.4",
                    ";BUILD_PLATE.INITIAL_TEMPERATURE:0",
                    ";PRINT.TIME:1",
                    ";PRINT.SIZE.MIN.X:0",
                    ";PRINT.SIZE.MIN.Y:0",
                    ";PRINT.SIZE.MIN.Z:0",
                    ";PRINT.SIZE.MAX.X:215",
                    ";PRINT.SIZE.MAX.Y:215",
                    ";PRINT.SIZE.MAX.Z:200",
                    ";END_OF_HEADER",
                    "G92 E0",
                ],
                REPRAP: [
                    ";RepRap target",
                    "G28",
                    "G92 E0",
                ]
            };

            Printer.filamentDiameter = { UM2: 2.85, UM2plus: 2.85, UM3: 2.85, REPRAP: 2.85 };
            Printer.extrusionInmm3 = { UM2: false, UM2plus: true, UM3: true, REPRAP: false };

            // TODO: FIX THESE!
            // https://ultimaker.com/en/products/ultimaker-2-plus/specifications

            // TODO: check these: there are max speeds for each motor (x,y,z,e)

            Printer.maxTravelSpeed = {
                UM2plus: { 'x': 300, 'y': 300, 'z': 80, 'e': 45 },
                UM2: { 'x': 300, 'y': 300, 'z': 80, 'e': 45 },
                UM3: { 'x': 300, 'y': 300, 'z': 80, 'e': 45 },
                REPRAP: { 'x': 300, 'y': 300, 'z': 80, 'e': 45 }
            };

            Printer.maxPrintSpeed = {
                UM2: { 'x': 150, 'y': 150, 'z': 80 },
                'UM2plus': { 'x': 150, 'y': 150, 'z': 80 },
                UM3: { 'x': 150, 'y': 150, 'z': 80 },
                REPRAP: { 'x': 150, 'y': 150, 'z': 80 }
            };

            Printer.bedSize = {
                UM2: { 'x': 223, 'y': 223, 'z': 205 },
                UM2plus: { 'x': 223, 'y': 223, 'z': 305 },
                UM3: { 'x': 223, 'y': 223, 'z': 205 },
                REPRAP: { 'x': 150, 'y': 150, 'z': 80 }
            };

            Printer.defaultPrintSpeed = 50; // mm/s

            //////////////////////////////////////////////////////////

            function clearError() {
                document.getElementById("code-errors").innerHTML = "<p>...</p>";
            }

            //
            // needs to be global so scripts can call this when run
            //
            window.doError = function(e) {
                // report to user
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SyntaxError
                document.getElementById("code-errors").innerHTML = "<p>" + e.name + ": " + e.message + "(line:" + e.lineNumber + ")</p>";
                /*
                console.log("SyntaxError? " + (e instanceof SyntaxError)); // true
                console.log(e); // true
                console.log("SyntaxError? " + (e instanceof SyntaxError)); // true
                console.log("ReferenceError? " + (e instanceof ReferenceError)); // true
                console.log(e.message);                // "missing ; before statement"
                console.log(e.name);                   // "SyntaxError"
                console.log(e.fileName);               // "Scratchpad/1"
                console.log(e.lineNumber);             // 1
                console.log(e.columnNumber);           // 4
                console.log(e.stack);                  // "@Scratchpad/1:2:3\n"
                */

                // this sucked because of coding... jst highlight instead!
                /*
                if (e.lineNumber) {
                    // remember that syntax errors start at line 1 which is line 0 in CodeMirror!
                    CodeEditor.setSelection({ line: (e.lineNumber-1), ch: e.columnNumber }, { line: (e.lineNumber-1), ch: (e.columnNumber + 1) });
                }
                */
            };

            $("#codeform").on("submit", function () {
                runCode();
                return false;
            });

            // set up things...
            var printer = new Printer();

            // handler for JSON-RPC calls from server
            printer.jsonrpcListener = {
                "position": function (params) {
                    console.log("position:");
                    console.log(params);
                    printer.x = parseFloat(params.x);
                    printer.y = parseFloat(params.y);
                    printer.z = parseFloat(params.z);
                    printer.e = parseFloat(params.e);
                }
            };

            socketHandler.registerListener(printer.jsonrpcListener);

            $("#gcode").select();  // focus on code input
            socketHandler.start(); // start websockets

            var responseJSON = JSON.stringify({
                "jsonrpc": "2.0",
                "id": 4,
                "method": "response",
                "params": []
            });

            var waitingForResponse = false; // only ask for responses if we expect them?

            Scheduler.scheduleEvent({
                timeOffset: 80,
                func: function () {
                    //console.log(message_json);
                    if (socketHandler.socket.readyState === socketHandler.socket.OPEN) {
                        socketHandler.socket.send(responseJSON);
                    }
                },
                repeat: true
            });



            // temperature event handler
            var tempHandler = {
                'temperature': function (tempEvent) {
                console.log("temp event:");
                console.log(tempEvent);
                    let tmp = parseFloat(tempEvent.hotend).toFixed(2);
                    let target = parseFloat(tempEvent.hotend_target).toFixed(2);
                    // look for 10% diff, it's not very accurate...
                    if ((Math.abs(tmp-target)/target) < 0.10) {
                    let gcodeString = "";
                        for (var i=1; i<5; i++)
                    {
                            gcodeString +='M300 P200 S' + i*220+'\n';
                    }
                    sendGCode(gcodeString);
                    }
                }
            };
            socketHandler.registerListener(tempHandler);


            // temperature event handler
            var errorHandler = {
                'error': function (event) {
                    //console.log("error event:");
                    //console.log(event);
                    $("#errors > ul").append("<li>" + (new Date(event.time)).toDateString() + ": " + event.message + "</li>").css("background-color", "red");
                }
            };
            socketHandler.registerListener(errorHandler);

            // temperature event handler
            var infoHandler = {
                'info': function (event) {
                    //console.log("error event:");
                    //console.log(event);
                    $("#info > ul").append("<li>" + (new Date()).toDateString() + ": " + event.message + "</li>").css("background-color", "red");
                },
                'resend': function (event) {
                    //console.log("error event:");
                    //console.log(event);
                    $("#info > ul").append("<li>" + (new Date()).toDateString() + ": " + event.message + "</li>").css("background-color", "orange");
                }
            };


            socketHandler.registerListener(infoHandler);

            // temperature event handler
            var commandHandler = {
                'gcode': function (event) {
                    //console.log("error event:");
                    //console.log(event);
                    $("#commands > ul").append("<li>" + (new Date(event.time)).toDateString() + ": " + event.message + "</li>").css("background-color", "green");
                }
            };

            socketHandler.registerListener(commandHandler);

            // temperature event handler
            var okHandler = {
                'ok': function (event) {
                    //console.log("error event:");
                    //console.log(event);
                    if (outgoingQueue.length > 0)
                    {
                        let msg = outgoingQueue.pop();
                        socketHandler.socket.send(msg);
                    }
                }
            };

            socketHandler.registerListener(okHandler);


            // TODO: temp probe that gets scheduled every 300ms and then removes self when
            // tempHandler called

            // update printing API to share with running script
            scope.printer = printer;
            scope.scheduler = Scheduler;
            scope.socket = socketHandler;
            scope.sendGCode = sendGCode;


            function globalEval(code, line) {
                clearError();
                code = jQuery.trim(code);
                console.log(code);
                if (code) {

                    // give quick access to liveprinter API
                    code = "let lp = window.scope.printer;" + code;
                    code = "let sched = window.scope.scheduler;" + code;
                    code = "let socket = window.scope.socket;" + code;
                    code = "let gcode = window.scope.sendGCode;" + code;

                    // wrap code in anonymous function to avoid redeclaring scope variables and
                    // scope bleed.  For global functions that persist, use lp scope

                    // error handling
                    code = 'try {' + code;
                    code = code + '} catch (e) { e.lineNumber=line;doError(e); }';

                    code = "let line =" + line + ";" + code;

                    // function wrapping
                    code = '(function(){"use strict";' + code;
                    code = code + "})();";

                    console.log("adding code:" + code);
                    let script = document.createElement("script");
                    script.text = code;
                    /*
                     * NONE OF THIS WORKS IN CHROME... should be aesy, but no.
                     *
                    let node = null;
                    script.onreadystatechange = script.onload = function () {
                        console.log("loaded");
                        node.printer = printer;
                        node.scheduler = Scheduler;
                        node.socket = socketHandler;

                        node.parentNode.removeChild(script);
                        node = null;
                    };
                    script.onerror = function (e) { console.log("script error:" + e) };

                    node = document.head.appendChild(script);
                    */
                    // run and remove
                    document.head.appendChild(script).parentNode.removeChild(script);
                }
            }
        })();
    });
})();
