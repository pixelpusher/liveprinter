    let dims = 16; // dimensions of underlying grid - careful not to make too big!
    let grid = new Grid(dims, dims); // grid for ants to fill up
    const numAnts = 4; // ants at any point
    let ants = Array.from({ length: numAnts }, () => (createAnt(grid))); // our current ant walker
    let paths = []; // array of paths walked at each layer

    let layers = 1; // layers we're rendered

///// loop code - run this each time

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
    lp.printPaths({ paths: paths, x: lp.maxx / 8, y: lp.maxy / 8, z: lp.layerHeight * layers, w: lp.maxx / 8, passes: layers });
}
lp.up(100).go(); // move up at end
