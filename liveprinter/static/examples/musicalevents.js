// musical events example

lp.start(0); // start

lp.maxTimePerOperation = 40;


// basic/quick way of adding repeated tasks ("events")
let loop1e = {
    name: "loop1",
    notes: [62, 72, 84],
    delay: toff * 3,
    run: function (time) {
        this.notes.map(
            t => lp.turn(ang).m2s(t).t2d(toff).go(1, 0));
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
    this.data.notes.map( t => lp.turn(90).m2s(t).t2d(this.data.duration).go(0));
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