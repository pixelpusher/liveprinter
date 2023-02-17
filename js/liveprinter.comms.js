/**
 * Communications between server, GUI, and events functionality for LivePrinter.
 * @module Comms
 * @typicalname comms
 * @author Evan Raskob <evanraskob+nosp4m@gmail.com>
 * @version 1.0
 * @license
 * Copyright (c) 2022 Evan Raskob and others
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

const compile = require('./language/compile'); // minigrammar compile function

import { MarlinLineParserResultPosition, MarlinLineParserResultTemperature } from './parsers/MarlinParsers.js';
import { __esModule } from "bootstrap";
import {updateGUI, clearError, tempHandler, moveHandler} from './liveprinter.ui';
import  Logger from 'liveprinter-utils/logger';

//------------------------------------------------
// feedback to the GUI or logger
//--------------------------------------------

// TODO: encapsulate this into a single call so it can be sent to a single listener as {type, data}
// instead of this mess of functions

let debug = (v)=>Logger.debug(v); // to be overridden by a real debug when loaded
module.exports.setDebug = f => debug=f; 

let doError = (v)=>Logger.error(v); // to be overridden by a real debug when loaded
module.exports.setDoError = f => doError=f; 

let logError = (v)=>Logger.error(v); // to be overridden by a real debug when loaded
module.exports.setLogError = f => logError=f; 

let logInfo = (v)=>Logger.info(v); // to be overridden by a real debug when loaded
module.exports.setLogInfo = f => logInfo=f; 


// was liveprinterUI.commandsHandler.log
let logCommands = (v)=>Logger.info(v); // to be overridden by a real debug when loaded
module.exports.setLogCommands = f => logCommands=f; 

//liveprinterUI.printerStateHandler
let logPrinterState = (v)=>Logger.info(v); // to be overridden by a real debug when loaded
module.exports.setLogPrinterState = f => logPrinterState=f; 

// TODO: these

//liveprinterUI.moveHandler
//updateGUI
//tempHandler
//clearError


/**
 * External libraries to include when compiling (evaluating) code from the live editor
 * @see main.js
 */

const lib = Object.create(null); // session vars

/**
 * Add external libs (as object keys) to the list of those to include whilst compiling
 * @param {Object} libs Object with external library functions as keys 
 */
module.exports.addLibs = function (libs) {
  Object.assign(lib, libs);  
}

/**
 * Global variables object collection.
 * @alias comms:vars
 */
const vars = Object.create(null); // session vars

module.exports.vars = vars;

vars.serialPorts = []; // available ports

vars.logAjax = false; // log all ajax request/response pairs for debugging to command panel

vars.ajaxTimeout = 60000; // 1 minute timeout for ajax calls (API calls to the backend server)

vars.requestId = 0;

//-------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------
//----------- LIVEPRINTER BACKEND JSON-RPC API ----------------------------------------------------
//-------------------------------------------------------------------------------------------------

window.maxCodeWaitTime = 5; // max time the limiter waits for scheduled code before dropping job -- in ms

/**
 * Creates a new limiter instance and returns it.
 * @returns {Bottleneck} Limiter queue instance
 */
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

        try {
            await restartLimiter();
        }
        catch (err) {
            errorTxt = "Limiter restart error (failed restart too)::" + errorTxt;
        }
        doError(Error(errorTxt));
        logError(`Limiter error: ${errorTxt}`);        
    });

    // Listen to the "failed" event
    _limiter.on("failed", async (error, jobInfo) => {
        const id = jobInfo.options.id;
        logError(`Job ${id} failed: ${error}`);
        // if (jobInfo.retryCount === 0) { // Here we only retry once
        //     logError(`Retrying job ${id} in 5ms!`);
        //     return 5;
        // }
    
    });

    // Listen to the "retry" event
    _limiter.on("retry", (error, jobInfo) => logError(`Now retrying ${jobInfo.options.id}`));

    _limiter.on("dropped", (dropped) => {
        logError("Limiter dropped job----------");
        let errorTxt = "";
        try {
            errorTxt = `${JSON.stringify(dropped)}`;
        }
        catch (err) {
            errorTxt = dropped + "";
        }
        doError(Error(errorTxt));
        logError(`Dropped job ${errorTxt}`);
        //   This will be called when a strategy was triggered.
        //   The dropped request is passed to this event listener.
    });

    _limiter.on('queued', async function (info){
        logInfo(`starting command...: ${_limiter.queued()}`);
        info.queued = _limiter.queued();
        
        try {
            await Promise.all(queuedListeners.map(async v=>v(info))); // don't schedule or we'll be in a loop!
        }
        catch (err)
        {
            err.message = "Error in queued event:" + err.message;
            doError(err);
        }
    })

    _limiter.on('done', async function (info) {
        info.queued = _limiter.queued(); 
        //logInfo(`done running command: ${_limiter.queued()}`);
        try {
            await Promise.all(doneListeners.map(async v => v(info))); // don't schedule or we'll be in a loop!
        }
        catch (err)
        {
            err.message = "Error in done event:" + err.message;
            doError(err);
        }
        
    });
    return _limiter;
}

