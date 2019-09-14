// L-systems test
// Uses a modified verion of the Lindenmayer library for JavaScript that uses ES6 Generators
// https://github.com/pixelpusher/lindenmayer


await lp.start(195);

attachScript("http://localhost:8888/static/lib/linden/linden.js");

await lp.moveto({ x: 40, y: 80, z: 80, speed: 80 });

await lp.retract();

await lp.ext({ e: 10, speed: 8 })

// Now initialize the L-System to generate the Hilbert curve
global hilbert = new LSystem({
    axiom: 'L',
    ignoredSymbols: "",
    productions: {
        'L': "+RF-LFL-FR+",
        'R': "-LF+RFR+FL-",
    },
    finals: {
        'F': async () => { await lp.dist(4).go(1, false); },
        '+': async () => { lp.turn(-90); return true; },
        '-': async () => { lp.turn(90); return true; }
    }
});

// Run the 1 iterations of the L-System
hilbert.iterate(1);

console.log(window.hilbert.getFuncs())
console.log(window.hilbert.axiom)

loginfo(hilbert.getString())
loginfo(totalsteps)


// draw each layer of the Hilbert curve (as a block, or manually)
{
    lp.lh = 0.25; // make it thick
    let layer = 1; // current index of layer we're printing
    await lp.moveto({ x: 120, y: 100, z: 0.2 + 0.2 * layer, speed: 80 }); // set this to where you want to print and how high

    lp.speed(10); // set speed conservatively
    await lp.unretract(); // unretract material for printing
    lp.turnto(0); // turn to initial angle (facing right) 
    //await hilbert.run();

    for await (let f of hilbert.getFuncs()) {
        const func = f[0];
        const index = f[1];
        const part = f[2];
        await func({ index, part });
    }

    await lp.retract(); // unretract material for printing
    await lp.up(90).go();
}

