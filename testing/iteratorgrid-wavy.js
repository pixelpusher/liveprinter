const { concat, cycle, take, reverse, range, butLast, partitition } = await import("https://cdn.skypack.dev/@thi.ng/iterators");

const { zigzagColumns2d } = await import('https://cdn.skypack.dev/@thi.ng/grid-iterators');

const PI = Math.PI;
const TAU = Math.PI*2;
const PTS = 16; // grid points -- 45 is nice too
const pad = 10;
const W = Math.ceil((lp.maxx-2*pad) / (PTS+1))/2;
const H = Math.ceil((lp.maxy-2*pad) / (PTS+1))/2;

loginfo(`w:${W} h:${H}`);

// avoid repeating front and end points
const forwardgrid = 
      butLast(zigzagColumns2d({ cols: PTS }));

// grid in reverse
const reversegrid = butLast(reverse(zigzagColumns2d({ cols: PTS })));

// create infinite repetition of the combined fwd & reverse sequence
const grid = cycle(concat(forwardgrid, reversegrid));

const notes = "acdcbag".split("").map((v,i)=>v+(7+Math.round(Math.sin(PI/3*i))));

const prog = cycle(
  concat(butLast(notes), butLast(reverse(notes.slice())))
);

function mapping([x,y]) {
  return [(x+1+0.5*Math.sin(y*2.13*TAU/PTS)*Math.sin(y*6.74*TAU/TPS))*W+pad, (y+1+0.2*Math.cos(y*16.8*TAU/PTS))*H+pad];
}

const TPS = PTS*PTS;

// almost twice
//let i = Math.floor(1.25*TPS);

# mov2 x:lp.maxx*0.05 y:lp.maxy*0.1 z:0.25 | thick 0.25 | unretract

for (let i=0; i<TPS*2; i++) {
  if (i % TPS === 0 ) {
    
    # up 0.2
    
  }
    
   loginfo(`${i}/${TPS}`);
      
  const coords = grid.next().value;
  
  let [x,y] = mapping([coords[0], coords[1]]);
    
  loginfo(`x:${x} y:${y}`);
  
  let beats = "1/4b";
  
  # bpm 110 | interval "1/32b" | to x:x y:y t:beats | drawtime beats
  
}
  
# retract | upto 50