/**
 * Private async queue (limiter) instance.
 */
let limiter = initLimiter(); // runs code in a scheduler: see ui/globalEval()
// Bottleneck rate limiter for priority async queueing



/**
 * HACK -- needs fixing! Gives access to limiter queue. Dangerous.
 * @returns {Object} BottleneckJS limiter object. Dangerous.
 * @alias comms:getLimiter
 */
function getLimiter()
{
    return limiter;
} 

module.exports.getLimiter = getLimiter;

/**
 * Schedules code to run in the async queue (e.g. limiter)
 * @param  {...any} args Limiter options object (see Bottleneckjs) and list of other function arguments 
 * @returns {PromiseFulfilledResult} From the docs: schedule() returns a promise that will be executed according to the rate limits.
 * @alias comms:scheduleFunction
 */
async function scheduleFunction(...args){
    return await limiter.schedule(...args);
} 

module.exports.scheduleFunction = scheduleFunction;


/**
 * Quickly schedules code to run in the async queue (e.g. limiter) with default args
 * @param  {...any} args Limiter options object (see Bottleneckjs) and list of other function arguments 
 * @returns {PromiseFulfilledResult} From the docs: schedule() returns a promise that will be executed according to the rate limits.
 * @alias comms:schedule
 */
 async function schedule(...args){
    logInfo(`scheduling: ${JSON.stringify(args)}`);
    return limiter.schedule({ priority:1, weight:1, id:codeIndex++ }, ...args);
} 

module.exports.schedule = schedule;



// index of code block running
let codeIndex = 0;

/**
  * Evaluate the code in local (within closure) or global space according to the current editor mode (javascript/python).
  * @param {string} code to evaluate
  * @param {integer} line line number for error displaying
  * @param {Boolean} globally true if executing in global space, false (normal) if executing within closure to minimise side-effects
  * @alias comms:globalEval
  */
 async function globalEval(code, line) {
    clearError();

    const commentRegex = /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm; // https://stackoverflow.com/questions/5989315/regex-for-match-replacing-javascript-comments-both-multiline-and-inline/15123777#15123777

    code = code.replace(commentRegex, (match, p1) => {
        return p1;
    });

    // replace globals in js
    code = code.replace(/^[ ]*global[ ]+/gm, "window.");

    debug("code before pre-processing-------------------------------");
    debug(code);
    debug("========================= -------------------------------");

    //
    // compile in minigrammar
    //
    try {
        code = compile(code);
    }
    catch (err)
    {
        debug("Compilation error:");
        doError(err);
        return 1; // stop execution
    }

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
            // debug(code);
            // eval(code);
        }
        else {         
            debug(code);
        }

        //if (vars.logAjax) loginfo(`starting code ${codeIndex}`);

        //Logger.log(`async()=>{await 1; ${code} return 1}`);

        async function func () {
            //Logger.log(`async()=>{await 1; ${code} return 1}`);

            // bindings
            lib.comms = exports; // local functions for events, etc.
            lib.log = Logger;

            // Call user's function with external bindings from lib (as 'this' which gets interally mapped to 'lib' var)
            const innerFunc = eval(`async(lib)=>{await 1; ${code}; return 1}`);
            
            try 
            {
                //Logger.log("running inner");
                await innerFunc(lib);
            }
            catch(e) 
            {
                lastErrorMessage = null;
                e.lineNumber=line;
                Logger.error(`Code running error(${line}): ${e}`);
                doError(e);
           }
            return 1;
        }
        
        //await func();
        //await liveprintercomms.scheduleFunction({ priority:1,weight:1,id:codeIndex++ }, async ()=> {Logger.log(`something`); return 1});

        await schedule(func);

        // wrap in try/catch block and debugging code
    }
    return true;
}
// end globalEval

module.exports.globalEval = globalEval;

/**
 * Get number of queued functions in limiter 
 * @returns {Number} number of queued functions to run
 * @alias comms:getQueued
 */
function getQueued() {
    return limiter.queued();
}

module.exports.getQueued = getQueued;

