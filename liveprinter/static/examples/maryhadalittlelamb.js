// Mary had a little lamb, LivePrinter style:
// by Evan Raskob 2019

p.moveto({ x: lp.cx, lp.cy });
lp.turnto(0);
let octave = 2; // shift up 2 octaves
for (let note of [40, 38, 36, 38, 40, 40, 40, 0, 38, 38, 38, 0, 40, 43, 43, 0]) {  // do something for these midi notes
    if (note == 0) lp.wait(500); // wait 1/2 second if no note (0)
    // lp.m2s => midi note to motor speed 
    // lp.t2d => time to distance (seconds to millimeters) based on the current printing speed
    lp.m2s(note + octave * 12, "x").t2d(500).go().turn(90); // play the note for 1/2 second and turn 90 CCW
}
