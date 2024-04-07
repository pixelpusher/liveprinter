// seashell warp May 13th 2023

// LivePrinter test  April 18 2023 two whites

# m2s "C6" | bpm 120 | drawtime "1b"

loginfo(`${lp.t2mm("1b")}`)

# start | bed 72 | temp 225


# sync

# bed 72 | temp 225

# gcode "G92 E0"

lp.e = 0;

# gcode "G1 E20 F100"

# gcode "M92 E925"

# gcode "M503"


lib.log.level = 3

loginfo(lib.log)

// 100mm was 54mm

# ext e:20 speed:1.5

# sync
                                           
# retract 

# temp 225

// test 1: layer heights and thicknesses. Vary from 0.1 to 0.4 (fails)

# mov2 x:lp.maxx*0.6 y:lp.maxy*0.3 z:40.1 speed:80	

# ext e:6 speed:2

# retract

// 0.1-0.4 max. 0.2 looks good, 0.3 gets a little stringier. 0.4 not great
// better adhesion at 225 C

// manually repeat this block of code for each layer to test, changing tk above as desired
let tk = 0.1; 
await repeat(8, async(i) => {
	# turn 45 | thick tk | speed 30 | draw 30 
});
# up tk

  // 6.3

# retract | up 50

# bed 0 | temp 0

// test 2: layer heights and thicknesses. Vary from 0.1 to 0.4 (fails)

# mov2 x:lp.maxx*0.58 y:lp.maxy*0.2 z:60.1 speed:80	
# retract
# ext e:12 speed:1 
  
let tk = 0.2; // 0.1-0.4 max
  
await repeat(20, async(it) => {  
  await repeat(8, async(i) => {
    let d = 6-(it/8);
    # turn 45 | thick tk | speed 15 | draw d 
  });
  # up tk
});
  
# retract| up 40  
  
  
# start | bed 0 | fan 0 | temp 0

# sync 

# retract 

# fan 40

# start | bed 50
 
lp.resettimewarp();
  
lp.timewarp = function ({dt, t, tt}={})
{
  return dt; //A time-varying movement function set by user. Default is no-op 
};   
  
lp.warp = function ({d, heading, elevation, t, tt}={})
{
  const bt = lp.b2t(1/2);
  const tt2 = tt % (32*bt);
  heading = heading + Math.PI/2*Math.sin(Math.PI*tt/bt) + Math.PI/16*Math.sin(Math.PI*(tt/4)/bt); // sine wave for 1/32 beat
  //loginfo(`${[d, heading, elevation, t, tt]}`);
  return {d, heading, elevation}; //A time-varying movement function set by user. Default is no-op 
};  

// now we wait  
  
global bail = true  
  
beat = "3b"  

# bpm 40  
  
minthick = 0.15
  
# down 0.05
  
# fan 80  
  
loginfo(`${lp.b2t(1/32)}`)

  
  
# turn 180 | drawtime 1000  | up 0.1
  
 # retract | up 50

# ext e:5 speed:3  
  
  
const { concat, cycle, take, reverse, range, butLast, mapIndexed } = await import("https://cdn.skypack.dev/@thi.ng/iterators");

const { zigzagColumns2d } = await import('https://cdn.skypack.dev/@thi.ng/grid-iterators');
const cos = Math.cos;
const sin = Math.sin; 
const PI = Math.PI;
const TAU = Math.PI*2;

// position on paper
const offsetx = lp.maxx*0.25;
const offsety = lp.maxy*0.25;
const minz = 0.1; // start z
global minthick = 0.2;

const goodparams = [
  [5.5,2.5,0.33,0.33],
  [55.5,12.5,0.85,0.4],
  [7,3,0.33,0.33],
  [33,51,0.33,0.25],
  [13,99,0.33,0.4]
];

const sizes = [[3,3],
              [9,9],
              [11,3],
              [6,18],
              [8,8]];

const log2 = (l) =>  Math.log(l)/Math.log(2);

const xanglefuncs = [
    // (i,amt,p)=>1, // identity, for testing
    (i,amt,p)=>(sin(amt*PI)*sin(amt*PI))*sin(p*PI*(i/(TPS-1))),
    (i,amt,p)=>amt*sin(p*PI*( Math.ceil((i % ROWS) / ROWS)) % TAU),
    (i,amt,p)=>amt*sin(p*PI*( i / ROWS))%TAU, // was happy accident? whiteys lines apr 18
    (i,amt,p)=> (i%(COLS-1))*0.25+0.70*log2(1+(1-amt))*(sin((ROWS-(i%ROWS)/2)/(ROWS)*p*3*PI % TAU) + sin((ROWS-(i%ROWS)/2)/(ROWS)*11.33*p*PI % TAU) + sin((COLS-(i%COLS)/2)/(COLS)*p*22.56*PI % TAU)),
    (i,amt,p)=>1,
];

const yanglefuncs = [
    (i,amt,p)=>(sin(amt*PI)*sin(amt*PI))*cos(p*PI*( i / ROWS) % TAU),
    (i,amt,p)=>amt*cos(p*PI*( i / COLS) % TAU),
    (i,amt,p)=>amt*cos(p*PI*( i / (TPS-1)) % TAU),
    (i,amt,p)=>{const cc=log2(1+(1-amt)); 
                return cc*cos(cc/100*(COLS-(i%COLS)/2)/(COLS)*p*4.5*PI % TAU)},
    (i,amt,p)=>1,
];

// apr 18th whiteys was size/param/x/y 1,1,1,1