/**
 * Stops and clears the current queue of events. Should cancel all non-running actions. No new events can be added after this.
 */
async function stopLimiter() {
    if (limiter) {
        await limiter.stop({ dropWaitingJobs: true });
        limiter.disconnect(); // clear interval and allow memory to be freed
        logInfo("Limiter stopped.");
    }
    limiter = null;
    debug("Shutdown completed!");
    return;
}

/**
 * Effectively cleares the current queue of events and restarts it. Should cancel all non-running actions. 
 * @alias comms:restartLimiter
 */
async function restartLimiter() {
    logInfo("Limiter restarting");
    let stopped = false;
    try {
        await stopLimiter();
        stopped = true;
    }
    catch(err)
    {
        stopped = false;
        logError(`Failed to restart limiter (restartLimiter): ${err}`)
    }
    if (stopped) limiter = initLimiter();
    return;
}

module.exports.restartLimiter = restartLimiter;

/**
 * Send a JSON-RPC request to the backend, get a response back. See below implementations for details.
 * @param {Object} request JSON-RPC formatted request object
 * @returns {Object} response JSON-RPC response object
 * @alias comms:sendJSONRPC 
 */

async function sendJSONRPC(request) {
    //debug(request)
    let args = typeof request === "string" ? JSON.parse(request) : request;
    //args._xsrf = getCookie("_xsrf");
    //debug(args);
    let reqId = "req" + vars.requestId++; // shared with limiter - see above

    if (vars.logAjax) logCommands(`SENDING ${reqId}::${request}`);

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
        Logger.error(statusText);
        logError(statusText);
    }
    if (undefined !== response.error) {
        logError(`JSON error response communicating with server:<br/>${JSON.stringify(response.error, null, 2)}<br/>Orig:${request}`);
    }

    if (vars.logAjax) logCommands(`RECEIVED ${reqId}::${request}`);
    return response;
}

module.exports.sendJSONRPC = sendJSONRPC;


/**
* Get the list of serial ports from the server (or refresh it) and display in the GUI (the listener will take care of that)
* @memberOf LivePrinter
* @returns {Object} result Returns json object containing result
* @alias comms:getSerialPorts
*/
async function getSerialPorts() {
    const message = {
        'jsonrpc': '2.0',
        'id': 6,
        'method': 'get-serial-ports',
        'params': []
    };
    logInfo('getting serial ports');
    return sendJSONRPC(JSON.stringify(message));
}
// expose as global
module.exports.getSerialPorts = getSerialPorts;

/**
* Set the serial port from the server (or refresh it) and display in the GUI (the listener will take care of that)
* @memberOf LivePrinter
* @param {String} port Name of the port (machine)
* @returns {Object} result Returns json object containing result
* @alias comms:setSerialPort
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
        logError("bad response from set serialPort():");
        logError(JSON.stringify(response));
    }
    else {
        logInfo("connected to port " + response.result[0].port[0] + " at baud rate " + response.result[0].port[1]);
        logInfo("startup messages:");
        for (const msg of response.result[0].messages) {
            logInfo(msg);
        }
    }

    return response;
}
// expose as global
module.exports.setSerialPort = setSerialPort;

/**
* Set the current commands line number on the printer (in case of resend). Probably doesn't work?
* @param {int} int new line number
* @returns {Object} result Returns json object containing result
* @alias comms:setline
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
        logError("bad response from set setCurrentLine():");
        logError(JSON.stringify(response));
    }
    else {
        logInfo("set line number " + response.result[0].line);
    }

    return response;
}
// expose as global
module.exports.setline = setCurrentLine;

/**
* Get the connection state of the printer and display in the GUI (the listener will take care of that)
* @returns {Object} result Returns json object containing result
* @alias comms:getPrinterState
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
            logError("bad response from set getPrinterState():");
            logError(JSON.stringify(response));
        }
        else {
            logPrinterState(response);
        }
        return response;
    }
    return null;
}
// expose as global
module.exports.getPrinterState = getPrinterState;


/**
 * Send GCode to the server via json-rpc over ajax.
 * @param {string} gcode gcode to send 
 * @returns {Object} result Returns json object containing result
 * @alias comms:sendGCodeRPC
 */
