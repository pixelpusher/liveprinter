import { repeat, numrange, countto, Scheduler } from 'liveprinter-utils';
import {Printer as Printer} from '../js/liveprinter.printer'; // printer API object
import {debug, logerror, loginfo, doError,
     moveHandler, portsListHandler, commandsHandler, printerStateHandler,
     taskListenerUI, init,
     blinkElem} from '../js/liveprinter.ui';
const liveprintercomms =  require('../js/liveprinter.comms');
const editors = require('../js/liveprinter.editor');

import Logger from 'liveprinter-utils/logger';
Logger.debugLevel = Logger.DEBUG_LEVEL.debug;

window.$ = window.jquery = require('jquery');

liveprintercomms.setDebug(debug);
liveprintercomms.setDoError(doError);
liveprintercomms.setLogError(logerror);
liveprintercomms.setLogInfo(loginfo);
liveprintercomms.setLogCommands(commandsHandler.log);
liveprintercomms.setLogPrinterState(printerStateHandler);


//require('./svg/SVGReader'); // svg util class
//require('./svg/svg2gcode'); // svg gcode converter

// other code libraries:

/////-----------------------------------------------------------
/////------grammardraw fractals---------------------------------

//import * as Tone from 'tone';
import {lp_functionMap as functionMap} from "grammardraw/modules/functionmaps.mjs"
import {createESequence} from "grammardraw/modules/sequences"
import { setNoteMods, setScales, getBaseNoteDuration, setBaseNoteDuration, 
   step,
   on, off
} from "grammardraw/modules/fractalPath.mjs";


const listener = {
    'step': (v) => loginfo(`step event: ${v}`),
    'action': ({noteString,noteMidi,noteSpeed,notesPlayed,noteDuration,noteDist,
       currentTotalDuration, 
       totalSequenceDuration,
       moved}) => {
        loginfo(`action: ${noteMidi},${noteSpeed},${notesPlayed},${noteDuration},${noteDist},
               ${currentTotalDuration}, 
               ${totalSequenceDuration},
               ${moved}}`);
        //    document.getElementById('cur-time').innerHTML = `${currentTotalDuration}s`;
        //    document.getElementById('note-string').innerHTML = `${noteString}`;

       },
    'done': (v) => {
       animating = false; 
       loginfo(`done event: ${v}`);
       // ???
       // cancelAnimationFrame(animationFrameHandle); 
    }
}

const libs = {functionMap, 
    createESequence, 
    setNoteMods, setScales,
    getBaseNoteDuration, setBaseNoteDuration, 
    step,
    on, off
}

// setup listeners
for (let eventName in listener) {
    on(eventName, listener[eventName]);
}

// set up API for live editor
liveprintercomms.addLibs(libs);



/////------grammardraw fractals---------------------------------
/////-----------------------------------------------------------



// now that browsers have deferred loading, this isn't really needed anymore?
(async function (w) {
    "use strict";

    await $.ready();

    window.repeat = repeat;
    window.numrange = numrange;
    window.countto = countto;

    //await repeat(2, async(n) => console.log(n)); // test func

    if (!window.console) {
        window.console = {
            __log: [],
            get _log() { return this.__log; },
            log: function (text) { this._log.push(text); },
            getLog: function () { return this._log; }
        };
    }

    var bootstrap = require('bootstrap');

    // liveprinter object
    const printer = new Printer();

    if (window.lp) delete window.lp;
    window.lp = printer; // make available to all scripts later on and livecoding... not great

    // start task scheduler!
    const scheduler = new Scheduler();

    // register GUI handler for scheduled tasks events 
    scheduler.addEventsListener(taskListenerUI);

    await editors.init(); // create editors and setup live editing functions
    await init(printer, scheduler); // start server communications and setup UI

    /// attach listeners

    printer.addGCodeListener({ gcodeEvent: liveprintercomms.sendGCodeRPC });
    printer.addErrorListener({ errorEvent: doError });

    ///
    /// add GCode listener to capture compiles GCode to editor
    printer.addGCodeListener(
        { gcodeEvent: async (gcode) => editors.recordGCode(editors.GCodeEditor, gcode) }
    );

    liveprintercomms.onPosition(async (v) => moveHandler(v));
    liveprintercomms.onCodeDone(async (v)=>{
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
    liveprintercomms.onCodeQueued(async (v)=>{
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
    window.addTask = addTask;

    function getTask(scheduler, name) {
        return scheduler.getEventByName(name);
    }

    window.getTask = getTask;

    function removeTask(scheduler, name) {
        return scheduler.removeEventByName(name);
    }

    window.removeTask = removeTask;
    ///
    /// --------- End livecoding tasks API -------------------------
    ///

    // get serial ports, to start things
    loginfo("Hang on, getting serial ports list...");
    const timeOutID = setInterval(loginfo, 100, "...");

    const portsReponse = await liveprintercomms.getSerialPorts();
    clearInterval(timeOutID);
    
    loginfo("Received serial ports!");
    portsListHandler(portsReponse);

})(global).catch(err => {
    console.error(err);
});
