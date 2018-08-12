// run gcode directly in a function
// this will only work once - to persist functions use the "lp" object
function doMove(x,y)
{
	var gtokens = ["G92"];
    gtokens.push("X"+x); gtokens.push("Y"+y);
    gcode(gtokens.join(" "));
}

// ex: a global function
lp.movex = x => gcode("G92 X" + x);

// use the API to move to a spot
// lp is the liveprinter object (x,y,z,e, layerHeight and move/print functions)
lp.moveto({x:100,y:120,z:10});

//turn on hot end to 190C
gcode("M104 S190");

//check temp (see console)
gcode("M105");

// extrude some plastic!
//can even move the filament direct, and negative is backwards
lp.extrudeto({x:100,y:100,z:10,e:-60});

//relative
lp.extrude({x:10,y:12});
