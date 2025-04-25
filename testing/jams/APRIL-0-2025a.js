# start | temp 220 | bed 70

# temp 0 | bed 0

global gridlib = await import("http://localhost:8888/static/lib/gridlib.js");
global presets = gridlib.presets;

global bail = false;

// helpful
lp.stop = async () => { loginfo("STOPPING LOOP"); bail = true; await lp.retract(); lp.tsp(50); await lp.up(5) };
lp.prime = async () => {
	# mov2 x:lp.minx+15 y:lp.miny+40 z:80 speed:80 | unretract | ext e:14 speed:2 | retract | wait 100
};

# mov2 x:lp.cx y:lp.cy z:20 speed:80


# speed 'c4'  

let c = 0;
  
repeat(3, async ()=> {
  # up 40 | down 40
  loginfo(`${c++}`);
})
  
# downto 8 | speed 12

let c = 0;  

let next = () => 'c5';  
  
repeat(12, async ()=> {
  # speed next() | travel 40 | turn 180
  loginfo(`${c++}`);
})


# moveto x:lp.cx y:lp.cy z:0.2 speed:50

bail = true;

global delaytime = 0;  
  
# temp 230  
  
# bpm 94 

let next = () => ['c5', 'c6', 'a4', 'g7'][Math.round(Math.random(4))];  
  
# sync
  
# up 80  

# ext e:20 speed:8
  
# unretract

# prime

# moveto x:(lp.cx+50) y:lp.cy z:0.2 speed:50 
  
lp.lh = 0.25;
  
let notesCtr = 0;
let durCtr = 0;
  
let next = function (n=1) {
  let notes = ['c3', 'd5', 'e4', 'g3', 'a3', 'd6', 'e3', 'a3'];  
  notesCtr = (notesCtr + 1) % notes.length;
  return notes[notesCtr];
}  
  
let dur = function (n=1) {
  let durs = ['1/4b', '2b', '1b', '1/2b',
             '1/4b', '1/8b', '1/4b', '1/8b'];  
  durCtr = (durCtr + 1) % durs.length;
  return durs[durCtr];
}  

let l = ()=> ['2/4b', '1b', '2/4b', '2b'][Math.round(Math.random(4))];  

let c = 0;    

repeat(128, async ()=> {
  # speed next() | drawtime dur() | turn (360/12) | elev (Math.PI/88)
//  await (() => new Promise((resolve) => setTimeout(resolve, delaytime)))();
  loginfo(`${c++}`);
  if (bail) return;
})
  
//--------------------------------------------------------------------------
  
repeat(64, async ()=> {
  # speed next() | traveltime dur() | turn (360/12) | elev (Math.PI/48)
//  await (() => new Promise((resolve) => setTimeout(resolve, delaytime)))();
  loginfo(`${c++}`);
  if (bail) return;
})


//-------------------------------------------------------------------------


# moveto x:(lp.cx+50) y:lp.cy z:0.2 speed:50 
  
lp.lh = 0.2;
  
let notesCtr = 0;
let durCtr = 0;
  
let next = function (n=1) {
  let notes = ['d3', 'e5', 'd4', 'd3', 'b3', 'a6', 'f3', 'b3'];  
  notesCtr = (notesCtr + 1) % notes.length;
  return notes[notesCtr];
}  
  
let dur = function (n=1) {
  let durs = ['1/4b', '2b', '1b', '1/2b'];  
  durCtr = (durCtr + 1) % durs.length;
  return durs[durCtr];
}  

let l = ()=> ['2/4b', '1b', '2/4b', '2b'][Math.round(Math.random(4))];  

let c = 0;    

repeat(64, async ()=> {
  # speed next() | drawtime dur() | turn (360/12) | elev (Math.PI/36)
//  await (() => new Promise((resolve) => setTimeout(resolve, delaytime)))();
  loginfo(`${c++}`);
  if (bail) return;
})
  
//--------------------------------------------------------------------------
  
repeat(64, async ()=> {
  # speed next() | traveltime dur() | turn (360/12) | elev (Math.PI/48)
//  await (() => new Promise((resolve) => setTimeout(resolve, delaytime)))();
  loginfo(`${c++}`);
  if (bail) return;
})
  
//-------------------------------------------------------------------------
  

# retract | speed 80 | up 60

# up 50

# ext e:12 speed:4  
  
notes = [];
  
pushnote('c4',8);  

pushnote('c5',8);  

pushnote('d5',4);  
pushnote('g5',4);  
  
global circly = (t='1/2b',r=48)=>{
      repeat(r, async ()=> {
      # speed next() | traveltime t | turn (8*360/r)
    })
  };

global circly2 = (t='1/2b',r=48)=>{
  	repeat(r, async ()=> {
      	# elev (Math.PI/(r*2) | speed next() | drawtime t | turn (8*360/r)
    })
  };

  
