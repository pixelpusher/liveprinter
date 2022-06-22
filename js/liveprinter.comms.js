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

const compile = require('./language/compile'); // minigrammar compile function

import { MarlinLineParserResultPosition, MarlinLineParserResultTemperature } from './parsers/MarlinParsers.js';
import { __esModule } from "bootstrap";
import { Logger  } from "liveprinter-utils";

const logger = new Logger();

const liveprinterUI = require('./liveprinter.ui');

// other code libraries:

/////------grammardraw fractals---------------------------------

import * as Tone from 'tone';
import {lp_functionMap as functionMap} from "grammardraw/modules/functionmaps.mjs"
import {createESequence} from "grammardraw/modules/sequences"
import { noteMods, scales, getBaseNoteDuration, setBaseNoteDuration, 
   iterate,
   on, off
} from "grammardraw/modules/fractalPath.mjs";
/////------grammardraw fractals---------------------------------

const vars = Object.create(null); // session vars
module.exports.vars = vars;
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

window.maxCodeWaitTime = 5; // max time the limiter waits for scheduled code before dropping job -- in ms

function initLimiter() {
    // Bottleneck rate limiter package: https://www.npmjs.com/package/bottleneck
    // prevent more than 1 request from running at a time, provides priority queing
    const _limiter = new Bottleneck({
        maxConcurrent: 1,
        highWater: 10000, // max jobs, good to set for performance
        minTime: 1, // (ms) How long to wait after launching a job before launching another one.
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
        liveprinterUI.doError(Error(errorTxt));
        liveprinterUI.logerror(`Limiter error: ${errorTxt}`);

        await restartLimiter();
    });

    // Listen to the "failed" event
    _limiter.on("failed", async (error, jobInfo) => {
        const id = jobInfo.options.id;
        logger.warn(`Job ${id} failed: ${error}`);
        liveprinterUI.logerror(`Job ${id} failed: ${error}`);
        // if (jobInfo.retryCount === 0) { // Here we only retry once
        //     liveprinterUI.logerror(`Retrying job ${id} in 5ms!`);
        //     return 5;
        // }
    
    });

    // Listen to the "retry" event
    _limiter.on("retry", (error, jobInfo) => liveprinterUI.logerror(`Now retrying ${jobInfo.options.id}`));

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
        liveprinterUI.doError(Error(errorTxt));
        liveprinterUI.logerror(`Dropped job ${errorTxt}`);
        //   This will be called when a strategy was triggered.
        //   The dropped request is passed to this event listener.
    });

    _limiter.on('queued', async function (info){
        //liveprinterUI.loginfo(`starting command...: ${_limiter.queued()}`);
        info.queued = _limiter.queued();
        
        try {
            await Promise.all(queuedListeners.map(async v=>v(info))); // don't schedule or we'll be in a loop!
        }
        catch (err)
        {
            err.message = "Error in done event:" + err.message;
            liveprinterUI.doError(err);
        }
    })

    _limiter.on('done', async function (info) {
        info.queued = _limiter.queued(); 
        //liveprinterUI.loginfo(`done running command: ${_limiter.queued()}`);
        try {
            await Promise.all(doneListeners.map(async v => v(info))); // don't schedule or we'll be in a loop!
        }
        catch (err)
        {
            err.message = "Error in done event:" + err.message;
            liveprinterUI.doError(err);
        }
        
    });


    return _limiter;
}

let limiter = initLimiter(); // runs code in a scheduler: see ui/globalEval()
// Bottleneck rate limiter for priority async queueing



/**
 * HACK -- needs fixing!
 * @returns {Object} BottleneckJS limiter object. Dangerous.
 */
function getLimiter()
{
    return limiter;
} 

module.exports.getLimiter = getLimiter;

/**
 * Schedules code to run in the async queue (e.g. limiter)
 * @param  {...any} args Limiter options object (see Bottleneckjs) and list of other function arguments 
 * @returns 
 */
async function scheduleFunction(...args){
    return await limiter.schedule(...args);
} 

module.exports.scheduleFunction = scheduleFunction;

// index of code block running
let codeIndex = 0;

