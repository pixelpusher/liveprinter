//
// for console debugging
//

if (window.Logger === undefined) {
    const Logger = {};

    Logger.DEBUG_LEVEL = {
        error: 0,
        warning: 1,
        info: 2,
        debug: 3
    };

    Logger.debugLevel = Logger.DEBUG_LEVEL.info;

    Logger.log = function (text, level = Logger.debugLevel) {
        if (level <= Logger.debugLevel) {
            console.log(text);
        }
    };

    Logger.info = t => Logger.log(t, Logger.DEBUG_LEVEL.info);
    Logger.debug = t => Logger.log(t, Logger.DEBUG_LEVEL.debug);
    Logger.warning = t => Logger.log(t, Logger.DEBUG_LEVEL.warning);
    Logger.error = t => Logger.log(t, Logger.DEBUG_LEVEL.error);
    window.Logger = Logger;
}

// export
module.exports = window.Logger;