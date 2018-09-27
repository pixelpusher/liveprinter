// Drawing a circle with LivePrinter
// By Evan Raskob, 2018
// --------------------------------

// draw a circle composed of a number of segments at a certain radius

// center head first
lp.moveto({ x: lp.cx, y: lp.cy, z: lp.layerHeight });

{
    let radius = 30;
    let segments = 10;
    let angle = Math.PI * 2 / segments;

    let dist_to_extrude = radius * Math.sin(angle);

    for (let i = 0; i < segments; i++) {
        lp.dist(dist_to_extrude).speed(15).go(1).turn(angle);
    }
}

// define a circle function -- the lp.circle is a bit like this
function circle (r, cx, cy, segs=10) {

    // law of cosines
    const r2x2 = r * r * 2;
    const x = sqrt(r2x2 - r2x2 * cos(segAngle));
    const segAngle = Math.PI * 2 / segs;

    //translate((float)radius, 0);
    lp.turn(Math.PI / 2);
    // we're in the middle of segment
    lp.turn(-segAngle / 2);
    
    for (let i = 0; i < segs; i++)
    {
        lp.turn(segAngle);
        // print without retraction
        lp.dist(x).go(1, false);
    }
}


// another way
let segs = 10;
for (let i = 0; i < segs; i++) {
    let angle = Math.PI * 2 * i / (segs - 1);
    let x = Math.cos(angle) * r;
    let y = Math.sin(angle) * r;
    lp.extrudeto({ 'x': cx + x, 'y': cy + y });
}


// make a cylinder by moving up each time
lp.circle(30, lp.cx, lp.cy);
lp.move({ z: lp.layerHeight });


// draw a "cone" thing
let r = 30;
let offset = 0.2;

for (let i = 0; i < 20; i++) {
    lp.circle(r).retract();

    lp.turn(90).dist(offset).go(); // move towards centre slightly
    lp.move({ z: lp.layerHeight }); // move up a level
    lp.turn(-90);
    r -= offset;
    lp.unretract();
}