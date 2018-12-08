/**
 * @file Main liveprinter system file for a livecoding system for live CNC manufacturing.
 * @author Evan Raskob <evanraskob+nosp4m@gmail.com>
 * @version 0.8
 * @license
 * Copyright (c) 2018 Evan Raskob and others
 * Licensed under the GNU Affero 3.0 License (the "License"); you may
* not use this file except in compliance with the License. You may obtain
* a copy of the License at
*
*     {@link https://www.gnu.org/licenses/gpl-3.0.en.html}
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
* WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
* License for the specific language governing permissions and limitations
* under the License.
*/

/**
 * @namespace LivePrinter
 */

// import vector functions - doesn't work in chrome ?
//import { Vector } from './lib/Vector.prototype.js';

$.when($.ready).then(
    function () {
        "use strict";

        if (!window.console) window.console = {};
        if (!window.console.log) window.console.log = function () { };

        // dangerous?
        // need to pass to scripts somehow
        if (!window.scope) {
            window.scope = Object.create(null);
        }
        /**
         * Global namespace for all printer functions.  See {@link globalEval}
         * @memberOf LivePrinter
         * @inner
         */
        let scope = window.scope; // shorthand
        scope.serialPorts = []; // available ports

        let outgoingQueue = []; // messages for the server

        let pythonMode = false;



        /**
         * Handy object for scheduling events at intervals, etc.
         * @class
         * @constructor
         * @memberOf LivePrinter
         * @inner
         */
        window.scope.Scheduler = {
            ScheduledEvents: [],
            audioContext: new AudioContext(),
            schedulerInterval: 40,
            timerID: null,

            /**
             * Clear all scheduled events.
             * */
            clearEvents: function () {
                window.scope.Scheduler.ScheduledEvents = [];
            },

            /**
            * Schedule a function to run (and optionally repeat).
            * @param {Object} args Object with timeOffset: ms offset to schedule this for, func: function, repeat: true/false whether to reschedule
            */
            scheduleEvent: function (args) {
                args.time = window.scope.Scheduler.audioContext.currentTime;

                window.scope.Scheduler.ScheduledEvents.push(args);
            },

            /**
             * Remove an event using a filtering function (like matching a name)
             * @param {Function} func - filtering function  
             */
            removeEvent: function (func) {
                // run events 
                window.scope.Scheduler.ScheduledEvents = window.scope.Scheduler.ScheduledEvents.filter(func);
            },

            /**
             * Remove an event using the name property of that event
             * @param {string} name of the event to remove
             */
            removeEventByName: function (name) {
                // run events 
                window.scope.Scheduler.ScheduledEvents = window.scope.Scheduler.ScheduledEvents.filter(e => e.name !== name);
            },

            /**
             * Start the Scheduler running events.
             */
            startScheduler: function () {
                console.log("scheduler starting at time: " + window.scope.Scheduler.audioContext.currentTime);

                function scheduler(nextTime) {
                    let time = window.scope.Scheduler.audioContext.currentTime * 1000; // in ms

                    // run events 
                    window.scope.Scheduler.ScheduledEvents.filter(
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

                window.scope.Scheduler.timerID = window.setInterval(scheduler, window.scope.Scheduler.schedulerInterval);
            }
        };


        window.scope.Scheduler.startScheduler();

        // Scheduler.scheduleEvent({
        //     timeOffset: 2000,
        //     func: function() { console.log("EVENT"); } ,
        //     repeat: true,
        // });


        //////////////////////////////////////////////////////////////////////////////////////////
        // Codemirror:
        // https://codemirror.net/doc/manual.html
        //////////////////////////////////////////////////////////////////////////////////////////
        
        /**
         * CodeMirror code editor instance. See {@link https://codemirror.net/doc/manual.html}
         * @namespace CodeMirror
         */
        var CodeEditor = CodeMirror.fromTextArea(document.getElementById("code-editor"), {
            lineNumbers: true,
            scrollbarStyle: "simple",
            styleActiveLine: true,
            lineWrapping: true,
            undoDepth: 100,
            //autocomplete: true,
            extraKeys: {
                "Ctrl-Enter": runCode,
                "Cmd-Enter": runCode,
                "Ctrl-Space": "autocomplete",
                "Ctrl-Q": function(cm){ cm.foldCode(cm.getCursor()); }
            },
            foldGutter: true,
            autoCloseBrackets: true
        });


        /**
         * Toggle the language mode for livecoding scripts between Javascript and Python.
         * @memberOf LivePrinter
         * */
        function setLanguageMode() {
            if (pythonMode) {
                CodeEditor.setOption("gutters", ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]);
                CodeEditor.setOption("mode", "text/x-python");
                CodeEditor.setOption("lint", true);
            } else {
                CodeEditor.setOption("gutters", ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "CodeMirror-foldgutter"]);
                CodeEditor.setOption("mode", "javascript");
                CodeEditor.setOption("lint", {
                    globalstrict: true,
                    strict: false,
                    esversion: 6
                });
            }
        }

        /**
         * build examples loader links for dynamically loading example files
         * @memberOf LivePrinter
         * */
        let exList = $("#examples-list > .dropdown-item").not("[id*='session']" );
        exList.on("click", function () {
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

        /**
         * Strip GCode comments from text.
         * Borrowed from {@link https://github.com/cncjs/gcode-parser/blob/master/src/index.js} (MIT License)
         * See {@link http://linuxcnc.org/docs/html/gcode/overview.html#gcode:comments}
         * Comments can be embedded in a line using parentheses () or for the remainder of a lineusing a semi-colon. The semi-colon is not treated as the start of a comment when enclosed in parentheses.
         */
        const stripComments = (() => {
            const re1 = new RegExp(/\s*\([^\)]*\)/g); // Remove anything inside the parentheses
            const re2 = new RegExp(/\s*;.*/g); // Remove anything after a semi-colon to the end of the line, including preceding spaces
            //const re3 = new RegExp(/\s+/g);
            return (line => line.replace(re1, '').replace(re2, '')); //.replace(re3, ''));
        })();

        /**
         * Convert code to JSON RPC for sending to the server.
         * @param {string} gcode to convert
         * @returns {string} json message
         * 
         */
        function codeToJSON(gcode) {
            if (typeof gcode === 'string') gcode = [stripComments(gcode)];

            if (typeof gcode === 'object' && Array.isArray(gcode)) {
                let message = {
                    'jsonrpc': '2.0',
                    'id': 1,
                    'method': 'gcode',
                    'params': gcode
                };

                let message_json = JSON.stringify(message);
                // debugging
                //console.log(message_json);

                return message_json;

                //socketHandler.socket.send(message_json);
            }
            else throw new Error("invalid gcode in sendGCode[" + typeof text + "]:" + text);
        }

        /**
         * Send GCode to the server via websockets.
         * @param {string} gcode gcode to send
         */
        function sendGCode(gcode) {
            let message = codeToJSON(gcode);
            socketHandler.socket.send(message);
        }

        /**
         * queue to be run after OK -- for movements, etc.
         * only if necessary... send if nothing is already in the queue
         * @param {string} gcode to send
         */
        function queueGCode(gcode) {
            let message = codeToJSON(gcode);
            if (outgoingQueue.length > 0)
                outgoingQueue.push(message);
            else
                socketHandler.socket.send(message);
        }

        /**
         * This function takes the highlighted code from the editor and runs the compiling and error-checking functions.
         */ 
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
            // blink the form
            blinkElem($("form"));

            // run code
            //if (validCode) {
            try {
                globalEval(code, cursor.line + 1);
            } catch (e) {
                doError(e);
            }
        }


        let updateTemperature = function (state) {

            if (state) {
                // schedule temperature updates every little while
                window.scope.Scheduler.scheduleEvent({
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
                window.scope.Scheduler.removeEventByName("tempUpdates");
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
                        'params': []
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
                this.listeners = this.listeners.filter(l => l !== listener);
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

        const WORD = /[\w$]+/g, RANGE = 500;

        CodeMirror.registerHelper("hint", "anyword", function (editor, options) {
            const word = options && options.word || WORD;
            const range = options && options.range || RANGE;
            const cur = editor.getCursor(), curLine = editor.getLine(cur.line);
            let start = cur.ch, end = start;
            while (end < curLine.length && word.test(curLine.charAt(end)))++end;
            while (start && word.test(curLine.charAt(start - 1)))--start;
            let curWord = start !== end && curLine.slice(start, end);

            let list = [], seen = {};
            function scan(dir) {
                let line = cur.line, end = Math.min(Math.max(line + dir * range, editor.firstLine()), editor.lastLine()) + dir;
                for (; line !== end; line += dir) {
                    let text = editor.getLine(line), m;
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
        function blinkElem($elem, speed, callback) {
            $elem.removeClass("blinkit fast slow"); // remove to make sure it's not there
            $elem.on("animationend", function () {
                if (callback !== undefined && typeof callback === "function") callback();
                $(this).removeClass("blinkit fast slow");
            });
            if (speed === "fast")
            {
                $elem.addClass("blinkit fast");
            }
            else if (speed === "slow") {
                $elem.addClass("blinkit slow");
            } else {
                $elem.addClass("blinkit");
            }
        }

        /*
        * START SETTING UP SESSION VARIABLES ETC>
        * **************************************
        * 
        */
        if (scope.printer) delete scope.printer;

        scope.printer = new Printer(sendGCode);

        // handler for JSON-RPC calls from server
        const jsonrpcPositionListener = {
            "position": function (params) {
                console.log("position:");
                console.log(params);
                scope.printer.x = parseFloat(params.x);
                scope.printer.y = parseFloat(params.y);
                scope.printer.z = parseFloat(params.z);
                scope.printer.e = parseFloat(params.e);
            }
        };

        socketHandler.registerListener(jsonrpcPositionListener);

        $("#gcode").select();  // focus on code input
        socketHandler.start(); // start websockets

        const responseJSON = JSON.stringify({
            "jsonrpc": "2.0",
            "id": 4,
            "method": "response",
            "params": []
        });

        let waitingForResponse = false; // only ask for responses if we expect them?

        window.scope.Scheduler.scheduleEvent({
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
        const tempHandler = {
            'temperature': function (tempEvent) {
                //console.log("temp event:");
                //console.log(tempEvent);
                let tmp = parseFloat(tempEvent.hotend).toFixed(2);
                let target = parseFloat(tempEvent.hotend_target).toFixed(2);

                $("#temperature > p").html(
                    '<strong>hotend temp/target:'
                    + tmp + " / " + target
                    + '</strong>');

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


        // error event handler
        const errorHandler = {
            'error': function (event) {
                appendLoggingNode($("#errors > ul"), event.time, event.message);
                blinkElem($("#errors-tab"));
                blinkElem($("#inbox"));
            }
        };
        socketHandler.registerListener(errorHandler);

        // info event handler
        const infoHandler = {
            'info': function (event) {
                appendLoggingNode($("#info > ul"), event.time, event.message);
                blinkElem($("#info-tab"));
            },
            'resend': function (event) {
                appendLoggingNode($("#info > ul"), event.time, event.message);
                blinkElem($("#info-tab"));
                blinkElem($("#inbox"));
            }
        };


        socketHandler.registerListener(infoHandler);

        /**
         * Append a dismissible, styled text node to one of the side menus, formatted appropriately.
         * @param {jQuery} elem JQuery element to append this to
         * @param {Number} time Time of the event
         * @param {String} message message text for new element
         * @namespace LivePrinter
         */
        function appendLoggingNode(elem, time, message) {
            const dateStr = (new Date(time)).toLocaleString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit', hours: '2-digit', minutes: '2-digit', seconds: '2-digit' });
            elem.prepend("<li class='alert alert-primary alert-dismissible fade show' role='alert'>"
                + dateStr
                + '<strong>'
                + ": " + message
                + '</strong>'
                + '<button type="button" class="close" data-dismiss="alert" aria-label="Close">'
                + '<span aria-hidden="true">&times;</span></button>'
                + "</li>");
        }

        // command event handler
        const commandHandler = {
            'gcode': function (event) {
                //(new Date(parseInt(event.time))).toLocaleDateString('en-US')
                appendLoggingNode($("#commands > ul"), event.time, event.message);
                blinkElem($("#commands-tab"));
                blinkElem($("#inbox"));
            }
        };

        socketHandler.registerListener(commandHandler);

        // ok event handler
        const okHandler = {
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
        const portsListHandler = {
            'serial-ports-list': function (event) {
                window.scope.serialPorts = []; // reset serial ports list
                let portsDropdown = $("#serial-ports-list");
                //console.log("list of serial ports:");
                //console.log(event);
                portsDropdown.empty();
                if (event.message.length === 0) {
                    appendLoggingNode($("#info > ul"), (new Date()).getUTCMilliseconds(), "<li>no serial ports found</li > ");
                    window.scope.serialPorts.push("dummy");
                }
                else {
                    let msg = "<ul>Serial ports found:";
                    for (let p of event.message) {
                        msg += "<li>" + p + "</li>";
                        window.scope.serialPorts.push(p);
                    }
                    msg += "</ul>";
                    appendLoggingNode($("#info > ul"), (new Date()).getUTCMilliseconds(), msg);
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
                            'params': [me.data("portName")]
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

        $("#sendCode").on("click", runCode);

        $("#temp-display-btn").on("click", function () {
            let me = $(this);
            let doUpdates = !me.hasClass('active'); // because it becomes active *after* a push
            updateTemperature(doUpdates);
            if (doUpdates) {
                me.text("stop polling temperature");
            }
            else {
                me.text("start polling Temperature");
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
                me.text("javascript mode");
            }
            setLanguageMode(); // update codemirror editor
            me.button('toggle');
        });


        scope.clearPrinterCommandQueue = function () {
            let message = {
                'jsonrpc': '2.0',
                'id': 7,
                'method': 'clear-command-queue',
                'params': []
            };
            socketHandler.socket.send(JSON.stringify(message));
        };

        /*
         * Clear printer queue on server 
         */
        $("#clear-btn").on("click", scope.clearPrinterCommandQueue);

        
        // TODO: temp probe that gets scheduled every 300ms and then removes self when
        // tempHandler called



        // update printing API to share with running script
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
        };

        /**
         * 
         * @param {Function} func function to run when mouse moved
         * @param {any} minDelta minimum mouse distance, under which the function won't be run
         * @example 
         * Example in use:
         * s.mousemove( function(e) {
         *     console.log(e);
	     *     console.log((e.x-e.px) + "," + (e.y-e.py));
         *   }, 20);
         */
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
        };


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

        setLanguageMode(); // set up python or javascript


        /**
         * Evaluate the code according to the current editor mode (javascript/python).
         * @param {string} code to evaluate
         * @param {integer} line line number for error displaying
         */
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
                    code = "let cancel = s.clearPrinterCommandQueue;" + code; //alias
                    code = "let lp = window.scope.printer;" + code;
                    code = "let sched = window.scope.Scheduler;" + code;
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


        //brython(10);

    });
