
import { repeat, numrange, countto, Scheduler } from 'liveprinter-utils';

import { LivePrinter } from "liveprinter-core";

import {
    logerror, loginfo, doError,
     moveHandler, portsListHandler, commandsHandler, printerStateHandler,
     taskListenerUI, initUI,
     blinkElem
    } from '../js/liveprinter.ui';

import { setDebug, setDoError, setLogError, setLogCommands, setLogInfo, setLogCommands, 
    getSerialPorts,
    setLogPrinterState, onPosition, onCodeDone, onCodeQueued, sendGCodeRPC 
} from './liveprinter.comms';

import { initEditors } from './liveprinter.editor';
import Logger from 'liveprinter-utils/logger';

var bootstrap = require('bootstrap');


Logger.level = Logger.LOG_LEVEL.info;

globalThis.$ = globalThis.jquery = require('jquery');

setDebug(Logger.debug);
setDoError(doError);
setLogError(logerror);
setLogInfo(Logger.info);
setLogCommands(commandsHandler.log);
setLogPrinterState(printerStateHandler);

//require('./svg/SVGReader'); // svg util class
//require('./svg/svg2gcode'); // svg gcode converter



// now that browsers have deferred loading, this isn't really needed anymore?
(async function (w) {
    "use strict";

    await $.ready();

    // const testdata = await liveprintercomms.getData("http://localhost:8888/data", "POST", "nothing");
    // Logger.debug(testdata);

    globalThis.repeat = repeat;
    globalThis.numrange = numrange;
    globalThis.countto = countto;

    //await repeat(2, async(n) => console.log(n)); // test func

    if (!globalThis.console) {
        globalThis.console = {
            __log: [],
            get _log() { return this.__log; },
            log: function (text) { this._log.push(text); },
            getLog: function () { return this._log; }
        };
    }


    // start task scheduler!
    const scheduler = new Scheduler();

    // register GUI handler for scheduled tasks events 
    scheduler.addEventsListener(taskListenerUI);

    const lp = new LivePrinter();
    globalThis.lp = lp;

    await initEditors(lp); // create editors and setup live editing functions
    await initUI(lp, scheduler); // start server communications and setup UI

    /// attach listeners

    lp.addGCodeListener({ gcodeEvent: sendGCodeRPC });
    lp.addErrorListener({ errorEvent: doError });

    ///
    /// add GCode listener to capture compiles GCode to editor
    // printer.addGCodeListener(
    //     { gcodeEvent: async (gcode) => editors.recordGCode(editors.GCodeEditor, gcode) }
    // );

    onPosition(async (v) => moveHandler(v));
    onCodeDone(async (v)=>{
        const dateStr = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            hour12: false
        }).format(new Date(Date.now()));

        let msg;
        if (v.queued === 0) {
            msg = `done: no code running [${dateStr}]`;
        }
        else {
            msg = `done: other code blocks in queue: ${v.queued} [${dateStr}]`;
        }
        document.getElementById('working-tab').innerHTML = msg;
        blinkElem($("#working-tab"));
        //loginfo(`done: code blocks running: ${v.queued}`);
    });
    onCodeQueued(async (v)=>{
        const dateStr = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            hour12: false
        }).format(new Date(Date.now()));

        document.getElementById('working-tab').innerHTML=`queued: code block running (queued: ${v.queued}) [${dateStr}]`;
        //loginfo(`queued: code blocks running: ${v.queued}`);
    });

    // With the live server, this just blinks constantly...
    // liveprintercomms.onOk(async () => {
    //     blinkElem($("#working-tab"));
    // });

    
    ///----------------------------------------------------------------------------
    ///--------Start running things------------------------------------------------
    ///----------------------------------------------------------------------------


    ////
    /// Livecoding tasks API -- sort of floating here, for now
    ///
    /**
     * Add a cancellable task to the scheduler and also the GUI 
     * @param {Any} task either scheduled task object or name of task plus a function for next arg
     * @param {Function} func Async function, if name was passed as 1st arg
     * @memberOf LivePrinter
     */
    function addTask(scheduler, task, interval, func) {

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
    globalThis.addTask = addTask;

    function getTask(scheduler, name) {
        return scheduler.getEventByName(name);
    }

    globalThis.getTask = getTask;

    function removeTask(scheduler, name) {
        return scheduler.removeEventByName(name);
    }

    globalThis.removeTask = removeTask;
    ///
    /// --------- End livecoding tasks API -------------------------
    ///

    // get serial ports, to start things
    loginfo("Hang on, getting serial ports list...");
    const timeOutID = setInterval(loginfo, 100, "...");

    const portsReponse = await getSerialPorts();
    clearInterval(timeOutID);
    
    loginfo("Received serial ports!");
    portsListHandler(portsReponse);

})(global).catch(err => {
    console.error(err);
});
