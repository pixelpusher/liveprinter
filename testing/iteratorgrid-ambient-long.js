// this one was long and ambient -- apr. 17, 5:30pm
// it was out of sync too... see later ones (up on 1st pt not 0th)


# bpm 100 // set bpm for piece

const { concat, cycle, take, reverse, range, butLast, partitition } = await import("https://cdn.skypack.dev/@thi.ng/iterators");

const { zigzagColumns2d } = await import('https://cdn.skypack.dev/@thi.ng/grid-iterators');
const cos = Math.cos;
const sin = Math.sin; 

const PI = Math.PI;
const TAU = Math.PI*2;

const COLS = 8; // grid points -- 45 is nice too
const ROWS = 32; 
// total points
const TPS = (ROWS*COLS)-1; // avoid last dupes

const pad = 0;

//const W = Math.ceil((lp.maxx/3-2*pad) / (ROWS+1));
//const H = Math.ceil((lp.maxy/3-2*pad) / (ROWS+1));

const W = Math.ceil((lp.maxx*0.25) / (ROWS+1));
const H = Math.ceil((lp.maxy*0.75) / (ROWS+1));


loginfo(`w:${W}/h:${H}`);

const offsetx = lp.maxx*0.25;
const offsety = lp.maxy*0.15;

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

const beatHeight = lp.t2mm(beat);

function mapping(i, [x,y]) {
  const zangle = PI*(lp.z - minz)/beatHeight;
  const ramp =sin(zangle);
  
  return [
    (x+ramp*0.4*(0.6*sin(PI*i/TPS)+sin(237*PI*i/TPS))) * W + pad + offsetx, 
    (y+ramp*0.33*(0.8*sin(PI*(i+25)/TPS)+cos(353*PI*i/TPS)))* H + pad + offsety
  ];
}

# mov2 x:offsetx y:offsety z:minz | interval "1/16b" | unretract


loginfo(`beatheight: ${beatHeight}`);

while (lp.z < beatHeight+minz)
{  
    const pctDone = (lp.z-minz)/beatHeight;

    for (let ctr=0; ctr<=TPS; ctr++) {

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
