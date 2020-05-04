"use strict";

window.$ = window.jquery = require('jquery');

const fext = require('./fext'); // recursion library

const Vector = require ('./util').Vector;
const scales = require ('./util').scales;

const repeat = require ('./util').repeat;
const numrange = require ('./util').numrange;
const countto = require ('./util').countto;

const editors = require('./liveprinter.editor');
const liveprinterComms = require('./liveprinter.ui');

console.log(scales.majPattern);

//require('./svg/SVGReader'); // svg util class
//require('./svg/svg2gcode'); // svg gcode converter


(async function (w) {
    "use strict";

    await $.ready();

    await repeat(2, async(n) => console.log(n));

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

    await editors.init();
    await liveprinterComms.start();

})(global).catch(err => {
    console.error(err);
});
