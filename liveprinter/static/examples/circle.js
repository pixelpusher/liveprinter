// Drawing a circle with LivePrinter
// By Evan Raskob, 2018
// --------------------------------

// draw a circle composed of a number of segments at a certain radius

let radius = 30;
let segments = 10;
let angle = Math.PI*2/segments;

let dist_to_extrude = r*Math.sin(angle);

for (let i=0; i<segments; i++)
{
    lp.dist(dist_to_extrude).go(1).turn(angle);
}