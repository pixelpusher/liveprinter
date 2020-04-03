// Minigrammar - code quickly!
// You can use the experimental mini-grammar as a shorthand.

// normally you type this whole function (with punctuation!):

//absolute move to x=20mm, y=20mm at speed 80mm/s:
await lp.moveto({ x: 20, y: 20, speed: 80 });

// Instead you can type:
# moveto x: 20 y: 20 speed: 80

// you can enclose statements in # # if you're worried about mixing with javascript:

# moveto x: 20 y: 20 speed: 80 #

// or 
#moveto x:20 y:20 speed:80#


//... and this is automatically compiled into the whole function call above.
// Single lnes need to start with '#'.

// You can use the '|' character to chain together functions like so:

# start 210 | move x: 23 y: 50 z: 10 | extrude x: 50 speed: 15 | go 1

// compiles to: 
// await lp.start(210);await lp.move({x:23,y:50,z:10});await lp.extrude({x:50,speed:15});await lp.go(1);

// you can also do multiline blocks by surrounding code with ##'s:

##
start 210
moveto x: 20 y: 30 speed: 40
extrude e: 10 speed: 8

m2s 64 | t2d 400 | go 1
##

// the above compiles to:

//await lp.start(210);await lp.moveto({x:20,y:30,speed:40});await lp.extrude({e:10,speed:8});lp.m2s(64);lp.t2d(400);await lp.go(1);

// you can also interleave js and minigrammar:
# mov2 x:lp.cx/2 y:lp.cy/2 z:lp.lh

for (let i = 0; i < 10; i++) {
    if (i % 2)
    # mov x: 10 y: 10 
else
    # mov x:-10 y: 10
}


// you can also safely enclose minigrammar statements inside lines with # (code) #
let bung = () => { # mov2 x: 20 y: 40 # }
