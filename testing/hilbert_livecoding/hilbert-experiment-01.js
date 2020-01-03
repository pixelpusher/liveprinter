// L-systems test for manual Hilbert drawing
// Uses a modified verion of the Lindenmayer library for JavaScript that uses ES6 Generators
// https://github.com/pixelpusher/lindenmayer

// print onto acrylic held in place by clamps in the printer bed
await lp.sync()
lp.start(195);
lp.bed(60); // turn off heat, will warp acrylic

attachScript("http://localhost:8888/static/lib/linden/linden.js");

// startup stuff - move somewhere out of the way
# mov2 x: lp.cx y: lp.cy z: 0.2 #
# mov2 x: 222 y: lp.cy z: 40 #

// prime filament
for (let i = 0; i < 2; i++)
# ext e: 10 speed: 8

lp.retract(10); // retract to stop leaking

global nextNote = () => 60 + Math.round(Math.random() * 3) * 2;
global noteDuration = 300;

lp.m2s(nextNote()); // note 60
loginfo(lp.t2mm(noteDuration)); // 1.6674721983442735
loginfo(lp.printSpeed); // 5.558240661147578


// Now initialize the L-System to generate the Hilbert curve
global hilbert = new LSystem({
    axiom: 'L',
    ignoredSymbols: "",
    productions: {
        'L': "+RF-LFL-FR+",
        'R': "-LF+RFR+FL-",
    },
    finals: {
        'F': async () => { await lp.m2s(nextNote()).t2d(noteDuration).go(1, false); return 1; },
        '+': async () => { lp.turn(-90); return 0; },
        '-': async () => { lp.turn(90); return 0; }
    }
});

// Run the iterations of the L-System - each one makes it more complex
hilbert.iterate(1);

loginfo(hilbert.getString()); // print some info

// draw each layer of the Hilbert curve (as a block, or manually)
{
    await lp.bed(60);

    lp.maxTimePerOperation = 45;

    # ext e: 20 speed: 4
    # up 80 | speed 80 | go
    # retract 10

    lp.lh = 0.15;

    let layer = 1; // current index of layer we're printing
    await lp.moveto({ x: 20, y: 160, z: layer * lp.lh, speed: 80 }); // set this to where you want to print and how high

    //lp.speed(10); // set speed conservatively
    await lp.unretract(10);
    await lp.wait(500);
    lp.turnto(0); // turn to initial angle (facing right) 
    global runner = await hilbert.run(); // start running the hilbert fractal
    await lp.retract(10); // stop material dripping
    await lp.up(5).go(); // move head up for next layer, or done!
}