var global, exports;

(function (global) {
    global.scales = {};
    global.majScale = majScale;
    global.minScale = minScale;
    global.cmaj = cmaj;
    global.dmaj = dmaj;
    global.emaj = emaj;
    

    // for ease of use, put in global space?
    global.c0 = 48; //midi 48 

    const majPattern = [0,//root
        2, //1
        4,//3rd
        5,//4
        7,//5
        9,//A
        11,
        12 //root
       ];

    global.scales.majPattern = majPattern;

    function majScale(start = 0, offset = 0) {
        if (start < 0 || offset < 0) {
            throw new Error("note index can't me less than 0!");
        }
        const note = start % majPattern.length;
        const extra = Math.floor(start / majPattern.length);
        const oct = extra + Math.floor(offset / majPattern.length) + 1;
        return majPattern[note] * oct + offset + global.c0;
    }

    function cmaj(index) { return majScale(0, index); }
    function dmaj(index) { return majScale(global.d0, index); }
    function emaj(index) { return majScale(global.e0, index); }

    global.d0 = cmaj(1);
    global.e0 = cmaj(2);
    global.f0 = cmaj(3);
    global.g0 = cmaj(4);

    
    const minPattern = [0,//root
        2, //1
        3,//2rd
        5,//4
        7,//5
        8,//A
        10,
        12 //root
       ];

    global.scales.minPattern = minPattern;

    function minScale(start = 0, offset = 0) {
        if (start < 0 || offset < 0) {
            throw new Error("note index can't me less than 0!");
        }
        const note = start % minPattern.length;
        const extra = Math.floor(start / minPattern.length);
        const oct = extra + Math.floor(offset / minPattern.length) + 1;
        return minPattern[note] * oct + offset + global.c0;
    }


})(global || exports || this);
