
// mouse handling functions
scope.mx = 0;
scope.my = 0;
scope.pmx = 0;
scope.pmy = 0;
scope.md = false; // mouse down
scope.pmd = false; // previous mouse down

// add click handler - wrapper for jquery
scope.click = function (func, elem = "undefined") {
    if (elem !== "undefined" || elem) {
        return $(elem).click(func);
    }
    else {
        return $(window).click(func);
    }
};

/**
 * 
 * @param {Function} func function to run when mouse moved
 * @param {any} minDelta minimum mouse distance, under which the function won't be run
 * @example 
 * Example in use:
 * s.mousemove( function(e) {
 *     Logger.log(e);
 *     Logger.log((e.x-e.px) + "," + (e.y-e.py));
 *   }, 20);
 * @memberOf LivePrinter
 */
scope.mousemove = function (func, minDelta = 20) {
    // global mouse functions
    // remove all revious handlers -- might be dangerous?
    $(document).off("mousemove");
    $(document).off("mousedown");

    $(document).mousedown(function (e) {
        scope.pmd = scope.md;
        scope.md = true;
        scope.pmx = e.pageX;
        scope.pmy = e.pageY;

        $(document).mousemove(function (evt) {
            let self = $(this);
            scope.mx = evt.pageX;
            scope.my = evt.pageY;
            let distX = scope.mx - scope.pmx;
            let distY = scope.my - scope.pmy;
            let dist = distX * distX + distY * distY;
            if (minDelta * minDelta < dist) {
                Logger.log("mouse move:" + evt.pageX + "," + evt.pageY);
                func.call(this, {
                    x: scope.mx, y: scope.my,
                    px: scope.pmx, py: scope.pmy,
                    dx: (scope.mx - scope.pmx) / self.width(),
                    dy: (scope.my - scope.pmy) / self.height(),
                    md: scope.md, pmd: scope.pmd
                });
                scope.pmx = evt.pageX;
                scope.pmy = evt.pageY;
            }
        });
    });
    $(document).mouseup(function (e) {
        scope.pmd = scope.md;
        scope.md = false;
        $(document).off("mousemove");
    });
};
