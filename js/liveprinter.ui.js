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
const MarlinParsers = require('./parsers/MarlinParsers');
const util = require('./util'); // utility functions
const Logger = util.Logger;

const compile = require('./language/compile'); // minigrammar compile function

var $ = require('jquery');

const liveprintercomms = require('./liveprinter.comms');

let lastErrorMessage = "none"; // last error message for GUI

const vars = liveprintercomms.vars;

let scheduler = null; // task scheduler, see init()
let printer = null; // liveprinter printer object

/**
 * Clear HTML of all displayed code errors
 */
function clearError() {
    $(".code-errors").html("<p>[no errors]</p>");
    $("#modal-errors").empty();
}

exports.clearError = clearError;

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
        if (lastErrorMessage !== undefined && err.message !== lastErrorMessage) {
            lastErrorMessage = err.message;
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

/**
 * Function to start or stop polling for printer state updates
 * @param {Boolean} state true if starting, false if stopping
 * @param {Integer} interval time interval between updates
 * @memberOf LivePrinter
 */
const updatePrinterState = function (state, interval = 20000) {
    const name = "stateUpdates";

    if (!scheduler) {
        logerror("Warning: printer state update called but no scheduler!");
    } else {
        if (state) {
            // schedule state updates every little while
            scheduler.scheduleEvent({
                name: name,
                delay: interval,
                run: async (time) => {
                    try {
                        const state = await liveprintercomms.getPrinterState();
                        printerStateHandler(state);
                    }
                    catch (err) {
                        doError(err);
                    }
                },
                repeat: true,
                system: true // system event, non-cancellable by user
            });
        } else {
            // stop updates
            scheduler.removeEventByName(name);
        }
    }
};
exports.updatePrinterState = updatePrinterState;

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

exports.printerStateHandler = printerStateHandler;

/**
 * json-rpc serial ports list event handler
 * @param{Object} event json-rpc response (in json format)
 * @memberOf LivePrinter
 */
const portsListHandler = function (event) {
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

    vars.serialPorts = []; // reset serial ports list
    let portsDropdown = $("#serial-ports-list");
    //Logger.log("list of serial ports:");
    //Logger.log(event);
    portsDropdown.empty();
    if (ports.length === 0) {
        appendLoggingNode($("#info > ul"), Date.now(), "<li>no serial ports found</li > ");
        vars.serialPorts.push("dummy");
    }
    else {
        let msg = "<ul>Serial ports found:";
        for (let p of ports) {
            msg += "<li>" + p + "</li>";
            vars.serialPorts.push(p);
        }
        msg += "</ul>";
        appendLoggingNode($("#info > ul"), Date.now(), msg);
    }

    vars.serialPorts.forEach(function (port) {
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

            try {
                await liveprintercomms.setSerialPort({ port, baudRate });
            }
            catch (err) {
                doError(err);
            }
            try {
                const state = await liveprintercomms.getPrinterState(); // check if we are connected truly
                printerStateHandler(state);
            } catch (err) {
                doError(err);
            }
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

exports.portsListHandler = portsListHandler;

$("#log-requests-btn").on("click", async function (e) {
    let me = $(this);
    let doUpdates = !me.hasClass('active'); // because it becomes active *after* a push
    if (doUpdates) {
        me.text("stop logging ajax");
        vars.logAjax = true;
    }
    else {
        me.text("start logging ajax");
        vars.logAjax = false;
    }
    me.button('toggle');
});


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



/*
 * START SETTING UP SESSION VARIABLES ETC>
 * **************************************
 * 
 */

//////////////////////////////////////////////////////////////////////
// Listeners for printer events  /////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

/**
 * Parse temperature response from printer firmware (Marlin)
 * @param {String} data serial response from printer firmware (Marlin)
 * @return {Boolean} true or false if parsed or not
 */
const tempHandler = (data) => {
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
        const result = MarlinParsers.MarlinLineParserResultTemperature.parse(data);
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
exports.tempHandler = tempHandler;

async function updateTemperature(interval = 5000) {
    return requestRepeat("M105", //get temp
        $("#temp-display-btn"), // temp button
        interval,
        (res) => tempHandler(res.result[0]),
        3); // higher priority
}

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

exports.errorHandler = errorHandler;

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

exports.infoHandler = infoHandler;

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

exports.commandsHandler = commandsHandler;

/**
 * json-rpc move event handler
 * @memberOf LivePrinter
 */
const moveHandler = (response) => {
    $("input[name='speed']").val(printer.printSpeed); // set speed, maybe reset below
    // update GUI
    $("input[name='retract']")[0].value = printer.currentRetraction;

    return moveParser(response);
};

exports.moveHandler = moveHandler;


const moveParser = (data) => {
    let result = MarlinParsers.MarlinLineParserResultPosition.parse(data);

    if (!result) return false;

    printer.x = parseFloat(result.payload.pos.x);
    printer.y = parseFloat(result.payload.pos.y);
    printer.z = parseFloat(result.payload.pos.z);
    printer.e = parseFloat(result.payload.pos.e);

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

exports.appendLoggingNode = appendLoggingNode;



const taskListenerUI =
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
            () => scheduler.removeEventByName(task.name)
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



/**
* Log a line of text to the logging panel on the right side
* @param {String} text Text to log in the right info panel
 * @memberOf LivePrinter
*/
function loginfo(text) {
    //Logger.debug("LOGINFO-----------");
    Logger.debug(text);

    if (Array.isArray(text)) {
        infoHandler.info({ time: Date.now(), message: '[' + text.toString() + ']' });
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

exports.loginfo = loginfo;
window.loginfo = loginfo; //cheat, for livecoding...

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
exports.logerror = logerror;
window.logerror = logerror;  //cheat, for livecoding...

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
exports.attachScript = attachScript;
window.attachScript = attachScript;  //cheat, for livecoding...


/**
 * Download a file. From stack overflow
 * @param {any} data Data in file
 * @param {String} filename Name of file to save as
 * @param {String} type Type of file (e.g. text/javascript)
 * @memberOf LivePrinter
 */
async function downloadFile(data, filename, type) {
    const file = new Blob([data], { type: type });
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        const a = document.createElement("a"),
            url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        await (async () => (a.click()))();
        //setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        //}, 0);
    }
}

exports.downloadFile = downloadFile;



///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////// GUI SETUP ///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

function updateGUI() {
    $("input[name='x']").val(printer.x);
    $("input[name='y']").val(printer.y);
    $("input[name='z']").val(printer.z);
    $("input[name='e']").val(printer.e);
    $("input[name='angle']").val(printer.angle);
    $("input[name='speed']").val(printer.printSpeed);
    $("input[name='retract']").val(printer.currentRetraction);
}
exports.updateGUI = updateGUI;
window.updateGUI = updateGUI;  //cheat, for livecoding...

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

exports.blinkElem = blinkElem;

/**
  * Evaluate the code in local (within closure) or global space according to the current editor mode (javascript/python).
  * @param {string} code to evaluate
  * @param {integer} line line number for error displaying
  * @param {Boolean} globally true if executing in global space, false (normal) if executing within closure to minimise side-effects
  * @memberOf LivePrinter
  */
async function globalEval(code, line, globally = false) {
    clearError();

    const commentRegex = /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm; // https://stackoverflow.com/questions/5989315/regex-for-match-replacing-javascript-comments-both-multiline-and-inline/15123777#15123777

    code = code.replace(commentRegex, (match, p1) => {
        return p1;
    });

    // replace globals in js
    code = code.replace(/^[ ]*global[ ]+/gm, "window.");

    Logger.debug("code before pre-processing-------------------------------");
    Logger.debug(code);
    Logger.debug("========================= -------------------------------");

    //
    // compile in minigrammar
    //
    code = compile(code);

    if (code) {
        if ($("#python-mode-btn").hasClass('active')) { // check python mode

            code = "from browser import document as doc\nfrom browser import window as win\nlp = win.printer\n"
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
                "\nif (vars.logAjax) loginfo(`starting code ${codeIndex}`);\n" +
                code + '\n' +
                "if (vars.logAjax) loginfo(`finished with ${codeIndex}`);\n" +
                '} catch (e) { lastErrorMessage = null;e.lineNumber=' + line + ';Logger.log(e);window.doError(e); }';

            // prefix with locals to give quick access to liveprinter API
            code = "let stop = window.restartLimiter;" +
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

exports.globalEval = globalEval;


/**
 * 
 * @param {Scheduler} _scheduler Scheduler object to use for tasks, repeating events, etc. If
 *  undefined, will crearte new one. 
 */
const init = async function (_printer, _scheduler) {

    if (!_printer) {
        logerror("FATAL error: no liveprinter object in gui init()!");
        return;
    }
    else {
        printer = _printer;
    }

    // we can use our own, or the one passed in
    if (!_scheduler) scheduler = new util.Scheduler();
    else scheduler = _scheduler;

    ///--------------------------------------
    ///---------setup GUI--------------------
    ///--------------------------------------
    /**
 * build examples loader links for dynamically loading example files
 * @memberOf LivePrinter
 */

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

    // temperature buttons
    $("#basic-addon-tempbed").on("click", async () => printer.bed(parseFloat($("input[name=tempbed]")[0].value)));
    $("#basic-addon-temphot").on("click", async () => printer.temp(parseFloat($("input[name=temphot]")[0].value)));

    $("#basic-addon-angle").on("click", () => printer.turnto(parseFloat($("input[name=angle]")[0].value)));

    $("#basic-addon-retract").on("click", () => printer.currentRetraction = parseFloat($("input[name=retract]")[0].value));


    $("#refresh-serial-ports-btn").on("click", async function (e) {
        e.preventDefault();
        if (!this.working) {
            this.working = true;
        }
        else {
            try {
                const portsList = await getSerialPorts();
                await portsListHandler(portsList);
            }
            catch (err) {
                doError(err);
            }

            this.working = false;
        }
        return true;
    });

    // disable form reloading on code compile
    $('form').submit(false);

    //hide tab-panel after codeMirror rendering (by removing the extra 'active' class)
    $('.hideAfterLoad').each(function () {
        $(this).removeClass('active');
    });


    /// Clear printer queue on server 
    $("#clear-btn").on("click", liveprintercomms.restartLimiter);

    updatePrinterState(true);
};

exports.init = init;