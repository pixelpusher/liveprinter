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

global nextNote = () => 72 + Math.round(Math.random() * 3) * 2 + Math.ceil(Math.random()) * 12;

console.log(nextNote());

lp.m2s(nextNote() / 2);
loginfo(lp.t2mm(1000)); // from 1.9651348314821258 to 2.3369523235382172

// print speeds in mm/s:
// 1.9651348314821258
// 2.0819878293952856
// 2.2057892681495215
// 2.3369523235382172



// Now initialize the L-System to generate the Hilbert curve
global hilbert = new LSystem({
    axiom: 'L',
    ignoredSymbols: "",
    productions: {
        'L': "+RF-LFL-FR+",
        'R': "-LF+RFR+FL-",
    },
    finals: {
        'F': async () => { await lp.m2s(nextNote() / 2).t2d(1000).go(1, false); return 1; },
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

    # ext e: 10 speed: 10
    # up 100 | speed 80 | go
    # retract 10

    lp.lh = 0.15;

    let layer = 1; // current index of layer we're printing
    await lp.moveto({ x: 20, y: 120, z: 0.1 * layer, speed: 80 }); // set this to where you want to print and how high

    //lp.speed(10); // set speed conservatively
    await lp.unretract(10); // unretract material for printing
    # ext e: 5 speed: 10 #
    await lp.wait(500);
    lp.turnto(0); // turn to initial angle (facing right) 
    global runner = await hilbert.run(); // start running the hilbert fractal

    /* These let you step through in chunks, instead of the whole thing
    for (let ctr of numrange(1,5)) { // do 5 steps, some steps are just turns
    let p = runner.next().value; // this steps through
    // loginfo(p.index + "/" + p.total) // log the count to the side window - can be slow
    */
    await lp.retract(10); // stop material dripping
    await lp.up(5).go(); // move head up for next layer, or done!
}