import Printer from '../js/liveprinter.printer'; // printer API object
import {doError, infoHandler} from '../js/liveprinter.ui';
const liveprintercomms =  require('../js/liveprinter.comms');

/**
 * Create a delayed, async function for testing
 * @param {Function} f function to wrap in async function after a certain time
 * @param {Numer} timeout Time to wait
 * @returns {Function} async function to pass to scheduler
 */
function timeoutFunc(f,timeout) {
    return async fff => {
        const p = new Promise(f => {        
            setTimeout(f, timeout);
        });
        await p;
        return true;
    };
}

async function testSchedule(func) {
    testIndex++;
    await liveprintercomms.schedule( timeoutFunc(func, 200));
    return true;
} 

function quickMsg(msg) {
    return {"time":Date.now(),"message":msg};
}

// liveprinter object
const printer = new Printer();

let testIndex = 0; // incremented when code is scheduled

if (window.lp) delete window.lp;
window.lp = printer; // make available to all scripts later on and livecoding... not great

infoHandler.info(quickMsg("starting"));
// test scheduling code
liveprintercomms.schedule( timeoutFunc( ()=>infoHandler.info({time:Date.now(),message:`schedule test: ${testIndex++}`}), 500));

/// attach listeners
printer.addGCodeListener({ gcodeEvent: infoHandler.info });
printer.addErrorListener({ errorEvent: doError });

// ///
// /// add GCode listener to capture compiles GCode to editor
// printer.addGCodeListener(
//     { gcodeEvent: async (gcode) => editors.recordGCode(editors.GCodeEditor, gcode) }
// );

liveprintercomms.onPosition(async (v) => infoHandler.info(v));
liveprintercomms.onCodeDone(async (v)=>{
    let msg;
    if (v.queued === 0) {
        msg = `done: no code running`;
    }
    else {
        msg = `done: other code blocks in queue: ${v.queued}`;
    }
    infoHandler.info({"time":Date.now(),"message":msg} );
});
liveprintercomms.onCodeQueued(async (v)=>{
    let msg = `queued: code block running (queued: ${v.queued})`;
    infoHandler.info({"time":Date.now(),"message":msg} );
});


infoHandler.info({time:Date.now(), message:"test scheduling"});

testSchedule(printer.dist(10));

