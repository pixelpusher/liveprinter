import { Printer } from '../js/liveprinter.printer'; // printer API object
import {doError, infoHandler, init} from '../js/liveprinter.ui';
const liveprintercomms =  require('../js/liveprinter.comms');
import { Logger } from 'liveprinter-utils';
import $ from "jquery";
import { Note, transpose } from 'tonal';

Logger.level = Logger.LOG_LEVEL.debug;

const midi = Note.midi;

// Note.midi("A4"); // => 60
// Note.transpose("C4", "5P"); // => "G4"

const libs = {midi, transpose }

// set up API for live editor
liveprintercomms.addLibs(libs);

liveprintercomms.vars.logAjax = true;

Logger.debug("STARTING");

/**
 * Test if one thing is same as the other (===)
 * @param {Any} val1 
 * @param {Any} val2 
 * @param {String} message 
 */
function ASSERT(val1,val2, message) {
    if (val1!==val2) infoMsg("ERROR::" + message + `--${val1}:${val2}`);
}

/**
 * BROKEN -- FIXME Create a delayed, async function for testing
 * @param {Function} f function to wrap in async function after a certain time
 * @param {Numer} timeout Time to wait
 * @returns {Function} async function to pass to scheduler
 */
async function timeoutFunc(f,timeout) {
    return async fff => {
        const p = async () => {        
            setTimeout(f, timeout);

        };
        await p();
        return true;
    };
}

// BROKEN
async function testSchedule(func) {
    testIndex++;
    await liveprintercomms.schedule( timeoutFunc(func, 200));
    return true;
} 

/**
 * Quick format for info handler
 * @param {String} msg 
 * @returns 
 */
function quickMsg(msg) {
    return {"time":Date.now(),"message":msg};
}

/**
 * Debug to info area quickly
 * @param {String} msg 
 */
function infoMsg(msg) {
    infoHandler.info(quickMsg(msg));
}

// liveprinter object
const printer = new Printer();

let testIndex = 0; // incremented when code is scheduled

async function setup() {
    // set up GUI with printer ref
    await init(printer);

    if (window.lp) delete window.lp;
    window.lp = printer; // make available to all scripts later on and livecoding... not great
    
    infoMsg("starting");
    // test scheduling code
    liveprintercomms.schedule( async ()=> infoHandler.info({time:Date.now(),message:`schedule test: ${testIndex++}`}), 500);
    
    /// attach listeners
    printer.addGCodeListener({ gcodeEvent: async data => infoMsg(data) });
    printer.addGCodeListener({ gcodeEvent: async data => Logger.debug(quickMsg(data)) });
    printer.addErrorListener({ errorEvent: doError });
    // SETUP PRINTER GCODE LISTENER
    printer.addGCodeListener({ gcodeEvent: liveprintercomms.sendGCodeRPC });

    // ///
    // /// add GCode listener to capture compiles GCode to editor
    // printer.addGCodeListener(
    //     { gcodeEvent: async (gcode) => editors.recordGCode(editors.GCodeEditor, gcode) }
    // );
    
    liveprintercomms.onPosition(async (v) => infoMsg(v));
    liveprintercomms.onCodeDone(async (v)=>{
        let msg;
        if (v.queued === 0) {
            msg = `done: no code running`;
        }
        else {
            msg = `done: other code blocks in queue: ${v.queued}`;
        }
        infoMsg(msg);
    });
    liveprintercomms.onCodeQueued(async (v)=>{
        let msg = `queued: code block running (queued: ${v.queued})`;
        infoMsg(msg);
    });
    
    infoMsg("test scheduling");    
}