/**
  * Evaluate the code in local (within closure) or global space according to the current editor mode (javascript/python).
  * @param {string} code to evaluate
  * @param {integer} line line number for error displaying
  * @param {Boolean} globally true if executing in global space, false (normal) if executing within closure to minimise side-effects
  * @memberOf LivePrinter
  */
 async function globalEval(code, line) {
    liveprinterUI.clearError();

    const commentRegex = /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm; // https://stackoverflow.com/questions/5989315/regex-for-match-replacing-javascript-comments-both-multiline-and-inline/15123777#15123777

    code = code.replace(commentRegex, (match, p1) => {
        return p1;
    });

    // replace globals in js
    code = code.replace(/^[ ]*global[ ]+/gm, "window.");

    liveprinterUI.logger.debug("code before pre-processing-------------------------------");
    liveprinterUI.logger.debug(code);
    liveprinterUI.logger.debug("========================= -------------------------------");

    //
    // compile in minigrammar
    //
    try {
        code = compile(code);
    }
    catch (err)
    {
        liveprinterUI.logger.error("Compilation error:");
        liveprinterUI.doError(err);
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
            // liveprinterUI.logger.log(code);
            // eval(code);
        }
        else {         

            liveprinterUI.logger.debug(code);
        }

        //if (vars.logAjax) loginfo(`starting code ${codeIndex}`);

        //console.log(`async()=>{await 1; ${code} return 1}`);

        async function func () {
            //console.log(`async()=>{await 1; ${code} return 1}`);

             // bindings
             const comms = exports; // local functions for events, etc.
            const fm = functionMap;
            const createESeq = createESequence;
            const fractalStep = iterate;
            const stepNotes = noteMods;
            
// import { noteMods, scales, getBaseNoteDuration, setBaseNoteDuration, 
//    iterate,
//    on, off
// } from "grammardraw/modules/fractalPath.mjs";
             
            const innerFunc =  eval(`async()=>{await 1; ${code}; return 1}`);
    
            try 
            {
                //console.log("running inner");
                await innerFunc();
            }
            catch(e) 
            {
                lastErrorMessage = null;
                e.lineNumber=line;
                console.log(`Code running error(${line}): ${e}`);
                liveprinterUI.doError(e);  
           }
            return 1;
        }
        
        //await func();
        //await liveprintercomms.scheduleFunction({ priority:1,weight:1,id:codeIndex++ }, async ()=> {console.log(`something`); return 1});

        await scheduleFunction({ priority:1,weight:1,id:codeIndex++ }, func);

        // wrap in try/catch block and debugging code
    }
    return true;
}
// end globalEval

module.exports.globalEval = globalEval;

/**
 *  
 * @returns {Number} number of queued functions to run
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
        liveprinterUI.loginfo("Limiter stopped.");
    }
    limiter = null;
    logger.log("Shutdown completed!");
    return;
}

/**
 * Effectively cleares the current queue of events and restarts it. Should cancel all non-running actions.
 */
