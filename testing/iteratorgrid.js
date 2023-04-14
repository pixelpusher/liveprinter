// LivePrinter test  April 14 2023 two -- this slays!

# start | bed 65 | temp 220 

# speed 80

# mov2 x:lp.maxx*0.85 y:lp.maxy*0.1 z:30 speed: 80


# sync 

# ext e:3 speed:3 

# retract 

const { concat, cycle, take, reverse, range, butLast, partitition } = await import("https://cdn.skypack.dev/@thi.ng/iterators");

const { zigzagColumns2d } = await import('https://cdn.skypack.dev/@thi.ng/grid-iterators');
const cos = Math.cos;
const sin = Math.sin; 

const PI = Math.PI;
const TAU = Math.PI*2;
const PTS = 16; // grid points -- 45 is nice too
const pad = 8;
const W = Math.ceil((lp.maxx/2-2*pad) / (PTS+1));
const H = Math.ceil((lp.maxy/2-2*pad) / (PTS+1));

const offsetx = lp.maxx*0.05;
const offsety = lp.maxy*0.01;


// avoid repeating front and end points
const forwardgrid = 
      butLast(zigzagColumns2d({ cols: PTS }));

// grid in reverse
const reversegrid = butLast(reverse(zigzagColumns2d({ cols: PTS })));

// create infinite repetition of the combined fwd & reverse sequence
const grid = cycle(concat(forwardgrid, reversegrid));

function mapping(i, [x,y]) {
  const zangle = TAU*lp.z/lp.t2mm("1/4b");
  const zamt = lp.t2mm("1/32b")/2;
  return [
    (x+sin(zangle/2)*0.33*cos(5*PTS*PI*i/10)) * W + zamt*cos(zangle) + pad + offsetx, 
    (y+sin(zangle/2)*0.5*cos(6*PI*i/PTS))* H + zamt*sin(zangle) + pad + offsety
  ];
}

// total points
const TPS = PTS*PTS;

# mov2 x:lp.maxx*0.5 y:lp.maxy*0.1 z:2.4 | thick 0.25 | interval "1/16b" | unretract

const beatHeight = lp.t2mm("1b");

while (lp.z < beatHeight)
{
    const pctDone = lp.z/beatHeight;

    let ctr = TPS;
    while (--ctr) {
            
        const coords = grid.next().value;
        
        let [x,y] = mapping(ctr, [coords[0], coords[1]]);
            
        //loginfo(`x:${x} y:${y}`);
        
        let beats = "1/4b";
        
        # bpm 135 | to x:x y:y t:beats | draw 
        
    }

    const newthick = 0.25 - 0.125*pctDone; 
    const fansp = pctDone*80;

    # up newthick | fan fansp

}
  
# up 50 | retract

  