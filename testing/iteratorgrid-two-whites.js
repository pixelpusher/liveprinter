// LivePrinter test  April 18 2023 two whites

# start | bed 65 | temp 220 

# mov2 x:lp.maxx*0.2 y:lp.maxy*0.6 z:50 speed: 80

# ext e:4 speed:3 | retract

# bed 0 | fan 0 | temp 0

# sync 

# retract 

# fan 0

# bpm 110 // set bpm for piece

const { concat, cycle, take, reverse, range, butLast, mapIndexed } = await import("https://cdn.skypack.dev/@thi.ng/iterators");

const { zigzagColumns2d } = await import('https://cdn.skypack.dev/@thi.ng/grid-iterators');
const cos = Math.cos;
const sin = Math.sin; 
const PI = Math.PI;
const TAU = Math.PI*2;

const goodparams = [
  [5.5,2.5,0.33,0.33],
  [55.5,12.5,0.3,0.33],
  [7,3,0.33,0.33],
  [33,51,0.33,0.25],
  [77,51,0.33,0.25]
];

const selectedParams = 1;

const sizes = [[3,3],
              [9,9],
              [11,3],
            [6,18]];

const selectedSize = 1;




const COLS = sizes[selectedSize][0]; // grid points -- 45 is nice too
const ROWS = sizes[selectedSize][1]; 
// total points
const TPS = (ROWS*COLS); // avoid last dupes

const pad = 4;

//const W = Math.ceil((lp.maxx/3-2*pad) / (ROWS+1));
//const H = Math.ceil((lp.maxy/3-2*pad) / (ROWS+1));

const W = Math.ceil((lp.maxx*0.65) / (Math.max(ROWS,COLS)+1));
const H = Math.ceil((lp.maxy*0.4) / (Math.max(ROWS,COLS)+1));


loginfo(`w:${W}/h:${H}`);

const offsetx = lp.maxx*0.2;
const offsety = lp.maxy*0.55;

const minz = 0.3; // start z
const minthick = 0.15;

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


function mapping(i, [x,y]) {
  const rr =Math.pow( (lp.z - minz)/beatHeight, 2);
  const zangle = PI/2*rr;
  //loginfo(`${PI}:${lp.z}`);
  const ramp =sin(zangle);
  
  return [
    (x+goodparams[selectedParams][2]*rr*sin(goodparams[selectedParams][0]*PI*( i / ROWS)) % TAU) * W + pad + offsetx, 
    (y+goodparams[selectedParams][3]*rr*cos(goodparams[selectedParams][1]*PI*i/(TPS)))* H + pad + offsety
  ];
}

const beat = "1/2b";

const beatHeight = lp.t2mm(beat)/2;


# mov2 x:offsetx y:offsety z:minz | interval "1/16b" | unretract


loginfo(`beatheight: ${beatHeight}`);

while (lp.z < beatHeight+minz)
{  
	let lastIndex = TPS;
    const pctDone = (lp.z-minz)/beatHeight;
	const newthick = minthick - 0.05*pctDone; 
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