async function startTest() {
    let distToMove = 8;
    let origX, origY, origZ, origE;

    await liveprintercomms.schedule(async()=> printer.start());
    infoMsg("moving to cx,cy...");
    await liveprintercomms.schedule(async()=> printer.moveto({x:printer.cx, y:printer.cy}));

    origX = printer.x;
    origY = printer.y;
    origZ = printer.z;
    origE = printer.e;

    // test that position is cx,cy
    ASSERT(printer.x, printer.cx, "x not equal to cx");
    ASSERT(printer.y, printer.cy, "y not equal to cy");
    ASSERT(origZ, printer.z, "z not equal to orig Z");
    ASSERT(origE, printer.e, "e not equal to orig E");
    
    infoMsg("!!done testing cx,cy!!");
    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");

    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");
    infoMsg("!!testing down!!");
    origX = printer.x;
    origY = printer.y;
    origZ = printer.z;
    origE = printer.e;

    await liveprintercomms.schedule(async()=> printer.up(-distToMove));

    ASSERT(printer.x, origX, "x not equal to x0");
    ASSERT(printer.y, origY, "y not equal to y0");
    ASSERT(printer.z, origZ-distToMove, "z not equal to new Z");
    ASSERT(origE, printer.e, "e not equal to orig E");

    infoMsg("!!done testing down!!");
    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");

    infoMsg("!!testing up!!");
    origX = printer.x;
    origY = printer.y;
    origZ = printer.z;
    origE = printer.e;

    await liveprintercomms.schedule(async()=> printer.up(distToMove));

    ASSERT(printer.x, origX, "x not equal to x0");
    ASSERT(printer.y, origY, "y not equal to y0");
    ASSERT(printer.z, origZ+distToMove, "z not equal to new Z");
    ASSERT(origE, printer.e, "e not equal to orig E");

    infoMsg("!!done testing up!!");
    
    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");
    infoMsg("!!testing draw!!");
    
    origX = printer.x;
    origY = printer.y;
    origZ = printer.z;
    origE = printer.e;
    
    await liveprintercomms.schedule(async()=> printer.turnto(25));
    await liveprintercomms.schedule(async()=> printer.dist(distToMove));
    await liveprintercomms.schedule(async()=> printer.speed(30));
    await liveprintercomms.schedule(async()=> printer.draw());

    ASSERT(printer.x, origX+distToMove*Math.cos(printer.d2r(25)), `did not move ${distToMove}`); // off by a few hundredths... not great
    ASSERT(printer.y, origY+distToMove*Math.sin(printer.d2r(25)), "y not equal to y0");
    ASSERT(printer.z, origZ, "z not equal to new Z");
    //TODO: e too complex to calculate for now...

    infoMsg("!!done testing draw!!");
    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");
    infoMsg("!!testing travel!!");
    
    origX = printer.x;
    origY = printer.y;
    origZ = printer.z;
    origE = printer.e;
    
    await liveprintercomms.schedule(async()=> printer.turnto(90));
    await liveprintercomms.schedule(async()=> printer.dist(distToMove));
    await liveprintercomms.schedule(async()=> printer.speed(30));
    await liveprintercomms.schedule(async()=> printer.travel());

    ASSERT(printer.x, origX, `did not move ${distToMove}`); // off by a few hundredths... not great
    ASSERT(printer.y, origY+distToMove, "y not equal to y0");
    ASSERT(printer.z, origZ, "z not equal to new Z");
    ASSERT(origE, printer.e, "e not equal to orig E");

        
    infoMsg("!!done testing travel!!");


    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");
    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");
    infoMsg("!!----------WARPING-------------!!");
    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");    
    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");


    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");
    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");
    infoMsg("!!testing draw with warp!!");
    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");    
    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");


    // warp time
    // warp distance

    origX = printer.x;
    origY = printer.y;
    origZ = printer.z;
    origE = printer.e;

    printer.timewarp = ({dt, t, tt}) => 
    {
        Logger.debug(`timewarp(t:${t}, tt:${tt})`);   
        return dt*2;
    };
    
    
    printer.warp = ({d, heading, elevation, t, tt}={}) =>
    {
        const d2 = d*2;
        const h2 = heading/2;
        Logger.debug(`warp(d:${d}, heading:${heading}, elevation:${elevation}, t:${t}, tt:${tt})`);    
        return {d:d2, heading:h2, elevation};
    };

    infoMsg("BPM TESTING");
    let bpm = printer.bpm(140);
    ASSERT(bpm, 140, "BPM miscalculation");
    bpm = printer.bps(140/60);
    ASSERT(bpm, 140,"BPS miscalculation");

    infoMsg("TEST Interval");
    infoMsg(`One beat at 140bpm should be ${(6000/140)} ms`);
    printer.interval("1/8b");
    ASSERT(printer._intervalTime, (6000/140)*0.125, "Interval time miscalculation");

    let timeToMove = "12b";

    infoMsg("Set speed and move");
    await liveprintercomms.schedule(async()=> printer.speed(30));

    await liveprintercomms.schedule(async()=> printer.drawtime("10b"));

    infoMsg("!!done testing drawtime with warp!!");
    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");

}

