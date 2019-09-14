
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

