// L-systems test for manual Hilbert drawing
// Uses a modified verion of the Lindenmayer library for JavaScript that uses ES6 Generators
// https://github.com/pixelpusher/lindenmayer

// print onto acrylic held in place by clamps in the printer bed

lp.start(195);
lp.bed(0); // turn off heat, will warp acrylic

attachScript("http://localhost:8888/static/lib/linden/linden.js");

// startup stuff - move somewhere out of the way
# lp.mov2 x: lp.cx y: lp.cy z: 40

// prime filament
# lp.ext e: 10 speed: 10

lp.retract(10); // retract to stop leaking

// Now initialize the L-System to generate the Hilbert curve
global hilbert = new LSystem({
    axiom: 'L',
    ignoredSymbols: "",
    productions: {
        'L': "+RF-LFL-FR+",
        'R': "-LF+RFR+FL-",
    },
    finals: {
        'F': () => { lp.dist(2).go(1, false) },
        '+': () => { lp.turn(-90) },
        '-': () => { lp.turn(90) }
    }
});

// Run the iterations of the L-System - each one makes it more complex
hilbert.iterate(1);

loginfo(hilbert.getString()); // print some info

// draw each layer of the Hilbert curve (as a block, or manually)
{
    let layer = 0; // current index of layer we're printing
    lp.moveto({ x: 34, y: 80, z: 3.6 + 0.2 * layer, speed: 22 }); // set this to where you want to print and how high

    global runner = hilbert.run(); // start running the hilbert fractal
    global totalsteps = hilbert.getFuncs().length; // get total steps
    lp.speed(10); // set speed conservatively
    lp.unretract(); // unretract material for printing
    lp.turnto(0); // turn to initial angle (facing right) 

    /* These let you step through in chunks, instead of the whole thing
    for (let ctr of numrange(1,5)) { // do 5 steps, some steps are just turns
    let p = runner.next().value; // this steps through
    // loginfo(p.index + "/" + p.total) // log the count to the side window - can be slow
    */

    while (runner.next().value); // run it all at once
    lp.retract(10); // stop material dripping
    lp.up(5).go(); // move head up for next layer, or done!
}