

# bpm 135 // set bpm for piece

const { concat, cycle, take, reverse, range, butLast, partitition } = await import("https://cdn.skypack.dev/@thi.ng/iterators");

const { zigzagColumns2d } = await import('https://cdn.skypack.dev/@thi.ng/grid-iterators');
const cos = Math.cos;
const sin = Math.sin; 

const PI = Math.PI;
const TAU = Math.PI*2;

const COLS = 4; // grid points -- 45 is nice too
const ROWS = 16; 
// total points
const TPS = (ROWS*COLS)-1; // avoid last dupes

const pad = 0;

const W = Math.ceil((lp.maxx/4-2*pad) / (ROWS+1));
const H = Math.ceil((lp.maxy/6-2*pad) / (ROWS+1));

loginfo(`w:${W}/h:${H}`);

const offsetx = lp.maxx*0.44;
const offsety = lp.maxy*0.42;

const minz = 0.7; // start z
const minthick = 0.15;

// avoid repeating front and end points
const forwardgrid = 
      butLast(zigzagColumns2d({ cols: COLS, rows: ROWS }));

// grid in reverse
const reversegrid = butLast(reverse(zigzagColumns2d({ cols: COLS, rows: ROWS })));

// create infinite repetition of the combined fwd & reverse sequence
const grid = cycle(concat(forwardgrid, reversegrid));

const beat = "1/4b";

const beatHeight = lp.t2mm(beat)/2;

function mapping(i, [x,y]) {
  const zangle = PI/2*(lp.z - minz)/beatHeight;
  const ramp =sin(zangle);
  
  return [
    (x+ramp*0.33*sin(33*PI*i/TPS)) * W + pad + offsetx, 
    (y+ramp*0.25*cos(51*PI*i/TPS))* H + pad + offsety
  ];
}

# mov2 x:offsetx y:offsety z:minz | interval "1/16b" | unretract


loginfo(`beatheight: ${beatHeight}`);

while (lp.z < beatHeight+minz)
{  
    const pctDone = (lp.z-minz)/beatHeight;

    for (let ctr=0; ctr<TPS; ctr++) {

       if (window.bail) return; //safety stop
           
        const coords = grid.next().value;
        
        let [x,y] = mapping(ctr, [coords[0], coords[1]]);
                            
        # to x:x y:y t:beat | draw 
            
    }

    const newthick = minthick - 0.05*pctDone; 
    const fansp = Math.min(100, Math.floor(150*pctDone));

    # up newthick | fan fansp | thick newthick
    
}
  
# retract | speed 50 | up 50