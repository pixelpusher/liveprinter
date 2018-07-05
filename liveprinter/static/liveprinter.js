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

        
        var Scheduler = {
            ScheduledEvents: [],
            audioContext: new AudioContext(),
            schedulerInterval: 1000,
            timerID: null,

            /*
            * arguments properties:
            * timeOffset: ms offset to schedule this for
            * func: function
            * repeat: true/false whether to reschedule
            */
            scheduleEvent: function(args)
            {
                Scheduler.ScheduledEvents.push({
                    'time': (Scheduler.audioContext.currentTime+args.timeOffset), 
                    'timeOffset': args.timeOffset,
                    'func': args.func,
                    'repeat': args.repeat,
                    });
            },

            startScheduler: function() {
                console.log("scheduler starting at time: " + Scheduler.audioContext.currentTime);

                function scheduler(nextTime){
                    let time = Scheduler.audioContext.currentTime;
                    let i=0;
                    // run events -- this could be done better with map/filter
                    if (Scheduler.ScheduledEvents) 
                    while (i < Scheduler.ScheduledEvents.length && Scheduler.ScheduledEvents.length > 0)
                    {
                        //console.log("processing events at time " + time);
                        event = Scheduler.ScheduledEvents[0];
                        //console.log(event);
                        if (event.time >= time)
                        {
                            //console.log("running event at time:" + time);
                            event.func(time);
                            Scheduler.ScheduledEvents.shift();
                            if (event.repeat)
                            {
                                Scheduler.scheduleEvent(event);
                            }
                        }
                        i++;
                    }
                    
                    // run it again
                    Scheduler.timerID = setTimeout(scheduler, Scheduler.schedulerInterval, time+Scheduler.schedulerInterval);
                }
                Scheduler.timerID = setTimeout(scheduler, Scheduler.schedulerInterval, Scheduler.schedulerInterval);
            }
        }

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
        var CodeEditor = CodeMirror.fromTextArea(document.getElementById("gcode_input"), {
            lineNumbers: true,
            styleActiveLine: true,
            lineWrapping: true,
            mode: "htmlmixed",
            extraKeys: {
                "Ctrl-Enter": ed_trigger,
                "Cmd-Enter": ed_trigger,
            }
        });
        CodeEditor.on('change', function (editor, changeObj) {
            // info
            //for (var p in changeObj)
            //    console.log("change[" + p + "]=" + changeObj[p]);

            // check syntax
            if (changeObj["text"] || changeObj["removed"]) {
                clearError();
                parseCode();
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

        function sendGCode(text) {
            let gcode = text;
            if (typeof gcode == 'string') gcode = [ stripComments(gcode) ];

            if (typeof gcode == 'object' && Array.isArray(gcode))
            {
                let message = {
                    'jsonrpc': '2.0',
                    'id': 1,
                    'method': 'gcode',
                    'params': gcode,
                };

                let message_json = JSON.stringify(message);
                // debugging
                console.log(message_json);

                socketHandler.socket.send(message_json);
            }
            else throw new Error("invalid gcode in sendGCode[" + typeof text+"]:" + text);
        }

 
        function newMessage(form) {
            var line = CodeEditor.getLine(CodeEditor.getCursor().line)
    
            console.log("trigger", line);
        
            sendGCode(line);
        }

        var socketHandler = {
            socket: null,

            start: function () {
                var url = "ws://" + location.host + "/json";
                this.socket = new WebSocket(url);
                console.log('opening socket');
                socketHandler.socket.onmessage = function (event) {
                    socketHandler.showMessage(JSON.parse(event.data));
                }

                // runs when printer connection is established via websockets
                socketHandler.socket.onopen = function()
                {
                    
                    // TEST
                    // printer.extrude({
                    //     'x': 20,
                    //     'y': 30,
                    //     'z': 10,
                    // });

                    sendGCode("G92");
                    sendGCode("G28");

                    document.getElementById("info").innerHTML = "PRINTER CONNECTED";
                }
            },

            showMessage: function (message) {
                var existing = $("#m" + message.id);
                if (existing.length > 0) return;
                var node = $(message.html);
                node.hide();
                $("#inbox").append(node);
                node.slideDown();
            }
        };


        // CodeMirror stuff

        var WORD = /[\w$]+/g, RANGE = 500;

        CodeMirror.registerHelper("hint", "anyword", function (editor, options) {
            var word = options && options.word || WORD;
            var range = options && options.range || RANGE;
            var cur = editor.getCursor(), curLine = editor.getLine(cur.line);
            var start = cur.ch, end = start;
            while (end < curLine.length && word.test(curLine.charAt(end)))++end;
            while (start && word.test(curLine.charAt(start - 1)))--start;
            var curWord = start != end && curLine.slice(start, end);

            var list = [], seen = {};
            function scan(dir) {
                var line = cur.line, end = Math.min(Math.max(line + dir * range, editor.firstLine()), editor.lastLine()) + dir;
                for (; line != end; line += dir) {
                    var text = editor.getLine(line), m;
                    word.lastIndex = 0;
                    while (m = word.exec(text)) {
                        if ((!curWord || m[0].indexOf(curWord) == 0) && !seen.hasOwnProperty(m[0])) {
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


        //// FIXME



        /**
         * JS-Interpreter stuff (modified from https://github.com/NeilFraser/JS-Interpreter)
         * 
         * */
        var myInterpreter;

        function initFuncs(interpreter, scope) {
            var wrapper = function (text) {
                return alert(arguments.length ? text : '');
            };
            interpreter.setProperty(scope, 'alert',
                interpreter.createNativeFunction(wrapper));

            wrapper = function (text) {
                sendGCode(text);
                console.log("sent gcode: " + text)
            };
            interpreter.setProperty(scope, 'gcode',
                interpreter.createNativeFunction(wrapper));

            wrapper = function (props) {
                // can't send objects back and forth, need to copy property primitives
                let _props = {};
                for (var key in props)
                {
                    _props[key] = props[key]; 
                }
                printer.extrude(_props);
                console.log("extrude:");
                console.log(props);
            };
            interpreter.setProperty(scope, 'extrude',
                interpreter.createNativeFunction(wrapper));
    
                //printer.extrude({
                    //     'x': 20,
                    //     'y': 30,
                    //     'z': 10,
                    // });

            /// TODO: API LINKING
            // These are just copied in
            //var strFunctions = [
            //    [escape, 'escape'], [unescape, 'unescape'],
            //    [decodeURI, 'decodeURI'], [decodeURIComponent, 'decodeURIComponent'],
            //    [encodeURI, 'encodeURI'], [encodeURIComponent, 'encodeURIComponent']
            //];
            //for (var i = 0; i < strFunctions.length; i++) {
            //    var wrapper = (function (nativeFunc) {
            //        return function (str) {
            //            try {
            //                return nativeFunc(str);
            //            } catch (e) {
            //                // decodeURI('%xy') will throw an error.  Catch and rethrow.
            //                thisInterpreter.throwException(thisInterpreter.URI_ERROR, e.message);
            //            }
            //        };
            //    })(strFunctions[i][0]);
            //    this.setProperty(scope, strFunctions[i][1],
            //        this.createNativeFunction(wrapper, false),
            //        Interpreter.NONENUMERABLE_DESCRIPTOR);
            //}



        }

      

        // dictionary of basic properties about the physical printer like speeds, dimensions, extrusion settings
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

                // TODO: use Quarternions for axis/angle: https://github.com/infusion/Quaternion.js

                // or this.travelSpeed = { "direction": 30, "angle": [0,30,0] }; // in mm/s

                // TODO: not sure about this being valid - maybe check for max speed?
                this._printSpeed = Printer.defaultPrintSpeed;
                this._model = Printer.UM2plus; // default
                this.layerHeight = 0.2; // thickness of a 3d printed extrudion, mm by default


                /*
        this.extrusion_per_mm_movement = width * height;
        this.extrusion_per_mm__z_movement = Math.PI * (width / 2) * (width / 2);
        if (!this.extrusion_in_mm3) {
            var radius = this.filament_diameter / 2.0;
            this.extrusion_per_mm_movement /= Math.PI * radius * radius;
            this.extrusion_per_mm__z_movement /= Math.PI * radius * radius;
        }
        */



        /*
        var distance__xy = Math.sqrt((x - this.x) * (x - this.x) + (y - this.y) * (y - this.y));
        var distance__z = z - this.z;
        this.e += distance__xy * this.extrusion_per_mm_movement;
        */

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
                this._printSpeed = Math.min(s, this._maxPrintSpeed[this._model]);
            }

            get printSpeed() { return this._printSpeed; }

            /**
             * Move the printer head, withing bounds
             * @param {Object} params Parameters dictionary containing either x,y,z keys or direction/angle (radians) keys.
             *      Optional bounce (Boolean) key if movement should bounce off sides.
             */
            move (params) {
                let __x = params.x || this.targetX;
                let __y = params.y || this.targetY;
                let __z = params.z || this.targetZ;
                let _speed = params.speed || this.printSpeed;

                // TODO: handle bounce (much more complicated!)

                // clip to printer size for safety
                let _bedSize = Printer.bedSize[this._model];
                __x = Math.min(__x, _bedSize["x"]);
                __y = Math.min(__y, _bedSize["y"]);
                __z = Math.min(__z, _bedSize["z"]);

                let dx = this.x - __x;
                let dy = this.y - __y;
                let dz = this.y - __z;
                let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                // TODO: calculate time to move...

                // RETURN GCODE for move as array of strings
            }

            extrude(params) {
                let __x = params.x || this.targetX;
                let __y = params.y || this.targetY;
                let __z = params.z || this.targetZ;
                
                let _speed = params.speed || this.printSpeed;
                let _layerHeight = params.thickness || this.layerHeight;

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

                if (params.e)
                {
                    // if filament length was specified, use that.
                    // Otherwise calculate based on layer height
                    this.targetE = params.e; // TODO: not sure if this is good idea yet)
                }
                // otherwise, calculate filament length needed based on layerheight, etc.
                else 
                {
                    let filamentRadius = Printer.filamentDiameter[this.model] / 2;
                        
                    // for extrusion into free space
                    // apparently, some printers take the filament into account (so this is in mm3)
                    // this was helpful: https://github.com/Ultimaker/GCodeGenJS/blob/master/js/gcode.js
                    let filamentLength = dist * Math.PI * (_layerHeight / 2) * (_layerHeight / 2)
                    if (!Printer.extrusionInmm3[this.model]) {
                        filamentLength /= (filamentRadius * filamentRadius * Math.PI);
                    }

                    let filamentSpeed = filamentLength / moveTime;

                    //console.log("filament speed: " + filamentSpeed);
                    //console.log("filament distance : " + filamentLength + "/" + dist);
                    
                    this.targetE = this.e + filamentLength;
                }
                // update target position for printer head, to send as gcode
                this.targetX = __x;
                this.targetY = __y;
                this.targetZ = __z;

                // TODO: 
                // schedule callback function to update state variables like layerheight, 
                // etc? But, query printer for physical vars
                
                // gcode to send to printer
                // https://github.com/Ultimaker/Ultimaker2Marlin
                let gcode = [];

                gcode.push("G90"); // abs coordinates
                // G1 - Coordinated Movement X Y Z E
                let moveCode = ["G1"];
                moveCode.push("X"+this.targetX.toFixed(4));
                moveCode.push("Y"+this.targetY.toFixed(4));
                moveCode.push("Z"+this.targetZ.toFixed(4));
                moveCode.push("E"+this.targetE.toFixed(4));
                gcode.push(moveCode.join(" "));

                gcode.push("M114"); // get position after move (X:0 Y:0 Z:0 E:0)

                try {
                    console.log("sending gcode: " + gcode)
                    sendGCode(gcode);
                }
                catch (e)
                {
                    // TODO: this goes in HTML
                    console.log("Error in extrude: " + e.message + "\n" + e.stack)
                }
            }
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
        Printer.extrusionInmm3 = { UM2: true, UM2plus: true, UM3: false, REPRAP: false };

            // TODO: FIX THESE!
            // https://ultimaker.com/en/products/ultimaker-2-plus/specifications

            // TODO: check these: there are max speeds for each motor (x,y,z,e)

        Printer.maxTravelSpeed = {
            UM2plus: { 'x': 300, 'y': 300, 'z': 80, 'e': 45 },
            UM2: { 'x': 300, 'y': 300, 'z': 80, 'e': 45 },
            UM3: { 'x': 300, 'y': 300, 'z': 80, 'e': 45 },
            REPRAP: { 'x': 300, 'y': 300, 'z': 80, 'e': 45 },
        };

        Printer.maxPrintSpeed = {
            UM2: { 'x': 150, 'y': 150, 'z': 80 },
            UM2plus: { 'x': 150, 'y': 150, 'z': 80 },
            UM3: { 'x': 150, 'y': 150, 'z': 80 },
            REPRAP: { 'x': 150, 'y': 150, 'z': 80 },
        };

        Printer.bedSize = {
            UM2: { 'x': 223, 'y': 223, 'z': 205 },
            UM2plus: { 'x': 223, 'y': 223, 'z': 305 },
            UM3: { 'x': 223, 'y': 223, 'z': 205 },
            REPRAP: { 'x': 150, 'y': 150, 'z': 80 },
        };

        Printer.defaultPrintSpeed = 50; // mm/s

        //////////////////////////////////////////////////////////

        function clearError() {
            document.getElementById("errors").innerHTML = "<p>...</p>";
        }

        function doError(e) {
            // report to user
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SyntaxError
            document.getElementById("errors").innerHTML = "<p>" + e.name + ":" + e.message + "(line:" + e.lineNumber + " / col: " + e.columnNumber + "</p>";
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
        }
        function parseCode() {
            var code = CodeEditor.getSelection();

            if (!code) {
                // info level
                console.log("no selections");
                code = CodeEditor.getValue();
            }
            try {
                myInterpreter = new Interpreter(code, initFuncs);
            } catch (e) {
                doError(e);
            }
            disable('');
        }

        function stepCode() {
            if (myInterpreter.stateStack.length) {
                var node =
                    myInterpreter.stateStack[myInterpreter.stateStack.length - 1].node;
                var start = node.start;
                var end = node.end;
            } else {
                var start = 0;
                var end = 0;
            }
            console.log("start:" + start + " end:" + end);

            CodeEditor.setSelection({ line: start, ch: 0 }, { line: end, ch: 0 });
            
            try {
                var ok = myInterpreter.step();

            } catch (e) {
                doError(e);
            } finally {
                if (!ok) {
                    disable('disabled');
                }
            }
        }

        function runCode() {
            disable('disabled');
            var code = CodeEditor.getSelection();

            // parse first

            var validCode = true;

            if (!code) {
                // info level
                console.log("no selections");
                code = CodeEditor.getValue();
            }
            try {
                myInterpreter = new Interpreter(code, initFuncs);
            } catch (e) {
                doError(e);
                validCode = false;
            }
            // run code
            if (validCode) {
                try {
                    myInterpreter.run();
                } catch (e) {
                    doError(e);
                }
            }
        }

        function disable(disabled) {
            document.getElementById('stepButton').disabled = disabled;
            document.getElementById('runButton').disabled = disabled;
        }

        document.getElementById("stepButton").onclick = stepCode;
        document.getElementById("runButton").onclick = runCode;


        $("#gcodeform").on("submit", function () {
            newMessage($(this));
            return false;
        });

        // set up things...
        var printer = new Printer();

        $("#gcode").select();  // focus on code input
        socketHandler.start(); // start websockets
    });
})();