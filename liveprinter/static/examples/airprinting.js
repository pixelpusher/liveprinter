// air printing test 1 (2019 Feb 28 @ 4:10PM BST)
// tests different properties in an automated way.
// the goal: print structures in air, reliably!

# start 200 | bed 50

# sync

# mov2 x:lp.cx y:100
# retractspeed 30
# extrude e: 6 speed: 1 // do this a few times to prime filament

# retract 8 // ready for printing!

await repeat(1, async (i) => {
    let h = 3.5;
    # thick 0.11
  await lp.move({ x: i*0.2*lp.maxx, y:30, speed: 150 });
  # downto lp.layerHeight
    lp.autoretract(0);
  # turnto -90 | printspeed 10 | retractspeed 40
  # unretract | printspeed 12 | draw 20 | tilt 90 | drawup h | retract 4.5 
  # wait 3000
  # unretract
  # thick 0.1
  # printspeed 18 | tilt -35 | drawdown h | draw 8 | retract 8
  # travelspeed 50 | upto 80
  # autoretract 1
});
//////////////////////// untested --- old!

await repeat(3, async (i) => {
    await lp.moveto({ x: xmap(i * 0.25), y: ymap(0.5), speed: 150 });
    await lp.downto(lp.layerHeight);
    await lp.unretract();
    await lp.turnto(-90).speed(10).dist(20).go(1, false);
    await lp.speed(12).tilt(90).up(6, 1, 1);
    await lp.wait(2500);
    await lp.unretract();
    await lp.speed(20).tilt(-30).down(6, 1, 1);
    await lp.speed(50).upto(80);
});

// test 2 for retraction speed - faster is better for up (30)
// hard to see much difference, although last one appeared straighter
// ALSO: head is only about 4mm from bed, it gets hit on way down!
for (let i of numrange(1, 5)) {
    let retractDist = 6;
    lp.retractSpeed = 30;
    lp.moveto({ x: s.xmap(i * 0.2), y: s.ymap(0.5), speed: 150 });
    lp.downto(lp.layerHeight).go();
    lp.unretract();
    lp.turnto(-90).speed(10).dist(20).go(1, false);
    lp.speed(10).tilt(90).up(6).go(1, false).retract(retractDist);
    lp.retractSpeed = 35 / i;
    lp.wait(2500).unretract();
    loginfo(lp.retractSpeed);
    lp.speed(10).tilt(-25).down(6).go(1, false);
    lp.retractSpeed = 30;
    lp.retract();
    lp.speed(50).upto(10).go();
}

// test 3 for retraction speed (video)
for (let i of numrange(1, 4)) {
    let vdist = 8;
    let pspeed = 10;
    let retractDist = 8;
    lp.retractSpeed = 30;
    lp.moveto({ x: s.xmap(i * 0.1), y: s.ymap(0.2), speed: 150 });
    lp.downto(lp.layerHeight).go();
    lp.unretract();
    lp.turnto(90).speed(pspeed + i * 5).dist(20).go(1, false);
    lp.tilt(90).up(vdist).go(1, false).retract(retractDist);
    lp.retractSpeed = 11.66;
    lp.wait(2000).unretract();
    lp.tilt(-35).down(vdist).go(1, false);
    lp.retractSpeed = 30;
    lp.retract();
    lp.speed(50).up(vdist * 1.5).go();
}


// test 4 for wait time - less wait time
// looks like 2000 is best! tried with 6 and 8mm retraction, similar results
for (let i of numrange(1, 6)) {
    let vdist = 8;
    let pspeed = 30;
    let retractDist = 6;
    lp.retractSpeed = 30;
    lp.moveto({ x: s.xmap(i * 0.08), y: s.ymap(0.1), speed: 150 });
    lp.downto(lp.layerHeight).go();
    lp.unretract();
    lp.turnto(90).speed(pspeed).dist(20).go(1, false);
    lp.tilt(90).up(vdist).go(1, false).retract(retractDist);
    lp.retractSpeed = 15;
    lp.wait(400 * i).unretract(); // first trial was 200, second 400
    lp.tilt(-35).down(vdist).go(1, false);
    lp.retractSpeed = 30;
    lp.retract();
    lp.speed(50).up(vdist * 1.5).go();
}


