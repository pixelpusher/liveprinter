// Drawing a circle with LivePrinter
// By Evan Raskob, 2018
// --------------------------------

// draw a circle composed of a number of segments at a certain radius

// center head first
lp.moveto({ x: lp.cx, y: lp.cy, z: lp.layerHeight })

//make sure elevation is 0!
lp.elev(0);

{
    let radius = 30;
    let segments = 10;
    let angle = Math.PI * 2 / segments;

    let dist_to_extrude = radius * Math.sin(angle);

    for (let i = 0; i < segments; i++) {
        lp.dist(dist_to_extrude).speed(15).go(1).turn(angle);
    }
}

// define a circle function and use it!
lp.circle = function (r, cx, cy, segs=10) {
    for (let i = 0; i < segs; i++) {
        let angle = Math.PI * 2 * i / (segs-1);
        let x = Math.cos(angle) * r;
        let y = Math.sin(angle) * r;
        lp.extrudeto({ 'x': cx + x, 'y': cy + y, speed: 15 });
    }
}

lp.unretract(8);
lp.circle(30, lp.cx, lp.cy);
lp.move({ z: lp.layerHeight })
lp.retract(10);

// draw a "cone"
for (let i = 0; i < 20; i++) {
    lp.circle(30 - i / 20, lp.cx, lp.cy);
    lp.move({ z: lp.layerHeight })
}