async function sendGCodeRPC(gcode) {
    let gcodeObj = { "jsonrpc": "2.0", "id": 4, "method": "send-gcode", "params": [] };
    if (vars.logAjax) logCommands(`SENDING gcode ${gcode}`);

    if (Array.isArray(gcode)) {

        const results = await Promise.all(gcode.map(async (_gcode) => {
            if (!_gcode.startsWith(';')) // don't send comments
            {
                gcodeObj.params = [_gcode];
                //debug(gcodeObj);
                let response = sendJSONRPC(JSON.stringify(gcodeObj));
                response.then(async (result) => { debug(result); await handleGCodeResponse(result) }).catch(err => {
                    logError(err);
                    doError(err);
                    response = Promise.reject(err.message);
                });
                return response;
            }
        }));
        updateGUI();

    } else {
        //debug("single line gcode");
        if (!gcode.startsWith(';')) // don't send comments
        {
            gcodeObj.params = [gcode];
            const response = await sendJSONRPC(JSON.stringify(gcodeObj));
            await handleGCodeResponse(response);
            updateGUI();

        }
    }
    if (vars.logAjax) logCommands(`DONE gcode ${gcode}`);
    return 1;
}

module.exports.sendGCodeRPC = sendGCodeRPC;

/**
 * Schedule GCode to be sent to the server, in order, using the limiter via json-rpc over ajax.
 * @param {string} gcode gcode to send
 * @param {Integer} priority Priority in queue (0-9 where 0 is highest)
 * @alias comms:scheduleGCode
 * @returns {Object} result Returns json promise object containing printer response
 */
async function scheduleGCode(gcode, priority = 4) { // 0-9, lower higher
    const reqId = "req" + vars.requestId++;
    if (vars.logAjax) logCommands(`SENDING ${reqId}`);
    await scheduleFunction(
                { "priority": priority, weight: 1, id: reqId, expiration: maxCodeWaitTime },
                async () => {
                    await sendGCodeRPC(gcode);
                    if (vars.logAjax) logCommands(`RECEIVED ${reqId}`);
                    return true;
                }
    );
    return true;
}

module.exports.scheduleGCode = scheduleGCode;

/*
* START SETTING UP SESSION VARIABLES ETC>
* **************************************
* 
*/

//////////////////////////////////////////////////////////////////////
// Listeners for printer events  /////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

// movement functions triggered at end of movement GCode reponse
let positionEventListeners = [];

let okEventListeners = [];

let otherEventListeners = [];

//------------------------------------------------
// NOTE: these could be more general on('event', func)

/**
 * Add listener function to run when 'position' events are received from the printer server (these are scheduled to be run by the limiter)
 * @param {Function} listener 
 * @alias comms:onPosition
 */
module.exports.onPosition = function (listener) {
    if (positionEventListeners.includes(listener)) return;

    positionEventListeners.push(listener);
}

/**
 * Remove a listener function from 'position' events queue
 * @param {Function} listener 
 * @alias comms:offPosition
 */
module.exports.offPosition = (listener) => {
    positionEventListeners = positionEventListeners.filter(list => list !== listener);
};

let doneListeners = [];

/**
 * Add listener function to run when 'codeDone' events are received from the limiter (not scheduled to be run by the limiter!)
 * @param {Function} listener 
 * @alias comms:onCodeDone
 */
module.exports.onCodeDone =function (listener) {
    if (doneListeners.includes(listener)) return;

    doneListeners.push(listener);
}

/**
 * Remove a listener from 'codeDone' events queue
 * @param {Function} listener 
 * @alias comms:offCodeQueued
*/
module.exports.offCodeDone = (listener) => {
    doneListeners = doneListeners.filter(list => list !== listener);
};

let queuedListeners = [];

/**
 * Add listener function to run when 'codeQueued' events are received from the limiter (not scheduled to be run by the limiter!)
 * @param {Function} listener 
 * @alias comms:onCodeQueued 
 */
module.exports.onCodeQueued = function (listener) {
    if (queuedListeners.includes(listener)) return;

    queuedListeners.push(listener);
}

/**
 * Remove a listener from 'codeQueued' events queue
 * @param {Function} listener 
 * @alias comms:offCodeQueued 
 */
module.exports.offCodeQueued = (listener) => {
    queuedListeners = queuedListeners.filter(list => list !== listener);
};


/**
 * Add listener function to run when 'position' events are received from the printer server (these are scheduled to be run by the limiter)
 * @param {Function} listener 
 * @alias comms:onOk 
 */
module.exports.onOk = function (listener) {
    if (okEventListeners.includes(listener)) return;

    okEventListeners.push(listener);
}

/**
 * Remove listener function from ok events queue
 * @param {Function} listener
 * @alias comms:offOk 
 */
module.exports.offOk = (listener) => {
    okEventListeners = okEventListeners.filter(list => list !== listener);
};