// test 5 for retraction length - less wait time
// looks like 8 is decent - hard to tell though.  4-8 are similar
for (let i of numrange(1, 6)) {
    let vdist = 8;
    let pspeed = 30;
    let retractDist = (7 - i) * 2;
    lp.retractSpeed = 30;
    lp.moveto({ x: s.xmap(i * 0.08), y: s.ymap(0.1), speed: 150 });
    lp.downto(lp.layerHeight).go();
    lp.unretract();
    lp.turnto(90).speed(pspeed).dist(20).go(1, false);
    lp.tilt(90).up(vdist).go(1, false).retract(retractDist);
    lp.retractSpeed = 15;
    lp.wait(2000).unretract(); // first trial was 200, second 400
    lp.tilt(-35).down(vdist).go(1, false);
    lp.retractSpeed = 30;
    lp.retract();
    lp.speed(50).up(vdist * 1.5).go();
}


lp.extrude({ e: 3, speed: 10 })
lp.retract(2);

// test 6: different retraction lengths (forwards and backwards)
for (let i of numrange(1, 6)) {
    let vdist = 8;
    let pspeed = 30;
    let retractDist = (7 - i) * 2; // backwards test (1st)
    // let retractDist = i*2;
    lp.retractSpeed = 30;
    lp.moveto({ x: s.xmap(0.08 * i), y: s.ymap(0.1), speed: 150 });
    lp.downto(lp.layerHeight).go();
    lp.unretract();
    lp.turnto(90).speed(pspeed).dist(20).go(1, false);
    lp.retract(retractDist);
    lp.speed(50).up(40).go();
}

for (let i of numrange(1, 6)) {
    let vdist = 8;
    let pspeed = 30;
    //let retractDist = (7-i)*2; // backwards test (1st)
    let retractDist = i * 2;
    lp.retractSpeed = 30;
    lp.moveto({ x: s.xmap(0.08 * i), y: s.ymap(0.3), speed: 150 });
    lp.downto(lp.layerHeight).go();
    lp.unretract();
    lp.turnto(90).speed(pspeed).dist(20).go(1, false);
    lp.retract(retractDist);
    lp.speed(50).up(40).go();
}



// test 7: pyramid
for (let i of numrange(1, 5)) {
    let vdist = 4;
    let ang = 30;
    let hdist = vdist / Math.tan(lp.d2r(ang));
    let pspeed = 25;
    let retractDist = 6;
    lp.retractSpeed = 20;
    lp.moveto({ x: s.xmap(i * 0.08 + 0.2), y: s.ymap(0.1), speed: 150 });
    lp.downto(lp.layerHeight).go();
    lp.unretract();
    lp.turnto(90).speed(pspeed).dist(hdist).go(1, false);
    lp.tilt(90).up(vdist).go(1, false).retract(retractDist);
    lp.retractSpeed = 11.666;
    lp.wait(2000).unretract(); // first trial was 200, second 400
    lp.tilt(-ang).down(vdist).go(1, false);

    lp.turn(-90).dist(hdist).go(1, false);
    lp.turn(-90).dist(hdist).go(1, false);

    lp.retractSpeed = 20;
    lp.turn(-90).tilt(ang).up(vdist).go(1, false).retract(retractDist);
    lp.retractSpeed = 11.666;
    lp.wait(1200).unretract(); // first trial was 200, second 400
    lp.tilt(-ang).down(vdist).go(1, false);
    lp.turn(90).dist(hdist).go(1, false);
    lp.turn(90).dist(hdist).go(1, false);
    lp.turn(90).tilt(ang).up(vdist).go(1, false);
    lp.tilt(-ang).down(vdist).go(1, false);

    lp.turn(90).dist(hdist).go(1, false);
    lp.turn(90).dist(hdist).go(1, false);

    lp.retractSpeed = 30;
    lp.retract();
    lp.wait(500);
    lp.speed(10).up(vdist * 1.25).go();
}

// top bar
let vdist = 4;
let ang = 30;
let hdist = vdist / Math.tan(lp.d2r(ang));
let pspeed = 25;
let retractDist = 6;
lp.retractSpeed = 20;
let i = 1;
lp.moveto({ x: s.xmap(i * 0.08 + 0.2), y: s.ymap(0.1) + hdist, speed: 150 });
lp.downto(vdist).go();
lp.unretract();
lp.turnto(0);
lp.speed(50).dist(4 * s.xmap(0.08)).go(1);
lp.up(2).go()



// release "drawing"
lp.speed(50).up(40).go()



lp.moveto({ x: s.xmap(0.1), y: s.ymap(0.5), speed: 100 });
lp.downto(lp.layerHeight).go();
lp.unretract(12.5);
lp.wait(200);
lp.turnto(-90).speed(20).dist(20).go(1, false);
lp.speed(10).tilt(45).up(6).go(1, false).retract(12.5);
lp.speed(50).upto(80).go();

lp.speed(10).tilt(45).up(6).go();