async function restartLimiter() {
    liveprinterUI.loginfo("Limiter restarting");
    await stopLimiter();
    limiter = initLimiter();
    return;
}
module.exports.restartLimiter = restartLimiter;

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

    if (vars.logAjax) liveprinterUI.commandsHandler.log(`SENDING ${reqId}::${request}`);

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
        liveprinterUI.logerror(statusText);
    }
    if (undefined !== response.error) {
        liveprinterUI.logerror(`JSON error response communicating with server:<br/>${JSON.stringify(response.error, null, 2)}<br/>Orig:${request}`);
    }

    if (vars.logAjax) liveprinterUI.commandsHandler.log(`RECEIVED ${reqId}::${request}`);
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
    liveprinterUI.loginfo('getting serial ports');
    return sendJSONRPC(JSON.stringify(message));
}
// expose as global
module.exports.getSerialPorts = getSerialPorts;

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
        liveprinterUI.logerror("bad response from set serialPort():");
        liveprinterUI.logerror(JSON.stringify(response));
    }
    else {
        liveprinterUI.loginfo("connected to port " + response.result[0].port[0] + " at baud rate " + response.result[0].port[1]);
        liveprinterUI.loginfo("startup messages:");
        for (const msg of response.result[0].messages) {
            liveprinterUI.loginfo(msg);
        }
    }

    return response;
}
// expose as global
module.exports.setSerialPort = setSerialPort;

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
        liveprinterUI.logerror("bad response from set setCurrentLine():");
        liveprinterUI.logerror(JSON.stringify(response));
    }
    else {
        liveprinterUI.loginfo("set line number " + response.result[0].line);
    }

    return response;
}
// expose as global
module.exports.setline = setCurrentLine;

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
            liveprinterUI.logerror("bad response from set getPrinterState():");
            liveprinterUI.logerror(JSON.stringify(response));
        }
        else {
            liveprinterUI.printerStateHandler(response);
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
 * @memberOf LivePrinter
 * @returns {Object} result Returns json object containing result
 */
async function sendGCodeRPC(gcode) {
    let gcodeObj = { "jsonrpc": "2.0", "id": 4, "method": "send-gcode", "params": [] };
    if (vars.logAjax) liveprinterUI.commandsHandler.log(`SENDING gcode ${gcode}`);

    if (Array.isArray(gcode)) {

        const results = await Promise.all(gcode.map(async (_gcode) => {
            if (!_gcode.startsWith(';')) // don't send comments
            {
                gcodeObj.params = [_gcode];
                //logger.log(gcodeObj);
                let response = sendJSONRPC(JSON.stringify(gcodeObj));
                response.then(async (result) => { logger.debug(result); await handleGCodeResponse(result) }).catch(err => {
                    liveprinterUI.logerror(err);
                    liveprinterUI.doError(err);
                    response = Promise.reject(err.message);
                });
                return response;
            }
        }));
        liveprinterUI.updateGUI();

    } else {
        //logger.debug("single line gcode");
        if (!gcode.startsWith(';')) // don't send comments
        {
            gcodeObj.params = [gcode];
            const response = await sendJSONRPC(JSON.stringify(gcodeObj));
            await handleGCodeResponse(response);
            liveprinterUI.updateGUI();

        }
    }
    if (vars.logAjax) liveprinterUI.commandsHandler.log(`DONE gcode ${gcode}`);
    return 1;
}

module.exports.sendGCodeRPC = sendGCodeRPC;

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
        if (vars.logAjax) liveprinterUI.commandsHandler.log(`SENDING ${reqId}`);
        try {
            result = await limiter.schedule(
                { "priority": priority, weight: 1, id: reqId, expiration: maxCodeWaitTime },
                async () => await sendGCodeRPC(gcode)
            );
        }
        catch (err) {
            liveprinterUI.logerror(`Error with ${reqId}:: ${err}`);
        }
        if (vars.logAjax) liveprinterUI.commandsHandler.log(`RECEIVED ${reqId}`);
    }
    return result;
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

// could be more general on('event', func)

module.exports.onPosition = (listener) => positionEventListeners.push(listener);

module.exports.offPosition = (listener) => {
    positionEventListeners = positionEventListeners.filter(list => list !== listener);
};

let doneListeners = [];

module.exports.onCodeDone = (listener) =>  doneListeners.push(listener);

module.exports.offCodeDone = (listener) => {
    doneListeners = doneListeners.filter(list => list !== listener);
};

let queuedListeners = [];

module.exports.onCodeQueued = (listener) =>  queuedListeners.push(listener);

module.exports.offCodeQueued = (listener) => {
    queuedListeners = queuedListeners.filter(list => list !== listener);
};

module.exports.onOk = (listener) => okEventListeners.push(listener);

module.exports.offOk = (listener) => {
    okEventListeners = okEventListeners.filter(list => list !== listener);
    return true;
};

/**
 * Trigger the ok event for all ok listeners
 * @param {Anything} data 
 */
