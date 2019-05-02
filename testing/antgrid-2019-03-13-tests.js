
// cyberanthill v2 (16x16) -- 2019 March 14

let dims = 16; // dimensions of underlying grid - careful not to make too big!
let grid = new Grid(dims, dims); // grid for ants to fill up
let ant = null; // our current ant walker
let paths = []; // array of paths walked


while (ant = createAnt(grid)) {
    if (ant) {
        //ant.skip = 1; // move per loop
        while (ant.alive) {
            move(ant, grid);
        }
        paths.push(ant.path);
    }
}
//print all paths
lp.printPaths({ paths: paths, x: lp.maxx / 4, y: lp.maxy / 4, w: lp.maxx / 4, passes: 2 });



// chunkier:


lp.start(190); // start up printer, home axes, set print head temperature and bed temp
lp.speed(30); // set print speed to a bit slower

lp.fan(50); // turn off fan for first layer

lp.lh(0.35);


let dims = 12; // dimensions of underlying grid - careful not to make too big!
let grid = new Grid(dims, dims); // grid for ants to fill up
let ant = null; // our current ant walker
let paths = []; // array of paths walked
let layers = 4; // layers per ant trail
let iteration = 0; // how many time's we've run this before (start at 1)

while (ant = createAnt(grid)) {
    if (ant) {
        ant.maxLife = 20;
        //ant.skip = 1; // move per loop
        while (ant.alive) {
            move(ant, grid);
        }
        paths.push(ant.path);
    }
}
//print all paths
lp.printPaths({ paths: paths, x: lp.maxx / 4, y: lp.maxy / 4, z: lp.layerHeight * layers * iteration, w: lp.maxx / 5, passes: layers });

lp.up(100).go()
