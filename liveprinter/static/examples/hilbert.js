// hilbert curve
// https://github.com/nylki/lindenmayer

attachScript("http://localhost:8888/static/lib/linden/linden.js");

// Now initialize the L-System to generate the tree
var tree = new LSystem({
    axiom: 'L',
    ignoredSymbols: "",
    productions: {
        'L': "+RF-LFL-FR+",
        'R': "-LF+RFR+FL-",
    },
    finals: {
        'F': () => { lp.dist(20).go(1); },
        '+': () => { lp.turn(90); },
        '-': () => { lp.turn(-90); }
    }
});

// Run the 5 iterations of the L-System
tree.iterate(4);
console.log(tree);
tree.final();
