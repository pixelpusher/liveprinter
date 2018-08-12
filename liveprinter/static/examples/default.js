// run gcode directly in a function
// this will only work once - to persist functions use the "lp" object
function doMove(x,y)
{
	var gtokens = ["G92"];
    gtokens.push("X"+x); gtokens.push("Y"+y);
    gcode(gtokens.join(" "));
}

// start up - home axes, start temperature (argument), turn on fan
lp.start(190);

lp.pause();

lp.resume(190);

// home axes
gcode("G28");

// turn off printer
gcode("M80");

// resume
gcode("M999"); 

gcode("M410");

// unconditional stop (press button to resume)
gcode("M0")


for (var i=0; i < 8; i++)
{
	lp.note(47+i*2,250,"y");
    lp.note(0,250+i*50);
}

lp.moveto({x:100, y:100, speed:50});
lp.moveto({x:lp.cx,speed:50});
lp.moveto({y:lp.cy,speed:50});

lp.note(47,500,"y");

lp.note(50,500,"y");
lp.note(0,500,"y");

//turn on hot end to 190C
gcode("M104 S190");

gcode("M119");

gcode("M104 S0"); // turn off temp
gcode("M106 S100"); 

gcode("M107"); 
// turn off fan


//set retract length
gcode("M207 S3 F300 Z0.2");
//set retract recover
gcode("M208 S0.1 F300");

//check temp (see console)
gcode("M105");

gcode("M410");



lp.extrude({z:10,e:16,speed:2});

lp.moveto({y:lp.cy, x:lp.cx,z:lp.layerHeight,speed:30});

gcode("G11"); 
lp.extrude({x:-lp.maxx/4});
gcode("G10"); 

lp.move({x:40})

for (var i=0; i<6; i++)
{
  	let m = (i%2==0) ? -1 : 1;
	//gcode("G11"); 
  	lp.extrude({y:-lp.maxy/20});
	lp.extrude({x:m*lp.maxx/5});
	//gcode("G10"); 
}

lp.fill = (w,h) => {
  for (var i=0; i<h/lp.layerHeight; i++)
  {
      let m = (i%2==0) ? -1 : 1;
      lp.extrude({y:lp.layerHeight});
      lp.extrude({x:m*w});
  }
  gcode("G10"); 
};

lp.fill(50,10);

// extrude some plastic!
//can even move the filament direct, and negative is backwards
lp.extrudeto({x:100,y:100,z:10,e:-60});

//relative
lp.extrude({x:10,y:12});
