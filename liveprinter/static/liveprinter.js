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

// import vector functions - doesn't work in chrome ?
//import { Vector } from './lib/Vector.prototype.js';


(function () {
    "use strict";

    $.when($.ready).then(function () {
        if (!window.console) window.console = {};
        if (!window.console.log) window.console.log = function () { };

        // dangerous?
        // need to pass to scripts somehow
        if (!window.scope) {
            window.scope = Object.create(null);
        }
        var scope = window.scope;
        scope.serialPorts = []; // available ports

        var outgoingQueue = []; // messages for the server

        var pythonMode = true;

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
                args.time = Scheduler.audioContext.currentTime;

                Scheduler.ScheduledEvents.push(args);
            },

            removeEvent: function (func) {
                // run events 
                Scheduler.ScheduledEvents = Scheduler.ScheduledEvents.filter(func);
            },

            removeEventByName: function (name) {
                // run events 
                Scheduler.ScheduledEvents = Scheduler.ScheduledEvents.filter(e => e.name != name);
            },

            startScheduler: function () {
                console.log("scheduler starting at time: " + Scheduler.audioContext.currentTime);

                function scheduler(nextTime) {
                    let time = Scheduler.audioContext.currentTime * 1000; // in ms

                    // run events 
                    Scheduler.ScheduledEvents.filter(
                        function (event) {
                            let keep = true;

                            if (event.time < time) {
                                //console.log("running event at time:" + time);
                                event.func(time);

                                if (event.repeat) {
                                    event.time = time + event.timeOffset;
                                    keep = true;
                                }
                                else {
                                    keep = false;
                                }
                            }
                            return keep;
                        });
                }

                Scheduler.timerID = window.setInterval(scheduler, Scheduler.schedulerInterval);
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

        var compileCode = function (ed) {
            // changeFunc(CodeEditor);
            runCode();
            blinkElem($("form"));
            // reloadSession();
        };

        // start CodeMirror
        var CodeEditor = CodeMirror.fromTextArea(document.getElementById("code-editor"), {
            lineNumbers: true,
            scrollbarStyle: "simple",
            styleActiveLine: true,
            lineWrapping: true,
            //autocomplete: true,
            extraKeys: {
                "Ctrl-Enter": compileCode,
                "Cmd-Enter": compileCode,
                "Ctrl-Space": "autocomplete",
                "Ctrl-Q": function(cm){ cm.foldCode(cm.getCursor()); }
            },
            foldGutter: true,
            autoCloseBrackets: true
        });

        var setLanguageMode = () => {
            if (pythonMode) {
                CodeEditor.setOption("mode", "text/x-python");
                CodeEditor.setOption("lint", true);
                CodeEditor.setOption("gutters", ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]);
            } else {
                CodeEditor.setOption("mode", "javascript");
                CodeEditor.setOption("lint", {
                    globalstrict: true,
                    strict: false,
                    esversion: 6
                });
                CodeEditor.setOption("gutters", ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "CodeMirror-foldgutter"]);
            }
        };

        //
        // build examples loader links for dynamically loading example files
        //
        let exList = $("#examples-list > .dropdown-item").not("[id*='session']" );
        exList.on("click", function() {
            let me = $(this);
            let filename = me.data("link");
            clearError(); // clear loading errors
            var jqxhr = $.ajax( {url: filename, dataType:"text" })
                .done(function(content) {
                    let newDoc = CodeMirror.Doc(content, "javascript");
                    blinkElem($(".CodeMirror"), "slow", () => CodeEditor.swapDoc(newDoc));
                })
                .fail(function() {
                    doError({name:"error", message:"file load error:"+filename});
                });
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


        function codeToJSON(gcode) {
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
                globalEval(code, cursor.line + 1);
            } catch (e) {
                doError(e);
            }
        }


        var updateTemperature = function (state) {

            if (state) {
                // schedule temperature updates every little while
                Scheduler.scheduleEvent({
                    name: "tempUpdates",
                    timeOffset: 5000,
                    func: function (time) {
                        if (socketHandler.socket.readyState === socketHandler.socket.OPEN) {
                            sendGCode("M105");
                            //console.log("TEMP: " + new Date());
                        }
                    },
                    repeat: true
                });
            } else {
                // stop updates
                Scheduler.removeEventByName("tempUpdates");
            }
        };

        /**
            * Handle websockets communications
            * and event listeners
            * 
            */
        var socketHandler = {
            socket: null, //websocket
            listeners: [], // listeners for json rpc calls

            start: function () {
                $("#info > ul").empty();
                $("#errors > ul").empty();
                $("#commands > ul").empty();
                var url = "ws://" + location.host + "/json";
                this.socket = new WebSocket(url);
                console.log('opening socket');
                    
                this.socket.onmessage = function (event) {
                    //console.log(event.data);
                    let jsonRPC = JSON.parse(event.data);
                    //console.log(jsonRPC);
                    socketHandler.handleJSONRPC(jsonRPC);
                    socketHandler.showMessage(event.data);
                };

                // runs when printer connection is established via websockets
                this.socket.onopen = function () {
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
                    $("#info").prepend(node);
                    node.slideDown();
    
                    let message = {
                        'jsonrpc': '2.0',
                        'id': 6,
                        'method': 'get-serial-ports',
                        'params': [],
                    };
                    let message_json = JSON.stringify(message);                    
                    this.send(message_json);
                };
            },

            showMessage: function (message) {
                var existing = $("#m" + message.id);
                if (existing.length > 0) return;
                var node = $(message.html);
                node.hide();
                $("#inbox").prepend(node);
                node.slideDown();
            },

            handleError: function (errorJSON) {
                // TODO:
                console.log("JSON RPC ERROR: " + errorJSON);
                errorHandler.error({message: errorJSON});
            },

            handleJSONRPC: function (jsonRPC) {
                // call all listeners
                //console.log("socket:");
                //console.log(jsonRPC);
                this.listeners.map(listener => { if (listener[jsonRPC.method]) { listener[jsonRPC.method](jsonRPC.params); } });
            },

            //
            // add a listener to the queue of jsonrpc event listeners
            // must have a function for jsonrpc event method name which takes appropriate params json object
            registerListener: function (listener) {
                this.listeners.push(listener);
            },

            removeListener: function (listener) {
                this.listeners = this.listeners.filter(l => (l !== listener));
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
        // FUTURE NOTE: make this not a class but use object inheritance and prototyping
        //
        //
        class Printer {

            ///////
            // Printer API /////////////////
            ///////

            constructor() {
                // TODO: not sure about this being valid - maybe check for max speed?
                this._printSpeed = Printer.defaultPrintSpeed;
                this._model = Printer.UM2plus; // default
                this.layerHeight = 0.2; // thickness of a 3d printed extrudion, mm by default
                
                let coords = {
                    x: 0, // x position in mm
                    y: 0,// y position in mm
                    z: 0, // z position in mm
                    e: -99999
                }; //filament position in mm

                this.minPosition = new Vector(coords);

                coords = {
                    x: Printer.bedSize[this.model]["x"], // x position in mm
                    y: Printer.bedSize[this.model]["y"], // y position in mm
                    z: Printer.bedSize[this.model]["z"], // z position in mm
                    e: 999999
                }; //filament position in mm

                this.maxPosition = new Vector(coords);

                coords = {
                    x: this.minPosition.axes.x, // x position in mm
                    y: this.minPosition.axes.y, // y position in mm
                    z: this.minPosition.axes.z, // z position in mm
                    e: 0
                }; //filament position in mm

                this.position = new Vector(coords);

                this.lastSpeed = -1.0;

                this.maxFilamentPerOperation = 30; // safety check to keep from using all filament, in mm
                this.maxTimePerOperation = 10; // prevent very long operations, by accident - this is in seconds

                // NOTE: disabled for now to use hardware retraction settings
                this.currentRetraction = 0; // length currently retracted
                this.retractLength = 3; // in mm - amount to retract after extrusion
                this.retractSpeed = 300; //mm/s
                this.firmwareRetract = true;    // use Marlin or printer for retraction

                /**
                 * What to do when movement or extrusion commands are out of machine bounds.
                 * Can be clip (keep printing inside edges), bounce (bounce off edges), stop
                 */
                this.boundaryMode = "stop";

                this.maxMovePerCycle = 40; // max mm to move per calculation (see _extrude method)

                this.moveCallback = null;   // callback function run every move/extrude cycle

                // TODO: use Quarternions for axis/angle: https://github.com/infusion/Quaternion.js
                // or this.travelSpeed = { "direction": 30, "angle": [0,30,0] }; // in mm/s  
            }

            get x() { return this.position.axes.x; }
            get y() { return this.position.axes.y; }
            get z() { return this.position.axes.z; }
            get e() { return this.position.axes.e; }

            set x(val) { this.position.axes.x = val; }
            set y(val) { this.position.axes.y = val; }
            set z(val) { this.position.axes.z = val; }
            set e(val) { this.position.axes.e = val; }

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
                this._printSpeed = Math.min(parseFloat(s), parseFloat(maxs.x)); // pick in x direction...
            }

            get maxSpeed() { return Printer.maxPrintSpeed[this._model]; } // in mm/s

            get printSpeed() { return this._printSpeed; }

            get extents() {
                return this.maxPosition.axes;
            }

            /**
             * Get the center horizontal (x) position on the bed
             */
            get cx() {
                return (this.maxPosition.axes.x - this.minPosition.axes.x) / 2;
            }
            /**
             * Get the center vertical (y) position on the bed,
             */
            get cy() {
                return (this.maxPosition.axes.y - this.minPosition.axes.y) / 2;
            }
            /// maxmimum values
            get minx() {
                return this.minPosition.axes.x;
            }
            get miny() {
                return this.minPosition.axes.y;
            }
            get minz() {
                return this.minPosition.axes.z;
            }
            // maxmimum values
            get maxx() {
                return this.maxPosition.axes.x;
            }
            get maxy() {
                return this.maxPosition.axes.y;
            }
            get maxz() {
                return this.maxPosition.axes.z;
            }

            /**
             * Performs a quick startup by resetting the axes and moving the head
             * to printing position (layerheight)
             * 
             * @param {float} temp is the temperature to start warming up to
             */
            start(temp="190") {
                sendGCode("G28");
                sendGCode("M104 S" + temp);
                //set retract length
                sendGCode("M207 S3 F" + this.retractSpeed+" Z0.2");
                //set retract recover
                sendGCode("M208 S0.1 F" + this.retractSpeed +" 300");
                this.moveto({ x: this.cx, y: this.cy, z: this.layerHeight, speed: Printer.defaultPrintSpeed });
                sendGCode("M106 S100"); // set fan to full
            }

           /**
           * clip object's x,y,z properties to printer bounds and return it
           * @param {object} position: object with x,y,z properties clip
           */
            clipToPrinterBounds(position) {
                position.x = Math.min(position.x, this.maxx);
                position.y = Math.min(position.y, this.maxy);
                position.z = Math.min(position.z, this.maxz);

                // stop at min edges
                position.x = Math.max(position.x, this.minx);
                position.y = Math.max(position.y, this.miny);
                position.z = Math.max(position.z, this.minz);

                return position;
            }

            /**
            * extrude from the printer head, withing bounds
            * @param {Object} params Parameters dictionary containing either x,y,z keys or direction/angle (radians) keys.
            *      Optional bounce (Boolean) key if movement should bounce off sides.
            */
            extrudeto(params) {
                let extrusionSpecified = (params.e !== undefined);
                let retract = ((params.retract !== undefined) && params.retract);

                let __x = (params.x !== undefined) ? parseFloat(params.x) : this.x;
                let __y = (params.y !== undefined) ? parseFloat(params.y) : this.y;
                let __z = (params.z !== undefined) ? parseFloat(params.z) : this.z;
                let __e = (extrusionSpecified) ? parseFloat(params.e) : this.e;

                let newPosition = new Vector({ x: __x, y: __y, z: __z, e: __e });

                this.printSpeed = parseFloat((params.speed !== undefined) ? params.speed : this.printSpeed);
                this.layerHeight = parseFloat((params.thickness !== undefined) ? params.thickness : this.layerHeight);

                //////////////////////////////////////
                /// START CALCULATIONS      //////////
                //////////////////////////////////////

                let distanceVec = Vector.prototype.sub(newPosition, this.position);
                let distanceMag = distanceVec.mag();

                // FYI:
                //  nozzle_speed{mm/s} = (radius_filament^2) * PI * filament_speed{mm/s} / layer_height^2
                //  filament_speed{mm/s} = layer_height^2 * nozzle_speed{mm/s}/(radius_filament^2)*PI

                if (!extrusionSpecified) {
                    // otherwise, calculate filament length needed based on layerheight, etc.
                    let filamentRadius = Printer.filamentDiameter[this.model] / 2;

                    // for extrusion into free space
                    // apparently, some printers take the filament into account (so this is in mm3)
                    // this was helpful: https://github.com/Ultimaker/GCodeGenJS/blob/master/js/gcode.js
                    let filamentLength = distanceMag * this.layerHeight * this.layerHeight;//(Math.PI*filamentRadius*filamentRadius);

                    //
                    // safety check:
                    //
                    if (filamentLength > this.maxFilamentPerOperation) {
                        throw Error("Too much filament in move:" + filamentLength);
                    }
                    if (!Printer.extrusionInmm3[this.model]) {
                        filamentLength /= (filamentRadius * filamentRadius * Math.PI);
                    }

                    //console.log("filament speed: " + filamentSpeed);
                    //console.log("filament distance : " + filamentLength + "/" + dist);

                    distanceVec.axes.e = filamentLength;
                    newPosition.axes.e = this.e + distanceVec.axes.e;
                }

                let velocity = distanceVec.divSelf(distanceMag);
                let moveTime = distanceMag / this.printSpeed; // in sec, doesn't matter that new 'e' not taken into account because it's not in firmware
               

                console.log("time: " + moveTime + " / dist:" + distanceMag);

                //
                // BREAK AT LARGE MOVES
                //
                if (moveTime > this.maxTimePerOperation) {
                    throw Error("move time too long:" + moveTime);
                }

                let nozzleSpeed = (new Vector(distanceVec)).divSelf(moveTime);
                //
                // safety checks
                //
                if (nozzleSpeed.axes.x > this.maxSpeed["x"]) {
                    throw Error("X travel too fast:" + nozzleSpeed.x);
                }
                if (nozzleSpeed.axes.y > this.maxSpeed["y"]) {
                    throw Error("Y travel too fast:" + nozzleSpeed.y);
                }
                if (nozzleSpeed.axes.z > this.maxSpeed["z"]) {
                    throw Error("Z travel too fast:" + nozzleSpeed.z);
                }
                if (nozzleSpeed.axes.e > this.maxSpeed["e"]) {
                    throw Error("Z travel too fast:" + nozzleSpeed.z);
                }

                // Handle movements outside printer boundaries if there's a need.
                // Tail recursive.
                //
                //console.log(this);
                this._extrude(velocity, distanceMag, retract);
            } // end extrudeto

            /**
             * Send movement update GCode to printer based on current position (this.x,y,z).
             * 
             * @param {boolean} retract if true (default) add GCode for retraction/unretraction. Will use either hardware or software retraction if set in Printer object
             * */
            sendExtrusionGCode(retract = true) {
                //unretract first if needed
                if (!this.firmwareRetract && this.currentRetraction) {
                    this.e += this.currentRetraction;
                    // account for previous retraction
                    sendGCode("G1 " + "E" + this.e.toFixed(4) + " F" + this.retractSpeed.toFixed(4));
                    this.currentRetraction = 0;
                }
                // unretract
                if (this.firmwareRetract && this.currentRetraction > 0) { // ugh what an ungly check
                    sendGCode("G11");
                    this.currentRetraction = 0;
                }
                // G1 - Coordinated Movement X Y Z E
                let moveCode = ["G1"];
                moveCode.push("X" + this.x.toFixed(4));
                moveCode.push("Y" + this.y.toFixed(4));
                moveCode.push("Z" + this.z.toFixed(4));
                moveCode.push("E" + this.e.toFixed(4));
                moveCode.push("F" + (this.printSpeed * 60).toFixed(4)); // mm/s to mm/min
                sendGCode(moveCode.join(" "));

                // RETRACT
                if (retract && this.retractLength) {
                    if (this.firmwareRetract) {
                        sendGCode("G10");
                        this.currentRetraction = 3.5; // this is handled in hardware, just need to be > 0                        
                    } else {
                        this.currentRetraction = this.retractLength;
                        this.e -= this.currentRetraction;
                        sendGCode("G1 " + "E" + this.e.toFixed(4) + " F" + this.retractSpeed.toFixed(4));
                    }
                }
            } // end sendExtrusionGCode


            // TODO: have this chop up moves and call a callback function each time,
            // like in _extrude
            //             
            // call movement callback function with this lp object
            // if(that.moveCallback)
            //        that.moveCallback(that);

            /**
             * Relative extrusion.
             * @param {objects} params Can be specified as x,y,z,e or dist (distance), angle (xy plane), elev (z dir). All in mm.
             */
            extrude(params) {
                if (params.angle !== undefined && params.dist !== undefined) {
                    params.dist = parseFloat(params.dist);
                    params.angle = parseFloat(params.angle);
                    params.x = params.dist * Math.cos(params.angle);
                    params.y = params.dist * Math.sin(params.angle);
                    if (params.elev !== undefined) {
                        params.z = params.dist * Math.sin(parseFloat(params.elev));
                    }
                    params.e = (params.e !== undefined) ? parseFloat(params.e) + this.e : undefined;
                } else {
                    params.x = (params.x !== undefined) ? parseFloat(params.x) + this.x : 0;
                    params.y = (params.y !== undefined) ? parseFloat(params.y) + this.y : 0;
                    params.z = (params.z !== undefined) ? parseFloat(params.z) + this.z : 0;
                    params.e = (params.e !== undefined) ? parseFloat(params.e) + this.e : undefined;
                }
                this.extrudeto(params);
            }
            
            /**
             * Relative movement.
             * @param {any} params Can be specified as x,y,z,e or dist (distance), angle (xy plane), elev (z dir). All in mm.
             */
            move(params) {
                params.e = 0; // no filament extrusion
                params.retract = false;
                this.extrude(params);
            }

            /**
             * Absolute movement.
             * @param {any} params Can be specified as x,y,z,e. All in mm.
             */
            moveto(params) {
                params.e = this.e; // keep filament at current position
                params.retract = false;
                this.extrudeto(params);
            } 

            /**
             * @param {float} note as midi note
             * @param {float} time in ms
             * @param {object or Vector} direction in x,y,z (default x) 
             * @returns object with axis/distance & speed: {x:distance, speed:speed}
             */
            note(note, time, axes) {
                // low notes are pauses
                if (note < 10) {
                    this.wait(time);
                    let moveObj = {};
                    moveObj[x] = 0;
                    moveObj["speed"] = 0;
                    return moveObj;
                }
                else {
                    //this.printSpeed = this.midi2feedrate(note,axis); // mm/s
                    let speed = this.midi2speed(note, axis); // mm/s
                    let dist = speed * time / 1000; // time in ms
                    let moveObj = {};
                    // TODO: fix or other axes
                    moveObj[axes] = dist;
                    moveObj["speed"] = speed;
                    this.move(moveObj);
                    return moveObj;
                }
            }

            /**
             * Fills an area based on layerHeight (as thickness of each line)
             * @param {float} width of the area in mm
             * @param {float} height of the area in mm
             * @param {float} lh the layerheight (or gap, if larger)
             */
            fill(w, h, lh = this.layerHeight) {
                let inc = lh * Math.PI; // not totally sure why this works, but experimentally it does
                for (var i = 0, y = 0; y < h; i++ , y += inc) {
                    let m = (i % 2 == 0) ? 1 : -1;
                    this.move({ y: inc });
                    this.extrude({ x: m * w });
                }
            }

            /**
             * @param {number} note as midi note 
             * @param {string} axis of movement: x,y,z 
             * @returns speed in mm/s
             */
            midi2speed(note, axis) {
                // MIDI note 69     = A4(440Hz)
                // 2 to the power (69-69) / 12 * 440 = A4 440Hz
                // 2 to the power (64-69) / 12 * 440 = E4 329.627Hz
                // Ultimaker:
                // 47.069852, 47.069852, 160.0,
                //freq_xyz[j] = Math.pow(2.0, (note-69)/12.0)*440.0 

                let freq = Math.pow(2.0, (note-69)/12.0)*440.0;
                let speed = freq / parseFloat(this.speedScale()[axis]);

                return speed;
            }

            m2s(note,axis) {
                return this.midi2speed(note,axis);
            }

            //
            // for calculating note frequencies
            //
            speedScale()
            {
                let bs = Printer.speedScale[this.model];
                return {"x":bs["x"], "y":bs["y"], "z":bs["z"] };
            }

            /**
             * Causes the printer to wait for a number of milliseconds
             * @param {float} ms to wait
             */
            wait(ms) {
                sendGCode("M0 P" + ms);
            }

            pause() {
                // retract filament, turn off fan and heater wait
                this.extrude({ e: -16, speed: 250 });
                this.move({ z: -3 });
                sendGCode("M104 S0"); // turn off temp
                sendGCode("M107 S0"); // turn off fan
            }

            resume(temp = "190") {
                sendGCode("M109 S" + temp); // turn on temp, but wait until full temp reached
                sendGCode("M106 S100"); // turn on fan
                this.extrude({ e: 16, speed: 250 });
            }
            // end Printer class
        };


        // defined outside class because we have to
        /**
         * Tail-recursive extrusion function.  Uses FEXT https://github.com/glathoud/fext
         * @param {Vector} moveVector
         * @param {Number} leftToMove
         */
        Printer.prototype._extrude = meth("_extrude",function (that,moveVector, leftToMove, retract) {
            // if there's nowhere to move, return
            //console.log(that);
            console.log("left to move:" + leftToMove);

            //console.log("CURRENT:");
            //console.log(that.position);

            if (leftToMove < 0.08) {
                return false;
            }

            let amountMoved = Math.min(leftToMove, that.maxMovePerCycle);
            // calculate next position
            let nextPosition = Vector.prototype.add(that.position, Vector.prototype.mult(moveVector, amountMoved));

            //console.log("VECTOR:");
            //console.log(moveVector);

            //console.log("CURRENT:");
            //console.log(that.position);

            //console.log("NEXT:");
            //console.log(nextPosition);
            
            if (that.boundaryMode == "bounce") {
                let moved = new Vector();
                // calculate movement per axis, based on printer bounds
                // reverse velocity if bounds hit
                for (let axis in nextPosition.axes) {
                    // TODO:
                    // for each axis, see where it intersects the printer bounds
                    // then, using velocity, get other axes positions at that point
                    // if any of them are over, skip to next axis

                    if (nextPosition.axes[axis] > that.maxPosition.axes[axis]) {
                        moved.axes[axis] = that.maxPosition.axes[axis] - that.position.axes[axis];
                        nextPosition.axes[axis] = that.maxPosition.axes[axis];
                        moveVector.axes[axis] *= -1;
                    } else if (nextPosition.axes[axis] < that.minPosition.axes[axis]) {
                        moved.axes[axis] = that.position.axes[axis] - that.minPosition.axes[axis];
                        nextPosition.axes[axis] = that.minPosition.axes[axis];
                        moveVector.axes[axis] *= -1;
                    } else {
                        moved.axes[axis] = nextPosition.axes[axis] - that.position.axes[axis];
                    }
                    //console.log("moved:");
                    //console.log(moved);
                }
                amountMoved = moved.mag();
                console.log("amt moved:" + amountMoved);
                console.log(moved);
            } else {
                that.clipToPrinterBounds(nextPosition.axes);
            }
            leftToMove -= amountMoved;


            // update current position
            //console.log("current pos:")
            //console.log(that.position);

            that.position.set(nextPosition);
            //console.log("next pos:");
            //console.log(nextPosition);
            //console.log(that.position);
            //console.log(that);

            that.sendExtrusionGCode(retract);

            // Tail recursive, until target x,y,z is hit
            //
            return mret(that._extrude, moveVector, leftToMove, retract);

        } // end _extrude 
        );


        // TODO: this is dumb.  SHould be in another data model class called "printer model"

        // supported printers
        Printer.UM2 = "UM2";
        Printer.UM2plus = "UM2plus";
        Printer.UM2plusExt = "UM2plusExt";
        Printer.UM3 = "UM3";
        Printer.REPRAP = "REP";

        Printer.PRINTERS = [Printer.UM2, Printer.UM3, Printer.REPRAP];

        // dictionary of first GCODE sent to printer at start
        Printer.GCODE_HEADERS = {};
        Printer.GCODE_HEADERS[Printer.UM2] = [
                ";FLAVOR:UltiGCode",
                ";TIME:1",
                ";MATERIAL:1",
        ];
        Printer.GCODE_HEADERS[Printer.UM2plus] = [
                ";FLAVOR:UltiGCode",
                ";TIME:1",
                ";MATERIAL:1",
        ];

        Printer.GCODE_HEADERS[Printer.UM3]= [
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
            ];
            Printer.GCODE_HEADERS[Printer.REPRAP] = [
                ";RepRap target",
                "G28",
                "G92 E0",
            ];

        Printer.filamentDiameter = {};
        Printer.filamentDiameter[Printer.UM2] = Printer.filamentDiameter[Printer.UM2plus] =
                Printer.filamentDiameter[Printer.REPRAP] = 2.85;
        Printer.extrusionInmm3 = {};
        Printer.extrusionInmm3[Printer.UM2]= Printer.extrusionInmm3[Printer.REPRAP] = false;
        Printer.extrusionInmm3[Printer.UM2plus] = Printer.extrusionInmm3[Printer.UM3] = true;

        // TODO: FIX THESE!
        // https://ultimaker.com/en/products/ultimaker-2-plus/specifications

        // TODO: check these: there are max speeds for each motor (x,y,z,e)

        Printer.maxTravelSpeed = {};

        Printer.maxTravelSpeed[Printer.UM3] =
            Printer.maxTravelSpeed[Printer.UM2plus] = 
                Printer.maxTravelSpeed[Printer.UM2] = { 'x': 300, 'y': 300, 'z': 80, 'e': 45 };
        Printer.maxTravelSpeed[Printer.REPRAP] = { 'x': 300, 'y': 300, 'z': 80, 'e': 45 };
            
        Printer.maxPrintSpeed = {};
        Printer.maxPrintSpeed[Printer.UM2] =
            Printer.maxPrintSpeed[Printer.REPRAP] = { 'x': 150, 'y': 150, 'z': 80, 'e': 45 };
        Printer.maxPrintSpeed[Printer.UM3] = Printer.maxPrintSpeed[Printer.UM2plus] = { 'x': 150, 'y': 150, 'z': 80, 'e': 45 };

        Printer.bedSize = {};
        Printer.bedSize[Printer.UM2plus] = Printer.bedSize[Printer.UM2] 
            = Printer.bedSize[Printer.UM3] = { 'x': 223, 'y': 223, 'z': 205 };
        Printer.bedSize[Printer.UM2plusExt] ={ 'x': 223, 'y': 223, 'z': 305 };
        Printer.bedSize[Printer.REPRAP] = { 'x': 150, 'y': 150, 'z': 80 };

        Printer.defaultPrintSpeed = 30; // mm/s

        Printer.speedScale = {};
        Printer.speedScale[Printer.UM2] = {'x': 47.069852, 'y':47.069852, 'z':160.0};
        Printer.speedScale[Printer.UM2plus] = {'x': 47.069852, 'y':47.069852, 'z':160.0};

        //////////////////////////////////////////////////////////

        function clearError() {
            document.getElementById("code-errors").innerHTML = "<p>...</p>";
        }

        //
        // needs to be global so scripts can call this when run
        //
        window.doError = function (e) {
            // report to user
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SyntaxError
            document.getElementById("code-errors").innerHTML = "<p>" + e.name + ": " + e.message + "(line:" + e.lineNumber + ")</p>";
            console.log(e);
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


        //
        // blink an element using css animation class
        //
        var blinkElem = function ($elem, speed, callback) {
            $elem.removeClass("blinkit fast slow"); // remove to make sure it's not there
            $elem.on("animationend", function () {
                if (callback !== undefined && typeof callback == "function") callback();
                $(this).removeClass("blinkit fast slow");
            });
            if (speed == "fast")
            {
                $elem.addClass("blinkit fast");
            }
            else if (speed == "slow") {
                $elem.addClass("blinkit slow");
            } else {
                $elem.addClass("blinkit");
            }
        };


        function globalEval(code, line) {
            clearError();
            code = jQuery.trim(code);
            console.log(code);
            if (code) {
                if (pythonMode) {


                    code = "from browser import document as doc\nfrom browser import window as win\nlp = win.scope.printer\ngcode = win.scope.sendGCode\n"
                        + code;

                    let script = document.createElement("script");
                    script.type = "text/python";
                    script.text = code;
                   
                    // run and remove
                    let scriptsContainer = $("#python-scripts");
                    scriptsContainer.empty(); // remove old ones
                    scriptsContainer.append(script); // append new one

                    brython(); // re-run brython

                    //code = __BRYTHON__.py2js(code + "", "newcode", "newcode").to_js();
                    console.log(code);
                    // eval(code);
                }
                else {

                    // give quick access to liveprinter API
                    code = "let lp = window.scope.printer;" + code;
                    code = "let sched = window.scope.scheduler;" + code;
                    code = "let socket = window.scope.socket;" + code;
                    code = "let gcode = window.scope.sendGCode;" + code;
                    code = "let s = window.scope;" + code;
                    code = "let None = function() {};" + code;


                    // wrap code in anonymous function to avoid redeclaring scope variables and
                    // scope bleed.  For global functions that persist, use lp scope or s

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
        } // end globalEval


        /*
        * START SETTING UP SESSION VARIABLES ETC>
        * **************************************
        * 
        */

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
            name: "queryResponses",
            timeOffset: 80,
            func: function (event) {
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
                //console.log("temp event:");
                //console.log(tempEvent);
                let tmp = parseFloat(tempEvent.hotend).toFixed(2);
                let target = parseFloat(tempEvent.hotend_target).toFixed(2);

                $("#temperature").empty();
                $("#temperature").append("<p class='alert alert-danger fade show' role='alert'>"
                    + '<strong>hotend temp/target:<br />'
                    + tmp + " / " + target
                    + '</strong>'
                    + "</p>");

                // look for 10% diff, it's not very accurate...
                /*
                if ((Math.abs(tmp - target) / target) < 0.10) {
                    let gcodeString = "";
                    for (var i=1; i<5; i++)
                    {
                            gcodeString +='M300 P200 S' + i*220+'\n';
                    }
                    sendGCode(gcodeString);
                }
                */
            }
        };
        socketHandler.registerListener(tempHandler);


        // temperature event handler
        var errorHandler = {
            'error': function (event) {
                //console.log("error event:");
                //console.log(event);

                $("#errors > ul").append("<li class='alert alert-warning alert-dismissible fade show' role='alert'>"
                    //+ (new Date(event.time)).toDateString() // FIXME!
                    + '<strong>'
                    + ": " + event.message
                    + '</strong>'
                    + '<button type="button" class="close" data-dismiss="alert" aria-label="Close">'
                    + '<span aria-hidden="true">&times;</span></button>'
                    + "</li>");
                blinkElem($("#errors-tab"));
                blinkElem($("#inbox"));
            }
        };
        socketHandler.registerListener(errorHandler);

        // temperature event handler
        var infoHandler = {
            'info': function (event) {
                //console.log("error event:");
                //console.log(event);
                $("#info > ul").prepend("<li class='alert alert-primary alert-dismissible fade show' role='alert'>"
                    + (new Date(parseInt(event.time))).toLocaleDateString('en-US')
                    + '<strong>'
                    + ": " + event.message
                    + '</strong>'
                    + '<button type="button" class="close" data-dismiss="alert" aria-label="Close">'
                    + '<span aria-hidden="true">&times;</span></button>'
                    + "</li>");
                blinkElem($("#info-tab"));
                blinkElem($("#inbox"));
            },
            'resend': function (event) {
                //console.log("error event:");
                //console.log(event);
                $("#info > ul").prepend("<li>" + (new Date(parseInt(event.time))).toLocaleDateString('en-US') + ": " + event.message + "</li>");
                blinkElem($("#info-tab"));
                blinkElem($("#inbox"));
            }
        };


        socketHandler.registerListener(infoHandler);

        // temperature event handler
        var commandHandler = {
            'gcode': function (event) {
                //console.log("error event:");
                //console.log(event);
                $("#commands > ul").prepend("<li>" + (new Date(parseInt(event.time))).toLocaleDateString('en-US') + ": " + event.message + "</li>").fadeIn(50);
                blinkElem($("#commands-tab"));
                blinkElem($("#inbox"));
            }
        };

        socketHandler.registerListener(commandHandler);

        // ok event handler
        var okHandler = {
            'ok': function (event) {
                //console.log("ok event:");
                //console.log(event);
                if (outgoingQueue.length > 0) {
                    let msg = outgoingQueue.pop();
                    socketHandler.socket.send(msg);
                }
                blinkElem($("#commands-tab"));
            }
        };

        socketHandler.registerListener(okHandler);


        // portsListHandler event handler
        var portsListHandler = {
            'serial-ports-list': function (event) {
                window.scope.serialPorts = []; // reset serial ports list
                let portsDropdown = $("#serial-ports-list");
                //console.log("list of serial ports:");
                //console.log(event);
                portsDropdown.empty();
                if (event.message.length == 0) {
                    $("#info > ul").append("<li>no serial ports found</li > ").fadeIn(50);
                    window.scope.serialPorts.push("dummy");
                }
                else {
                    $("#info > ul").prepend("<li>serial ports: " + event.message + "</li > ").fadeIn(50);
                    for ( let p of event.message) {
                        window.scope.serialPorts.push(p);
                    }
                }

                window.scope.serialPorts.forEach(function (port) {
                    //console.log("PORT:" + port);
                    let newButton = $('<button class="dropdown-item" type="button" data-port-name="' + port + '">' + port + '</button>');
                    //newButton.data("portName", port);
                    newButton.click(function (e) {
                        e.preventDefault();
                        let me = $(this);
                        let message = {
                            'jsonrpc': '2.0',
                            'id': 6,
                            'method': 'set-serial-port',
                            'params': [me.data("portName")],
                        };
                        socketHandler.socket.send(JSON.stringify(message));
                        $("#serial-ports-list > drop-down-menu > button").removeClass("active");
                        me.addClass("active");
                    });
                    portsDropdown.append(newButton);
                });
                    
                blinkElem($("#serial-ports-list"));
                blinkElem($("#info-tab"));
            }
        };

        socketHandler.registerListener(portsListHandler);

        $("#sendCode").on("click", compileCode);

        $("#temp-display-btn").on("click", function () {
            let me = $(this);
            let doUpdates = !me.hasClass('active'); // because it becomes active *after* a push
            updateTemperature(doUpdates);
            if (doUpdates) {
                me.text("stop polling temperature");
            }
            else {
                me.text("start polling Temperature")
            }
            me.button('toggle');
        });


        $("#python-mode-btn").on("click", function () {
            let me = $(this);
            pythonMode = !me.hasClass('active'); // because it becomes active *after* a push
            
            if (pythonMode) {
                me.text("python mode");
            }
            else {
                me.text("javascript mode")
            }
            setLanguageMode(); // update codemirror editor
            me.button('toggle');
        });


        /*
         * Clear printer queue on server 
         */
        $("#clear-btn").on("click", function () {
            let message = {
                'jsonrpc': '2.0',
                'id': 7,
                'method': 'clear-command-queue',
                'params': [],
            };
            socketHandler.socket.send(JSON.stringify(message));
        });


        // TODO: temp probe that gets scheduled every 300ms and then removes self when
        // tempHandler called

        // update printing API to share with running script
        scope.printer = printer;
        scope.scheduler = Scheduler;
        scope.socket = socketHandler;
        scope.sendGCode = sendGCode;

        // mouse handling functions
        scope.mx = 0;
        scope.my = 0;
        scope.pmx = 0;
        scope.pmy = 0;
        scope.md = false; // mouse down
        scope.pmd = false; // previous mouse down

        // add click handler - wrapper for jquery
        scope.click = function (func, elem = "undefined") {
            if (elem !== "undefined" || elem) {
                return $(elem).click(func);
            }
            else {
                return $(window).click(func);
            }
        }
        scope.mousemove = function (func, minDelta = 20) {
            // global mouse functions
            // remove all revious handlers -- might be dangerous?
            $(document).off("mousemove");
            $(document).off("mousedown");

            $(document).mousedown(function (e) {
                scope.pmd = scope.md;
                scope.md = true;
                scope.pmx = e.pageX;
                scope.pmy = e.pageY;

                $(document).mousemove(function (evt) {
                    let self = $(this);
                    scope.mx = evt.pageX;
                    scope.my = evt.pageY;
                    let distX = scope.mx - scope.pmx;
                    let distY = scope.my - scope.pmy;
                    let dist = distX * distX + distY * distY;
                    if (minDelta * minDelta < dist) {
                        console.log("mouse move:" + evt.pageX + "," + evt.pageY);
                        func.call(this, {
                            x: scope.mx, y: scope.my,
                            px: scope.pmx, py: scope.pmy,
                            dx: (scope.mx - scope.pmx) / self.width(),
                            dy: (scope.my - scope.pmy) / self.height(),
                            md: scope.md, pmd: scope.pmd
                        });
                        scope.pmx = evt.pageX;
                        scope.pmy = evt.pageY;
                    }
                });
            });
            $(document).mouseup(function (e) {
                scope.pmd = scope.md;
                scope.md = false;
                $(document).off("mousemove");
            });
        }

        /*
            * Example in use:
            * 
            s.mousemove( function(e) {
                console.log(e);
	            console.log((e.x-e.px) + "," + (e.y-e.py));
            }, 20);
        */
            

        /**
            * Local Storage for saving/loading documents.
            * Default behaviour is loading the last edited session.
            * 
            */

        // from https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
        function storageAvailable(type) {
            try {
                var storage = window[type],
                    x = '__storage_test__';
                storage.setItem(x, x);
                storage.removeItem(x);
                return true;
            }
            catch(e) {
                return e instanceof DOMException && (
                    // everything except Firefox
                    e.code === 22 ||
                    // Firefox
                    e.code === 1014 ||
                    // test name field too, because code might not be present
                    // everything except Firefox
                    e.name === 'QuotaExceededError' ||
                    // Firefox
                    e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                    // acknowledge QuotaExceededError only if there's something already stored
                    storage.length !== 0;
            }
        }

        let editedKey = "edited";
        let savedKey = "saved";

        let changeFunc = cm => {
            let txt = cm.getDoc().getValue();
            localStorage.setItem(editedKey, txt);
        };

        CodeEditor.on("change", changeFunc);

        let reloadSession = () => {
            CodeEditor.off("change");
            let newFile = localStorage.getItem(editedKey);
            if (newFile !== undefined && newFile)
            {
                blinkElem($(".CodeMirror"), "slow", () => {    
                    CodeEditor.swapDoc(
                        CodeMirror.Doc(
                            newFile, "javascript"
                        )
                    );
                    CodeEditor.on("change", changeFunc);
                });
            }
        };

        $("#reload-edited-session").on("click", reloadSession);

        $("#save-session").on("click", () => {
            CodeEditor.off("change");
            let txt = CodeEditor.getDoc().getValue();
            localStorage.setItem(savedKey, txt);
            blinkElem($(".CodeMirror"), "fast", () => {
                CodeEditor.on("change", changeFunc);
            });
            // mark as reload-able
            $("#reload-saved-session").removeClass("graylink");
        });

        // start as non-reloadable
        $("#reload-saved-session").addClass("graylink");

        $("#reload-saved-session").on("click", () => {
            CodeEditor.off("change");
            let newFile = localStorage.getItem(savedKey);
            if (newFile !== undefined && newFile)
            {
                blinkElem($(".CodeMirror"), "slow", () => {    
                    CodeEditor.swapDoc(
                        CodeMirror.Doc(
                            newFile, "javascript"
                        )
                    );
                    CodeEditor.on("change", changeFunc);
                });
            }
        });

        if (storageAvailable('localStorage')) {
            // finally, load the last stored session:
            reloadSession();
        }
        else {
            errorHandler({name:"save error", message:"no local storage available for saving files!"});
        }
        // disable form reloading on code compile
        $('form').submit(false);

        brython(10);

    });
})();
