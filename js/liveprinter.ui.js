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

const Bottleneck = require('bottleneck');

const MarlinParsers = require('./parsers/MarlinParsers');
const util = require('./util'); // utility functions
const Task = util.Task;
const Vector = util.Vector; // vector class
const Scheduler = util.Scheduler;
const Logger = util.Logger;
const compile = require('./language/compile'); // minigrammar compile function

const Printer = require('./liveprinter.printer'); // printer API object

var $ = require('jquery');

let vars = Object.create(null); // session vars
window.vars = vars;

vars.serialPorts = []; // available ports

let lastErrorMessage = "none"; // last error message for GUI

// this uses the limiting queue, but that affects performance for fast operations (< 250ms)
vars.useLimiter = true;

vars.logAjax = false; // log all ajax request/response pairs for debugging to command panel

vars.ajaxTimeout = 60000; // 1 minute timeout for ajax calls (API calls to the backend server)

vars.requestId = 0;

const scheduler = new Scheduler();

// liveprinter object
const printer = new Printer(scheduleGCode, doError);

if (window.printer) delete window.printer;
window.printer = printer; // make available to script later on, pollutes but oh well...

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
window.restartLimiter = restartLimiter; // expose to GUI, FIXME


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
    let reqId = "req" + vars.requestId++; // shared with limiter - see above

    if (vars.logAjax) commandsHandler.log(`SENDING ${reqId}::${request}`);

    let response = "awaiting response";
    try {
        response = await $.ajax({
            url: "http://localhost:8888/jsonrpc",
            type: "POST",
            data: JSON.stringify(args),
            timeout: vars.ajaxTimeout // might be a long wait on startup... printer takes time to start up and dump messages
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

    if (vars.logAjax) commandsHandler.log(`RECEIVED ${reqId}::${request}`);
    return response;
}

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
exports.getSerialPorts = getSerialPorts;

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
exports.setSerialPort = setSerialPort;

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
exports.setline = setCurrentLine;

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
exports.getPrinterState = getPrinterState;




/**
 * Send GCode to the server via json-rpc over ajax.
 * @param {string} gcode gcode to send 
 * @memberOf LivePrinter
 * @returns {Object} result Returns json object containing result
 */
async function sendGCodeRPC(gcode) {

    let gcodeObj = { "jsonrpc": "2.0", "id": 4, "method": "send-gcode", "params": [] };
    if (vars.logAjax) commandsHandler.log(`SENDING gcode ${gcode}`);

    if (Array.isArray(gcode)) {
        //Logger.debug("start array gcode[" + codeLine + "]");

        const results = await Promise.all(gcode.map(async (_gcode) => {
            gcodeObj.params = [_gcode];
            //Logger.log(gcodeObj);
            const response = sendJSONRPC(JSON.stringify(gcodeObj));
            response.then((result) => { Logger.debug(result); handleGCodeResponse(result) });
            return response;
        }));
        //Logger.debug("finish array gcode[" + codeLine + "]");
    } else {
        //Logger.debug("single line gcode");
        gcodeObj.params = [gcode];
        const response = await sendJSONRPC(JSON.stringify(gcodeObj));
        handleGCodeResponse(response);
    }
    if (vars.logAjax) commandsHandler.log(`DONE gcode ${gcode}`);
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

    if (vars.useLimiter) {
        // use limiter for priority scheduling
        let reqId = "req" + vars.requestId++;
        if (vars.logAjax) commandsHandler.log(`SENDING ${reqId}`);
        try {
            result = await limiter.schedule(
                { "priority": priority, weight: 1, id: reqId, expiration: maxCodeWaitTime },
                async () => await sendGCodeRPC(gcode)
            );
        }
        catch (err) {
            logerror(`Error with ${reqId}:: ${err}`);
        }
        if (vars.logAjax) commandsHandler.log(`RECEIVED ${reqId}`);
    }
    return result;
}

exports.scheduleGCode = scheduleGCode;

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
        scheduler.scheduleEvent({
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
        scheduler.removeEventByName(name);
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

scheduler.addEventsListener(taskListener);

/**
 * Add a cancellable task to the scheduler and also the GUI 
 * @param {Any} task either scheduled task object or name of task plus a function for next arg
 * @param {Function} func Async function, if name was passed as 1st arg
 * @memberOf LivePrinter
 */
function addTask(task, interval, func) {

    if (func === undefined) {
        //try remove first
        scheduler.removeEventByName(task.name);
        scheduler.scheduleEvent(task);
    }
    else {
        if (typeof task === "string" && func === undefined) throw new Error("AddTask: no function passed!");
        //try remove first
        scheduler.removeEventByName(task);
        const t = new Task;
        t.name = task;
        t.delay = interval;
        t.run = func;
        scheduler.scheduleEvent(t);
    }
}
exports.addTask = addTask;

function getTask(name) {
    return scheduler.getEventByName(name);
}

exports.getTask = getTask;

function removeTask(name) {
    return scheduler.removeEventByName(name);
}

exports.removeTask = removeTask;


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
window.loginfo = loginfo;

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
exports.attachScript = attachScript;
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

exports.downloadFile = downloadFile;


/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////// GUI SETUP /////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////

function updateGUI() {
    $("input[name='x']").val(printer.x);
    $("input[name='y']").val(printer.y);
    $("input[name='z']").val(printer.z);
    $("input[name='e']").val(printer.e);
    $("input[name='angle']").val(printer.angle);
    $("input[name='speed']").val(printer.printSpeed);
    $("input[name='retract']").val(printer.currentRetraction);
}
window.updateGUI = updateGUI;

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
            code = "let lp = window.printer;" +
                //"let sched = scheduler;" +
                //"let updateGUI = .updateGUI;" +
                "let stop = window.restartLimiter;" +
                //"let s = window.scope;\n" +
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


const start = async function () {
    ///--------------------------------------
    ///---------setup GUI--------------------
    ///--------------------------------------
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
    $("#basic-addon-tempbed").on("click", () => printer.bed(parseFloat($("input[name=tempbed]")[0].value)));
    $("#basic-addon-temphot").on("click", () => printer.temp(parseFloat($("input[name=temphot]")[0].value)));

    $("#basic-addon-angle").on("click", () => printer.turnto(parseFloat($("input[name=angle]")[0].value)));

    $("#basic-addon-retract").on("click", () => printer.currentRetraction = parseFloat($("input[name=retract]")[0].value));


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

    ///----------------------------------------------------------------------------
    ///--------Start running things------------------------------------------------
    ///----------------------------------------------------------------------------

    // start scheduler!
    scheduler.startScheduler();

    await getSerialPorts();

    updatePrinterState(true); // start updating printer connection state
    // disable form reloading on code compile
    $('form').submit(false);

    //hide tab-panel after codeMirror rendering (by removing the extra 'active' class)
    $('.hideAfterLoad').each(function () {
        $(this).removeClass('active');
    });


    /// Clear printer queue on server 
    $("#clear-btn").on("click", restartLimiter);
};

exports.start = start;

exports.vars = vars;