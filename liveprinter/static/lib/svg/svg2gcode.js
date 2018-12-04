function svg2gcode(svg, settings) {
    // clean off any preceding whitespace
    svg = svg.replace(/^[\n\r \t]/gm, '');
    settings = settings || {};
    settings.passes = settings.passes || 1;
    settings.scale = settings.scale || 1;
    settings.layerHeight = settings.layerHeight || 0.2; // cut z
    settings.safeZ = settings.safeZ || 100;   // safe z
    settings.feedRate = settings.feedRate || (30 * 60); //convert mm/s to mm/min
    settings.seekRate = settings.seekRate || (80 * 60); //convert mm/s to mm/min
    settings.bitWidth = settings.bitWidth || 1; // in mm
    settings.minY = 0; // translate on bed
    settings.minX = 0;
    settings.maxY = 150; // make sure not bigger than printer size!
    settings.maxX = 150;
    settings.offsetX = settings.offsetX || 0; // add an optional offset
    settings.offsetY = settings.offsetY || 0;
    settings.offsetZ = settings.offsetZ || 0;

    // total bounds
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;


    let
        calcX = x => ((x - minX) * settings.scale + settings.offsetX).toFixed(4),
        calcY = y => ((y - minY) * settings.scale + settings.offsetY).toFixed(4),
        paths = SVGReader.parse(svg, {}).allcolors,
        gcode,
        lpcode,
        path;

    let idx = paths.length;
    while (idx--) {
        let subidx = paths[idx].length;
        let bounds = { x: Infinity, y: Infinity, x2: -Infinity, y2: -Infinity, area: 0 };

        // find lower and upper bounds
        while (subidx--) {
            minX = Math.min(paths[idx][subidx][0], minX);
            minY = Math.min(paths[idx][subidx][1], minY);
            maxX = Math.max(paths[idx][subidx][0], maxX);
            maxY = Math.max(paths[idx][subidx][1], maxY);

            if (paths[idx][subidx][0] < bounds.x) {
                bounds.x = paths[idx][subidx][0];
            }

            if (paths[idx][subidx][1] < bounds.y) {
                bounds.y = paths[idx][subidx][0];
            }

            if (paths[idx][subidx][0] > bounds.x2) {
                bounds.x2 = paths[idx][subidx][0];
            }
            if (paths[idx][subidx][1] > bounds.y2) {
                bounds.y2 = paths[idx][subidx][0];
            }
        }

        // calculate area
        bounds.area = (1 + bounds.x2 - bounds.x) * (1 + bounds.y2 - bounds.y);
        paths[idx].bounds = bounds;
    }

    let newScale = 1;
    let xDiff = (maxX - minX) * settings.scale;
    let yDiff = (maxY - minY) * settings.scale;

    // scale to larger of the dimensions
    // *****note: offsets aren't scaled (that would be weird)
    if ((settings.offsetX + xDiff) > settings.maxX || (settings.offsetY + yDiff) > settings.maxY) {
        newScale = Math.min(settings.maxX / (settings.offsetX + xDiff), settings.maxY / (settings.offsetY + yDiff));
    }

    settings.scale *= newScale; // apply new scale

    // cut the inside parts first
    //paths.sort(function (a, b) {
    //    // sort by area
    //    return (a.bounds.area < b.bounds.area) ? -1 : 1;
    //});

    paths.sort(function (a, b) {
        // sort by horizontal position
        return (a.bounds.x < b.bounds.x) ? -1 : 1;
    });


    gcode = [
        'G90',
        'G1 Z' + settings.safeZ,
        'G82',
        'M4'
    ];

    lpcode = [
        "lp.moveto({'z':" + settings.safeZ + "});"
    ];

    for (let pathIdx = 0, pathLength = paths.length; pathIdx < pathLength; pathIdx++) {
        path = paths[pathIdx];

        let currentHeight = settings.layerHeight;

        // seek to start of first path segment
        gcode.push(['G1',
            'X' + calcX(path[0][0]),
            'Y' + calcY(path[0][1]),
            'F' + settings.seekRate
        ].join(' '));

        // seek to start of first path segment
        lpcode.push(['lp.moveto({' + 
            "'x':" + calcX(path[0][0]),
            "'y':" + calcY(path[0][1]),
            "'speed':" + settings.seekRate,
            "});"
        ].join(','));

        // begin print, move head into place
        gcode.push(['G1',
            'Z' + currentHeight,
            'F' + settings.seekRate
        ].join(' '));

        lpcode.push([
            "lp.moveto({'z':" + currentHeight, "'speed':" + settings.seekRate + "});"
        ]);

        // unretract if needed, get ready to print first segment
        if (pathIdx > 0) lpcode.push('lp.unretract();');

        // print each segment, one by one
        for (let segmentIdx = 0, segmentLength = path.length; segmentIdx < segmentLength; segmentIdx++) {
            let segment = path[segmentIdx];

            gcode.push(['G1',
                'X' + calcX(segment[0]),
                'Y' + calcY(segment[1]),
                'F' + settings.feedRate
            ].join(' '));

            lpcode.push(['lp.extrudeto({' +
                "'x': " + calcX(segment[0]),
                "'y':" + calcY(segment[1]),
                "'speed':" + settings.feedRate,
                "'retract':false});"
            ].join(','));
        }

        // path finished, retract and raise up head
        lpcode.push('lp.retract();');

        lpcode.push([
            "lp.moveto({'z':" + settings.safeZ, "'speed':" + settings.seekRate + "});"
        ]);

        // go safe
        gcode.push(['G1',
            'Z' + settings.safeZ,
            'F' + '300'
        ].join(' '));
    }

    // just wait there for a second
    gcode.push('G4 P1');

    // turn off the spindle
    gcode.push('M5');

    // go home
    lpcode.push([
        "lp.moveto({'z':" + (settings.safeZ), "'speed':80" + "});"
    ]);

    gcode.push('G1 Z0 F300');
    gcode.push('G1 X0 Y0 F800');

    return [lpcode.join('\n'), gcode.join('\n')];
}
