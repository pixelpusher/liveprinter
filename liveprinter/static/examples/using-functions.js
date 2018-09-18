// Using functions with LivePrinter
// By Evan Raskob, 2018
// --------------------------------


// run gcode directly in a function
// this will only work once - to persist functions use the "lp" object
function doMove(x,y)
{
	var gtokens = ["G92"];
    gtokens.push("X"+x); gtokens.push("Y"+y);
    gcode(gtokens.join(" "));
}

// you can use ES6 functions too!
// these are handy for extending the lp (liveprinter) objects:
// In this case, we can create a custom fill function:

lp.fillDirection = (w,h) => {
    for (var i=0; i<h/lp.layerHeight; i++)
    {
        let m = (i%2==0) ? -1 : 1;
        lp.dist(lp.layerHeight).go();
        lp.dist(m*w).go(1);
    }
  };
  
  lp.fillDirection(50,10);
  