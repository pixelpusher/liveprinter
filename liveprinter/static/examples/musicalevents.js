// musical events

lp.maxTimePerOperation = 40;

lp.downto(0).go()

let toff = 1200;
let ang = 45;
window.scope.Scheduler.removeEventByName("loop1");

let loop1e = {
    name: "loop1",
    notes: [62, 72, 84],
    timeOffset: toff * 3,
    func: function (time) {
        for (let t of this.notes) {
            lp.turn(ang).m2s(t).t2d(toff).go(1, 0);
        }
        lp.up(lp.layerHeight).go();
    },
    repeat: true
};

s.loop1 = loop1e;
window.scope.Scheduler.scheduleEvent(loop1e);

s.loop1.ang = 90;