/**
 * Trigger the ok event for all ok listeners
 * @param {Anything} data 
 * @return {Boolean} success
 * @alias comms:okEvent 
 */
module.exports.okEvent = async function (data) {
    let handled = false;
    try {
        await Promise.all(okEventListeners.map(async v => {
            scheduleFunction({ priority:1,weight:1,id:codeIndex++ }, v, data);
        }));

        debug('ok event handled: ' + data); // other response
        handled = true;    
    }
    catch (err)
    {
        err.message = "Error in ok event handler:" + err.message;
        doError(err);
        handled = false;
    }
    return handled;
};

/**
 * Add listener function to run when 'other' (unmatched) events are received from the printer server (these are not scheduled to be run by the limiter)
 * @param {Function} listener
 * @alias comms:onOther 
 */
 module.exports.onOther = function (listener) {
    if (otherEventListeners.includes(listener)) return;

    otherEventListeners.push(listener);
}


/**
 * Remove listener function from 'other' (unmatched) events queue
 * @param {Function} listener
 * @alias comms:offOther 
 */
 module.exports.offOther = (listener) => {
    otherEventListeners = otherEventListeners.filter(list => list !== listener);
};

/**
 * Clear all listeners for a specific event type: codeDone, ok, other, codeQueued, position.
 * @param {*} eventType 
 * @alias comms:clearEvent 
 */
module.exports.clearEvent = function (eventType) {
    switch(eventType) {
        case 'codeDone': doneListeners.length = 0; break;
        case 'ok': okEventListeners.length = 0; break;
        case 'other': otherEventListeners.length = 0; break;
        case 'codeQueued': queuedListeners.length = 0; break;
        case 'position': positionEventListeners.length = 0; break;
        default: doError(`Bad event type: ${eventType}`); break;
    }
};


/**
 * Handles logging of a GCode response from the server
 * @param {Object} res 
 * @returns {Boolean} whether handled or not
 * @alias comms:handleGCodeResponse 
 */
async function handleGCodeResponse(res) {
    let handled = true;

    ///
    /// should only get 4 back (result from gcode)
    ///
    switch (res.id) {
        case 1: logInfo("1 received");
            /// catch: there is no 1!
            break;
        case 2: logInfo("close serial port received");
            break;
        case 3: logInfo("printer state received");
            // keys: time, port, state
            break;
        case 4: //logInfo("gcode response");
            if (res.result !== undefined) {
                for (const rr of res.result) {
                    //logInfo('gcode reply:' + rr);
                    // check for error
                    if (rr.toLowerCase().match(/error/m)) {
                        logError(rr);
                        handled = false;
                        break;
                    }

                    // try move handler
                    const positionResult = MarlinLineParserResultPosition.parse(rr);
                    const tempResult = MarlinLineParserResultTemperature.parse(rr);

                    if (tempResult) {
                        tempHandler(tempResult);
                        debug('temperature event handled');
                        handled = true;
                    }
                    
                    if (positionResult) {
                        moveHandler(positionResult);
                        // move/position update handled

                        try {
                            debug('position event handled');
                            await Promise.all(positionEventListeners.map(async v => {
                                schedule(v, positionResult);
                            }));

                            handled = true;
                        }
                        catch (err)
                        {
                            err.message = "Error in position event handler:" + err.message;
                            doError(err);
                            handled = false;
                        }
                    }
                    
                    if (!tempResult && !positionResult && rr.match(/ok/i)) {
                        try {
                            await Promise.all(okEventListeners.map(async v => {
                                scheduleFunction({ priority:1,weight:1,id:codeIndex++ }, v, rr);
                            }));
                
                            debug('ok event handled: ' + rr); // other response
                            handled = true;    
                        }
                        catch (err)
                        {
                            err.message = "Error in ok event handler:" + err.message;
                            doError(err);
                            handled = false;
                        }
                    }
                    else {

                        try {
                            debug('unhandled gcode response: ' + rr);
                            await Promise.all(otherEventListeners.map(async v => {
                                scheduleFunction({ priority:1,weight:1,id:codeIndex++ }, v, rr);
                            }));
                            handled = false;
                        }
                        catch (err)
                        {
                            err.message = "Error in other event handler:" + err.message;
                            doError(err);
                            handled = false;
                        }
                    }
                }
            }
            break;
        case 5: logInfo("connection result");
            if (res.result !== undefined) {
                // keys: time, port, messages
                logInfo(res.result);
            }
            break;
        case 6: logInfo("port names");
            break;
        default: logInfo(res.id + " received");
    }
    return handled;
}
module.exports.handleGCodeResponse = handleGCodeResponse;

