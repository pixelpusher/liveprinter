// LivePrinter parameterised version  April 18 2023 two whites

# start | bed 65 | temp 220 

# mov2 x:lp.maxx*0.4 y:lp.maxy*0.2 z:50 speed:80

# ext e:20 speed:3 | retract

# retract

# ext e:10 speed:4

# ext2 e:2

# bed 0 | fan 0 | temp 0

# sync 

# retract 

# fan 0


const { concat, cycle, take, reverse, range, butLast, mapIndexed } = await import("https://cdn.skypack.dev/@thi.ng/iterators");

const { zigzagColumns2d } = await import('https://cdn.skypack.dev/@thi.ng/grid-iterators');
const cos = Math.cos;
const sin = Math.sin; 
const PI = Math.PI;
const TAU = Math.PI*2;

// position on paper
const offsetx = lp.maxx*0.2;
const offsety = lp.maxy*0.2;
const minz = 0.3; // start z
const minthick = 0.16;

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
            [6,18]];

const xanglefuncs = [
    (i,p)=>sin(p*PI*( i / ROWS) % TAU),
    (i,p)=>sin(p*PI*( i / ROWS))%TAU, // was happy accident? whiteys lines apr 18
    (i,p)=>sin(p*PI*( i / TPS) % TAU)
];

const yanglefuncs = [
    (i,p)=>cos(p*PI*( i / ROWS) % TAU),
    (i,p)=>cos(p*PI*( i / TPS) % TAU)
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
        tpsoffset:1, // for out of sync
        params: 2,
        xfunc: 2,
        yfunc: 1,
        beat: "1/4b",
        bh: 4,
        bpm:110
    }
};

// selected run
const run = runs.jaggy;

//-------VARS--------------------

const COLS = sizes[run.size][0]; // grid points -- 45 is nice too
const ROWS = sizes[run.size][1]; 
// total points
const TPS = (ROWS*COLS)-run.tpsoffset; // avoid last dupes

const pad = 4;

const W = Math.ceil(((lp.maxx*0.65)-2*pad) / (Math.max(ROWS,COLS)+1));
const H = Math.ceil(((lp.maxy*0.4)-2*pad) / (Math.max(ROWS,COLS)+1));

loginfo(`w:${W}/h:${H}`);


const beat = run.beat;

const beatHeight = lp.t2mm(beat)/run.bh;

loginfo(`x ${xanglefuncs[run.xfunc](1,0)}`);
loginfo(`y ${yanglefuncs[run.yfunc](1,1)}`);



/**
 * Maps normalised-ish grid to actual width,height
 * @param {Integer} i index
 * @param {Any} param1 Coords array x,y to map
 * @returns {Array} mapped [x,y]
 */
function mapping(i, [x,y]) {
  const rr =Math.pow( (lp.z - minz)/beatHeight, 2);
  const zangle = PI/2*rr;
  //loginfo(`${PI}:${lp.z}`);
  const ramp =sin(zangle);
  
  return [
    (x+goodparams[run.params][2] * rr * xanglefuncs[run.xfunc](
        i,goodparams[run.params][0])
    ) * W + pad + offsetx, 
    (y+goodparams[run.params][3] * rr * yanglefuncs[run.yfunc](
        i,goodparams[run.params][1])
    ) * H + pad + offsety
  ];
}

loginfo(`y ${mapping(0,[1,1])}`);


// GRIDZ --------------------------

// avoid repeating front and end points
const forwardgrid = 
      zigzagColumns2d({ cols: COLS, rows: ROWS });

// grid in reverse
const reversegrid = reverse(zigzagColumns2d({ cols: COLS, rows: ROWS }));

// create infinite repetition of the combined fwd & reverse sequence
const grid = cycle(concat(forwardgrid, reversegrid));

const indexed = mapIndexed((i, v) => {
  let ii = i % (2*TPS); 
  //console.log(ii);
  if (ii < TPS) return [ii,v];
  else return [2*TPS-ii-1,v];
}, grid );

//console.log([...take(TPS,indexed)]);

// END GRIDZ --------------------------


# mov2 x:offsetx y:offsety z:minz speed:50 | interval "1/16b" | unretract

lp.bpm(run.bpm); // set bpm for piece

loginfo(`beatheight: ${beatHeight}`);

while (lp.z < beatHeight+minz)
{  
	let lastIndex = TPS;
    const pctDone = (lp.z-minz)/beatHeight;
	const newthick = minthick - 0.08*pctDone; 
	const fansp = Math.min(100, Math.floor(150*pctDone));

    for (let ctr=0; ctr<(2*TPS); ctr++) {
      	
        if (window.bail) {
          # retract | speed 50 | up 50
          return; //safety stop
        }
          
		const[i, coords] = indexed.next().value;

 		let [x,y] = mapping(i, [coords[0], coords[1]]);
        //loginfo(`${[x,y]}`);

        if (i === lastIndex ) 
        {          
          # up newthick | fan fansp | thick newthick
          continue;
        }
        lastIndex = i;
      	
        # to x:x y:y t:beat | draw        
    };
 
}
  
# retract | speed 50 | up 50

# bed 0 | temp 0  // for the end

delete window.bail;