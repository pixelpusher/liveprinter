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

import { __esModule } from "bootstrap";
import { Logger  } from "liveprinter-utils";

const logger = new Logger();

const liveprinterui = require('./liveprinter.ui');
const doError = liveprinterui.doError;

const vars = Object.create(null); // session vars
exports.vars = vars;
window.vars = vars;

vars.serialPorts = []; // available ports

// this uses the limiting queue, but that affects performance for fast operations (< 250ms)
vars.useLimiter = true;

vars.logAjax = false; // log all ajax request/response pairs for debugging to command panel

vars.ajaxTimeout = 60000; // 1 minute timeout for ajax calls (API calls to the backend server)

vars.requestId = 0;

//-------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------
//----------- LIVEPRINTER BACKEND JSON-RPC API ----------------------------------------------------
//-------------------------------------------------------------------------------------------------

window.maxCodeWaitTime = 0; // max time the limiter waits for scheduled code before dropping job -- in ms

function initLimiter() {
    // Bottleneck rate limiter package: https://www.npmjs.com/package/bottleneck
    // prevent more than 1 request from running at a time, provides priority queing
    const _limiter = new Bottleneck({
        maxConcurrent: 1,
        highWater: 10000, // max jobs, good to set for performance
        minTime: 0, // (ms) How long to wait after launching a job before launching another one.
        strategy: Bottleneck.strategy.LEAK // cancel lower-priority jobs if over highwater
    });

    _limiter.on("error", async (error) => {
        /* handle errors here */
        let errorTxt = error;
        try {
            errorTxt = `${JSON.stringify(error)}`;
        }
        catch (err) {
            errorTxt = error + "";
        }
        doError(Error(errorTxt));
        liveprinterui.logerror(`Limiter error: ${errorTxt}`);

        await restartLimiter();
    });

    // Listen to the "failed" event
    _limiter.on("failed", async (error, jobInfo) => {
        const id = jobInfo.options.id;
        logger.warn(`Job ${id} failed: ${error}`);
        liveprinterui.logerror(`Job ${id} failed: ${error}`);
        // if (jobInfo.retryCount === 0) { // Here we only retry once
        //     liveprinterui.logerror(`Retrying job ${id} in 5ms!`);
        //     return 5;
        // }
    
    });

    // Listen to the "retry" event
    _limiter.on("retry", (error, jobInfo) => liveprinterui.logerror(`Now retrying ${jobInfo.options.id}`));

    _limiter.on("dropped", (dropped) => {
        logger.warn("limiter dropped:");
        logger.warn(dropped);
        let errorTxt = "";
        try {
            errorTxt = `${JSON.stringify(dropped)}`;
        }
        catch (err) {
            errorTxt = dropped + "";
        }
        doError(Error(errorTxt));
        liveprinterui.logerror(`Dropped job ${errorTxt}`);
        //   This will be called when a strategy was triggered.
        //   The dropped request is passed to this event listener.
    });

    return _limiter;
}

let limiter = initLimiter(); // runs code in a scheduler: see ui/globalEval()
// Bottleneck rate limiter for priority async queueing



/**
 * HACK -- needs fixing!
 * @returns {Object} BottleneckJS limiter object. Dangerous.
 */
const getLimiter = () => limiter;

exports.getLimiter = getLimiter;

/**
 * Schedules code to run in the async queue (e.g. limiter)
 * @param  {...any} args Limiter options object (see Bottleneckjs) and list of other function arguments 
 * @returns 
 */
const scheduleFunction = async (...args) => limiter.schedule(...args);

exports.scheduleFunction = scheduleFunction;

/**
 *  
 * @returns {Number} number of queued functions to run
 */
function getQueued() {
    return limiter.queued();
}

exports.getQueued = getQueued;

/**
 * Stops and clears the current queue of events. Should cancel all non-running actions. No new events can be added after this.
 */
async function stopLimiter() {
    if (limiter) {
        await limiter.stop({ dropWaitingJobs: true });
        limiter.disconnect(); // clear interval and allow memory to be freed
        liveprinterui.loginfo("Limiter stopped.");
    }
    limiter = null;
    logger.log("Shutdown completed!");
    return;
}

/**
 * Effectively cleares the current queue of events and restarts it. Should cancel all non-running actions.
 */
async function restartLimiter() {
    liveprinterui.loginfo("Limiter restarting");
    await stopLimiter();
    limiter = initLimiter();
    return;
}
exports.restartLimiter = restartLimiter;

/**
 * Send a JSON-RPC request to the backend, get a response back. See below implementations for details.
 * @param {Object} request JSON-RPC formatted request object
 * @returns {Object} response JSON-RPC response object
 */

