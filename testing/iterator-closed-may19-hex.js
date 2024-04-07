// BIG W for creatlity -- note needs 112500 baud
// april 25 4:50pm
// leveling was tough -- needs to be close to bed, thickness needs
// more maybe because of diff firmware calc from Ultimaker 2

# start | temp 225 | bed 75

# temp 230

minthick = 0.15

# fan 70

global bail = true

# sync

# thick 0.3 | draw 140

# mov2 x:lp.maxx*0.6 y:lp.maxy*0.2 z:60.4

# ext e:2 speed:1

# fan 100

setbpm(80)

setbeat("1/2b")

# retract

// May 16, 11am
// last one, symmetry but fixed level up bug (should be on 1st pt)
// makes an enclosed M shape

window.bail = false;

const { concat, cycle, take, reverse, range, mapIndexed } = await import("https://cdn.skypack.dev/@thi.ng/iterators");

const { zigzagColumns2d } = await import('https://cdn.skypack.dev/@thi.ng/grid-iterators');

const tri = (angle) => {const ang = angle % (Math.PI*2); return (ang <= Math.PI ? ang/Math.PI : 1-ang/Math.PI);}; 

const cos = Math.cos;
const sin = Math.sin; 

const PI = Math.PI;
const TAU = Math.PI*2;

const pad = 0;

const offsetx = lp.maxx*0.6;
const offsety = lp.maxy*0.1;

const minz = 0.1; // start z
global minthick = 0.18;


const goodparams = [
  [5.5,2.5,0.33,0.33], //0
  [55.5,12.5,0.8,0.33], //1
  [7,3,0.33,0.33],		//2
  [33,51,0.33,0.25],	//3
  [13,99,0.33,0.4],		//4
  [8,0,0.99,0.13],		//5
];

const sizes = [[3,3], //0
              [9,9],  //1
              [11,3], //2
              [6,18], //3
              [8,8], //4
              [6,22] //5
            ];

const log2 = (l) =>  Math.log(l)/Math.log(2);


// presets from runs -- indices of saves params
const runs = {
  "orig": {
    size: 2,
    tpsoffset:0, // for out of sync
    params: 0,
    xfunc: 0,
    yfunc: 1,
    beat: "1/2b",
    bh: 2,
    bpm:110
},  
  
  "whiteys": {
        size: 1,
        tpsoffset:0, // for out of sync
        params: 1,
        xfunc: 0,
        yfunc: 0,
        beat: "1/2b",
        bh: 2,
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
        beat: "1/4b",
        bh: 3,
        bpm:130
    },
    "diamonds":{
      size: 5,
      tpsoffset:0, // for out of sync
      params: 5, // 4 is jaggy
      xfunc: 5,
      yfunc: 4,
      beat: "1/4b",
      bh: 1,
      bpm:80
  },
  "crushdiamonds":{
    size: 5,
    tpsoffset:0, // for out of sync
    params: 5,
    xfunc: 6,
    yfunc: 4,
    beat: "1/16b",
    bh: 0.35,
    bpm:60
},
"regnoise":{
  size: 5,
  tpsoffset:0, // for out of sync
  params: 5,
  xfunc: 7,
  yfunc: 4,
  beat: "1/16b",
  bh: 0.25,
  bpm:130
},
  
};

// selected run VARS ****************************
let run = runs.diamonds;

const COLS = sizes[run.size][0]; // grid points -- 45 is nice too
const ROWS = sizes[run.size][1]; 

// total points
const TPS = (ROWS*COLS) - run.tpsoffset; // avoid last dupes

const W = Math.ceil((lp.maxx*0.25) / COLS);
const H = Math.ceil((lp.maxy*0.2) / ROWS);


