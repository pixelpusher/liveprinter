attachScript("the-cyber-anthill/ant.js"); // run this line first by itself
attachScript("the-cyber-anthill/grid.js"); // run this line second by itself
attachScript("the-cyber-anthill/antgrid-api.js"); // run this line 3rd by itself

lp.start(190); // start up printer, home axes, set print head temperature and bed temp

const minZ = 3.08;

lp.speed(20); // set print speed to a bit slower
lp.lh(0.15);

let dims = 12; // dimensions of underlying grid - careful not to make too big!
let grid = new Grid(dims, dims); // grid for ants to fill up
let ant = null; // our current ant walker
let paths = []; // array of paths walked
let layers = 2; // layers per ant trail
let iteration = 0; // how many time's we've run this before (start at 0)

while (ant = createAnt(grid)) {
    if (ant) {
        ant.maxLife = 12;
        while (ant.alive) {
            move(ant, grid);
        }
        paths.push(ant.path);
    }
}

//print all paths
lp.printPaths({ paths: paths, x: lp.maxx / 6 + lp.maxx / 6, y: lp.maxy / 6, z: minZ + lp.layerHeight * layers * iteration, w: lp.maxx / 6, passes: layers });

while (paths.length > 0) {
    iteration++;

    // fan on layer 1
    if (iteration === 1) lp.fan(80);

    // go backwards in paths and degrade each
    paths = paths.filter(path => { path.splice(0, 1); return path.length > 0 });

    //print all paths
    lp.printPaths({ paths: paths, x: lp.maxx / 6 + lp.maxx / 6, y: lp.maxy / 6, z: minZ + lp.layerHeight * layers * iteration, w: lp.maxx / 6, passes: layers });
}

lp.up(100).go(); // move up at end
