"use strict";

window.$ = window.jquery = require('jquery');

const util = require('./util');

window.repeat = util.repeat;
window.numrange = util.numrange;
window.countto = util.countto;

const Printer = require('./liveprinter.printer'); // printer API object

// liveprinter object
const printer = new Printer();

if (window.lp) delete window.printer;
window.lp = printer; // make available to all scripts later on and livecoding... not great

const editors = require('./liveprinter.editor'); // code editors and functions
const liveprinterui = require('./liveprinter.ui'); // main ui
const liveprintercomms = require('./liveprinter.comms'); // browser-to-server communications

//console.log(scales.majPattern); // test

//require('./svg/SVGReader'); // svg util class
//require('./svg/svg2gcode'); // svg gcode converter

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

    await editors.init(); // create editors and setup live editing functions
    await liveprinterui.init(); // start server communications and setup UI

        /// attach listeners

        printer.addGCodeListener({ gcodeEvent: liveprintercomms.sendGCodeRPC });
        printer.addErrorListener({ errorEvent: liveprinterui.doError });
        
        ///
        /// add GCode listener to capture compiles GCode to editor
        printer.addGCodeListener(
            { gcodeEvent: async (gcode) => editors.recordGCode(editors.GCodeEditor, gcode) }
        );
    
    ///----------------------------------------------------------------------------
    ///--------Start running things------------------------------------------------
    ///----------------------------------------------------------------------------

    // start task scheduler!
    const scheduler = new util.Scheduler();
    liveprinterui.taskListener.scheduler = scheduler;

    // register GUI handler for scheduled tasks events 
    scheduler.addEventsListener(liveprinterui.taskListener);

    
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
    await liveprintercomms.getSerialPorts();

})(global).catch(err => {
    console.error(err);
});
