// draw the algorave logo
lp.start(195);

lp.sync();
lp.extrude({ e: 14, speed: 10 });
lp.downto(lp.layerHeight);

lp.moveto({ x: 60, y: lp.cy - 8 });
lp.speed(45);
let gap = 4;
let forwards = 120;
let backwards = -120;

// 2 layers
for (let i of numrange(0, 1)) {
    lp.moveto({ x: 60, y: lp.cy - 8 });
    lp.turnto(0);

    let d = 110;
    //lp.dist(d).go(1);
    //also use plain fillDirection for other results

    lp.fillDirectionH(2.5, d, gap * lp.layerHeight, false);
    lp.turn(backwards);

    for (let ii of numrange(0, 12)) {
        //also use plain fillDirection for other results
        lp.fillDirectionH(2.5, d, gap * lp.layerHeight, false);
        //lp.dist(d).go(1);
        lp.turn(backwards);

        d -= 8;
    }
    lp.up(lp.layerHeight);
}
lp.retract(12.5);
lp.up(60);