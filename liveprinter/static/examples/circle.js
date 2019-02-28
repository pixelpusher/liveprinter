// Drawing a circle with LivePrinter
// By Evan Raskob, 2019
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

//---------------------------
// copy all code below up until we say so:

// define a polygon function -- use more segments for a better circle
function polygon(r, segs = 10) {
    // law of cosines
    let r2x2 = r * r * 2;
    let segAngle = Math.PI * 2 / segs;
    let cx = Math.sqrt(r2x2 - r2x2 * Math.cos(segAngle));
    loginfo(r2x2 + "," + segAngle + "," + cx);

    //translate((float)radius, 0);
    lp.turn(Math.PI / 2, true); // use radians
    // we're in the middle of segment
    lp.turn(-segAngle / 2, true); // use radians
    lp.unretract();
    for (let i = 0; i < segs; i++) {
        lp.turn(segAngle, true); // use radians
        // print without retraction
        lp.dist(cx).go(1, false);
    }
    lp.retract();
}
// move to a spot
lp.moveto({ x: lp.cx, y: lp.cy, z: lp.layerHeight });
polygon(20, 20);
// move up to inspect the drawing!
lp.up(40).speed(40).go();

// stop copying here!
//---------------------------

// use the built-in function to create a cylinder:
lp.moveto({ x: lp.cx, y: lp.cy, z: lp.layerHeight });
lp.retractSpeed = 30;
lp.unretract();
for (let i of numrange(1, 14)) {
    lp.speed(30).polygon(20, 16);
    lp.up(lp.layerHeight).go();
}
lp.retract();
lp.up(40).speed(40).go();


// another way
let segs = 10;
for (let i = 0; i < segs; i++) {
    let angle = Math.PI * 2 * i / (segs - 1);
    let x = Math.cos(angle) * r;
    let y = Math.sin(angle) * r;
    lp.extrudeto({ 'x': cx + x, 'y': cy + y });
}


// make a cylinder by moving up each time
lp.unretract();
lp.polygon(30, 20);
lp.retract();
lp.move({ z: lp.layerHeight });

