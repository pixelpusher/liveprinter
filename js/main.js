"use strict";

window.$ = window.jquery = require('jquery');

const fext = require('./fext'); // recursion library

const Vector = require ('./util').Vector;
const scales = require ('./util').scales;

const repeat = require ('./util').repeat;
window.repeat = repeat;

const numrange = require ('./util').numrange;
window.numrange = numrange;

const countto = require ('./util').countto;
window.countto = countto;

const Printer = require('./liveprinter.printer'); // printer API object

// liveprinter object
const printer = new Printer();

if (window.printer) delete window.printer;
window.printer = printer; // make available to all scripts later on, pollutes but oh well... FIXME

const editors = require('./liveprinter.editor'); // code editors and functions

const liveprinterComms = require('./liveprinter.ui'); // main ui and server comms

//console.log(scales.majPattern); // test

//require('./svg/SVGReader'); // svg util class
//require('./svg/svg2gcode'); // svg gcode converter

(async function (w) {
    "use strict";

    await $.ready();

    //await repeat(2, async(n) => console.log(n)); // test func

    if (!window.console) {
        window.console = {
            __log: [],
            get _log() { return this.__log; },
            log: function (text) { this._log.push(text); },
            getLog: function () { return this._log; }
        };
    }

    require('popper.js'); // for bootstrap
    var bootstrap = require('bootstrap');

    await editors.init(); // create editors and setup live editing functions
    await liveprinterComms.start(); // start server communications and setup UI

})(global).catch(err => {
    console.error(err);
});
