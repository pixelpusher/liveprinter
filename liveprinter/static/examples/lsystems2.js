// musical events example

lp.start(195);

lp.temp(195)

lp.bed(50)

gcode("G28")

attachScript("http://localhost:8888/static/lib/linden/linden.js");

lp.moveto({ x: 20, y: lp.maxy - 20, z: lp.lh, speed: 30 });

# lp.mov y: 20

# lp.ext e: 300 speed: 30

lp.angle = 0

lp.retract()

# lp.mov z: 40

cancel()
lp.sync()

lp.up(80).go()

# lp.mov2 z: 0.2 y: 180 x: 20

let baseNote = 40;
let iter = 0;
const iters = 1;
lp.unretract()
// Now initialize the L-System to generate the tree
var tree = new LSystem({
    axiom: 'L',
    ignoredSymbols: "",
    productions: {
        'L': "+RF-LFL-FR+",
        'R': "-LF+RFR+FL-",
    },
    finals: {
        'F': () => { lp.dist(20 / iters).speed(window.scales.majPattern[iter++ % 8] + baseNote).go(1, false); },
        '+': () => { lp.turn(90); },
        '-': () => { lp.turn(-90); }
    }
});

// Run the 5 iterations of the L-System
tree.iterate(4);
loginfo(tree.getString());
tree.final();




lp.start(0); // start
lp.bed(0);
lp.temp(0);


lp.maxTimePerOperation = 40;

let toff = 800;
let ang = 20;
// basic/quick way of adding repeated tasks ("events")
let loop1e = {
    name: "loop1",
    notes: [62, 72, 84],
    delay: toff * 3,
    run: function (time) {
        this.notes.map(
            t => lp.turn(ang).m2s(t).t2d(toff).go(0, 0));
        lp.up(lp.layerHeight).go();
    },
    repeat: true
};

addTask(loop1e);

removeTask("loop1"); // remove when needed, or via GUI

// getting a task and modifying it
let loop = getTask("loop1");
loop.notes = [60, 62, 63, 64];



lp.turnto(0).dist(lp.maxx / 3).speed(150).go()


// more "standard" way of creating a task

let loop = new Task;
loop.name = "loop1";
loop.data.notes = [62, 72, 84];
loop.data.duration = 50;
loop.delay = 1000;
loop.run = function (time) {
    this.data.notes.map(t => lp.turn(90).m2s(t).t2d(this.data.duration).go(0));
    lp.up(lp.layerHeight).go();
};

addTask(loop);


// get previous task and create another task to modify it
s.loop = getTask("loop1");

let loop = new Task;
loop.name = "loop3";
loop.delay = 100;
loop.run = function (time) {
    s.loop.data.duration = Math.random() * 100 + 100;
};
addTask(loop);


s.loop.data.duration = 150;


let loop1e = {
    name: "loop2",
    delay: 3200,
    run: function (time) {
        [41, 42, 45, 56].map(n => lp.m2s(n).t2d(250).go().wait(125));
        lp.turn(180);
    },
    repeat: true
};

addTask(loop1e);