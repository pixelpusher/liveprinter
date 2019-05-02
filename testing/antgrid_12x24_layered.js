attachScript("the-cyber-anthill/ant.js"); // run this line first by itself
attachScript("the-cyber-anthill/grid.js"); // run this line second by itself
attachScript("the-cyber-anthill/antgrid-api.js"); // run this line 3rd by itself

lp.start(190); // start up printer, home axes, set print head temperature and bed temp

lp.moveto({ x: lp.cx + 10, y: lp.miny + 32 })
lp.speed(50);


const minZ = 3.14;
lp.moveto({ z: minZ })

lp.up(100).go();
lp.extrude({ e: 20, speed: 8 })
lp.retract(12)

lp.bed(0);

lp.turnto(0).dist(4).go();

lp.speed(22); // set print speed to a bit slower
lp.lh(0.1);

let dims = 12; // dimensions of underlying grid - careful not to make too big!
let grid = new Grid(dims, dims * 2); // grid for ants to fill up
let ant = null; // our current ant walker
let paths = []; // array of paths walked
let layers = 2; // layers per ant trail
let iteration = 0; // how many time's we've run this before (start at 0)
const startx = lp.x;
const starty = lp.y;
const z = lp.z;
const w = lp.maxx / 10;

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
lp.printPaths({ paths: paths, x: startx, y: starty, z: z + lp.layerHeight * layers * iteration, w: w, passes: layers });

while (paths.length > 0) {
    iteration++;

    // fan on layer 1
    if (iteration === 1) lp.fan(80);

    // go backwards in paths and degrade each
    paths = paths.filter(path => { path.splice(0, 1); return path.length > 0 });


    //print all paths
    lp.printPaths({ paths: paths, x: startx, y: starty, z: z + lp.layerHeight * layers * iteration, w: w, passes: layers });
}

lp.up(100).go(); // move up at end
