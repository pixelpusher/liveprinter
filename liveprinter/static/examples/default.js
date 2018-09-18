// Using LivePrinter!
// Note: You've probably already done steps 1-6 but they're here for reference anyway.
// ------------------
// by Evan Raskob, 2018

//Step 1: Turn on printer
//
//Step 2: level bed (on the actual printer itself)
//
//Step 3:  start server (Use Visual Studio Code, or your favourite Python environment)
//
//Step 4: open http://localhost:8888
//
//Step 5: click printer settings tab, select serial port
//
//Step 6: click code tab to load editor
//
// Step 7: set temperature, home axes, turn on fan to ready bed for printing:
lp.start(210);

// Step 8: click printer tab again and hit the button to start live temperature polling

// Now your printer is ready to print! (When the target temperature of 210C is reached)

//
// MOVING AND EXTRUDING BY SPECIFYING COORDINATES DIRECTLY
//--------------------------------------------------------
// Try moving - you can do this whilst it warms up:

//absolute move to x=20mm, y=20mm at speed 80mm/s:
lp.moveto({x:20,y:20,speed:80});

// relative move at 1/2 the speed - we should be at (60,60,0.2) now.
lp.move({x:40,y:40,speed:40});

// lower the bed to 20mm less than the bottom: 
lp.moveto({z:lp.maxz-20,speed:40});

// extrude some plastic! 16mm to be exact.
// you can move the filament directly, and negative is backwards
// watch the speed!
lp.extrude({e:20,speed:10});

// now, clean that up and let's print.
// move back to the centre of the bed, with the head ready for a first layer:
lp.moveto({z:lp.layerHeight, x:lp.cx,y:lp.cy, speed:80});

// extrude absolute:
lp.extrudeto({x:lp.minx+20, y:lp.miny+20, speed:15});

//

//
// MOVING AND EXTRUDING RELATIVELY
//--------------------------------------------------------

// move at an angle of 20 degrees (if moving to the right on the x axis as 0 degrees)
// at a distance of 40mm
lp.angle(20).distance(40).go();

// move another 40mm in the same direction, but this time extrude -- go(1)
lp.dist(40).go(1);

// turn 10 degrees counter-clock-wise and extrude a distance of 10mm at a line thickness of 0.3mm
lp.turn(10).dist(10).thick(0.3).go(1);


// pause printing - turn off heater, etc.
lp.pause();

// turn it all back on again
lp.resume(190);