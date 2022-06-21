window.$ = window.jquery = require('jquery');

import { repeat, numrange, countto, Scheduler } from 'liveprinter-utils';
window.repeat = repeat;
window.numrange = numrange;
window.countto = countto;

const Printer = require('./liveprinter.printer'); // printer API object
const editors = require('./liveprinter.editor'); // code editors and functions
const liveprinterui = require('./liveprinter.ui'); // main ui
const liveprintercomms = require('./liveprinter.comms'); // browser-to-server communications

//require('./svg/SVGReader'); // svg util class
//require('./svg/svg2gcode'); // svg gcode converter



// now that browsers have deferred loading, this isn't really needed anymore?
(async function (w) {
    "use strict";

    await $.ready();

    //await repeat(2, async(n) => console.log(n)); // test func

    if (!window.console) {
        window.console = {
            __log: [],
            get _log() { return this.__log; },
            log: function (text) { this._log.push(text); },
            getLog: function () { return this._log; }
        };
    }

    require('popper.js'); // for bootstrap
    var bootstrap = require('bootstrap');

    // liveprinter object
    const printer = new Printer();

    if (window.lp) delete window.lp;
    window.lp = printer; // make available to all scripts later on and livecoding... not great

    // start task scheduler!
    const scheduler = new Scheduler();

    // register GUI handler for scheduled tasks events 
    scheduler.addEventsListener(liveprinterui.taskListener);

    await editors.init(); // create editors and setup live editing functions
    await liveprinterui.init(printer, scheduler); // start server communications and setup UI

    /// attach listeners

    printer.addGCodeListener({ gcodeEvent: liveprintercomms.sendGCodeRPC });
    printer.addErrorListener({ errorEvent: liveprinterui.doError });

    ///
    /// add GCode listener to capture compiles GCode to editor
    printer.addGCodeListener(
        { gcodeEvent: async (gcode) => editors.recordGCode(editors.GCodeEditor, gcode) }
    );

    liveprintercomms.onPosition(async (v) => liveprinterui.moveHandler(v));
    liveprintercomms.onCodeDone(async (v)=>{
        const dateStr = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            hour12: false
        }).format(new Date(Date.now()));

        let msg;
        if (v.queued === 0) {
            msg = `no code running [${dateStr}]`;
        }
        else {
            msg = `running, other code blocks in queue: ${v.queued} [${dateStr}]`;
        }
        document.getElementById('working-tab').innerHTML = msg;
        //liveprinterui.loginfo(`done: code blocks running: ${v.queued}`);
    });
    liveprintercomms.onCodeQueued(async (v)=>{
        const dateStr = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            hour12: false
        }).format(new Date(Date.now()));

        document.getElementById('working-tab').innerHTML=`queued: code block running (queued: ${v.queued}) [${dateStr}]`;
        //liveprinterui.loginfo(`queued: code blocks running: ${v.queued}`);
    });
    liveprintercomms.onOk(async () => {
        liveprinterui.blinkElem($("#working-tab"));
    });

    
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
    liveprinterui.loginfo("Hang on, getting serial ports list...");
    const timeOutID = setInterval(liveprinterui.loginfo, 100, "...");

    const portsReponse = await liveprintercomms.getSerialPorts();
    clearInterval(timeOutID);
    
    liveprinterui.loginfo("Received serial ports!");
    liveprinterui.portsListHandler(portsReponse);

})(global).catch(err => {
    console.error(err);
});
