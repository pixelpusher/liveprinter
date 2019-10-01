
// API stress test!

let layer = 0; // current index of layer we're printing
await lp.moveto({ x: 60, y: 100, z: 0.15 + 0.2 * layer, speed: 80 });
lp.turnto(0);
let i = 0;
while (i < 22) {
    await lp.dist(50).speed(40).go(1, false);
    lp.turn(90);
    i++;
    if (i % 4 == 0) {
        layer++; // current index of layer we're printing
        await lp.moveto({ x: 60, y: 100, z: 0.15 + 0.2 * layer, speed: 80 });
    }
}


await lp.speed(80).up(40).go()

for (let i = 0; i < 10; i++) {
    let d = i % 2 ? 10 : -10;
    if (i % 2) lp.turnto(180);
    else lp.turnto(0);
    await lp.dist(40).speed(120).go(0);
    await s.sendGCode("M400");

    updateGUI();
    await lp.speed(80).up(d).go();
    await s.sendGCode("M400");
    updateGUI();
}