module.exports.okEvent = async function (data) {
    let handled = false;
    try {
        await Promise.all(okEventListeners.map(async v => {
            scheduleFunction({ priority:1,weight:1,id:codeIndex++ }, v, data);
        }));

        logger.debug('ok event handled: ' + data); // other response
        handled = true;    
    }
    catch (err)
    {
        err.message = "Error in ok event handler:" + err.message;
        liveprinterUI.doError(err);
        handled = false;
    }
    return handled;
};

module.exports.onOther = (listener) =>  otherEventListeners.push(listener);

module.exports.offOther = (listener) => {
    otherEventListeners = otherEventListeners.filter(list => list !== listener);
};

module.exports.clearEvent = function (eventType) {
    switch(eventType) {
        case 'codeDone': doneListeners.length = 0; break;
        case 'ok': okEventListeners.length = 0; break;
        case 'other': otherEventListeners.length = 0; break;
        case 'codeQueued': queuedListeners.length = 0; break;
        case 'position': positionEventListeners.length = 0; break;
        default: liveprinterUI.doError(`Bad event type: ${eventType}`); break;
    }
};


/**
 * Handles logging of a GCode response from the server
 * @param {Object} res 
 * @returns Boolean whether handled or not
 */
async function handleGCodeResponse(res) {
    let handled = true;

    ///
    /// should only get 4 back (result from gcode)
    ///
    switch (res.id) {
        case 1: liveprinterUI.loginfo("1 received");
            /// catch: there is no 1!
            break;
        case 2: liveprinterUI.loginfo("close serial port received");
            break;
        case 3: liveprinterUI.loginfo("printer state received");
            // keys: time, port, state
            break;
        case 4: //liveprinterUI.loginfo("gcode response");
            if (res.result !== undefined) {
                for (const rr of res.result) {
                    //liveprinterUI.loginfo('gcode reply:' + rr);
                    // check for error
                    if (rr.toLowerCase().match(/error/m)) {
                        liveprinterUI.logerror(rr);
                        handled = false;
                        break;
                    }

                    // try move handler
                    const positionResult = MarlinLineParserResultPosition.parse(rr);
                    const tempResult = MarlinLineParserResultTemperature.parse(rr);

                    if (tempResult) {
                        liveprinterUI.tempHandler(tempResult);
                        logger.debug('temperature event handled');
                        handled = true;
                    }
                    
                    if (positionResult) {
                        //liveprinterUI.moveHandler(positionResult);
                        // move/position update handled

                        try {
                            logger.debug('position event handled');
                            await Promise.all(positionEventListeners.map(async v => {
                                scheduleFunction({ priority:1,weight:1,id:codeIndex++ }, v, positionResult);
                            }));

                            handled = true;
                        }
                        catch (err)
                        {
                            err.message = "Error in position event handler:" + err.message;
                            liveprinterUI.doError(err);
                            handled = false;
                        }
                    }
                    
                    if (!tempResult && !positionResult && rr.match(/ok/i)) {
                        try {
                            await Promise.all(okEventListeners.map(async v => {
                                scheduleFunction({ priority:1,weight:1,id:codeIndex++ }, v, rr);
                            }));
                
                            logger.debug('ok event handled: ' + rr); // other response
                            handled = true;    
                        }
                        catch (err)
                        {
                            err.message = "Error in ok event handler:" + err.message;
                            liveprinterUI.doError(err);
                            handled = false;
                        }
                    }
                    else {

                        try {
                            logger.debug('unhandled gcode response: ' + rr);
                            await Promise.all(otherEventListeners.map(async v => {
                                scheduleFunction({ priority:1,weight:1,id:codeIndex++ }, v, rr);
                            }));
                            handled = false;
                        }
                        catch (err)
                        {
                            err.message = "Error in other event handler:" + err.message;
                            liveprinterUI.doError(err);
                            handled = false;
                        }
                    }
                }
            }
            break;
        case 5: liveprinterUI.loginfo("connection result");
            if (res.result !== undefined) {
                // keys: time, port, messages
                liveprinterUI.loginfo(res.result);
            }
            break;
        case 6: liveprinterUI.loginfo("port names");
            break;
        default: liveprinterUI.loginfo(res.id + " received");
    }
    return handled;
}
module.exports.handleGCodeResponse = handleGCodeResponse;

