import { Printer } from '../js/liveprinter.printer'; // printer API object
import {doError, infoHandler, init} from '../js/liveprinter.ui';
const liveprintercomms =  require('../js/liveprinter.comms');
import { Logger } from 'liveprinter-utils';
import $ from "jquery";

Logger.level = Logger.LOG_LEVEL.debug;

liveprintercomms.vars.logAjax = true;

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
        const p = async () => {        
            setTimeout(f, timeout);

        };
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

async function setup() {
    // set up GUI with printer ref
    await init(printer);

    if (window.lp) delete window.lp;
    window.lp = printer; // make available to all scripts later on and livecoding... not great
    
    infoHandler.info(quickMsg("starting"));
    // test scheduling code
    liveprintercomms.schedule( async ()=> infoHandler.info({time:Date.now(),message:`schedule test: ${testIndex++}`}), 500);
    
    /// attach listeners
    printer.addGCodeListener({ gcodeEvent: async data => infoHandler.info(quickMsg(data)) });
    printer.addGCodeListener({ gcodeEvent: async data => Logger.debug(quickMsg(data)) });
    printer.addErrorListener({ errorEvent: doError });
    // SETUP PRINTER GCODE LISTENER
    printer.addGCodeListener({ gcodeEvent: liveprintercomms.sendGCodeRPC });

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
}

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

document.getElementById("movetest").onclick= async ()=>{    
    let elapsedTime;
    // try movement code
    infoHandler.info(quickMsg(`testing mov function`));
    let startTime = new Date();
    await liveprintercomms.globalEval(`# mov2 x:20 y:40 speed:5`, 1);
    elapsedTime = (new Date()) - startTime;
    infoHandler.info(quickMsg(`time to move: ${elapsedTime}ms`));
}

document.getElementById("gotest").onclick= async ()=>{    
    let elapsedTime;
    infoHandler.info(quickMsg(`testing go function`));
    startTime = new Date();
    await liveprintercomms.globalEval(`# minmove 5 | m2s 74 | t2d 1600 | go 1`, 1);
    elapsedTime = (new Date()) - startTime;
    infoHandler.info(quickMsg(`time to move: ${elapsedTime}ms`));
}

document.getElementById("serialTest").onclick= async ()=>{

    // GET PORTS

    infoHandler.info(quickMsg("getting ports..."));
    let startTime = new Date();
    const ports = await testGetPorts();  
    Logger.debug(ports);
    let elapsedTime = new Date() - startTime;
    if (ports.result && Array.isArray(ports.result[0].ports))
    {
        infoHandler.info(quickMsg(`found ports in ${elapsedTime}ms`));
        ports.result[0].ports.map(port => infoHandler.info(quickMsg(port)));
    }  

    // SET PORTS

    infoHandler.info(quickMsg("setting port to DUMMY..."));
    try {
        startTime = new Date();
        await liveprintercomms.setSerialPort({port:"dummy", baudRate:"112500"});
        let elapsedTime = (new Date()) - startTime;
        infoHandler.info(quickMsg(`time to set port: ${elapsedTime}ms`));
    }
    catch (err) {
        Logger.debug(err);
        infoHandler.info(quickMsg(`ERROR: ${JSON.stringify(err)}`));    
    }

    // GET PRINTER STATE
    infoHandler.info(quickMsg("setting port to DUMMY..."));
    try {
        startTime = new Date();
        let state = await liveprintercomms.getPrinterState();
        let elapsedTime = (new Date()) - startTime;
        infoHandler.info(quickMsg(`time to get state: ${elapsedTime}ms`));
        infoHandler.info(quickMsg(JSON.stringify(state)));
    }
    catch (err) {
        Logger.debug(err);
        infoHandler.info(quickMsg(`ERROR: ${JSON.stringify(err)}`));    
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
        infoHandler.info(quickMsg(JSON.stringify(error, null, 2)));
        const statusText = `JSON error ${JSON.stringify(response)}`; 
        Logger.error(statusText);
        infoHandler.info(quickMsg(`ERROR: ${statusText}`));  
    }
    if (undefined !== response.error) {
        infoHandler.info(quickMsg(`ERROR: ${JSON.stringify(response.error)}`)); 
    }
    return response;
}


setup().catch(err=>Logger.error(err));
