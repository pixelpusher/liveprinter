# start 

# mov2 x:lp.maxx*0.05 y:lp.maxy*0.1 z:60 

# bed 65 | temp 210 

# sync 

# up 50 

# ext e:12 speed:3 

# retract 

const { concat, cycle, take, reverse, range, butLast, partitition } = await import("https://cdn.skypack.dev/@thi.ng/iterators");

const { zigzagColumns2d } = await import('https://cdn.skypack.dev/@thi.ng/grid-iterators');
const cos = Math.cos;

const PI = Math.PI;
const TAU = Math.PI*2;
const PTS = 30; // grid points -- 45 is nice too
const pad = 10;
const W = Math.ceil((lp.maxx/2-2*pad) / (PTS+1));
const H = Math.ceil((lp.maxy/2-2*pad) / (PTS+1));

const offsetx = lp.maxx*0.5;
const offsety = 0; 

loginfo(`w:${W} h:${H}`);

// avoid repeating front and end points
const forwardgrid = 
      butLast(zigzagColumns2d({ cols: PTS }));

// grid in reverse
const reversegrid = butLast(reverse(zigzagColumns2d({ cols: PTS })));

// create infinite repetition of the combined fwd & reverse sequence
const grid = cycle(concat(forwardgrid, reversegrid));

function mapping(i, [x,y]) {
  return [(x+0.33*cos(5*PTS*PI*i/10))*W+pad+offsetx, (y+0.5*cos(6*PI*i/PTS))*H+pad+offsety];
}

const TPS = PTS*PTS;

// almost twice


# mov2 x:lp.maxx*0.5 y:lp.maxy*0.1 z:0.05 | thick 0.25 | interval "1/16b" | unretract

for (let ctr=0; ctr < TPS*2; ctr++) {
  if (ctr % TPS === 0 ) {
    # up 0.2 
  }
    
  const coords = grid.next().value;
  
  let [x,y] = mapping(ctr, [coords[0], coords[1]]);
    
  loginfo(`x:${x} y:${y}`);
  
  let beats = "1/4b";
  
  # bpm 110 | to x:x y:y t:beats | draw 
  
}
  
# upto 50 | retract
  