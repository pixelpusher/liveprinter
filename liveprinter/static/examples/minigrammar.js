// Minigrammar - code quickly!
// You can use the experimental mini-grammar as a shorthand.
// It's a bit like typescript:

// normally you type this whole function (with punctuation!):

//absolute move to x=20mm, y=20mm at speed 80mm/s:
lp.moveto({ x: 20, y: 20, speed: 80 });

// Instead you can type:
# lp.moveto x: 20 y: 20 speed: 80

//... and this is automatically compiled into the whole function call above.
// Single lnes need to start with '#'.

// You can use the '|' character to chain together functions like so:

# lp.start 210 | move x: 23 y: 50 z: 10 | extrude x:50 speed:15

// compiles to: lp.start(210).move({x:23,y:50,z:10}).turn(23).go(1);

// you can also do blocks:

##
lp.moveto x: 20 y: 30 speed: 40
lp.extrude e: 10 speed: 8
lp.start 210

lp.m2s 64 | t2d 400 | go 1

##
