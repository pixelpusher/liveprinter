/**
 * 
 * @param {string} path SVG path text
 * @param {Number} xoffset horizontal offset 
 * @param {Number} yoffset vertical offset
 */

//
// borrowed from https://github.com/Pomax/js-svg-path
//
function parseSVGPath(path, xoffset, yoffset) {
    xoffset = xoffset || 0;
    yoffset = yoffset || 0;

    let points = [];
    let paths = [];

    // normalize the path
    path = path.replace(/\s*([mlvhqczMLVHQCZ])\s*/g, "\n$1 ")
        .replace(/,/g, " ")
        .replace(/-/g, " -")
        .replace(/ +/g, " ");

    // step one: split the path in individual pathing instructions
    var strings = path.split("\n");
    let x = xoffset;
    let y = yoffset;


    for (let s = 1; s < strings.length; s++) {
        let instruction = strings[s].trim();
        let op = instruction.substring(0, 1);
        let terms = (instruction.length > 1 ? instruction.substring(2).trim().split(" ") : []);

        // move instruction
        if (op === "m" || op === "M") {
            if (op === "m") { x += parseFloat(terms[0]); y += parseFloat(terms[1]); }
            else if (op === "M") { x = parseFloat(terms[0]) + xoffset; y = parseFloat(terms[1]) + yoffset; }
            // add a point only if the next operation is not another move operation, or a close operation
            if (s < strings.length - 1) {
                let nextstring = strings[s + 1].trim();
                let nextop = nextstring.substring(0, 1);
                if (!(nextop === "m" || nextop === "M" || nextop === "z" || nextop === "Z")) {
                    //if (s > 1) { receiver.closeShape(); }
                    points.push([x, y]);
                }
            }
        }

        // line instructions
        else if (op === "l" || op === "L") {
            // this operation take a series of [x2 y2] coordinates
            for (let t = 0; t < terms.length; t += 2) {
                if (op === "l") { x += parseFloat(terms[t + 0]); y += parseFloat(terms[t + 1]); }
                else if (op === "L") { x = parseFloat(terms[t + 0]) + xoffset; y = parseFloat(terms[t + 1]) + yoffset; }
                points.push([x, y]);
            }
        }

        // vertical line shorthand
        else if (op === "v" || op === "V") {
            terms.forEach(y2 => {
                if (op === "v") { y += parseFloat(y2); }
                else if (op === "V") { y = parseFloat(y2) + yoffset; }
                points.push([x, y]);
            });
        }


        // horizontal line shorthand
        else if (op === "h" || op === "H") {
            terms.forEach(x2 => {
                if (op === "h") { x += parseFloat(x2); }
                else if (op === "H") { x = parseFloat(x2) + yoffset; }
                points.push([x, y]);
            });
        }


        //// quadratic curve instruction
        //else if (op === "q" || op === "Q") {
        //    // this operation takes a series of [cx cy x2 y2] coordinates
        //    for (let q = 0; q < terms.length; q += 4) {
        //        let cx = 0; let cy = 0;
        //        if (op === "q") { cx = x + parseFloat(terms[q]); cy = y + parseFloat(terms[q + 1]); }
        //        else if (op === "Q") { cx = parseFloat(terms[q]) + xoffset; cy = parseFloat(terms[q + 1]) + yoffset; }

        //        // processing has no quadratic curves, so we have to derive the cubic control points
        //        let cx1 = (x + cx + cx) / 3;
        //        let cy1 = (y + cy + cy) / 3;

        //        // make start point bezier if it differs from the control point
        //        if (x != cx1 || y != cy1) {
        //            receiver.setRightControl(cx1, cy1);
        //        }

        //        // NOTE: the relative quadratic instruction does not count control points as "real"
        //        // points, so the curve's on-curve coordinate is relative to the last on-curve one.
        //        if (op === "q") { x += parseFloat(terms[q + 2]); y += parseFloat(terms[q + 3]); }
        //        else if (op === "Q") { x = parseFloat(terms[q + 2]) + xoffset; y = parseFloat(terms[q + 3]) + yoffset; }

        //        // derive cubic control point 2
        //        let cx2 = (x + cx + cx) / 3;
        //        let cy2 = (y + cy + cy) / 3;

        //        receiver.addPoint(x, y);
        //        if (x != cx2 || y != cy2) { receiver.setLeftControl(cx2, cy2); }
        //    }
        //}

        //// cubic curve instruction
        //else if (op === "c" || op === "C") {
        //    // this operation takes a series of [cx1 cy1 cx2 cy2 x2 y2] coordinates
        //    for (let c = 0; c < terms.length; c += 6) {

        //        // get first control point
        //        let cx1 = 0; let cy1 = 0;
        //        if (op === "c") { cx1 = x + parseFloat(terms[c]); cy1 = y + parseFloat(terms[c + 1]); }
        //        else if (op === "C") { cx1 = parseFloat(terms[c]) + xoffset; cy1 = parseFloat(terms[c + 1]) + yoffset; }

        //        // make start point bezier if it differs from the control point
        //        if (x != cx1 || y != cy1) {
        //            receiver.setRightControl(cx1, cy1);
        //        }

        //        // get second control point. NOTE: this is not relative to the first control point, but
        //        // relative to the on-curve start coordinate
        //        let cx2 = 0; let cy2 = 0;
        //        if (op === "c") { cx2 = x + parseFloat(terms[c + 2]); cy2 = y + parseFloat(terms[c + 3]); }
        //        else if (op === "C") { cx2 = parseFloat(terms[c + 2]) + xoffset; cy2 = parseFloat(terms[c + 3]) + yoffset; }

        //        // NOTE: the relative cubic instruction does not count control points as "real"
        //        // points, so the curve's on-curve coordinate is relative to the last on-curve one.
        //        if (op === "c") { x += parseFloat(terms[c + 4]); y += parseFloat(terms[c + 5]); }
        //        else if (op === "C") { x = parseFloat(terms[c + 4]) + xoffset; y = parseFloat(terms[c + 5]) + yoffset; }

        //        // add end point, make bezier if the on-curve and control point differ
        //        receiver.addPoint(x, y);
        //        if (x != cx2 || y != cy2) { receiver.setLeftControl(cx2, cy2); }
        //    }
        //}

        // close shape instruction
        else if (op === "z" || op === "Z") {
            paths.push(points);
            points = [];
        }
    }
    return paths;
}