async function sendJSONRPC(request) {
    //logger.log(request)
    let args = typeof request === "string" ? JSON.parse(request) : request;
    //args._xsrf = getCookie("_xsrf");
    //logger.log(args);
    let reqId = "req" + vars.requestId++; // shared with limiter - see above

    if (vars.logAjax) liveprinterui.commandsHandler.log(`SENDING ${reqId}::${request}`);

    let response = "awaiting response";
    try {
        response = await $.ajax({
            url: `${location.protocol}//${location.host}/jsonrpc`,
            type: "POST",
            data: JSON.stringify(args),
            timeout: vars.ajaxTimeout // might be a long wait on startup... printer takes time to start up and dump messages
        });
    }
    catch (error) {
        // statusText field has error ("timeout" in this case)
        response = JSON.stringify(error, null, 2);
        const statusText = `JSON error response communicating with server:<br/>${response}<br/>Orig:${request}`; 
        console.error(statusText);
        liveprinterui.logerror(statusText);
    }
    if (undefined !== response.error) {
        liveprinterui.logerror(`JSON error response communicating with server:<br/>${JSON.stringify(response.error, null, 2)}<br/>Orig:${request}`);
    }

    if (vars.logAjax) liveprinterui.commandsHandler.log(`RECEIVED ${reqId}::${request}`);
    return response;
}


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
    liveprinterui.loginfo('getting serial ports');
    return sendJSONRPC(JSON.stringify(message));
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
        liveprinterui.logerror("bad response from set serialPort():");
        liveprinterui.logerror(JSON.stringify(response));
    }
    else {
        liveprinterui.loginfo("connected to port " + response.result[0].port[0] + " at baud rate " + response.result[0].port[1]);
        liveprinterui.loginfo("startup messages:");
        for (const msg of response.result[0].messages) {
            liveprinterui.loginfo(msg);
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
        liveprinterui.logerror("bad response from set setCurrentLine():");
        liveprinterui.logerror(JSON.stringify(response));
    }
    else {
        liveprinterui.loginfo("set line number " + response.result[0].line);
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
            liveprinterui.logerror("bad response from set getPrinterState():");
            liveprinterui.logerror(JSON.stringify(response));
        }
        else {
            liveprinterui.printerStateHandler(response);
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
    if (vars.logAjax) liveprinterui.commandsHandler.log(`SENDING gcode ${gcode}`);

    if (Array.isArray(gcode)) {

        const results = await Promise.all(gcode.map(async (_gcode) => {
            if (!_gcode.startsWith(';')) // don't send comments
            {
                gcodeObj.params = [_gcode];
                //logger.log(gcodeObj);
                let response = sendJSONRPC(JSON.stringify(gcodeObj));
                response.then((result) => { logger.debug(result); handleGCodeResponse(result) }).catch(err => {
                    liveprinterui.logerror(err);
                    doError(err);
                    response = Promise.reject(err.message);
                });
                return response;
            }
        }));
        liveprinterui.updateGUI();

    } else {
        //logger.debug("single line gcode");
        if (!gcode.startsWith(';')) // don't send comments
        {
            gcodeObj.params = [gcode];
            const response = await sendJSONRPC(JSON.stringify(gcodeObj));
            handleGCodeResponse(response);
            liveprinterui.updateGUI();

        }
    }
    if (vars.logAjax) liveprinterui.commandsHandler.log(`DONE gcode ${gcode}`);
    return 1;
}

exports.sendGCodeRPC = sendGCodeRPC;

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
        if (vars.logAjax) liveprinterui.commandsHandler.log(`SENDING ${reqId}`);
        try {
            result = await limiter.schedule(
                { "priority": priority, weight: 1, id: reqId, expiration: maxCodeWaitTime },
                async () => await sendGCodeRPC(gcode)
            );
        }
        catch (err) {
            liveprinterui.logerror(`Error with ${reqId}:: ${err}`);
        }
        if (vars.logAjax) liveprinterui.commandsHandler.log(`RECEIVED ${reqId}`);
    }
    return result;
}

exports.scheduleGCode = scheduleGCode;


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
 * Handles logging of a GCode response from the server
 * @param {Object} res 
 * @returns Boolean whether handled or not
 */
function handleGCodeResponse(res) {
    let handled = true;

    ///
    /// should only get 4 back (result from gcode)
    ///
    switch (res.id) {
        case 1: liveprinterui.loginfo("1 received");
            /// catch: there is no 1!
            break;
        case 2: liveprinterui.loginfo("close serial port received");
            break;
        case 3: liveprinterui.loginfo("printer state received");
            // keys: time, port, state
            break;
        case 4: //liveprinterui.loginfo("gcode response");
            if (res.result !== undefined) {
                for (const rr of res.result) {
                    //liveprinterui.loginfo('gcode reply:' + rr);
                    // check for error
                    if (rr.toLowerCase().match(/error/m)) {
                        liveprinterui.logerror(rr);
                        handled = false;
                    }
                    // try move handler
                    else if (liveprinterui.moveHandler(rr)) {
                        // move/position update handled
                        logger.debug('position event handled');
                    }
                    else if (liveprinterui.tempHandler(rr)) {
                        logger.debug('temperature event handled');
                    }
                    else if (!rr.match(/ok/i)) liveprinterui.loginfo('gcode response: ' + rr); // other response
                    else {
                        logger.debug('unhandled gcode response: ' + rr);
                        handled = false;
                    }
                }
            }
            break;
        case 5: liveprinterui.loginfo("connection result");
            if (res.result !== undefined) {
                // keys: time, port, messages
                liveprinterui.loginfo(res.result);
            }
            break;
        case 6: liveprinterui.loginfo("port names");
            break;
        default: liveprinterui.loginfo(res.id + " received");
    }
    return handled;
}
exports.handleGCodeResponse = handleGCodeResponse;

