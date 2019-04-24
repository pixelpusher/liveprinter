let dims = 16; // dimensions of underlying grid - careful not to make too big!
let grid = new Grid(dims, dims); // grid for ants to fill up
let ant = null; // our current ant walker
let paths = []; // array of paths walked
let layers = 3; // layers per ant trail
let iteration = 0; // how many time's we've run this before (start at 0)

while (ant = createAnt(grid)) {
    if (ant) {
        ant.maxLife = 12;
        //ant.skip = 1; // move per loop
        while (ant.alive) {
            move(ant, grid);
        }
        paths.push(ant.path);
    }
}

//print all paths
lp.printPaths({ paths: paths, x: lp.maxx / 8, y: lp.maxy / 8, z: lp.layerHeight * layers * iteration, w: lp.maxx / 8, passes: layers });

while (paths.length > 0) {
    iteration++;

    // go backwards in paths and degrade each
    paths = paths.filter(path => path.splice(0, 1).length > 0);

    //print all paths
    lp.printPaths({ paths: paths, x: lp.maxx / 8, y: lp.maxy / 8, z: lp.layerHeight * layers * iteration, w: lp.maxx / 8, passes: layers });
}

lp.up(100).go(); // move up at end
