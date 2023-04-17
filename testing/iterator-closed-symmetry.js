// LivePrinter test  April 17 2023 18:53
// closed sinusoidal with accidental symmetry

# start | bed 60 | temp 220 

# bed 60

# mov2 x:lp.maxx*0.4 y:lp.maxy*0.62 z:5 speed: 80

# ext e:10 speed:3

# sync 

# retract 

# fan 0

# bpm 100 // set bpm for piece

  const { concat, cycle, take, reverse, range, butLast, partitition } = await import("https://cdn.skypack.dev/@thi.ng/iterators");

  const { zigzagColumns2d } = await import('https://cdn.skypack.dev/@thi.ng/grid-iterators');
  const cos = Math.cos;
  const sin = Math.sin; 

  const PI = Math.PI;
  const TAU = Math.PI*2;

  const COLS = 4; // grid points -- 45 is nice too
  const ROWS = 8; 
  // total points
  const TPS = (ROWS*COLS); // avoid last dupes

  const pad = 0;

  //const W = Math.ceil((lp.maxx/3-2*pad) / (ROWS+1));
  //const H = Math.ceil((lp.maxy/3-2*pad) / (ROWS+1));

  const W = Math.ceil((lp.maxx*0.4) / (ROWS+1));
  const H = Math.ceil((lp.maxy*0.3) / (ROWS+1));


  loginfo(`w:${W}/h:${H}`);

  const offsetx = lp.maxx*0.4;
  const offsety = lp.maxy*0.06;

  const minz = 0.3; // start z
  const minthick = 0.12;

  // avoid repeating front and end points
  const forwardgrid = 
        butLast(zigzagColumns2d({ cols: COLS, rows: ROWS }));

  // grid in reverse
  const reversegrid = butLast(reverse(zigzagColumns2d({ cols: COLS, rows: ROWS })));

  // create infinite repetition of the combined fwd & reverse sequence
  const grid = cycle(concat(forwardgrid, reversegrid));

  const beat = "1/2b";

  const beatHeight = lp.t2mm(beat)/2;

  function mapping(i, [x,y]) {
    const zangle = PI*(lp.z - minz)/beatHeight;
    const ramp =sin(zangle);

    return [
      (x+ramp*0.25*(0.6*sin(PI*i/TPS)+sin(237*PI*i/TPS))) * W + pad + offsetx, 
      (y+ramp*0.33*(0.8*sin(PI*(i+25)/TPS)+cos(353*PI*i/TPS)))* H + pad + offsety
    ];
  }

  # mov2 x:offsetx y:offsety z:minz | interval "1/16b" | unretract


  loginfo(`beatheight: ${beatHeight}`);

  let f = true;

 let index=0; 

  while (lp.z < beatHeight+minz)
  {  
      const pctDone = (lp.z-minz)/beatHeight;
      const newthick = minthick - 0.05*pctDone; 
      const fansp = Math.min(100, Math.floor(150*pctDone));

      for (let ctr=0; ctr<(TPS-1); ctr++) {

          if (window.bail) {
            # retract | speed 50 | up 50
            return; //safety stop
          }

          //loginfo(`${newthick}`);

          if (!f && ctr === 1) {
            # up newthick | fan fansp | thick newthick
            
            f = true; // flip to go up every other time because of this pattern's symmetry
          }

          const coords = grid.next().value;

          let [x,y] = mapping(ctr, [coords[0], coords[1]]);

          //loginfo(`${ctr}::${[x,y]}::${beat}`);

          # to x:x y:y t:beat | draw  
      };
      f = false;

  }

  # retract | speed 50 | up 50



delete window.bail;