const xanglefuncs = [
    // (i,amt,p)=>1, // identity, for testing
  //0
  (i,amt,p)=>(sin(amt*PI)*sin(amt*PI))*sin(p*PI*(i/(TPS-1))),
  //1
  (i,amt,p)=>amt*sin(p*PI*( Math.ceil((i % ROWS) / ROWS)) % TAU),
  //2
  (i,amt,p)=>amt*sin(p*PI*( i / ROWS))%TAU, // was happy accident? whiteys lines apr 18
  //3  
  (i,amt,p)=> ((i%(COLS-1))*0.25+0.70*log2(1+(1-amt))*(sin((ROWS-(i%ROWS)/2)/(ROWS)*p*3*PI % TAU) + sin((ROWS-(i%ROWS)/2)/(ROWS)*11.33*p*PI % TAU) + sin((COLS-(i%COLS)/2)/(COLS)*p*22.56*PI % TAU))
                     ),
  //4
		(i,amt,p)=>p,
  //5
		(i,amt,p)=> (
            //((i%p)/(p-1))* 
          // tri((p*i%ROWS)/COLS)* 
          // tri((p*i%ROWS))* 
          tri(2*p*i*PI/(ROWS))* // hexagons 
          sin(sin(amt*PI/2)*PI % TAU)
        ),
//6
		(i,amt,p)=>(
          ((i%p)/(p-1)) *
          cos(p*PI + ((i/COLS)*PI % TAU)) *
          sin(log2(1+(1-amt))*amt*PI % TAU)
        ),
  // 7
          (i,amt,p)=>  (
    	// cos(2*PI*((i % TPS)/TPS)*
      	log2(2-
        // ((i%p)/(p-1)) 
        cos((i*PI-(i%p)/(p-1)*PI % TAU)/(COLS-1))
        *Math.abs(sin(i*PI-(i%p)/(p-1)*PI % TAU))
        *(sin(sin(amt*PI/2)*PI % TAU))
        )
    )
];

//test
loginfo(`${xanglefuncs[5](0,0,1)}`);

const yanglefuncs = [
    (i,amt,p)=>(sin(amt*PI)*sin(amt*PI))*cos(p*PI*( i / ROWS) % TAU),
    (i,amt,p)=>amt*cos(p*PI*( i / COLS) % TAU),
    (i,amt,p)=>amt*cos(p*PI*( i / (TPS-1)) % TAU),
    (i,amt,p)=>{
        const cc=log2(1+(1-amt)); 
        return cc*cos(cc/100*(COLS-(i%COLS)/2)/(COLS)*p*4.5*PI % TAU);
      },
    (i,amt,p)=>p    
];



loginfo(`w:${W}/h:${H}`);


global beat = run.beat;
global beatHeight = lp.t2mm(beat)*run.bh;
global totalIters = Math.ceil(beatHeight/minthick);

global setbeat = (b) => {
  beat = b;
  //beatHeight = lp.t2mm(beat)*run.bh; // keep original or else ends early
  totalIters = Math.ceil(beatHeight/minthick);
};

global setbpm = (b) => {
  lp.bpm = b;
  setbeat(beat); // trigger recalc
};

setbpm(run.bpm);

loginfo(`bpm: ${lp.bpm}`);
loginfo(`bh: ${beatHeight} mm`);
loginfo(`beat: ${beat}`);
loginfo(`tot iters: ${totalIters}`);
// selected run VARS ****************************



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
      throw Error(`NAN${[xx,yy]} :${iters}:${i}:${[x,y]}`);
    }
    return [xx,yy];
}
  
loginfo(`y ${mapping(0,0,[0,0])}`);
  // for testing -- identity
  // return [
  //   x*W+offsetx,y*H+offsety
  // ];

loginfo(`y ${mapping(0,0,[1,1])}`);


// GRIDZ --------------------------

const makeIndexed = () =>
{
  // avoid repeating front and end points
  const forwardgrid = 
        zigzagColumns2d({ cols: COLS, rows: ROWS });

  // grid in reverse
  const reversegrid = reverse(zigzagColumns2d({ cols: COLS, rows: ROWS }));

  // create infinite repetition of the combined fwd & reverse sequence
  const grid = cycle(concat(forwardgrid, reversegrid));

  let iters = 0; // start at 1
  
  return mapIndexed((i, v) => {

    const ii = i % (2*TPS); 
    const sawIndex = ii < TPS ? ii : 2*TPS-1-ii; // sawtooth
    
    if (ii === (2*TPS-1)) iters++;

    return [iters, sawIndex, v];
  }, grid );
};

const indexed = makeIndexed();

//console.log([...take(TPS,indexed)]);

// END GRIDZ --------------------------

    
const [iters0, i0,coords0] = indexed.next().value;

const [x0,y0] = mapping(iters0/(totalIters-1), i0, coords0);
 
loginfo("***");  
# mov2 x:x0 y:y0 z:minz speed:50 | interval "1/32b" | unretract
loginfo("***");
  
# ext e:0.25

// *** START LOOP! ***********************

let lastIndex = TPS;

while (lp.z < (beatHeight+minz))
{  
  //	if (xxx-- < 1) return;
	
    const pctDone = (lp.z-minz)/beatHeight;
	//const newthick = minthick - 0.08*pctDone; 
	//const fansp = Math.min(100, Math.floor(150*pctDone));
      	
    if (window.bail) {
      # retract | tsp 50 | up 50
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

    # to x:x y:y t:beat | draw         
}
  
# retract | speed 50 | up 50