//*------------****------------****------------****------------***
// Setup button events
//*------------****------------****------------****------------***

document.getElementById("go").onclick= async ()=>{
    await startTest();  
  };

document.getElementById("music-test").onclick= async ()=>{
    await liveprintercomms.schedule(async()=> printer.start());

    infoMsg("!!music theory test!!");
    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");
    await startMusicTest();  
    infoMsg("!!done testing music theory!!");
    infoMsg("!!-=-=--=-=-=-=-=-=-=-=-=-=-=-=-=-");
};

async function startMusicTest() {
    await liveprintercomms.globalEval("console.log('stuff')");

    await liveprintercomms.globalEval("let m=lib.midi(\"A4\");console.log(m);");    
    Logger.info("transposing:");
    Logger.info(transpose("A4","3M")); // should be C

    await liveprintercomms.globalEval("lib.log.info(`A4:${lib.midi(\"A4\")}`)");
    await liveprintercomms.globalEval("lib.log.info(`A4/3P:${ lib.transpose(\"A4\",\"3M\") }`)");

    await liveprintercomms.globalEval("let m=lp.m2s(\"A4\");console.log(m);");    
    await liveprintercomms.globalEval("let m=lp.m2s(\"c5\");console.log(m);");    
    
}


document.getElementById("movetest").onclick= async ()=>{    
    let elapsedTime;
    // try movement code
    infoMsg(`testing mov function`);
    let startTime = new Date();
    await liveprintercomms.globalEval(`# mov2 x:20 y:40 speed:5`, 1);
    elapsedTime = (new Date()) - startTime;
    infoMsg(`time to move: ${elapsedTime}ms`);
}

document.getElementById("serialTest").onclick= async ()=>{

    // GET PORTS

    infoMsg("getting ports...");
    let startTime = new Date();
    const ports = await testGetPorts();  
    Logger.debug(ports);
    let elapsedTime = new Date() - startTime;
    if (ports.result && Array.isArray(ports.result[0].ports))
    {
        infoMsg(`found ports in ${elapsedTime}ms`);
        ports.result[0].ports.map(port => infoMsg(port));
    }  

    // SET PORTS

    infoMsg("setting port to DUMMY...");
    try {
        startTime = new Date();
        await liveprintercomms.setSerialPort({port:"dummy", baudRate:"112500"});
        let elapsedTime = (new Date()) - startTime;
        infoMsg(`time to set port: ${elapsedTime}ms`);
    }
    catch (err) {
        Logger.debug(err);
        infoMsg(`ERROR: ${JSON.stringify(err)}`);    
    }

    // GET PRINTER STATE
    infoMsg("setting port to DUMMY...");
    try {
        startTime = new Date();
        let state = await liveprintercomms.getPrinterState();
        let elapsedTime = (new Date()) - startTime;
        infoMsg(`time to get state: ${elapsedTime}ms`);
        infoMsg(JSON.stringify(state));
    }
    catch (err) {
        Logger.debug(err);
        infoMsg(`ERROR: ${JSON.stringify(err)}`);    
    }
};
  

async function testGetPorts(){
    const request = {"jsonrpc":"2.0","id":6,"method":"get-serial-ports","params":[]};
    let response;

    try {
        response = await $.ajax({
            url: `/jsonrpc`,
            type: "POST",
            data: JSON.stringify(request),
            timeout: liveprintercomms.vars.ajaxTimeout // might be a long wait on startup... printer takes time to start up and dump messages
        });
    }
    catch (error) {
        // statusText field has error ("timeout" in this case)
        infoMsg(JSON.stringify(error, null, 2));
        const statusText = `JSON error ${JSON.stringify(response)}`; 
        Logger.error(statusText);
        infoMsg(`ERROR: ${statusText}`);  
    }
    if (undefined !== response.error) {
        infoMsg(`ERROR: ${JSON.stringify(response.error)}`); 
    }
    return response;
}


setup().catch(err=>Logger.error(err));
