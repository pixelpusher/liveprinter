// Langston's CyberAnthill by Evan Raskob <e.raskob@gold.ac.uk>, 2019
// Cellular automata 'walkers' that fill up a rectangular grid space

attachScript("the-cyber-anthill/ant.js"); // run this line first by itself
attachScript("the-cyber-anthill/grid.js"); // run this line second by itself
attachScript("the-cyber-anthill/antgrid-api.js"); // run this line 3rd by itself

lp.start(190); // start up printer, home axes, set print head temperature and bed temp

lp.lh(0.35);

lp.speed(20); // set print speed to a bit slower

let dims = 8; // dimensions of underlying grid - careful not to make too big!
let grid = new Grid(dims, dims); // grid for ants to fill up
let ant = null; // our current ant walker
let paths = []; // array of paths walked
let layers = 4; // layers per ant trail
let iteration = 0; // how many time's we've run this before (start at 0)

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
lp.printPaths({ paths: paths, x: lp.maxx / 4, y: lp.maxy / 4, z: lp.layerHeight * layers * iteration, w: lp.maxx / 8, passes: layers });

lp.up(100).go(); // move up at end
