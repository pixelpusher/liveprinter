// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

// This version by Evan Raskob <evan@flkr.com> for LivePrinter

// Highlighting text that matches the selection
//
// Defines an option highlightSelectionMatches, which, when enabled,
// will style strings that match the selection throughout the
// document.
//
// The option can be set to true to simply enable it, or to a
// {minChars, style, wordsOnly, showToken, delay} object to explicitly
// configure it. minChars is the minimum amount of characters that should be
// selected for the behavior to occur, and style is the token style to
// apply to the matches. This will be prefixed by "cm-" to create an
// actual CSS class name. If wordsOnly is enabled, the matches will be
// highlighted only if the selected text is a word. showToken, when enabled,
// will cause the current token to be highlighted when nothing is selected.
// delay is used to specify how much time to wait, in milliseconds, before
// highlighting the matches. If annotateScrollbar is enabled, the occurences
// will be highlighted on the scrollbar via the matchesonscrollbar addon.

(function (mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
        mod(require("./codemirror"), require("./addon/search/matchesonscrollbar"));
    else if (typeof define == "function" && define.amd) // AMD
        define(["./codemirror", "./addon/search/matchesonscrollbar"], mod);
    else // Plain browser env
        mod(CodeMirror);
})(function (CodeMirror) {
    "use strict";

    var defaults = {
        style: "matchhighlight",
        delay: 100,
        annotateScrollbar: false,
        trim: true
    };

    const asyncFunctionsInAPIRegex = /[\.|;|\s*](setRetractSpeed|sendFirmwareRetractSettings|retract|unretract|start|temp|bed|fan|go|fwretract|polygon|rect|extrudeto|sendExtrusionGCode|extrude|move|moveto|fillDirection|fillDirectionH|sync|fill|wait|pause|resume|printPaths|printPathsThick|_extrude)\(/g;

    function State(options) {
        this.options = {};
        for (var name in defaults)
            this.options[name] = (options && options.hasOwnProperty(name) ? options : defaults)[name]
        this.overlay = this.timeout = null;
        this.matchesonscroll = null;
        this.active = false;
    }

    CodeMirror.defineOption("highlightAsyncMatches", false, function (cm, val, old) {
        if (old && old != CodeMirror.Init) {
            removeOverlay(cm);
            clearTimeout(cm.state.asyncmatchHighlighter.timeout);
            cm.state.asyncmatchHighlighter = null;
            cm.off("cursorActivity", cursorActivity);
            cm.off("focus", onFocus);
        }
        if (val) {
            var state = cm.state.asyncmatchHighlighter = new State(val);
            if (cm.hasFocus()) {
                state.active = true;
                highlightMatches(cm);
            } else {
                cm.on("focus", onFocus);
            }
            cm.on("cursorActivity", cursorActivity);
        }
    });

    function cursorActivity(cm) {
        var state = cm.state.asyncmatchHighlighter;
        if (state.active || cm.hasFocus()) scheduleHighlight(cm, state)
    }

    function onFocus(cm) {
        var state = cm.state.asyncmatchHighlighter;
        if (!state.active) {
            state.active = true;
            scheduleHighlight(cm, state);
        }
    }

    function scheduleHighlight(cm, state) {
        clearTimeout(state.timeout);
        state.timeout = setTimeout(function () { highlightMatches(cm); }, state.options.delay);
    }

    function addOverlay(cm, style) {
        var state = cm.state.asyncmatchHighlighter;
        cm.addOverlay(state.overlay = makeOverlay(style));
        //state.matchesonscroll = cm.showMatchesOnScrollbar({ className: "CodeMirror-selection-highlight-scrollbar" });
    }

    function removeOverlay(cm) {
        var state = cm.state.asyncmatchHighlighter;
        if (state.overlay) {
            cm.removeOverlay(state.overlay);
            state.overlay = null;
            if (state.matchesonscroll) {
                state.matchesonscroll.clear();
                state.matchesonscroll = null;
            }
        }
    }

    function highlightMatches(cm) {
        cm.operation(function () {
            var state = cm.state.asyncmatchHighlighter;
            removeOverlay(cm);

            addOverlay(cm, state.options.style);
        });
    }

    function makeOverlay(style) {
        return {
            token: function (stream) {
                asyncFunctionsInAPIRegex.lastIndex = stream.pos;
                var match = asyncFunctionsInAPIRegex.exec(stream.string);
                if (match) {
                    stream.pos = match.index;
                    return style;
                } else {
                    stream.next();
                    //stream.skipToEnd();
                }
            }
        };
    }
});
