global transducers = await import("https://cdn.skypack.dev/@thi.ng/transducers");
global take = transducers.take;


global gridlib = await import("http://localhost:8888/static/lib/gridlib.js");
global presets = gridlib.presets;

global bail = false;

// helpful
lp.stop = async () => { loginfo("STOPPING LOOP"); bail = true; await lp.retract(); lp.tsp(50); await lp.up(40) };
lp.prime = async () => {
	# mov2 x:lp.minx+40 y:lp.miny+40 z:80 speed:80 | unretract | ext e:14 speed:2 | retract | wait 100
};

# stop


// print at 200 for white filament, 215 for multi

# start | bed 68 | fan 0 | temp 215
  
// -------------------------------------------------------
// ---------------GEN6 M-like presets---------------------
// -------------------------------------------------------

// try 4x4 looks good sounds bad, 4,9 sucks
global preset = presets.genP6({
  printer:lp,
  loop: false,
  amtx: 0.14,
  minz: 0.12,
  grids: { cols: 4, rows: 4 },
  bpm: 125,
  t: "3/4b",
  rowNote:'g3',
  colNote: 'g3',
  beatHeight: "5/2b",
  layerThick: 0.12,
});

  
// fast fun tiny with 2 rows, 8 gets medium size and crazy
global preset = presets.genP6({
  printer:lp,
  loop: false,
  amtx: 0.08,
  amty: 0.06,
  minz: 0.12,
  grids: { cols: 4, rows: 8 },
  bpm: 125,
  t: "1/2b",
  rowNote:'d4',
  colNote: 'd4',
  beatHeight: "5/2b",
  layerThick: 0.12,
});

global notes = ['d4'];
  
  
  // diff approach, regular long
global preset = presets.genP6({
  printer:lp,
  loop: false,
  amtx: 0.02,
  amty: 0.02,
  minz: 0.12,
  grids: { cols: 8, rows: 2 },
  bpm: 125,
  t: "3/2b",
  rowNote:'d4',
  colNote: 'd4',
  beatHeight: "2b",
  layerThick: 0.12,
});

global notes = ['d4'];


// ambient simple
global preset = presets.genP6({
  printer:lp,
  loop: false,
  amtx: 0.12,
  minz: 0.1,
  grids: { cols: 2, rows: 2 },
  bpm: 125,
  t: "4b", // 1b
  rowNote:'c3',
  colNote: 'c3',
  beatHeight: "4b",
  layerThick: 0.11,
});

global notes = ['c3'];

// ---------------====START GRID====--------------------
global nextPoint = gridlib.makeIterator(preset);
// ---------------==================--------------------


// ---------------################------------------------
// ---------------- LINE presets--------------------------
// ---------------################------------------------

// small boxy performance
global preset = presets.makeBoxy({
  printer:lp,
  amt: 0.3,
  points: 2,
  note: "g4",
  t: "1/2b", // 1b
  beatHeight: "3/2b", // 2b
  layerThick: 0.12,
  loop: true,
  minz: 0.12,
});

global notes = ['g3'];

// ---------------====START GRID====--------------------
global nextPoint = gridlib.makeLineIterator(preset);
// ---------------==================--------------------


// ---------------################------------------------
// ---------------- POLY1 presets-------------------------
// ---------------################------------------------

// small, good and fast, 4 fold 

global preset = presets.genPoly1({
  printer:lp,
  sides:16, // good, so is 8
  circumference: "32b", 
  cx:40,
  cy:40,
  minz:0.1,
  layerThick:0.11,
  amtx : 0.33,
  amty : 1,
  amtr: 0.15,
  beatHeight : "4b",
  note : "c4",
  bpm : 125,
});

global notes = ['c4'];

// CHALICE OF NOISE -- temp 205, fan 140 -- 16mm x 8mm

global preset = presets.genPoly2({
  printer:lp,
  sides:16,
  circumference: "12b", // good
  cx:45,
  cy:45,
  minz:0.12,
  layerThick:0.12,
  amtx : 0.25,
  amty : 1.25,
  amtr: 0.175,
  beatHeight : "4b",
  note : "g3",
  bpm : 125,
});

global notes = ['g3'];


global preset = presets.genPoly1({
  printer:lp,
  sides:16,
  circumference: "32b", 
  cx:40,
  cy:40,
  minz:0.12,
  layerThick:0.12,
  amtx : 0.5,
  amty : 1.25,
  amtr: 0.175,
  beatHeight : "8b",
  note : "g3",
  bpm : 125,
});

global notes = ['g3'];

// -------------=====START POLY=====----------------------
global nextPoint = gridlib.makePolyIterator(preset);
// -------------====================----------------------



// START NOTES ---------------------------------

global pushnote = function(val, times=1) {
  for (let i=0; i<times; i++)
    {
      if (Array.isArray(val))
        notes.push(...val);
      else
      	notes.push(val);
    }
}

global notesCtr = 0;

global next = function (n=1) {
  notesCtr = (notesCtr + 1) % notes.length;
  return notes[notesCtr];
}

// END NOTES ------------------------------

pushnote('g3',2);
  
pushnote(['e3','bb3'],2);

loginfo(notes.length)

loginfo(`${[notes]} :: ${notes[notesCtr]}`);

notes = ['d4','g3', 'c4','a3', 'eb4', 'eb3'];