notes = ['e5', 'a4', 'a5', 'd5', 'c4', 'd4', 'f3'];  

# bpm 80  

# down 0.4  

# speed 'd6' | up 4  
  
lp.lh = 0.16;

# mov2 z:0.08
  
circly2('1/2b', 96);
  
circly('1/16b',192);

# ext e:2 speed:2
  
  
//------------------------------------------------
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

pushnote('g4',2);
  
pushnote(['e3','bb3'],2);

loginfo(notes.length)

loginfo(`${[notes]} :: ${notes[notesCtr]}`);

# fan 200

notes = ['c4', 'd2', 'g4','c4', 'd3', 'g4','c4', 'd4', 'g4'];

notes = ['d2','g2', 'd6', 'c2', 'c5','d2','g2', 'd4', 'c2', 'c5'];

// poly2
notes = ['d5','d6','d5','d4'];

notes = ['d4','g3', 'c4','a3', 'eb4', 'eb3'];


notes = ['d4','g3', 'c2','a2', 'eb4', 'eb3', 'c2', 'a5', 'eb2', 'bb5', 'a3', 'a3', 'd5', 'd5', 'a3','a2','d4','a2'];

notes = ['d4','g3', 'c4','a2', 'eb4', 'eb2'];

notes = ['c5','eb4', 'b5','a2'];


notes = ['g2']

# bed 0

# temp 0 

# thick 0.11
  
# fan 0
  
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# stop
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# sync 

# up 30

  
  
// DEBUG DRAWING ---debug--debug--debug--debug--debug--debug--
// go down, unretract, try draw

# mov2 x:40 y:40 speed:80 | unretract | ext e:12 speed:6

# mov2 x:40 y:180 speed:80 | unretract | ext e:12 speed:6 | retract 
  
# thick 0.12 | mov2 x:40 y:40 speed:80 | unretract | ext e:16 speed:4 

  # retract
  
# mov2 x:40 y:40 z:0.5 speed:40
  
# stop   

# up 70 

  # turn 45

# prime  

# speed 40 | turnto 0 | travel 50

# travel 40 | turn 180  

# speed 79 | thick 0.12 | downto 0.12 | unretract | speed 10 | turnto 0 | draw 80 | retract | speed 80 | up 40
// DEBUG DRAWING ---debug--debug--debug--debug--debug--debug--

# gcode "M92 E730"
  
# gcode "M500"
  
  # fan 200

notes = ['g4', 'c3', 'g5', 'eb3', 'g5']
  
notes = [ 'd2', 'd5', 'bb3', 'e3', 'f5']
  

notes = ['c5', 'd3', 'd6', 'c3', 'a3']

pushnote([], 1)
  
pushnote(['g4','a3'], 3)

pushnote(['c3', 'd3', 'e3', 'f3'], 3)

pushnote([ 'd4', 'e4', 'f4', 'g4'],1)

notes = ['c4', 'd6', 'd4', 'd5', 'd3']
  
notes = ['d6','c6','a6']
  
notes = ['e7']  
  
notes = ['c4', 'g3']


 notes = ['c4', 'g3', 'd4', 'g3'] 
  
# temp 225 
  
# fan 200
  
//******** RUN THE MAIN LOOP************************************
//******** RUN THE MAIN LOOP************************************

/// THANKS
  
# temp 0 | fan 0  
  
# stop  
  
# fan 50

  # up 50
  
# ext e:16 speed:8
  
# stop
  
  
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
   
loginfo("SOLSTICE STACK SCULPT")  
  

  
  
loginfo('CHALICE OF NOISE')  
  
  
// TO HERE
//////////////////////////////////////////////////////////////////////
////////////////////////// END ///////////////////////////////////////
////////////////////////// MAIN //////////////////////////////////////
////////////////////////// LOOP //////////////////////////////////////
////////////////////////// !!!! //////////////////////////////////////
//////////////////////////////////////////////////////////////////////

# bed 0 | temp 0 
  
# fan 0


# stop 





notes = ['eb3', 'd4', 'eb4', 'c3']


notes = ['c6', 'd5', 'e4', 'g3']

notes = ['c7', 'd3', 'c5', 'd3', 'd4', 'd5', 'a4', 'd6', 'c4']

  
  
  
loginfo('make some noise')

notes = ['d5', 'a7', 'd6', 'c5']
  
notes = ['d6','a5','g4', 'c3', 'f5', 'a4', 'c3'];
  
// boxy
notes = ['g4', 'eb4', 'c5','eb5','bb4','g5', 'd5', 'eb5'];

notes = ['c5','eb5','c6','d4','eb6'];

  
  
notes = ['d5', 'c3','e2','g5','a3', 'c6'];

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

  
notes = ['g3','a3','f3','c4'];

notes = ['e3', 'g5', 'eb4']  
  

notes = ['c4', 'd4', 'eb4', 'g4']  
  
loginfo('')


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
