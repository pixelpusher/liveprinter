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

// from

// http://stackoverflow.com/questions/10454518/javascript-how-to-retrieve-the-number-of-decimals-of-a-string-number
const decimalPlaces = (num) => {
    const match = ('' + num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
    if (!match) {
        return 0;
    }

    // Number of digits right of decimal point.
    const digits = match[1] ? match[1].length : 0;

    // Adjust for scientific notation.
    const E = match[2] ? (+match[2]) : 0;

    return Math.max(0, digits - E);
};

// from https://github.com/cncjs/cncjs/blob/30c294f0ffb304441304aaa6b75a728f3a096827/src/server/controllers/Marlin/MarlinLineParserResultPosition.js

class MarlinLineParserResultPosition {
    // X:0.00 Y:0.00 Z:0.00 E:0.00 Count X:0 Y:0 Z:0
    static parse(line) {
        const r = line.match(/^(?:(?:X|Y|Z|E):[0-9\.\-]+\s*)+/i);
        if (!r) {
            return null;
        }

        const payload = {
            pos: {}
        };
        const pattern = /((X|Y|Z|E):[0-9\.\-]+)/gi;
        const params = r[0].match(pattern);

        for (let param of params) {
            const nv = param.match(/([a-z]+):([0-9\.\-]+)/i);
            if (nv) {
                const axis = nv[1].toLowerCase();
                const pos = nv[2];
                const digits = decimalPlaces(pos);
                payload.pos[axis] = Number(pos).toFixed(digits);
            }
        }

        return {
            type: MarlinLineParserResultPosition,
            payload: payload
        };
    }
}

//  from https://github.com/cncjs/cncjs/blob/f33e6464e93de65b53aa4160676b8ee51ed4dcc6/src/server/controllers/Marlin/MarlinLineParserResultTemperature.js
class MarlinLineParserResultTemperature {
    // ok T:0
    // ok T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0
    // ok T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
    // ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0
    // ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0 W:?
    // ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0 W:0
    //  T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0
    //  T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
    //  T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0
    static parse(line) {
        let r = line.match(/^(ok)?\s+T:[0-9\.\-]+/i);
        if (!r) {
            return null;
        }

        const payload = {
            ok: line.startsWith('ok'),
            extruder: {},
            heatedBed: {}
        };

        const re = /(?:(?:(T|B|T\d+):([0-9\.\-]+)\s+\/([0-9\.\-]+)(?:\s+\((?:[0-9\.\-]+)\))?)|(?:(@|B@|@\d+):([0-9\.\-]+))|(?:(W):(\?|[0-9]+)))/ig;

        while ((r = re.exec(line))) {
            const key = r[1] || r[4] || r[6];

            if (key === 'T') { // T:293.0 /0.0
                payload.extruder.deg = r[2];
                payload.extruder.degTarget = r[3];
                continue;
            }

            if (key === 'B') { // B:60.0 /0.0
                payload.heatedBed.deg = r[2];
                payload.heatedBed.degTarget = r[3];
                continue;
            }

            if (key === '@') { // @:127
                payload.extruder.power = r[5];
                continue;
            }

            if (key === 'B@') { // B@:127
                payload.heatedBed.power = r[5];
                continue;
            }

            // M109, M190: Print temp & remaining time every 1s while waiting
            if (key === 'W') { // W:?, W:9, ..., W:0
                payload.wait = r[7];
                continue;
            }

            // Hotends: T0, T1, ...
            // TODO
        }

        return {
            type: MarlinLineParserResultTemperature,
            payload: payload
        };
    }
};

//
// for console debugging
//


function Logger() { }
Logger.DEBUG_LEVEL = {
    error: 0,
    warning: 1,
    info: 2,
    debug: 3
};

Logger.debugLevel = Logger.DEBUG_LEVEL.info;

Logger.log = function (text, level = Logger.debugLevel) {
    if (level <= Logger.debugLevel) {
        console.log(text);
    }
};

Logger.info = t => Logger.log(t, Logger.DEBUG_LEVEL.info);
Logger.debug = t => Logger.log(t, Logger.DEBUG_LEVEL.debug);
Logger.warning = t => Logger.log(t, Logger.DEBUG_LEVEL.warning);
Logger.error = t => Logger.log(t, Logger.DEBUG_LEVEL.error);


/**
 * Class for Scheduler tasks
 * @memberof LivePrinter
 * @see #window.scope.Scheduler
 */
function Task() { }
Task.prototype = {
    name: "task",
    data: {},
    delay: 0,
    run: async () => { return true; },
    repeat: true,
    running: false,
    system: false
};


(async function () {
    "use strict";

    await $.ready();

    if (!window.console) {
        window.console = {
            __log: [],
            get _log() { return this.__log; },
            log: function (text) { this._log.push(text); },
            getLog: function () { return this._log; }
        };
    }

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

    scope.lastErrorMessage = "none"; // last error message for GUI

    let outgoingQueue = []; // messages for the server

    let pythonMode = false;

    window.logAjax = false; // log all ajax request/response pairs for debugging to command panel

    // this uses the limiting queue, but that affects performance for fast operations (< 250ms)
    window.scope.useLimiter = true;

    window.scope.ajaxTimeout = 60000; // 1 minute timeout for ajax calls (API calls to the backend server)

    if (scope.printer) delete scope.printer;

    // names of all async functions in API for replacement in minigrammar later on in RunCode
    const asyncFunctionsInAPI = [
        "setRetractSpeed",
        "sendFirmwareRetractSettings",
        "retract",
        "unretract",
        "start",
        "temp",
        "bed",
        "fan",
        "go",
        "fwretract",
        "polygon",
        "rect",
        "extrudeto",
        "ext2",
        "sendExtrusionGCode",
        "extrude",
        "ext",
        "move",
        "mov",
        "moveto",
        "mov2",
        "up",
        "upto",
        "down",
        "downto",
        "fillDirection",
        "fillDirectionH",
        "sync",
        "fill",
        "wait",
        "pause",
        "resume",
        "printPaths",
        "printPathsThick",
        "_extrude"
    ];

    const asyncFunctionsInAPICMRegex = /^(setRetractSpeed|sendFirmwareRetractSettings|retract|unretract|start|temp|bed|fan|go|up|upto|down|downto|fwretract|polygon|rect|extrudeto|ext2|sendExtrusionGCode|extrude|ext|move|mov2|moveto|mov|fillDirection|fillDirectionH|sync|fill|wait|pause|resume|printPaths|printPathsThick|_extrude|repeat)[^a-zA-Z0-9\_]/;

    window.requestId = 0;

    // liveprinter object
    scope.printer = new Printer(scheduleGCode, doError);

    /**
     * Handy object for scheduling events at intervals, etc.
     * @class
     * @constructor
     * @memberOf LivePrinter
     * @inner
     */
    window.scope.Scheduler = {
        ScheduledEvents: [],
        schedulerInterval: 10,
        timerID: null,
        startTime: Date.now(),
        eventsToRemove: [], // list to be handed on update cycle
        eventsToAdd: [], // list to be handed on update cycle
        eventsListeners: [], // subscribed listeners for add/remove events

        /**
         * Events: EventsCleared, EventAdded(event), EventRemoved(event)
         * @param {Object} listener Listener object with implemented listener methods to be called
         */
        addEventsListener: function (listener) {
            if (!this.eventsListeners.includes(listener))
                this.eventsListeners.push(listener);
        },

        removeEventsListener: function (listener) {
            this.eventsListeners = this.eventsListeners.filter(e => e !== listener);
        },

        clearEventsListeners: function () { this.eventsListeners = []; },

        /**
         * Clear all scheduled events.
         * */
        clearEvents: function () {
            this.ScheduledEvents = [];

            this.eventsListeners.map(listener => { if (listener.EventsCleared !== undefined) listener.EventsCleared(); });
        },

        /**
        * Schedule a function to run (and optionally repeat).
        * @param {Object} args Object with delay: ms offset to schedule this for, run: function, repeat: true/false whether to reschedule
        * @return {Object} event that was added for future use
        */
        scheduleEvent: function (args) {
            args.time = Date.now() - this.startTime;
            this.eventsToAdd.push(args);
            return args; // return event for further usage
        },

        /**
         * Remove an event using the name property of that event
         * @param {string} name of the event to remove
         */
        removeEventByName: function (name) {
            this.eventsToRemove.push(name);
        },

        /**
         * Get first event with matching name field
         * @param {String} name Name of this event
         * @returns {Task} event object
         */
        getEventByName: function (name) {
            return this.ScheduledEvents.find(e => e.name === name);
        },

        /**
         * Start the Scheduler running events.
         */
        startScheduler: function () {

            Logger.log("scheduler starting at time: " + this.startTime);
            const me = this; //local reference for this closure

            function scheduler(nextTime) {
                const time = Date.now() - me.startTime; // in ms

                // remove old events
                me.eventsToRemove.map(name => {
                    let event = null;
                    while (event = me.ScheduledEvents.find(e => e.name == name)) {
                        if (event) {
                            me.ScheduledEvents = me.ScheduledEvents.filter(e => e !== event);
                            me.eventsListeners.map(listener => { if (listener.EventRemoved !== undefined) listener.EventRemoved(event); });
                        }
                    }
                });
                me.eventsToRemove = [];

                // add any new events
                me.eventsToAdd.map(event => {
                    if (!me.ScheduledEvents.includes(event)) {
                        me.ScheduledEvents.push(event);
                        me.eventsListeners.map(listener => { if (listener.EventAdded !== undefined) listener.EventAdded(event); });
                    }
                });
                me.eventsToAdd = [];

                // run events 
                me.ScheduledEvents.filter(
                    async event => {
                        if (event.running) return true; //quit if still running

                        let keep = true;
                        let tdiff = event.time - time;
                        if (tdiff < 1) {

                            //if (!event.system) Logger.log("running event at time:" + time);
                            // if we're behind, don't run this one...
                            //if (!event.ignorable && tdiff > -event.delay * 2) {
                            //if (!event.ignorable) {

                            event.running = true;
                            await event.run(event.time);


                            if (!event.system) me.eventsListeners.map(listener => { if (listener.EventRun !== undefined) listener.EventRun(event); });
                            //}
                            if (event.repeat) {
                                // try to keep to original time
                                // TODO: might be an issue if events run over in time!!
                                event.time = event.time + event.delay;
                                keep = true;
                            }
                            else {
                                keep = false;
                                me.eventsListeners.map(listener => { if (listener.EventRemoved !== undefined) listener.EventRemoved(event); });
                            }
                            event.running = false;
                        }
                        return keep;
                    });
            }

            window.scope.Scheduler.timerID = window.setInterval(scheduler, window.scope.Scheduler.schedulerInterval);
        }
    };

    // Scheduler.scheduleEvent({
    //     delay: 2000,
    //     run: function() { Logger.log("EVENT"); } ,
    //     repeat: true,
    // });

    // For debugging scheduler:
    //
    //window.scope.Scheduler.addEventsListener({
    //    EventRemoved: function (e) {
    //        Logger.log("event removed:");
    //        Logger.log(e);
    //    },
    //    EventAdded: function (e) {
    //        Logger.log("event added:");
    //        Logger.log(e);
    //    },
    //    EventsCleared: function (e) {
    //        Logger.log("events cleared:");
    //        Logger.log(e);
    //    }

    //});

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Codemirror:
    // https://codemirror.net/doc/manual.html
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////


    CodeMirror.defineMode("lp", function (config, parserConfig) {
        const liveprinterOverlay = {
            token: function (stream, state) {
                let ch = "";

                if (!stream.eol()) {
                    let matches = stream.match(asyncFunctionsInAPICMRegex, false);
                    if (matches) {
                        //Logger.log("MATCH::**" + matches[1] + "**");
                        let i = matches[1].length;
                        while (i--) stream.eat(() => true);
                        return "lp";
                    }
                }
                stream.eatSpace();
                if (stream.match(asyncFunctionsInAPICMRegex, false)) return null;
                while (ch = stream.eat(/[^\s]/)) {
                    if (ch === ".") break;
                };
                return null;
            }
        };
        return CodeMirror.overlayMode(CodeMirror.getMode(config, parserConfig.backdrop || "javascript"), liveprinterOverlay);
    });


    /**
     * CodeMirror code editor instance (local code). See {@link https://codemirror.net/doc/manual.html}
     * @memberOf LivePrinter
     */
    const CodeEditor = CodeMirror.fromTextArea(document.getElementById("code-editor"), {
        lineNumbers: true,
        scrollbarStyle: "simple",
        styleActiveLine: true,
        lineWrapping: true,
        undoDepth: 20,
        highlightAsyncMatches: true,
        tabMode: "indent", // or "spaces", "default", "shift"
        enterMode: "indent", // or "keep", "flat"
        //autocomplete: true,
        extraKeys: {
            "Ctrl-Enter": runCode, // handles aync
            "Shift-Enter": runCode,
            "Cmd-Enter": runCode,
            "Ctrl-Space": "autocomplete",
            "Ctrl-Q": function (cm) { cm.foldCode(cm.getCursor()); },
            "Ctrl-\\": (cm) => {
                CodeEditor.off("change");
                CodeEditor.swapDoc(
                    CodeMirror.Doc(
                        "// Type some code here.  Hit CTRL-\\ to clear \n\n\n\n", "javascript"
                    )
                );
                CodeEditor.on("change", localChangeFunc);
            },
        },
        foldGutter: true,
        autoCloseBrackets: true,
        gutters: ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        mode: "lp",
        onLoad: setLanguageMode
        // VIM MODE!
        //keyMap: "vim",
        //matchBrackets: true,
        //showCursorWhenSelecting: true,
        //inputStyle: "contenteditable"
    });
    CodeEditor.setOption("theme", "abcdef");

    window.ce = CodeEditor;

    //var commandDisplay = document.querySelectorAll('[id|=command-display]');
    //var keys = '';
    //CodeMirror.on(CodeEditor, 'vim-keypress', function (key) {
    //    keys = keys + key;
    //    for (let cd of commandDisplay)
    //        cd.innerHTML = keys;
    //});
    //CodeMirror.on(CodeEditor, 'vim-command-done', function (e) {
    //    keys = '';
    //    for (let cd of commandDisplay)
    //        cd.innerHTML = keys;
    //});


    /**
     * History code CodeMirror editor instance. See {@link https://codemirror.net/doc/manual.html}
     * @namespace CodeMirror
     * @memberOf LivePrinter
     */
    const HistoryCodeEditor = CodeMirror.fromTextArea(document.getElementById("history-code-editor"), {
        lineNumbers: true,
        scrollbarStyle: "simple",
        styleActiveLine: true,
        lineWrapping: true,
        undoDepth: 4, // updated too often for high numbers
        highlightAsyncMatches: true,
        tabMode: "indent", // or "spaces", "default", "shift"
        enterMode: "indent", // or "keep", "flat"
        //autocomplete: true,
        extraKeys: {
            /* TODO: implement history code running
            "Ctrl-Enter": runCode, // handles aync
            "Shift-Enter": runCode,
            "Cmd-Enter": runCode,
            */
            "Ctrl-Space": "autocomplete",
            "Ctrl-Q": function (cm) { cm.foldCode(cm.getCursor()); },
            "Ctrl-\\": (cm) => {
                HistoryCodeEditor.off("change");
                HistoryCodeEditor.swapDoc(
                    HistoryCodeEditor.Doc(
                        "// Type some code here.  Hit CTRL-\\ to clear \n\n\n\n", "javascript"
                    )
                );
                HistoryCodeEditor.on("change", historyChangeFunc);
            }
        },
        foldGutter: true,
        autoCloseBrackets: true,
        gutters: ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        mode: "lp",
        theme: "abcdef"
    });

    /**
     * CodeMirror code editor instance (compiled gcode). See {@link https://codemirror.net/doc/manual.html}
     * @memberOf LivePrinter
     */
    const GCodeEditor = CodeMirror.fromTextArea(document.getElementById("gcode-editor"), {
        lineNumbers: true,
        scrollbarStyle: "simple",
        styleActiveLine: true,
        lineWrapping: true,
        undoDepth: 20,
        //autocomplete: true,
        extraKeys: {
            "Ctrl-Enter": runEditorGCode,
            "Cmd-Enter": runEditorGCode,
            "Ctrl-Space": "autocomplete",
            "Ctrl-Q": function (cm) { cm.foldCode(cm.getCursor()); }
        }
    });


    //hide tab-panel after codeMirror rendering (by removing the extra 'active' class)
    $('.hideAfterLoad').each(function () {
        $(this).removeClass('active');
    });

    //HistoryCodeEditor.hide(); // hidden to start

    // CodeMirror stuff

    //const WORD = /[\w$]+/g, RANGE = 500;
    /*
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
    */

    /**
     * Clear HTML of all displayed code errors
     */
    function clearError() {
        $(".code-errors").html("<p>[no errors]</p>");
        $("#modal-errors").empty();
    }

    /**
     * Show an error in the HTML GUI  
     * @param {Error} e Standard JavaScript error object to show
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SyntaxError
     * @memberOf LivePrinter
     */
    function doError(e) {

        if (typeof e !== "object") {
            $("#modal-errors").prepend("<div class='alert alert-warning alert-dismissible fade show' role='alert'>"
                + "internal Error in doError(): bad error object:" + e
                + '<button type="button" class="close" data-dismiss="alert" aria-label="Close">'
                + '<span aria-hidden="true">&times;</span></button>'
                + "</div>");
        }
        else {
            let err = e;
            if (e.error !== undefined) err = e.error;
            const lineNumber = err.lineNumber == null ? -1 : e.lineNumber;

            // avoid repeated errors!!!
            if (scope.lastErrorMessage !== undefined && err.message !== scope.lastErrorMessage) {
                scope.lastErrorMessage = err.message;
                // report to user
                $(".code-errors").html("<p>" + err.name + ": " + err.message + " (line:" + lineNumber + ")</p>");

                $("#modal-errors").prepend("<div class='alert alert-warning alert-dismissible fade show' role='alert'>"
                    + err.name + ": " + err.message + " (line:" + lineNumber + ")"
                    + '<button type="button" class="close" data-dismiss="alert" aria-label="Close">'
                    + '<span aria-hidden="true">&times;</span></button>'
                    + "</div>");

                Logger.log(err);
            }
        }

        /*
        Logger.log("SyntaxError? " + (e instanceof SyntaxError)); // true
        Logger.log(e); // true
        Logger.log("SyntaxError? " + (e instanceof SyntaxError)); // true
        Logger.log("ReferenceError? " + (e instanceof ReferenceError)); // true
        Logger.log(e.message);                // "missing ; before statement"
        Logger.log(e.name);                   // "SyntaxError"
        Logger.log(e.fileName);               // "Scratchpad/1"
        Logger.log(e.lineNumber);             // 1
        Logger.log(e.columnNumber);           // 4
        Logger.log(e.stack);                  // "@Scratchpad/1:2:3\n"
        */

        // this sucked because of coding... jst highlight instead!
        /*
        if (e.lineNumber) {
            // remember that syntax errors start at line 1 which is line 0 in CodeMirror!
            CodeEditor.setSelection({ line: (e.lineNumber-1), ch: e.columnNumber }, { line: (e.lineNumber-1), ch: (e.columnNumber + 1) });
        }
        */
    }
    window.doError = doError;

    //-------------------------------------------------------------------------------------------------------------------------
    //-------------------------------------------------------------------------------------------------------------------------
    //-------------------------------------------------------------------------------------------------------------------------
    //----------- LIVEPRINTER BACKEND JSON-RPC API ----------------------------------------------------------------------------
    //-------------------------------------------------------------------------------------------------------------------------
    //-------------------------------------------------------------------------------------------------------------------------

    window.maxCodeWaitTime = 4 * 60 * 1000; // max time the limiter waits for scheduled code before dropping job -- in ms

    function initLimiter() {
        // Bottleneck rate limiter package: https://www.npmjs.com/package/bottleneck
        // prevent more than 1 request from running at a time, provides priority queing
        const _limiter = new Bottleneck({
            maxConcurrent: 1,
            highWater: 10000, // max jobs, good to set for performance
            minTime: 25, // (ms) How long to wait after launching a job before launching another one.
            strategy: Bottleneck.strategy.LEAK // cancel lower-priority jobs if over highwater
        });
        
        _limiter.on("error", (error) => {
            /* handle errors here */
            let errorTxt = error;
            try {
                errorTxt = `${JSON.stringify(error)}`;
            }
            catch (err) {
                errorTxt = error + "";
            }
            doError(Error(errorTxt));
            logerror(`Limiter error: ${errorTxt}`);
        });

        // Listen to the "failed" event
        _limiter.on("failed", async (error, jobInfo) => {
            const id = jobInfo.options.id;
            Logger.warn(`Job ${id} failed: ${error}`);
            logerror(`Job ${id} failed: ${error}`);
            if (jobInfo.retryCount === 0) { // Here we only retry once
                logerror(`Retrying job ${id} in 20ms!`);
                return;
            }
            return 0;
        });

        _limiter.on("dropped", (dropped) => {
            Logger.warn("limiter dropped:");
            Logger.warn(dropped);
            let errorTxt = "";
            try {
                errorTxt = `${JSON.stringify(dropped)}`;
            }
            catch (err) {
                errorTxt = dropped + "";
            }
            doError(Error(errorTxt));
            logerror(`Dropped job ${errorTxt}`);
            //   This will be called when a strategy was triggered.
            //   The dropped request is passed to this event listener.
        });

        return _limiter;
    }

    window.codeLimiter = initLimiter(); // runs code in a scheduler: see globalEval()
    window.codeLine = 0; // limiter again

    let limiter = initLimiter(); // Bottleneck rate limiter for priority async queueing

    const scheduleReservior = async () => {
        const reservoir = await limiter.currentReservoir();
        $("input[name='queued']")[0].value = reservoir;
    };

    function getQueued() {
        return limiter.queued();
    }


    /**
     * Stops and clears the current queue of events. Should cancel all non-running actions. No new events can be added after this.
     */
    async function stopLimiter() {
        if (limiter) {
            await limiter.stop({ dropWaitingJobs: true });
            limiter.disconnect(); // clear interval and allow memory to be freed
            loginfo("Limiter stopped.");
        }
        limiter = null;
        Logger.log("Shutdown completed!");
        return;
    }

    /**
     * Effectively cleares the current queue of events and restarts it. Should cancel all non-running actions.
     */
    async function restartLimiter() {
        loginfo("Limiter restarting");
        await stopLimiter();
        limiter = initLimiter();
        return;
    }
    window.scope.restartLimiter = restartLimiter;

    /**
     * Send a JSON-RPC request to the backend, get a response back. See below implementations for details.
     * @param {Object} request JSON-RPC formatted request object
     * @returns {Object} response JSON-RPC response object
     */

    async function sendJSONRPC(request) {
        //Logger.log(request)
        let args = typeof request === "string" ? JSON.parse(request) : request;
        //args._xsrf = getCookie("_xsrf");
        //Logger.log(args);
        let reqId = "req" + requestId++; // shared with limiter - see above

        if (logAjax) commandsHandler.log(`SENDING ${reqId}::${request}`);

        let response = "awaiting response";
        try {
            response = await $.ajax({
                url: "http://localhost:8888/jsonrpc",
                type: "POST",
                data: JSON.stringify(args),
                timeout: window.scope.ajaxTimeout // might be a long wait on startup... printer takes time to start up and dump messages
            });
        }
        catch (error) {
            // statusText field has error ("timeout" in this case)
            response = JSON.stringify(error, null, 2);
            console.error(response);
            logerror(response);
        }
        if (undefined !== response.error) {
            logerror(response);
        }

        if (logAjax) commandsHandler.log(`RECEIVED ${reqId}::${request}`);
        return response;
    }
    window.scope.sendJSONRPC = sendJSONRPC;


    /**
    * json-rpc printer state (connected/disconnected) event handler
    * @param{Object} stateEvent json-rpc response (in json format)
    * @memberOf LivePrinter
    */
    const printerStateHandler = function (stateEvent) {
        //loginfo(JSON.stringify(stateEvent));

        if (stateEvent.result === undefined) {
            logerror("bad state event" + JSON.stringify(stateEvent));
            return;
        } else {
            const printerTab = $("#header");
            const printerState = stateEvent.result[0].state;
            const printerPort = stateEvent.result[0].port === ("/dev/null" || "null") ? "dummy" : stateEvent.result[0].port;
            const printerBaud = stateEvent.result[0].baud;

            switch (printerState) {
                case "connected":
                    if (!printerTab.hasClass("blinkgreen")) {
                        printerTab.addClass("blinkgreen");
                    }
                    // highlight connected port
                    $("#serial-ports-list").children().each((i, elem) => {
                        let $elem = $(elem);
                        if (elem.innerText === printerPort) {
                            if (!$elem.hasClass("active")) {
                                $elem.addClass("active");
                                $("#connect-btn").text("disconnect").addClass("active"); // toggle connect button
                            }
                        } else {
                            $elem.removeClass("active");
                        }
                    });
                    $("#baudrates-list").children().each((i, elem) => {
                        let $elem = $(elem);
                        if (elem.innerText === printerBaud) {
                            if (!$elem.hasClass("active")) {
                                $elem.addClass("active");
                            }
                        } else {
                            $elem.removeClass("active");
                        }
                    });
                    break;
                case "closed":
                    printerTab.removeClass("blinkgreen");
                    break;
                case "error":
                    printerTab.removeClass("blinkgreen");
                    break;
            }
        }
    };



    /**
     * json-rpc serial ports list event handler
     * @param{Object} event json-rpc response (in json format)
     * @memberOf LivePrinter
     */
    const portsListHandler = async function (event) {
        let ports = ["none"];
        try {
            ports = event.result[0].ports;
        }
        catch (e) {
            console.error("Bad event in portsListHandler:");
            console.error(event);
            console.error(e);
            throw e;
        }

        window.scope.serialPorts = []; // reset serial ports list
        let portsDropdown = $("#serial-ports-list");
        //Logger.log("list of serial ports:");
        //Logger.log(event);
        portsDropdown.empty();
        if (ports.length === 0) {
            appendLoggingNode($("#info > ul"), Date.now(), "<li>no serial ports found</li > ");
            window.scope.serialPorts.push("dummy");
        }
        else {
            let msg = "<ul>Serial ports found:";
            for (let p of ports) {
                msg += "<li>" + p + "</li>";
                window.scope.serialPorts.push(p);
            }
            msg += "</ul>";
            appendLoggingNode($("#info > ul"), Date.now(), msg);
        }

        window.scope.serialPorts.forEach(function (port) {
            //Logger.log("PORT:" + port);
            let newButton = $('<button class="dropdown-item" type="button" data-port-name="' + port + '">' + port + '</button>');
            //newButton.data("portName", port);
            newButton.click(async function (e) {
                e.preventDefault();
                const me = $(this);
                loginfo("opening serial port " + me.html());
                const baudRate = $("#baudrates-list .active").data("rate");

                Logger.log("baudRate:");
                Logger.log(baudRate);

                // disable changing baudrate and port
                //$("#baudrates-list > button").addClass("disabled");
                //$("#serial-ports-list > button").addClass("disabled");

                await setSerialPort({ port, baudRate });

                await getPrinterState(); // check if we are conncected truly
                $("#serial-ports-list > button").removeClass("active");
                me.addClass("active");
                $("#connect-btn").text("disconnect").addClass("active"); // toggle connect button
                return;
            });
            portsDropdown.append(newButton);
        });

        // build baud rates selection menu

        const allBaudRates = [115200, 250000, 230400, 57600, 38400, 19200, 9600];

        allBaudRates.forEach(rate => {
            //Logger.log("PORT:" + port);
            let newButton = $('<button class="dropdown-item" type="button" data-rate="' + rate + '">' + rate + '</button>');

            // handle click
            newButton.click(async function (e) {
                e.preventDefault();
                const me = $(this);
                $("#baudrates-list .active").removeClass("active");
                me.addClass("active");
            });

            // default rate
            if (rate === 250000) {
                newButton.addClass("active");
            }
            $("#baudrates-list").append(newButton);
        });

        blinkElem($("#serial-ports-list"));
        blinkElem($("#info-tab"));

        return;
    };


    /**
    * Get the list of serial ports from the server (or refresh it) and display in the GUI (the listener will take care of that)
    * @memberOf LivePrinter
    * @returns {Object} result Returns json object containing result
    */
    async function getSerialPorts() {
        const message = {
            'jsonrpc': '2.0',
            'id': 6,
            'method': 'get-serial-ports',
            'params': []
        };
        const result = await sendJSONRPC(JSON.stringify(message));

        await portsListHandler(result);
        return result;
    }
    // expose as global
    window.scope.getSerialPorts = getSerialPorts;

    /**
        * Set the serial port from the server (or refresh it) and display in the GUI (the listener will take care of that)
        * @memberOf LivePrinter
        * @param {String} port Name of the port (machine)
        * @returns {Object} result Returns json object containing result
        */
    async function setSerialPort({ port, baudRate }) {
        const message = {
            'jsonrpc': '2.0',
            'id': 5,
            'method': 'set-serial-port',
            'params': [port, baudRate]
        };
        const response = await sendJSONRPC(JSON.stringify(message));
        if (undefined === response.result || undefined === response.result[0] || typeof response.result[0] === "string") {
            logerror("bad response from set serialPort():");
            logerror(JSON.stringify(response));
        }
        else {
            loginfo("connected to port " + response.result[0].port[0] + " at baud rate " + response.result[0].port[1]);
            loginfo("startup messages:");
            for (const msg of response.result[0].messages) {
                loginfo(msg);
            }
        }

        return response;
    }
    // expose as global
    window.scope.setSerialPort = setSerialPort;

    /**
        * Set the current commands line number on the printer (in case of resend)
        * @memberOf LivePrinter
        * @param {int} int new line number
        * @returns {Object} result Returns json object containing result
        */
    async function setCurrentLine(lineNumber) {
        const message = {
            'jsonrpc': '2.0',
            'id': 7,
            'method': 'set-line',
            'params': [lineNumber]
        };
        const response = await sendJSONRPC(JSON.stringify(message));
        if (undefined === response.result || undefined === response.result[0] || response.result[0].startsWith('ERROR')) {
            logerror("bad response from set setCurrentLine():");
            logerror(JSON.stringify(response));
        }
        else {
            loginfo("set line number " + response.result[0].line);
        }

        return response;
    }
    // expose as global
    window.scope.setline = setCurrentLine;

    /**
        * Get the connection state of the printer and display in the GUI (the listener will take care of that)
        * @memberOf LivePrinter
        * @returns {Object} result Returns json object containing result
        */
    let gettingState = false;

    async function getPrinterState() {
        if (!gettingState) {
            const message = {
                'jsonrpc': '2.0',
                'id': 3,
                'method': 'get-printer-state',
                'params': []
            };
            const response = await sendJSONRPC(JSON.stringify(message));
            if (undefined === response) {
                logerror("bad response from set getPrinterState():");
                logerror(JSON.stringify(response));
            }
            else {
                printerStateHandler(response);
            }
            return response;
        }
        return null;
    }
    // expose as global
    window.scope.getPrinterState = getPrinterState;


    //-------------------------------------------------------------------------------------------------------------------------
    //-------------------------------------------------------------------------------------------------------------------------
    //-------------------------------------------------------------------------------------------------------------------------
    //----------- GCODE PREPARING/SENDING -------------------------------------------------------------------------------------
    //-------------------------------------------------------------------------------------------------------------------------
    //-------------------------------------------------------------------------------------------------------------------------


    /**
     * Strip GCode comments from text. Comments can be embedded in a line using parentheses () or for the remainder of a lineusing a semi-colon.
     * The semi-colon is not treated as the start of a comment when enclosed in parentheses.
     * Borrowed from {@link https://github.com/cncjs/gcode-parser/blob/master/src/index.js} (MIT License)
     * See {@link http://linuxcnc.org/docs/html/gcode/overview.html#gcode:comments}
     * @param {String} line Line of GCode to strip comments from 
     * @returns {String} line without comments
     * @memberOf LivePrinter
     */
    const stripComments = (line) => {
        const re1 = new RegExp(/\s*\([^\)]*\)/g); // Remove anything inside the parentheses
        const re2 = new RegExp(/\s*;.*/g); // Remove anything after a semi-colon to the end of the line, including preceding spaces
        //const re3 = new RegExp(/\s+/g);
        return line.replace(re1, '').replace(re2, ''); //.replace(re3, ''));
    };



    function handleGCodeResponse(res) {
        ///
        /// should only get 4 back (result from gcode)
        ///
        switch (res.id) {
            case 1: loginfo("1 received");
                /// catch: there is no 1!
                break;
            case 2: loginfo("close serial port received");
                break;
            case 3: loginfo("printer state received");
                // keys: time, port, state
                break;
            case 4: //loginfo("gcode response");
                if (res.result !== undefined) {
                    for (const rr of res.result) {
                        //loginfo('gcode reply:' + rr);
                        if (rr.startsWith('ERROR')) {
                            logerror(rr);
                        }
                        else if (!moveHandler(rr)) {
                            if (!rr.match(/ok/i)) loginfo(rr);
                            else
                                if (rr.match(/[Ee]rror/)) doError(rr);
                                else if (tempParser(rr)) {
                                    Logger.debug('temperature event handled');
                                }
                        }
                    }
                }
                break;
            case 5: loginfo("connection result");
                if (res.result !== undefined) {
                    // keys: time, port, messages
                    loginfo(res.result);
                }
                break;
            case 6: loginfo("port names");
                break;
            default: loginfo(res.id + " received");
        }
        updateGUI(); // update after response
    }



    /**
     * Send GCode to the server via json-rpc over ajax.
     * @param {string} gcode gcode to send
     * @param {Integer} priority Priority in queue (0-9 where 0 is highest)
     
     * @memberOf LivePrinter
     * @returns {Object} result Returns json object containing result
     */
    async function sendGCodeRPC(gcode) {
        // remove all comments from lines and reconstruct
        let gcodeLines = gcode.replace(new RegExp(/\n+/g), '\n').split('\n');
        let cleanGCode = gcodeLines.map(l => stripComments(l)).filter(l => l !== '\n');

        //Logger.log(cleanGCode);

        // add comment with date and time
        const dateStr = '; ' + (new Date()).toLocaleString('en-US',
            {
                hour12: false,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }
        ) + '\n';

        // ignore temperature or other info commands - no need to save these!
        if (!/M114|M105/.test(gcode)) {

            const doc = GCodeEditor.getDoc();
            let line = doc.lastLine();
            const pos = {
                "line": line,
                "ch": doc.getLine(line).length
            };
            const gcodeText = '\n' + dateStr + cleanGCode.join('\n');
            doc.replaceRange(gcodeText, pos);
            GCodeEditor.refresh();
            let newpos = { line: doc.lastLine(), ch: doc.getLine(line).length };
            GCodeEditor.setSelection(pos, newpos);
            GCodeEditor.scrollIntoView(newpos);
        }

        let gcodeObj = { "jsonrpc": "2.0", "id": 4, "method": "send-gcode", "params": [] };
        if (logAjax) commandsHandler.log(`SENDING gcode ${cleanGCode}`);

        if (Array.isArray(cleanGCode)) {
            //Logger.debug("start array gcode[" + codeLine + "]");

            const results = await Promise.all(cleanGCode.map(async (gcode) => {
                gcodeObj.params = [gcode];
                //Logger.log(gcodeObj);
                const response = sendJSONRPC(JSON.stringify(gcodeObj));
                response.then((result) => { Logger.debug(result); handleGCodeResponse(result) });
                return response;
            }));
            //Logger.debug("finish array gcode[" + codeLine + "]");
        } else {
            //Logger.debug("single line gcode");
            gcodeObj.params = [cleanGCode];
            const response = await sendJSONRPC(JSON.stringify(gcodeObj), priority);
            handleResult(response);
        }
        if (logAjax) commandsHandler.log(`DONE gcode ${cleanGCode}`);
        //Logger.debug(`DONE gcode ${codeLine}`);
        return 1;
    }

    /**
     * Schedule GCode to be sent to the server, in order, using the limiter via json-rpc over ajax.
     * @param {string} gcode gcode to send
     * @param {Integer} priority Priority in queue (0-9 where 0 is highest)
     
     * @memberOf LivePrinter
     * @returns {Object} result Returns json promise object containing printer response
     */
    async function scheduleGCode(gcode, priority = 4) { // 0-9, lower higher
        let result = null;
        if (window.scope.useLimiter) {
            // use limiter for priority scheduling
            let reqId = "req" + requestId++;
            if (logAjax) commandsHandler.log(`SENDING ${reqId}`);
            try {
                result = await limiter.schedule(
                    { "priority": priority, weight: 1, id: reqId, expiration: maxCodeWaitTime },
                    async () => await sendGCodeRPC(gcode)
                );
            }
            catch (err) {
                logerror(`Error with ${reqId}:: ${err}`);
            }
            if (logAjax) commandsHandler.log(`RECEIVED ${reqId}`);
        }
        return result;
    }


    /**
     * Run GCode from the editor by sending to the server.
     * @memberOf LivePrinter
     * @param {string} _gcode gcode to send
     * @returns {Object} result Returns json object containing result
     */
    async function runEditorGCode(_gcode) {
        let gcode = GCodeEditor.getSelection();
        const cursor = GCodeEditor.getCursor();

        // parse first??
        let validCode = true;

        if (!gcode) {
            // info level
            //Logger.log("no selections");
            gcode = GCodeEditor.getLine(cursor.line);
            GCodeEditor.setSelection({ line: cursor.line, ch: 0 }, { line: cursor.line, ch: gcode.length });
        }
        const result = await scheduleGCode(gcode);
        // debugging:
        //if (result.result !== undefined)
        //    for (const res of result.result) {
        //        Logger.debug(res);
        //    }
        return result;
    }

    /**
     * This function takes the highlighted "local" code from the editor and runs the compiling and error-checking functions.
     * @memberOf LivePrinter
     */
    async function runCode() {

        // if printer isn't connected, we shouldn't run!
        let printerConnected = $("#header").hasClass("blinkgreen");
        if (!printerConnected) {
            clearError();
            const err = new Error("Printer not connected! Please connect first using the printer settings tab.");
            doError(err);
            throw err;
            //TODO: BIGGER ERROR MESSAGE HERE
        }
        else {

            let code = CodeEditor.getSelection();
            const cursor = CodeEditor.getCursor();

            if (!code) {
                // info level
                //Logger.log("no selections");
                code = CodeEditor.getLine(cursor.line);
                CodeEditor.setSelection({ line: cursor.line, ch: 0 }, { line: cursor.line, ch: code.length });
            }
            // blink the form
            blinkElem($("form"));

            // run code
            try {
                window.codeLine++; // increment times we've run code
                await globalEval(code, cursor.line + 1);
            }
            catch (err) {
                window.codeLine--; // go back 
                doError("runCode/globalEval:" + err);
            }
        }
    }

    /**
     * RequestRepeat:
     * Utility to send a JSON-RPC request repeatedly whilst a "button" is pressed (i.e. it has an "active" CSS class)
     * @param {Object} jsonObject JSON-RPC to repeat
     * @param {JQuery} activeElem JQuery element to check for active class (will keep running whist is has an "active" class)
     * @param {Integer} delay Delay between repeated successful calls in millis
     * @param {Function} func Callback to run on result
     * @param {Integer} priority Priority of request in queue (0-9 where 0 is highest)
     * @returns {Object} JsonRPC response object
     */
    async function requestRepeat(gcode, activeElem, delay, func, priority = 1) {
        const result = await scheduleGCode(gcode, priority);
        func(result);

        const running = activeElem.hasClass("active");

        setTimeout(async () => {
            if (!running) return;
            else {
                await requestRepeat(gcode, activeElem, delay, func, priority);
            }
        }, delay);

        return true;
    }
    /**
     * Parse temperature response from printer firmware (Marlin)
     * @param {String} data serial response from printer firmware (Marlin)
     * @return {Boolean} true or false if parsed or not
     */
    const tempParser = (data) => {
        let parsed = true;

        if (undefined !== data.hotend) {

            try {
                let tmp = parseFloat(data.hotend).toFixed(2);
                let target = parseFloat(data.hotend_target).toFixed(2);
                let tmpbed = parseFloat(data.bed).toFixed(2);
                let targetbed = parseFloat(data.bed_target).toFixed(2);

                $("input[name='temphot']").val(target);
                $("input[name='tempbed']").val(targetbed);
                let $tt = $("input[name='temphot-target']")[0];
                if ($tt !== $(document.activeElement)) $tt.value = tmp;
                $("input[name='tempbed-target']").val(tmpbed);
            } catch (e) {
                parsed = false;
            }
        }
        else {
            const result = MarlinLineParserResultTemperature.parse(data);
            if (!result) parsed = false;
            else {
                if (undefined !== result.payload.extruder) {
                    $("input[name='temphot']").val(result.payload.extruder.deg);
                    // make sure user isn't typing in this
                    let $tt = $("input[name='temphot-target']")[0];
                    if ($tt !== $(document.activeElement)) $tt.value = result.payload.extruder.degTarget;
                }
                if (undefined !== result.payload.heatedBed) {
                    $("input[name='tempbed']").val(result.payload.heatedBed.deg);
                    let $tt = $("input[name='tempbed-target']")[0];
                    if ($tt !== $(document.activeElement)) $tt.value = result.payload.heatedBed.degTarget;
                }
            }
        }
        return parsed;
    };

    /**
     * json-rpc temperature event handler
     * @param {Object} tempEvent JSON-RPC event result
     * @return {Any} result or parser
     * @memberOf LivePrinter
     */
    const tempHandler = (tempEvent) => {
        //Logger.log("temp event:");
        //Logger.log(tempEvent);
        const data = tempEvent.result[0];

        return tempParser(tempEvent.result[0]); // first object in results array
    };

    async function updateTemperature(interval = 5000) {
        return requestRepeat("M115", //get temp
            $("#temp-display-btn"), // temp button
            interval,
            tempHandler,
            3); // higher priority
    }


    $("#temp-display-btn").on("click", async function (e) {
        let me = $(this);
        let doUpdates = !me.hasClass('active'); // because it becomes active *after* a push
        if (doUpdates) {
            me.text("stop polling temperature");
            updateTemperature();
        }
        else {
            me.text("start polling Temperature");
        }
        me.button('toggle');
    });


    $("#log-requests-btn").on("click", async function (e) {
        let me = $(this);
        let doUpdates = !me.hasClass('active'); // because it becomes active *after* a push
        if (doUpdates) {
            me.text("stop logging ajax");
            logAjax = true;
        }
        else {
            me.text("start logging ajax");
            logAjax = false;
        }
        me.button('toggle');
    });


    /**
     * Function to start or stop polling for printer state updates
     * @param {Boolean} state true if starting, false if stopping
     * @param {Integer} interval time interval between updates
     * @memberOf LivePrinter
     */
    const updatePrinterState = function (state, interval = 20000) {
        const name = "stateUpdates";

        if (state) {
            // schedule state updates every little while
            window.scope.Scheduler.scheduleEvent({
                name: name,
                delay: interval,
                run: async (time) => {
                    await getPrinterState();
                },
                repeat: true,
                system: true // system event, non-cancellable by user
            });
        } else {
            // stop updates
            window.scope.Scheduler.removeEventByName(name);
        }
    };

    /*
    * START SETTING UP SESSION VARIABLES ETC>
    * **************************************
    * 
    */

    //////////////////////////////////////////////////////////////////////
    // Listeners for printer events  /////////////////////////////////////
    //////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////


    // message to tell printer to send all responses 
    const responseJSON = JSON.stringify({
        "jsonrpc": "2.0",
        "id": 4,
        "method": "response",
        "params": []
    });


    /**
     * json-rpc error event handler
     * @memberOf LivePrinter
     */
    const errorHandler = {
        'error': function (event) {
            appendLoggingNode($("#errors > ul"), event.time, event.message);
            blinkElem($("#errors-tab"));
            blinkElem($("#inbox"));
        }
    };

    /**
     * json-rpc info event handler
     * @memberOf LivePrinter
     */
    const infoHandler = {
        'info': function (event) {
            appendLoggingNode($("#info > ul"), event.time, event.message);
            //blinkElem($("#info-tab"));
        },
        'resend': function (event) {
            appendLoggingNode($("#info > ul"), event.time, event.message);
            blinkElem($("#info-tab"));
            blinkElem($("#inbox"));
        }
    };

    /**
     * json-rpc general event handler
     * @memberOf LivePrinter
     */
    const commandsHandler = {
        'log': function (event) {
            appendLoggingNode($("#commands > ul"), Date.now(), event);
            blinkElem($("#inbox"));
        },
    };


    /**
     * json-rpc move event handler
     * @memberOf LivePrinter
     */
    const moveHandler = (response) => {
        $("input[name='speed']").val(window.scope.printer.printSpeed); // set speed, maybe reset below
        // update GUI
        $("input[name='retract']")[0].value = window.scope.printer.currentRetraction;

        return moveParser(response);
    };

    const moveParser = (data) => {
        let result = MarlinLineParserResultPosition.parse(data);

        if (!result) return false;
        window.scope.printer.x = parseFloat(result.payload.pos.x);
        window.scope.printer.y = parseFloat(result.payload.pos.y);
        window.scope.printer.z = parseFloat(result.payload.pos.z);
        window.scope.printer.e = parseFloat(result.payload.pos.e);

        $("input[name='x']").val(result.payload.pos.x);
        $("input[name='y']").val(result.payload.pos.y);
        $("input[name='z']").val(result.payload.pos.z);
        $("input[name='e']").val(result.payload.pos.e);
        return true;
    };


    ////////////////////////////////////////////////////////////////////////
    /////////////// Utility functions
    ///////////////////////////////////////////////////////////////////////

    const maxLogPopups = 80;

    /**
     * Append a dismissible, styled text node to one of the side menus, formatted appropriately.
     * @param {jQuery} elem JQuery element to append this to
     * @param {Number} time Time of the event
     * @param {String} message message text for new element
     * @memberOf LivePrinter
     */
    function appendLoggingNode(elem, time, message) {
        const dateStr = new Intl.DateTimeFormat('en-US', {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            hour12: false
        }).format(new Date(time));

        //if (elem.children().length > maxLogPopups) {
        //    elem.children().
        // }

        elem.prepend("<li class='alert alert-primary alert-dismissible fade show' role='alert'>"
            + dateStr
            + '<strong>'
            + ": " + message
            + '</strong>'
            + '<button type="button" class="close" data-dismiss="alert" aria-label="Close">'
            + '<span aria-hidden="true">&times;</span></button>'
            + "</li>");
    }

    var taskListener =
    {
        EventRemoved: function (task) {
            Logger.log("event removed:");
            Logger.log(task);
            if (task != null) $('#task-' + task.name).remove();
        },

        EventAdded: function (task) {
            Logger.log("event added:");
            Logger.log(task);

            $("#tasks > ul").prepend("<li id='task-" + task.name + "' class='alert alert-success alert-dismissible fade show' role='alert'>"
                + task.name
                + '<strong>'
                + ": " + task.delay
                + '</strong>'
                + (!task.system ? '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' : '')
                + "</li>");

            $('#task-' + task.name).on('close.bs.alert',
                () => window.scope.Scheduler.removeEventByName(task.name)
            );
        },

        EventsCleared: function (task) {
            Logger.log("events cleared:");
            Logger.log(task);
            $("#tasks > ul").empty();
        },

        EventRun: function (task) {
            blinkElem($('#task-' + task.name));
        }
    };

    window.scope.Scheduler.addEventsListener(taskListener);

    /**
     * Add a cancellable task to the scheduler and also the GUI 
     * @param {Any} task either scheduled task object or name of task plus a function for next arg
     * @param {Function} func Async function, if name was passed as 1st arg
     * @memberOf LivePrinter
     */
    function addTask(task, interval, func) {

        if (func === undefined) {
            //try remove first
            window.scope.Scheduler.removeEventByName(task.name);
            window.scope.Scheduler.scheduleEvent(task);
        }
        else {
            if (typeof task === "string" && func === undefined) throw new Error("AddTask: no function passed!");
            //try remove first
            window.scope.Scheduler.removeEventByName(task);
            const t = new Task;
            t.name = task;
            t.delay = interval;
            t.run = func;
            window.scope.Scheduler.scheduleEvent(t);
        }
    }
    window.addTask = addTask;

    function getTask(name) {
        return window.scope.Scheduler.getEventByName(name);
    }

    window.getTask = getTask;

    function removeTask(name) {
        return window.scope.Scheduler.removeEventByName(name);
    }

    window.removeTask = removeTask;


    /**
    * Log a line of text to the logging panel on the right side
    * @param {String} text Text to log in the right info panel
     * @memberOf LivePrinter
    */
    function loginfo(text) {
        //Logger.debug("LOGINFO-----------");
        Logger.debug(text);

        if (Array.isArray(text)) {
            infoHandler.info({ time: Date.now(), message: '['+text.toString()+']' });
        }
        else if (typeof text === "string") {
            infoHandler.info({ time: Date.now(), message: text });
        }
        else if (typeof text === "object") {
            infoHandler.info({ time: Date.now(), message: JSON.stringify(text) });
        }
        else {
            infoHandler.info({ time: Date.now(), message: text + "" });
        }
    }

    /**
    * Log a line of text to the logging panel on the right side
    * @param {String} text Text to log in the right info panel
     * @memberOf LivePrinter
    */
    function logerror(text) {
        Logger.log("LOGERROR-----------");
        Logger.log(text);

        if (typeof text === "string")
            errorHandler.error({ time: Date.now(), message: text });
        else if (typeof text === "object") {
            errorHandler.error({ time: Date.now(), message: JSON.stringify(text) });
        }
        else if (typeof text === "array") {
            errorHandler.error({ time: Date.now(), message: text.toString() });
        }
        else {
            errorHandler.error({ time: Date.now(), message: text + "" });
        }
    }


    // make global
    window.loginfo = loginfo;
    window.logerror = logerror;

    /**
     * Attach an external script (and remove it quickly). Useful for adding outside libraries.
     * @param {String} url Url of script (or name, if in the static/misc folder)
     */
    function attachScript(url) {
        let realUrl = url;

        if (url.startsWith('/')) { // local
            realUrl = url;
        }
        else
            if (!url.startsWith('http')) {
                // look in misc folder
                realUrl = "/static/misc/" + url;
            }
        let script = document.createElement("script");
        script.src = realUrl;
        // run and remove
        try {
            document.head.appendChild(script).parentNode.removeChild(script);
        } catch (err) {
            doError(err);
        }
    }
    window.attachScript = attachScript;

    /**
     * Download a file. From stack overflow
     * @param {any} data Data in file
     * @param {String} filename Name of file to save as
     * @param {String} type Type of file (e.g. text/javascript)
     * @memberOf LivePrinter
     */
    function downloadFile(data, filename, type) {
        var file = new Blob([data], { type: type });
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            var a = document.createElement("a"),
                url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////// GUI SETUP /////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////////////////

    $("#gcode").select();  // focus on code input


    function updateGUI() {
        $("input[name='x']").val(window.scope.printer.x);
        $("input[name='y']").val(window.scope.printer.y);
        $("input[name='z']").val(window.scope.printer.z);
        $("input[name='e']").val(window.scope.printer.e);
        $("input[name='angle']").val(window.scope.printer.angle);
        $("input[name='speed']").val(window.scope.printer.printSpeed);
        $("input[name='retract']").val(window.scope.printer.currentRetraction);
    }
    window.scope.updateGUI = updateGUI;

    /**
     * blink an element using css animation class
     * @param {JQuery} $elem element to blink
     * @param {String} speed "fast" or "slow" 
     * @param {Function} callback function to run at end
     * @memberOf LivePrinter
     */

    function blinkElem($elem, speed, callback) {
        $elem.removeClass("blinkit fast slow"); // remove to make sure it's not there
        $elem.on("animationend", function () {
            if (callback !== undefined && typeof callback === "function") callback();
            $(this).removeClass("blinkit fast slow");
        });
        if (speed === "fast") {
            $elem.addClass("blinkit fast");
        }
        else if (speed === "slow") {
            $elem.addClass("blinkit slow");
        } else {
            $elem.addClass("blinkit");
        }
    }

    /**
     * Toggle the language mode for livecoding scripts between Javascript and Python.
     * @memberOf LivePrinter
     */
    function setLanguageMode() {
        if (pythonMode) {
            CodeEditor.setOption("gutters", ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]);
            CodeEditor.setOption("mode", "text/x-python");
            CodeEditor.setOption("lint", true);

            HistoryCodeEditor.setOption("gutters", ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]);
            HistoryCodeEditor.setOption("mode", "text/x-python");
            HistoryCodeEditor.setOption("lint", true);

        } else {
            CodeEditor.setOption("gutters", ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "CodeMirror-foldgutter"]);
            CodeEditor.setOption("mode", "lp");
            CodeEditor.setOption("lint", false);
            //CodeEditor.setOption("lint", {
            //    globalstrict: false,
            //    strict: false,
            //    esversion: 6
            //});

            HistoryCodeEditor.setOption("gutters", ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "CodeMirror-foldgutter"]);
            HistoryCodeEditor.setOption("mode", "lp");
            HistoryCodeEditor.setOption("lint", {
                globalstrict: true,
                strict: false,
                esversion: 6
            });
        }
    }

    /**
     * build examples loader links for dynamically loading example files
     * @memberOf LivePrinter
     */
    let exList = $("#examples-list > .dropdown-item").not("[id*='session']");
    exList.on("click", function () {
        let me = $(this);
        let filename = me.data("link");
        clearError(); // clear loading errors
        var jqxhr = $.ajax({ url: filename, dataType: "text" })
            .done(function (content) {
                let newDoc = CodeMirror.Doc(content, "javascript");
                blinkElem($(".CodeMirror"), "slow", () => CodeEditor.swapDoc(newDoc));
            })
            .fail(function () {
                doError({ name: "error", message: "file load error:" + filename });
            });
    });

    $("#connect-btn").on("click", async function (e) {
        e.preventDefault();
        loginfo("OPENING SERIAL PORT");

        const notCalledFromCode = !(e.namespace !== undefined && e.namespace === "");
        if (notCalledFromCode) {
            const me = $(this);
            const connected = me.hasClass('active'); // because it becomes active *after* a push

            // try disconnect
            if (connected) {
                const selectedPort = $("#serial-ports-list .active");
                if (selectedPort.length > 0) {
                    loginfo("Closing open port " + selectedPort.html());
                    // check for non-code-initiated click
                    const message = {
                        'jsonrpc': '2.0',
                        'id': 2,
                        'method': 'close-serial-port',
                        'params': []
                    };
                    const response = await sendJSONRPC(message);

                    if (response.result.length > 0 && response.result[0] === "closed") {
                        me.text("connect");
                        $("#serial-ports-list > button").removeClass("active").removeClass("disabled");
                        $("#baudrates-list > button").removeClass("disabled");

                        // this is how we check if connected!
                        $("#header").removeClass("blinkgreen");
                    }
                    else {
                        errorHandler.error({ time: Date.now(), event: "could not disconnect serial port" });
                    }
                }
            }

            else {
                const selectedPort = $("#serial-ports-list .active");
                if (selectedPort.length < 1) {
                    me.removeClass('active');
                }
                else {
                    loginfo("Opening port " + selectedPort.html());
                    me.text("disconnect");
                    selectedPort.click(); // trigger connection using active port
                }
            }
        }
    });

    $('a[data-toggle="pill"]').on('shown.bs.tab', function (e) {
        const target = $(e.target).attr("href"); // activated tab
        if (target === "#history-code-editor-area") {
            HistoryCodeEditor.refresh();
            setLanguageMode(); // have to update gutter, etc.
            clearError();
        }
        else if (target === "#code-editor-area") {
            CodeEditor.refresh();
            setTimeout(setLanguageMode, 1000); // have to update gutter, etc.
            clearError();
        }
        else if (target === "#gcode-editor-area") {
            GCodeEditor.refresh();
        }
    });

    //
    // redirect error to browser GUI
    //
    $(window).on("error", function (evt) {
        //Logger.log("jQuery error event:");
        //Logger.log(evt);

        const e = evt.originalEvent.error; // get the javascript event
        //Logger.log("original event:", e);
        doError(e);
    });

    $("#sendCode").on("click", runCode);

    $(".btn-download").on("click", () => {
        // add comment with date and time
        const dateStr = '_' + (new Date()).toLocaleString('en-US',
            {
                hour12: false,
                year: '2-digit',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }
        );
        downloadFile(CodeEditor.getDoc().getValue(), "LivePrinterCode" + dateStr + ".js", 'text/javascript');
        downloadFile(GCodeEditor.getDoc().getValue(), "LivePrinterGCode" + dateStr + ".js", 'text/javascript');
        downloadFile(HistoryCodeEditor.getDoc().getValue(), "LivePrinterHistoryCode" + dateStr + ".js", 'text/javascript');
    });


    // temperature buttons
    $("#basic-addon-tempbed").on("click", () => window.scope.printer.bed(parseFloat($("input[name=tempbed]")[0].value)));
    $("#basic-addon-temphot").on("click", () => window.scope.printer.temp(parseFloat($("input[name=temphot]")[0].value)));

    $("#basic-addon-angle").on("click", () => window.scope.printer.turnto(parseFloat($("input[name=angle]")[0].value)));

    $("#basic-addon-retract").on("click", () => window.scope.printer.currentRetraction = parseFloat($("input[name=retract]")[0].value));


    $("#refresh-serial-ports-btn").on("click", async function (e) {
        e.preventDefault();
        if (!this.working) {
            this.working = true;
        }
        else {
            await getSerialPorts();
            this.working = false;
        }
        return true;
    });

    $("#python-mode-btn").on("click", function (e) {
        e.preventDefault();
        const me = $(this);
        pythonMode = !me.hasClass('active'); // because it becomes active *after* a push

        if (pythonMode) {
            me.text("python mode");
        }
        else {
            me.text("javascript mode");
        }
        setLanguageMode(); // update codemirror editor
    });

    /*
     * Clear printer queue on server 
     */
    $("#clear-btn").on("click", restartLimiter);


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
     *     Logger.log(e);
     *     Logger.log((e.x-e.px) + "," + (e.y-e.py));
     *   }, 20);
     * @memberOf LivePrinter
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
                    Logger.log("mouse move:" + evt.pageX + "," + evt.pageY);
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

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////// Browser storage /////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////

    /**
    * Local Storage for saving/loading documents.
    * Default behaviour is loading the last edited session.
    * @param {String} type type (global key in window object) for storage object 
    * @returns {Boolean} true or false, if storage is available
    * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
    * @memberOf LivePrinter
    */
    function storageAvailable(type) {
        try {
            const storage = window[type],
                x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        }
        catch (e) {
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

    const editedLocalKey = "editedLoc";
    const savedLocalKey = "savedLoc";

    const editedHistoryKey = "editedHist";
    const savedGlobalKey = "savedHist";

    const localChangeFunc = cm => {
        let txt = cm.getDoc().getValue();
        localStorage.setItem(editedLocalKey, txt);
    };

    const historyChangeFunc = cm => {
        let txt = cm.getDoc().getValue();
        localStorage.setItem(editedHistoryKey, txt);
    };

    CodeEditor.on("change", localChangeFunc);

    HistoryCodeEditor.on("change", historyChangeFunc);

    let reloadLocalSession = () => {
        CodeEditor.off("change");
        let newFile = localStorage.getItem(editedLocalKey);
        if (newFile !== undefined && newFile) {
            blinkElem($(".CodeMirror"), "slow", () => {
                CodeEditor.swapDoc(
                    CodeMirror.Doc(
                        newFile, "javascript"
                    )
                );
                CodeEditor.on("change", localChangeFunc);
            });
        }
        CodeEditor.refresh();
    };

    // clear it, only save during session
    let reloadHistorySession = () => {
        HistoryCodeEditor.off("change");
        localStorage.removeItem(editedHistoryKey);
        HistoryCodeEditor.on("change", historyChangeFunc);
        HistoryCodeEditor.refresh();
    };

    $("#reload-edited-session").on("click", reloadLocalSession);

    $("#save-session").on("click", () => {
        CodeEditor.off("change");
        let txt = CodeEditor.getDoc().getValue();
        localStorage.setItem(savedKey, txt);
        blinkElem($(".CodeMirror"), "fast", () => {
            CodeEditor.on("change", localChangeFunc);
        });
        // mark as reload-able
        $("#reload-saved-session").removeClass("graylink");
    });

    // start as non-reloadable
    $("#reload-saved-session").addClass("graylink");

    $("#reload-saved-session").on("click", () => {
        CodeEditor.off("change");
        let newFile = localStorage.getItem(savedKey);
        if (newFile !== undefined && newFile) {
            blinkElem($(".CodeMirror"), "slow", () => {
                CodeEditor.swapDoc(
                    CodeMirror.Doc(
                        newFile, "javascript"
                    )
                );
                CodeEditor.on("change", localChangeFunc);
            });
        }
    });


    /**
      * Evaluate the code in local (within closure) or global space according to the current editor mode (javascript/python).
      * @param {string} code to evaluate
      * @param {integer} line line number for error displaying
      * @param {Boolean} globally true if executing in global space, false (normal) if executing within closure to minimise side-effects
      * @memberOf LivePrinter
      */
    async function globalEval(code, line, globally = false) {
        clearError();

        ///
        /// log code to code history window -------------------
        ///

        // add comment with date and time
        const dateStr = (new Date()).toLocaleString('en-US',
            {
                hour12: false,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }
        ) + '\n';

        const doc = HistoryCodeEditor.getDoc();
        let lastLine = doc.getLine(doc.lastLine());
        const pos = {
            "line": doc.lastLine(),
            "ch": lastLine.length
        };
        const codeText = "//" + dateStr + code + (code.endsWith('\n') ? '' : '\n');
        doc.replaceRange(codeText, pos);
        HistoryCodeEditor.refresh();
        lastLine = doc.getLine(doc.lastLine());
        const newpos = { line: doc.lastLine(), ch: lastLine.length };
        HistoryCodeEditor.setSelection(pos, newpos);
        HistoryCodeEditor.scrollIntoView(newpos);
        ///
        /// end logging code to code history window -----------------------------
        ///


        Logger.debug("code before pre-processing-------------------------------");
        Logger.debug(code);
        Logger.debug("========================= -------------------------------");

        // compile in minigrammar

        // Create a Parser object from our grammar.
        // global var grammar created by /static/lib/nearley/lpgrammar.js
        // global var nearley created by /static/lib/nearley/nearley.js


        // in code, find blocks inside ## ## and feed to grammar

        const grammarBlockRegex = /\#\#\s*([^\#][\w\d\s\(\)\{\}\.\,\|\:\"\'\+\-\/\*]+)\s*\#\#\s*/gm;

        const grammarOneLineRegex = /\s*\#{1,}\s*([^\#][\w\d\ \t\(\)\{\}\.\,\|\:\"\'\+\-\/\*]+)[\ \t]*(\#?)\s*/gm;

        const commentRegex = /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm; // https://stackoverflow.com/questions/5989315/regex-for-match-replacing-javascript-comments-both-multiline-and-inline/15123777#15123777

        code = code.replace(commentRegex, (match, p1) => {
            return p1;
        });

        // replace globals in js
        code = code.replace(/^[ ]*global[ ]+/gm, "window.");

        //
        // try block element grammar replacement FIRST because one-liner matches part
        //
        //code = code.replace(/([\r\n]+)/gm, "|").substring(^\s*(\|), "").replace(grammarFinderRegex, (match, p1) => {
        // TODO: fix multiline (split?)

        const blockparser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar)); // parser for entire block

        code = code.replace(grammarBlockRegex, (match, p1) => {
            //Logger.log("Match: " + p1);

            let result = "";
            let fail = false; // if not successful
            let lines = p1.split(/[\r\n]/);

            lines.map((line) => {
                // get ride of remaining line breaks and leading spaces
                line = line.replace(/([\r\n]+)/gm, "").replace(/(^[\s]+)/, "");
                if (line.length === 0) {
                    return;
                }

                else {
                    try {
                        blockparser.feed(line + '\n'); // EOL terminates command
                    } catch (e) { // SyntaxError on parse
                        doError(e);
                        Logger.log(e);
                        fail = e.message;
                    }

                    if (fail !== false)
                        result += "/*ERROR IN PARSE: " + fail + "*/\n";
                    //else
                    //result += parser.results[0] + "\n";
                }
            }); // end compiling line by line

            result += blockparser.results[0];

            return ' ' + result + "\n"; // need leading space
        });

        Logger.log("code AFTER block-grammar processing -------------------------------");
        Logger.log(code);
        Logger.log("========================= -------------------------------");


        //
        // try one liner grammar replacement
        //
        let grammarFound = false; // if this line contains the lp grammar
        // note: p3 is the optional trailing # that can be ignored
        code = code.replace(grammarOneLineRegex, (match, p1, p2) => {
            const lineparser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

            //Logger.log("!!!"+match+"!!!");
            //Logger.log("!!!"+p2+"!!!");
            grammarFound = true; // found!
            let result = "";
            let fail = false; // if not successful
            // .replace(/(^[\s]+)/, "")
            let line = p1.replace(/([\r\n]+)/gm, "").replace(/([\s]+)$/, "");

            //Logger.log("LINE::" + line + "::LINE");
            if (line) {
                try {
                    lineparser.feed(line + '\n');
                } catch (e) { // SyntaxError on parse
                    doError(e);
                    Logger.log(e);
                    fail = e.message;
                    Logger.log("offending code:[" + line + "]");
                }

                if (fail !== false)
                    result += "/*ERROR IN PARSE: [" + fail + "] + offending code: [" + line + "]" + "*/\n";
                else
                    result = lineparser.results[0];
                //Logger.log(result);
            }
            return ' ' + result;
        });

        Logger.log("code AFTER one-line-grammar processing -------------------------------");
        Logger.log(code);
        Logger.log("========================= -------------------------------");

        if (code) {
            if (pythonMode) {


                code = "from browser import document as doc\nfrom browser import window as win\nlp = win.scope.printer\ngcode = win.scope.scheduleGCode\n"
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
                // Logger.log(code);
                // eval(code);
            }
            else {
                // wrap in async limiter/queue
                code =
                    'const result = await codeLimiter.schedule({ priority:1,weight:1,id:codeIndex,expiration:maxCodeWaitTime},async()=>{ ' +
                    code + "\nreturn 1;});\n";
                
                // wrap in try/catch block and debugging code
                code = 'try {\n' +
                    "let codeIndex = " + window.codeLine + ';\n' +
                    "\nif (logAjax) loginfo(`starting code ${codeIndex}`);\n" +
                    code + '\n' +
                    "if (logAjax) loginfo(`finished with ${codeIndex}`);\n" +
                    '} catch (e) { window.scope.lastErrorMessage = null;e.lineNumber=' + line + ';Logger.log(e);window.doError(e); }';

                // prefix with locals to give quick access to liveprinter API
                code = "let lp = window.scope.printer;" +
                    "let sched = window.scope.Scheduler;" +
                    "let updateGUI = window.scope.updateGUI;" +
                    "let stop = window.scope.restartLimiter;" +
                    "let s = window.scope;\n" +
                    code;

                // wrap in global function call
                code = "window.codeToRun = async () => {\n" +
                    code +
                    "\n}";

                Logger.debug(code);
            }

            //Logger.log("adding code:" + code);
            const script = document.createElement("script");
            script.async = true;
            script.onerror = doError;
            script.type = "text/javascript";
            script.onerror = console.log;
            script.text = code;

            try {
                const scriptTag = document.head.appendChild(script);
                Logger.debug("script tag created");
                const didIt = await window.codeToRun(); // run code
                scriptTag.parentNode.removeChild(script);
            } catch (e) {
                doError(e);
            }
        }
        return;
    }
    // end globalEval

    ///----------------------------------------------------------------------------
    ///--------Start running things------------------------------------------------
    ///----------------------------------------------------------------------------

    // start scheduler!
    window.scope.Scheduler.startScheduler();

    await getSerialPorts();

    updatePrinterState(true); // start updating printer connection state


    if (storageAvailable('localStorage')) {
        // finally, load the last stored session:
        reloadHistorySession(); // actually, clear it
        reloadLocalSession();
    }
    else {
        errorHandler.error({ name: "save error", message: "no local storage available for saving files!" });
    }
    // disable form reloading on code compile
    $('form').submit(false);

    //brython(10);
})().catch(err => {
    console.error(err);
});