# fan 200
  
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# stop
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# sync 

// DEBUG DRAWING ---debug--debug--debug--debug--debug--debug--
// go down, unretract, try draw

# mov2 x:40 y:40 speed:80 | unretract | ext e:12 speed:6 | retract 

# mov2 x:40 y:180 speed:80 | unretract | ext e:12 speed:6 | retract 
  
# thick 0.12 | mov2 x:40 y:40 speed:80 | unretract | ext e:16 speed:4 

  # retract
  
# mov2 x:40 y:40  

  # turn 45
  
# speed 79 | thick 0.12 | downto 0.12 | unretract | speed 10 | turnto 0 | draw 80 | retract | speed 80 | up 40
// DEBUG DRAWING ---debug--debug--debug--debug--debug--debug--

# gcode "M92 E730"
  
# gcode "M500"
  
  
//******** RUN THE MAIN LOOP************************************
//******** RUN THE MAIN LOOP************************************

  
// copy from here

global delaytime = 100;
global bail = false;
global paused = false;

# prime | speed 80 | mov2 nextPoint() | unretract | wait 20 | fan 10


while (!bail) {
  //await (() => new Promise((resolve) => setTimeout(resolve, 1)))(); // pause for injected commands

  if (window.paused) {
    await (() => new Promise((resolve) => setTimeout(resolve, delaytime)))(); // wait 50 ms
    continue; // skip rest
  }

  const gridPoint = nextPoint();

  if (gridPoint.z <= preset.height) {
    try {
      // next note if uncommented
      lp.m2s(next());
      
      # to gridPoint | draw 
      
    } catch (err) {
      console.error(`draw to error vals: ${gridPoint}`);
      console.error(`draw to error: ${err}`);
    }
  } else {
    // DONE!
    //bail = true;
    loginfo("***LOOP FINISHED***");
    bail = true;
    # stop 
  }
}
 
  
// TO HERE
//////////////////////////////////////////////////////////////////////
////////////////////////// END ///////////////////////////////////////
////////////////////////// MAIN //////////////////////////////////////
////////////////////////// LOOP //////////////////////////////////////
////////////////////////// !!!! //////////////////////////////////////
//////////////////////////////////////////////////////////////////////


# fan 225

# sync 

# stop 


// DONE // CLAP CLAP CLAP
  
notes = ['f3', 'c4', 'd4', 'f4'];
  
notes = ['f3', 'g3', 'a4', 'a4', 'b3'];


notes = ['c4', 'c5', 'c6','c6', 'c5', 'c6'];
  
    
notes = ['c4', 'c3', 'f4'];

notes = ['e4', 'g4', 'b4'];
  

pushnote(['g3', 'ab3', 'c4', 'f3'],3)
  
pushnote(['c4', 'bb3', 'd4', 'e3'],2)

  
// boxy
notes = ['g4', 'eb4', 'c5','eb5','bb4','g5', 'd5', 'eb5'];

notes = ['c5','eb5','c6','d6','eb6'];

  
notes = ['c3','e3','g3','a3'];

pushnote(['c3','e3','g3','a3'],3);

  
notes = [
  'd4','f4','ab4','g4',
  'd4','f4','ab4','bb4'
        ];

notes = ['eb3', 'eb3', 'eb3', 'eb3', 
         'c4','c3','c3', 'c4',
        'd4', 'd4', 'eb3', 'eb3' ];


// poly1b -- slow g3 then fast
notes = ['eb4','g4','c4','a4'];

notes = ['g4','f3','c4', 'a3',
        'g4','f3','c4', 'a3',
        'd4','fb3','b4', 'e3',
        'g3','f3','c3', 'bb3'];





// aug 9th bigger
notes = ['g3','g3','c4','d3'];

notes = [
  'c4','d3','g4','d3',
  'c4','d3','f4','e3',
  'a3','g3','f3','e3',
  'd4','e3','f4','a3',
        ];

notes = [
  'e4','f3','a3','d4'
  ];

  'c4','d3','f4','e3',
  'a3','g3','f3','e3',
  'd4','e3','f4','a3',
        ];

// aug 9th smaller GOOD
notes = ['g3','g3', 'g4', 'g3', 'g4', 'g3'];

notes = ['g3','a3','f3', 'c4'];

notes = ['f3','g3','a3','d4'];

notes = ['a3','f3','e3','d4'];





lp.warp = ({ d, heading, elevation, t, tt } ) => {
  	//d = d + 0.01*0.08*Math.sin(tt/1600);
  	heading = heading + Math.PI*0.0125*Math.cos(tt/lp.parseAsTime("20b"));
    return { d, heading, elevation }; //A time-varying movement function set by user. Default is no-op
  }

lp.resetwarp()


//--------------------------------------------------------
// jam on shapes
//------------------------------------------------------

# mov2 x:80, y:80 | thick 0.2 | m2s "c4" | bpm 125

# prime

global sides = 5;
global layers = 30;
global turns = 2;
global offset = 360*turns/(layers*sides**2);

# thick 0.2 | m2s "c4" | prime

for (let l=0; l < layers; l++) {
  for (let s=0; i < sides; i++) {

    if (bail) break;
  
    # drawtime '1b' | turn (360/sides + offset) 
  }
  # up lp.lh
}
