/**
 * 
 * @param {Number} bpm beats per minute
 * @returns {Number} time in ms for a single beat 
 */
function beatLen(bpm) {
    return 60000/bpm; // 60000 ms per minute
}


const majPattern = [0,//root
    2, //1
    4,//3rd
    5,//4
    7,//5
    9,//A
    11,
    12 //root
];


function majScale(start = 0, offset = 0) {
    if (start < 0 || offset < 0) {
        throw new Error("note index can't me less than 0!");
    }
    const note = start % majPattern.length;
    const extra = Math.floor(start / majPattern.length);
    const oct = extra + Math.floor(offset / majPattern.length) + 1;
    return majPattern[note] * oct + offset + exports.c0;
}

function cmaj(index) { return majScale(0, index); }
function dmaj(index) { return majScale(exports.d0, index); }
function emaj(index) { return majScale(exports.e0, index); }

exports.c0 = 48; //midi 48 
exports.d0 = cmaj(1);
exports.e0 = cmaj(2);
exports.f0 = cmaj(3);
exports.g0 = cmaj(4);

const minPattern = [0,//root
    2, //1
    3,//2rd
    5,//4
    7,//5
    8,//A
    10,
    12 //root
];

function minScale(start = 0, offset = 0) {
    if (start < 0 || offset < 0) {
        throw new Error("note index can't me less than 0!");
    }
    const note = start % minPattern.length;
    const extra = Math.floor(start / minPattern.length);
    const oct = extra + Math.floor(offset / minPattern.length) + 1;
    return minPattern[note] * oct + offset + exports.c0;
}

exports.majPattern = majPattern;
exports.minPattern = minPattern;
exports.majScale = majScale;
exports.minScale = minScale;
exports.cmaj = cmaj;
exports.dmaj = dmaj;
exports.emaj = emaj;