/**
 * @namespace LivePrinter
 * Turns an array of paths (which is an array of points) into LivePrinter commands.
 * @param {Array} paths paths of points to convert
 * @param {Function} func to apply to each point (ex: scaling, offsetting)
 * @returns text string of commands
 */

function paths2code(paths, func) {
    if (func === undefined) func = (x, y) => [x, y]; // passthrough
    let commands = "";
    let minx = 99999;
    let maxx = -99999;
    let miny = 99999;
    let maxy = -99999;

    paths.map(path => {
        if (path && path.length) {
            let pp = path.shift();
            const pp2 = func(parseFloat(pp[0]), parseFloat(pp[1]));
            let prevText = $("#code").val();
            let cmd = `lp.moveto({"x":${pp2[0].toFixed(4)}, "y":${pp2[1].toFixed(4)}});\n`;
            commands += cmd;

            path.map(points => {
                points.map(p => {
                    const xy = func(parseFloat(p[0]), parseFloat(p[1]));
                    maxx = Math.max(xy[0], maxx);
                    minx = Math.min(xy[0], minx);
                    maxy = Math.max(xy[1], maxy);
                    miny = Math.min(xy[1], miny);
                    cmd = `lp.extrudeto({"x":${xy[0].toFixed(4)}, "y":${xy[1].toFixed(4)}});\n`;
                    commands += cmd;
                });
            });
        }
    });

    let bounds = [minx, maxx, miny, maxy];

    commands = `\nlet bounds = [${bounds.toString()}];\n` + commands;

    return commands;
}