// presets from runs -- indices of saves params
const runs = {
    "whiteys": {
        size: 1,
        tpsoffset:0, // for out of sync
        params: 1,
        xfunc: 0,
        yfunc: 0,
        beat: "1/2b",
        bh: 0.4,
        bpm:110
    },

    "jaggy":{
        size: 3,
        tpsoffset:0, // for out of sync
        params: 3,
        xfunc: 2,
        yfunc: 2,
        beat: "1/4b",
        bh: 3,
        bpm:130
    },
    "jaggy2":{
        size: 4,
        tpsoffset:0, // for out of sync
        params: 4,
        xfunc: 2,
        yfunc: 3,
        beat: "1/2b",
        bh: 2,
        bpm:80
    },
  	"timewarp":{
        size: 0,
        tpsoffset:0, // for out of sync
        params: 0,
        xfunc: 4,
        yfunc: 4,
        beat: "2b",
        bh: 0.35,
        bpm: 100
    }
};


// selected run
let run = runs.timewarp;


//-------VARS--------------------

const COLS = sizes[run.size][0]; // grid points -- 45 is nice too
const ROWS = sizes[run.size][1]; 
// total points
const TPS = (ROWS*COLS)-run.tpsoffset; // avoid last dupes

loginfo(`tps: ${TPS}`);

const pad = 4;

const W = Math.ceil(((lp.maxx*0.5)-2*pad) / (Math.max(ROWS,COLS)+1));
const H = Math.ceil(((lp.maxy*0.5)-2*pad) / (Math.max(ROWS,COLS)+1));

loginfo(`w:${W}/h:${H}`);


global beat = run.beat;

const beatHeight = lp.t2mm(beat)*run.bh;

const totalIters = Math.ceil(0.5*beatHeight/minthick);

loginfo(`ti:${totalIters}`)

loginfo(`x ${xanglefuncs[run.xfunc](1,0,0)}`);
loginfo(`y ${yanglefuncs[run.yfunc](1,1,1)}`);



/**
 * Maps normalised-ish grid to actual width,height
 * @param {Integer} i index
 * @param {Any} param1 Coords array x,y to map
 * @returns {Array} mapped [x,y]
 */
function mapping(iters, i, [x,y]) {
    //const rr =Math.pow( (lp.z - minz)/beatHeight, 2);
    //const zangle = PI/2*rr;
    //loginfo(`${PI}:${lp.z}`);
    //const ramp =sin(zangle);
    const xx = (x+goodparams[run.params][2] * xanglefuncs[run.xfunc](
          i,iters,goodparams[run.params][0])
      ) * W + pad + offsetx;
 	const yy= (y+goodparams[run.params][3] * yanglefuncs[run.yfunc](
          i,iters,goodparams[run.params][1])
      ) * H + pad + offsety;
  
  	if (Number.isNaN(xx) || Number.isNaN(yy)) {
      throw Error(`NAN:${iters}:${i}:${[x,y]}`);
    }
    return [xx,yy];
}
  
loginfo(`y ${mapping(0,0,[0,0])}`);
  
const makeIndexed = () =>
{
  // GRIDZ --------------------------

  // avoid repeating front and end points
  const forwardgrid = 
        zigzagColumns2d({ cols: COLS, rows: ROWS });

  // grid in reverse
  const reversegrid = reverse(zigzagColumns2d({ cols: COLS, rows: ROWS }));

  // create infinite repetition of the combined fwd & reverse sequence
  const grid = cycle(concat(forwardgrid, reversegrid));

  let iters = 0; // start at 1
  let lastVal = null;
  
  return mapIndexed((i, v) => {

    const ii = i % (2*TPS); 
    const sawIndex = ii < TPS ? ii : 2*TPS-1-ii; // sawtooth
    
    // if (lastVal === sawIndex && ii === 0) iters++;
    // lastVal = sawIndex;
    
    if (ii === (2*TPS-1)) iters++;

    return [iters, sawIndex, v];
  }, grid );
};

const indexed = makeIndexed();
  
//console.log([...take(TPS,indexed)]);

// END GRIDZ --------------------------



lp.bpm(run.bpm); // set bpm for piece

loginfo(`beatheight: ${beatHeight}`);

const [iters0, i0,coords0] = indexed.next().value;

const [x0,y0] = mapping(iters0/(totalIters-1), i0, coords0);
 
loginfo("***");  
# mov2 x:x0 y:y0 z:minz speed:50 | interval "1/32b" | unretract
loginfo("***");
  
# ext e:0.25
  
//let xxx = 4;

let lastIndex = TPS;

while (lp.z < (beatHeight+minz))
{  
  //	if (xxx-- < 1) return;
	
    const pctDone = (lp.z-minz)/beatHeight;
	//const newthick = minthick - 0.08*pctDone; 
	//const fansp = Math.min(100, Math.floor(150*pctDone));
      	
    if (window.bail) {
      # retract | speed 50 | up 50
      return; //safety stop
    }

    const [iters, i,coords] = indexed.next().value;
    //loginfo(`${i}::${lastIndex}`);

    //console.log([iters, i,coords]);

    const [x,y] = mapping(iters/(totalIters-1), i, coords);
    //loginfo(`${[x,y]}`);

    if (i === lastIndex ) 
    { 
      # tsp 50 | up minthick  //| fan fansp
      //loginfo(`up ${i}: ${lp.z}`);

      continue;
    }
    lastIndex = i;

    # to x:x y:y t:beat | drawtime beat         
}
  
# retract | speed 50 | up 50

//waiting............ 
// still loading from skypack
  
# sync   
global bail = false;
 
  global minthick = 0.2
  
 # ext e:10 speed:1 
  
 # up 40
  
# bed 0 | temp 0  | fan 0 // for the end


