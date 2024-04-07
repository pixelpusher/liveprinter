// LivePrinter test  April 18 2023 two whites

# start | bed 65 | temp 220 

# bed 65 | temp 210

# mov2 x:lp.maxx*0.8 y:lp.maxy*0.2 z:1.2 speed:80

                                                                                   
# unretract | turn 180 | thick 0.15 | speed 15 | draw 30


# thick 0.1 | ext e:10 speed:3 

# speed 50 | up 50 | retract

# retract

# ext e:10 speed:4

# ext2 e:2

# start | bed 0 | fan 0 | temp 0

# sync 

# retract 

# fan 0

# start | temp 0 | bed 0

const { concat, cycle, take, reverse, range, butLast, mapIndexed } = await import("https://cdn.skypack.dev/@thi.ng/iterators");

const { zigzagColumns2d } = await import('https://cdn.skypack.dev/@thi.ng/grid-iterators');
const cos = Math.cos;
const sin = Math.sin; 
const PI = Math.PI;
const TAU = Math.PI*2;

// position on paper
const offsetx = lp.maxx*0.3;
const offsety = lp.maxy*0.3;
const minz = 1; // start z
const minthick = 0.1;

const goodparams = [
  [5.5,2.5,0.33,0.33],
  [55.5,12.5,0.3,0.33],
  [7,3,0.33,0.33],
  [33,51,0.33,0.25],
  [77,51,0.33,0.25]
];

const sizes = [[3,3],
              [9,9],
              [11,3],
              [6,18],
              [8,8]];

const log2 = (l) =>  Math.log(l)/Math.log(2);

const xanglefuncs = [
    (i,amt,p)=>amt*sin(p*PI*( i / ROWS) % TAU),
    (i,amt,p)=>amt*sin(p*PI*( i / ROWS))%TAU, // was happy accident? whiteys lines apr 18
    (i,amt,p)=> (i%(COLS-1))*0.25+0.70*log2(1+(1-amt))*(sin((ROWS-(i%ROWS)/2)/(ROWS)*p*3*PI % TAU) + 
                            sin((ROWS-(i%ROWS)/2)/(ROWS)*11.33*p*PI % TAU) +
                            sin((COLS-(i%COLS)/2)/(COLS)*p*22.56*PI % TAU))
];

const yanglefuncs = [
    (i,amt,p)=>amt*cos(p*PI*( i / ROWS) % TAU),
    (i,amt,p)=>amt*cos(p*PI*( i / TPS) % TAU),
    (i,amt,p)=>amt*cos(p*PI*( i / (TPS-1)) % TAU),
    (i,amt,p)=>{const cc=log2(1+(1-amt)); 
                return cc*cos(cc/100*(COLS-(i%COLS)/2)/(COLS)*p*4.5*PI % TAU)}
];

// apr 18th whiteys was size/param/x/y 1,1,1,1

// presets from runs -- indices of saves params
const runs = {
    "whiteys": {
        size: 1,
        tpsoffset:0, // for out of sync
        params: 1,
        xfunc: 1,
        yfunc: 1,
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
        beat: "1/2b",
        bh: 2,
        bpm:80
    }
};

// selected run
const run = runs.jaggy2;

//-------VARS--------------------

const COLS = sizes[run.size][0]; // grid points -- 45 is nice too
const ROWS = sizes[run.size][1]; 
// total points
const TPS = (ROWS*COLS)-run.tpsoffset; // avoid last dupes

const pad = 0;

const W = Math.ceil(((lp.maxx*0.6)-2*pad) / (Math.max(ROWS,COLS)+1));
const H = Math.ceil(((lp.maxy*0.6)-2*pad) / (Math.max(ROWS,COLS)+1));

loginfo(`w:${W}/h:${H}`);


const beat = run.beat;
const beatHeight = lp.t2mm(beat)/run.bh;
const totalIters = beatHeight/minthick;

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
    
    return [
      (x+goodparams[run.params][2] * xanglefuncs[run.xfunc](
          i,iters,goodparams[run.params][0])
      ) * W + pad + offsetx, 
      (y+goodparams[run.params][3] * yanglefuncs[run.yfunc](
          i,iters,goodparams[run.params][1])
      ) * H + pad + offsety
    ];
  }
  
  loginfo(`y ${mapping(0,0,[1,1])}`);
  

// GRIDZ --------------------------

// avoid repeating front and end points
const forwardgrid = 
      zigzagColumns2d({ cols: COLS, rows: ROWS });

// grid in reverse
const reversegrid = reverse(zigzagColumns2d({ cols: COLS, rows: ROWS }));

// create infinite repetition of the combined fwd & reverse sequence
const grid = cycle(concat(forwardgrid, reversegrid));


const makeIndexed = () =>
{
  let iters = 0;
  let lastVal = null;
  
  return mapIndexed((i, v) => {
    
    
    const ii = i % (2*TPS); 
    const iii = ii < TPS ? ii : 2*TPS-1-ii; // sawtooth
    
    if (lastVal === iii && iii === 0) iters++;
    lastVal = iii;
    
    //console.log(iii);
    return [iters, iii,v];
  }, grid );
};

const indexed = makeIndexed();

//console.log([...take(TPS,indexed)]);

// END GRIDZ --------------------------


# mov2 x:offsetx y:offsety z:minz speed:50 | interval "1/16b" //| unretract

lp.bpm(run.bpm); // set bpm for piece

loginfo(`beatheight: ${beatHeight}`);

let xxx = 4;

let lastIndex = TPS;

while (lp.z < beatHeight+minz)
{  
  	if (xxx-- < 1) return;
	
    const pctDone = (lp.z-minz)/beatHeight;
	const newthick = minthick - 0.08*pctDone; 
	const fansp = Math.min(100, Math.floor(150*pctDone));

    for (let ctr=0; ctr<(2*TPS); ctr++) {
      	
        if (window.bail) {
          # retract | speed 50 | up 50
          return; //safety stop
        }
          
        const [iters, i,coords] = indexed.next().value;
        loginfo(`${i}::${lastIndex}`);
		
        console.log([iters, i,coords]);
          
 		const [x,y] = mapping(iters/totalIters, i, coords);
        //loginfo(`${[x,y]}`);

        if (i === lastIndex ) 
        { 
          # up minthick | fan fansp
          loginfo(`up ${i}: ${lp.z}`);
          
          continue;
        }
        lastIndex = i;
      	
        # to x:x y:y t:beat | draw        
    };
 
}
  
# retract | speed 50 | up 50

# bed 0 | temp 0  | fan 0 // for the end
