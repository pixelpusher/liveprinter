import {Printer as Printer} from '../js/liveprinter.printer'; // printer API object
import {doError, infoHandler} from '../js/liveprinter.ui';
const liveprintercomms =  require('../js/liveprinter.comms');
import { Logger } from 'liveprinter-utils';

function ASSERT(val1,val2, message) {
    if (val1!==val2) infoHandler.info(quickMsg("ERROR::" + message + `--${val1}:${val2}`));
}

/**
 * Create a delayed, async function for testing
 * @param {Function} f function to wrap in async function after a certain time
 * @param {Numer} timeout Time to wait
 * @returns {Function} async function to pass to scheduler
 */
async function timeoutFunc(f,timeout) {
    return async fff => {
        const p = new Promise(async f => {        
            setTimeout(f, timeout);
        });
        await p();
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
liveprintercomms.schedule( async ()=> infoHandler.info({time:Date.now(),message:`schedule test: ${testIndex++}`}), 500);

/// attach listeners
printer.addGCodeListener({ gcodeEvent: async data => infoHandler.info(quickMsg(data)) });
printer.addGCodeListener({ gcodeEvent: async data => Logger.debug(quickMsg(data)) });
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

async function startTest() {
    await liveprintercomms.schedule(async()=> printer.start());
    await liveprintercomms.schedule(async()=> printer.moveto({x:printer.cx, y:printer.cy}));

    // test that position is cx,cy
    ASSERT(printer.x, printer.cx, "x not equal to cx");
    ASSERT(printer.y, printer.cy, "y not equal to cy");

    let distToMove = 30;
    let origX = printer.x;
    await liveprintercomms.schedule(async()=> printer.turnto(0));
    await liveprintercomms.schedule(async()=> printer.dist(distToMove));
    await liveprintercomms.schedule(async()=> printer.speed(30));
    await liveprintercomms.schedule(async()=> printer.go(1));
    ASSERT(printer.x, origX+distToMove, `did not move ${distToMove}`); // off by a few hunredths... not great

    function WarpXFunc ({x,y,z,t}={})
    {
        // warp xcoord by up to 10mm
        // over a period of 400ms
        const warpAmount = 10;
        const angle = t*Math.PI/200;
        y = y + warpAmount * Math.sin(angle);

        return {x,y,z}; //A time-varying movement function set by user. Default is no op 
    }

    printer.moveFunc = WarpXFunc;
    distToMove = 15;
    origX = printer.x;

    await liveprintercomms.schedule(async()=> printer.turnto(180));
    ASSERT(printer.angle, 180, `turnto failed`); // off by a few hunredths... not great

    await liveprintercomms.schedule(async()=> printer.dist(distToMove));
    await liveprintercomms.schedule(async()=> printer.speed(30));
    await liveprintercomms.schedule(async()=> printer.go(1));
    ASSERT(printer.x, origX-distToMove, `did not move ${distToMove}`); // off by a few hunredths... not great
}

document.getElementById("go").onclick= async ()=>{
  await startTest();  
};

