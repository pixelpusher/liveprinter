// jam session 2019-Aug-7

# lp.speed 80
# gcode "G28"

# lp.mov2 x: 50 y: 80 z: 100 speed: 100

lp.temp(195)

lp.sync()

// create note sequence
global notes = Array.from({ length: 12 }, (_, n) => majScale(n, 0));
global note = infiter(notes); // infinite iterator over array

loginfo(note()); // if passed true, resets


global startNote = 12;

startNote = 12;
startNote--;

addTask("noteup", 8000, () => startNote += 2);

(() => {
    const t = 250;
    addTask("majscale", t * 4,
        () => {
            repeat(4, (i) => lp.turn(45).m2s(majScale(startNote, 8 * i * Math.sin(i / 8))).t2d(t / 2).go());
            lp.wait(t / 4);
        });
})();

removeTask("majscale");


lp.t2mm = (time, speed = lp.travelSpeed) => {
    return speed * time / 1000; // time in ms
};

(() => {
    let bumpup = 0;
    addTask("zbump", 4000,
        () => {
            bumpup = (1 - bumpup);
            repeat(4, () =>
                lp.m2s(majScale(0, 8)).up(lp.t2mm(50 * (bumpup * 2 - 1))).go()
            );
        }
    );
})();

removeTask("zbump")