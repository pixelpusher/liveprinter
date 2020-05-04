function svg2gcode(svg, settings) {
    // clean off any preceding whitespace
    svg = svg.replace(/^[\n\r \t]/gm, '');
    settings = settings || {};
    settings.passes = settings.passes || 1;
    settings.scale = settings.scale || 1;
    settings.layerHeight = settings.layerHeight || 0.2; // cut z
    settings.feedRate = settings.feedRate || 25; //mm/s
    settings.seekRate = settings.seekRate || 80; //mm/s 
    settings.bitWidth = settings.bitWidth || 1; // in mm
    settings.minY = settings.minY === undefined ? 0 : settings.minY; // translate on bed
    settings.minX = settings.minY === undefined ? 0 : settings.minX;
    settings.minZ = settings.minZ === undefined ? 0 : settings.minZ;
    settings.maxY = settings.maxY || 140; // make sure not bigger than printer size!
    settings.maxX = settings.maxY || 140;
    settings.safeZ = settings.safeZ || (settings.layerHeight * settings.passes + 10);   // safe z for traveling

    // total bounds
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity,
        realMinX = Infinity,
        realMinY = Infinity,
        realMaxX = -Infinity,
        realMaxY = -Infinity;


    let
        calcX = x => ((x - minX) * settings.scale + settings.minX).toFixed(4),
        calcY = y => ((y - minY) * settings.scale + settings.minY).toFixed(4),
        paths = SVGReader.parse(svg, {}).allcolors,
        gcode,
        lpcode,
        path;

    // for returning and setting to a variable
    let lpcodeWithVars = [
        "const shape = {",
            '\t"paths": ['
    ];


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
    if ((settings.minX + xDiff) > settings.maxX || (settings.minY + yDiff) > settings.maxY) {
        newScale = Math.min((settings.maxX - settings.minX) / xDiff, (settings.maxY - settings.minY) / yDiff);
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

        lpcodeWithVars.push("\t\t[" + "//" + pathIdx);

        let currentHeight = settings.layerHeight;

        // seek to start of first path segment
        gcode.push(['G1',
            'X' + calcX(path[0][0]),
            'Y' + calcY(path[0][1]),
            'F' + (settings.seekRate*60)
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
            'F' + (settings.seekRate*60)
        ].join(' '));

        lpcode.push([
            "lp.moveto({'z':" + currentHeight, "'speed':" + settings.seekRate + "});"
        ]);

        // unretract if needed, get ready to print first segment
       // if (pathIdx > 0) lpcode.push('lp.unretract();');

        lpcode.push('lp.unretract();'); // makes sense to do this every time

        // print each segment, one by one
        for (let segmentIdx = 0, segmentLength = path.length; segmentIdx < segmentLength; segmentIdx++) {
            let segment = path[segmentIdx];

            let pathTxt = "\t\t\t[" + calcX(segment[0]) + "," + calcY(segment[1]) + "]";
            if (segmentIdx != (segmentLength-1)) pathTxt = pathTxt + ",";
            lpcodeWithVars.push(pathTxt);

            const x = calcX(segment[0]);
            const y = calcY(segment[1]); 

            realMinX = Math.min(realMinX, x);
            realMaxX = Math.max(realMaxX, x);
            realMinY = Math.min(realMinY, y);
            realMaxY = Math.max(realMaxY, y);


            gcode.push(['G1',
                'X' + x,
                'Y' + y,
                'F' + (settings.feedRate*60)
            ].join(' '));

            lpcode.push(['lp.extrudeto({' +
                "'x': " + x,
                "'y':" + y,
                "'speed':" + settings.feedRate,
                "'retract':false});"
            ].join(','));
        }
        if (pathIdx < pathLength)
            lpcodeWithVars.push("\t\t],");
        else
            lpcodeWithVars.push("\t\t]");

        // path finished, retract and raise up head
        lpcode.push('lp.retract();');

        lpcode.push([
            "lp.moveto({'z':" + settings.safeZ, "'speed':" + settings.seekRate + "});"
        ]);

        // go safe
        gcode.push(['G1',
            'Z' + settings.safeZ,
            'F' + (settings.feedRate * 60)
        ].join(' '));
    }

    // just wait there for a second
    gcode.push('G4 P1');

    // turn off the spindle
    gcode.push('M5');

    gcode.push('G1 Z0 F300');
    gcode.push('G1 X0 Y0 F800');

    lpcodeWithVars.push("\t],");
    lpcodeWithVars.push(
        '\t"minX": ' + realMinX+",",
        '\t"minY": ' + realMinY+",",
        '\t"maxX": ' + realMaxX + ",",
        '\t"maxY": ' + realMaxY);
    lpcodeWithVars.push("};");

    return [lpcode.join('\n'), lpcodeWithVars.join('\n'), gcode.join('\n')];
}
