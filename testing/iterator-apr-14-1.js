// LivePrinter test  April 14 2023 2pm version 1

# start 

# mov2 x:lp.maxx*0.85 y:lp.maxy*0.1 z:60 

# bed 65 | temp 215 

# sync 

# up 50 

# ext e:4 speed:3 

# retract 

const { concat, cycle, take, reverse, range, butLast, partitition } = await import("https://cdn.skypack.dev/@thi.ng/iterators");

const { zigzagColumns2d } = await import('https://cdn.skypack.dev/@thi.ng/grid-iterators');
const cos = Math.cos;
const sin = Math.sin; 

const PI = Math.PI;
const TAU = Math.PI*2;
const PTS = 30; // grid points -- 45 is nice too
const pad = 10;
const W = Math.ceil((lp.maxx/2-2*pad) / (PTS+1));
const H = Math.ceil((lp.maxy/2-2*pad) / (PTS+1));

const offsetx = lp.maxx*0.05;
const offsety = lp.maxy*0.01;

loginfo(`w:${W} h:${H}`);

// avoid repeating front and end points
const forwardgrid = 
      butLast(zigzagColumns2d({ cols: PTS }));

// grid in reverse
const reversegrid = butLast(reverse(zigzagColumns2d({ cols: PTS })));

// create infinite repetition of the combined fwd & reverse sequence
const grid = cycle(concat(forwardgrid, reversegrid));

function mapping(i, [x,y]) {
  const zangle = TAU*lp.z/50;
  const zamt = lp.t2mm("1/16b")/2;  
  return [
    (x+sin(zangle/2)*0.33*cos(5*PTS*PI*i/10)) * W + zamt*cos(zangle) + pad + offsetx, 
    (y+sin(zangle/2)*0.5*cos(6*PI*i/PTS))* H + zamt*sin(zangle) + pad + offsety
  ];
}

const TPS = PTS*PTS;

# mov2 x:lp.maxx*0.5 y:lp.maxy*0.1 z:2.8 | thick 0.25 | interval "1/16b" | unretract

// 20 layers back and forth
for (let ctr=0; ctr < TPS*20; ctr++) {
  if (ctr % TPS === 0 ) {
    # up 0.2 
  }
    
  const coords = grid.next().value;
  
  let [x,y] = mapping(ctr, [coords[0], coords[1]]);
    
  loginfo(`x:${x} y:${y}`);
  
  let beats = "1/2b";
  
  # bpm 135 | to x:x y:y t:beats | draw 
  
}
  
# up 50  
  
# retract
  