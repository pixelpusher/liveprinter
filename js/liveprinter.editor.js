/**
 * Editor functions
 */

const $ = require('jquery');

const liveprinterUI = require('./liveprinter.ui');
const util = require('./util');

/// Code Mirror stuff
const CodeMirror = require('codemirror');
require('codemirror/mode/css/css');
console.log('css');
require('codemirror/addon/lint/lint');
require('codemirror/addon/lint/css-lint');
console.log('js');
require('jshint');
require('codemirror/mode/javascript/javascript');
require('codemirror/addon/lint/javascript-lint');
require('codemirror/addon/lint/json-lint');
require('codemirror/addon/hint/show-hint');
require('codemirror/addon/hint/javascript-hint');

require('codemirror/addon/mode/overlay');
require('codemirror/addon/scroll/simplescrollbars');

require('codemirror/addon/selection/active-line');
require('codemirror/addon/edit/closebrackets');
require('codemirror/addon/edit/matchbrackets');

require('codemirror/addon/fold/foldgutter');
require('codemirror/addon/fold/indent-fold');
require('codemirror/addon/fold/comment-fold');
require('codemirror/addon/fold/brace-fold');

require('codemirror/addon/dialog/dialog');
require('codemirror/addon/search/searchcursor');

// liveprinter editor linting mode
require('./language/lpmode');

console.log('codemirror loaded');


/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Codemirror:
// https://codemirror.net/doc/manual.html
/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Log code log to history editor window of choice
 * @param {String} gcode 
 */
function recordCode(editor, code) {
    ///
    /// log code to code history window -------------------
    ///

    // add comment with date and time
    const dateStr = (new Date()).toLocaleString('en-US',
        {
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }
    ) + '\n';

    const doc = editor.getDoc();
    let lastLine = doc.getLine(doc.lastLine());
    const pos = {
        "line": doc.lastLine(),
        "ch": lastLine.length
    };
    const codeText = "//" + dateStr + code + (code.endsWith('\n') ? '' : '\n');
    doc.replaceRange(codeText, pos);
    editor.refresh();
    lastLine = doc.getLine(doc.lastLine());
    const newpos = { line: doc.lastLine(), ch: lastLine.length };
    editor.setSelection(pos, newpos);
    editor.scrollIntoView(newpos);
    ///
    /// end logging code to code history window -----------------------------
    ///
    return code;
}

/**
 * Log GCode log to history window of choice
 * @param {Array or String} gcode 
 */

function recordGCode(editor, gcode) {

    // add comment with date and time
    const dateStr = (new Date()).toLocaleString('en-US',
        {
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }
    ) + '\n';

    const gcodeArray = Array.isArray(gcode) ? gcode : [gcode];
    // ignore temperature or other info commands - no need to save these!
    const usefulGCode = gcodeArray.filter(_gcode => !/M114|M105/.test(_gcode));

    const doc = editor.getDoc();
    let line = doc.lastLine();
    const pos = {
        "line": line,
        "ch": doc.getLine(line).length
    };
    const gcodeText = '\n' + dateStr + usefulGCode.join('\n');
    doc.replaceRange(gcodeText, pos);
    editor.refresh();
    let newpos = { line: doc.lastLine(), ch: doc.getLine(line).length };
    editor.setSelection(pos, newpos);
    editor.scrollIntoView(newpos);

    return usefulGCode;
}

/**
 * This function takes the highlighted "local" code from the editor and runs the compiling and error-checking functions.
 * @memberOf LivePrinter
 */
async function runCode(editor, callback) {

    // if printer isn't connected, we shouldn't run!
    const printerConnected = $("#header").hasClass("blinkgreen");
    if (!printerConnected) {
        liveprinterUI.clearError();
        const err = new Error("Printer not connected! Please connect first using the printer settings tab.");
        doError(err);
        throw err;
        //TODO: BIGGER ERROR MESSAGE HERE
    }
    else {

        let code = editor.getSelection();
        const cursor = editor.getCursor();

        if (!code) {
            // info level
            //Logger.log("no selections");
            code = editor.getLine(cursor.line);
            editor.setSelection({ line: cursor.line, ch: 0 }, { line: cursor.line, ch: code.length });
        }
        // blink the form
        liveprinterUI.blinkElem($("form"));

        // run code
        try {
            if (window.codeLine === undefined) window.codeLine = 0;
            window.codeLine++; // increment times we've run code
            await callback(code);
            //await globalEval(code, cursor.line + 1);
        }
        catch (err) {
            err.message = "runCode:" + err.message;
            window.codeLine--; // go back 
            doError(err);
        }
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////
///////////////////// Browser storage /////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////

/**
* Local Storage for saving/loading documents.
* Default behaviour is loading the last edited session.
* @param {String} type type (global key in window object) for storage object 
* @returns {Boolean} true or false, if storage is available
* @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
* @memberOf LivePrinter
*/
function storageAvailable(type) {
    try {
        const storage = window[type],
            x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch (e) {
        return e instanceof DOMException && (
            // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            storage.length !== 0;
    }
}

const editedLocalKey = "editedLoc";
const savedLocalKey = "savedLoc";

const editedHistoryKey = "editedHist";
const savedGlobalKey = "savedHist";


const init = async function () {

    /**
     * CodeMirror code editor instance (local code). See {@link https://codemirror.net/doc/manual.html}
     * @memberOf LivePrinter
     */
    const CodeEditor = CodeMirror.fromTextArea(document.getElementById("code-editor"), {
        lineNumbers: true,
        scrollbarStyle: "simple",
        styleActiveLine: true,
        lineWrapping: true,
        undoDepth: 20,
        highlightAsyncMatches: true,
        tabMode: "indent", // or "spaces", "default", "shift"
        enterMode: "indent", // or "keep", "flat"
        //autocomplete: true,
        extraKeys: {
            "Ctrl-Enter":
                async (cm) =>
                    await runCode(cm,
                        async (code) =>
                            await liveprinterUI.globalEval(recordCode(HistoryCodeEditor, code))
                    ),
            "Shift-Enter": async (cm) =>
                await runCode(cm,
                    async (code) =>
                        await liveprinterUI.globalEval(recordCode(HistoryCodeEditor, code))
                ),
            "Cmd-Enter": async (cm) =>
                await runCode(cm,
                    async (code) =>
                        await liveprinterUI.globalEval(recordCode(HistoryCodeEditor, code))
                ),
            "Ctrl-Space": "autocomplete",
            "Ctrl-Q": function (cm) { cm.foldCode(cm.getCursor()); },
            "Ctrl-\\": (cm) => {
                CodeEditor.off("change");
                CodeEditor.swapDoc(
                    CodeMirror.Doc(
                        "// Type some code here.  Hit CTRL-\\ to clear \n\n\n\n", "javascript"
                    )
                );
                CodeEditor.on("change", localChangeFunc);
            },
        },
        foldGutter: true,
        autoCloseBrackets: true,
        gutters: ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        mode: "lp",
        onLoad: setLanguageMode
        // VIM MODE!
        //keyMap: "vim",
        //matchBrackets: true,
        //showCursorWhenSelecting: true,
        //inputStyle: "contenteditable"
    });
    CodeEditor.setOption("theme", "abcdef");


    //var commandDisplay = document.querySelectorAll('[id|=command-display]');
    //var keys = '';
    //CodeMirror.on(CodeEditor, 'vim-keypress', function (key) {
    //    keys = keys + key;
    //    for (let cd of commandDisplay)
    //        cd.innerHTML = keys;
    //});
    //CodeMirror.on(CodeEditor, 'vim-command-done', function (e) {
    //    keys = '';
    //    for (let cd of commandDisplay)
    //        cd.innerHTML = keys;
    //});


    /**
     * History code CodeMirror editor instance. See {@link https://codemirror.net/doc/manual.html}
     * @namespace CodeMirror
     * @memberOf LivePrinter
     */
    const HistoryCodeEditor = CodeMirror.fromTextArea(document.getElementById("history-code-editor"), {
        lineNumbers: true,
        scrollbarStyle: "simple",
        styleActiveLine: true,
        lineWrapping: true,
        undoDepth: 4, // updated too often for high numbers
        highlightAsyncMatches: true,
        tabMode: "indent", // or "spaces", "default", "shift"
        enterMode: "indent", // or "keep", "flat"
        //autocomplete: true,
        extraKeys: {
            "Ctrl-Enter": async (cm) => await runCode(cm, globalEval), // handles aync
            "Shift-Enter": async (cm) => await runCode(cm, globalEval),
            "Cmd-Enter": async (cm) => await runCode(cm, globalEval),
            "Ctrl-Space": "autocomplete",
            "Ctrl-Q": function (cm) { cm.foldCode(cm.getCursor()); },
            "Ctrl-\\": (cm) => {
                HistoryCodeEditor.off("change");
                HistoryCodeEditor.swapDoc(
                    HistoryCodeEditor.Doc(
                        "// Type some code here.  Hit CTRL-\\ to clear \n\n\n\n", "javascript"
                    )
                );
                HistoryCodeEditor.on("change", historyChangeFunc);
            }
        },
        foldGutter: true,
        autoCloseBrackets: true,
        gutters: ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        mode: "lp",
        theme: "abcdef"
    });

    /**
     * CodeMirror code editor instance (compiled gcode). See {@link https://codemirror.net/doc/manual.html}
     * @memberOf LivePrinter
     */
    const GCodeEditor = CodeMirror.fromTextArea(document.getElementById("gcode-editor"), {
        lineNumbers: true,
        scrollbarStyle: "simple",
        styleActiveLine: true,
        lineWrapping: true,
        undoDepth: 20,
        //autocomplete: true,
        extraKeys: {
            "Ctrl-Enter":
                async (cm) => await runCode(cm,
                    async (gcode) => await liveprinterUI.scheduleGCode(
                        recordGCode(cm, util.cleanGCode(gcode))
                    )
                ), // handles aync
            "Shift-Enter":
                async (cm) => await runCode(cm,
                    async (gcode) => await liveprinterUI.scheduleGCode(
                        recordGCode(cm, util.cleanGCode(gcode))
                    )
                ), // handles aync

            "Cmd-Enter":
                async (cm) => await runCode(cm,
                    async (gcode) => await liveprinterUI.scheduleGCode(
                        recordGCode(cm, util.cleanGCode(gcode))
                    )
                ), // handles aync

            "Ctrl-Space": "autocomplete",
            "Ctrl-Q": function (cm) { cm.foldCode(cm.getCursor()); }
        }
    });


    //
    // Session saving functions for editors
    //

    const localChangeFunc = cm => {
        let txt = cm.getDoc().getValue();
        localStorage.setItem(editedLocalKey, txt);
    };

    const historyChangeFunc = cm => {
        let txt = cm.getDoc().getValue();
        localStorage.setItem(editedHistoryKey, txt);
    };

    CodeEditor.on("change", localChangeFunc);

    HistoryCodeEditor.on("change", historyChangeFunc);

    const reloadLocalSession = () => {
        CodeEditor.off("change");
        let newFile = localStorage.getItem(editedLocalKey);
        if (newFile !== undefined && newFile) {
            liveprinterUI.blinkElem($(".CodeMirror"), "slow", () => {
                CodeEditor.swapDoc(
                    CodeMirror.Doc(
                        newFile, "javascript"
                    )
                );
                CodeEditor.on("change", localChangeFunc);
            });
        }
        CodeEditor.refresh();
    };

    // clear it, only save during session
    const reloadHistorySession = () => {
        HistoryCodeEditor.off("change");
        localStorage.removeItem(editedHistoryKey);
        HistoryCodeEditor.on("change", historyChangeFunc);
        HistoryCodeEditor.refresh();
    };

    $("#reload-edited-session").on("click", reloadLocalSession);

    $("#save-session").on("click", () => {
        CodeEditor.off("change");
        let txt = CodeEditor.getDoc().getValue();
        localStorage.setItem(savedKey, txt);
        liveprinterUI.blinkElem($(".CodeMirror"), "fast", () => {
            CodeEditor.on("change", localChangeFunc);
        });
        // mark as reload-able
        $("#reload-saved-session").removeClass("graylink");
    });

    // start as non-reloadable
    $("#reload-saved-session").addClass("graylink");

    $("#reload-saved-session").on("click", () => {
        CodeEditor.off("change");
        let newFile = localStorage.getItem(savedKey);
        if (newFile !== undefined && newFile) {
            liveprinterUI.blinkElem($(".CodeMirror"), "slow", () => {
                CodeEditor.swapDoc(
                    CodeMirror.Doc(
                        newFile, "javascript"
                    )
                );
                CodeEditor.on("change", localChangeFunc);
            });
        }
    });

    // CodeMirror stuff

    //const WORD = /[\w$]+/g, RANGE = 500;
    /*
    CodeMirror.registerHelper("hint", "anyword", function (editor, options) {
        const word = options && options.word || WORD;
        const range = options && options.range || RANGE;
        const cur = editor.getCursor(), curLine = editor.getLine(cur.line);
        let start = cur.ch, end = start;
        while (end < curLine.length && word.test(curLine.charAt(end)))++end;
        while (start && word.test(curLine.charAt(start - 1)))--start;
        let curWord = start !== end && curLine.slice(start, end);
     
        let list = [], seen = {};
        function scan(dir) {
            let line = cur.line, end = Math.min(Math.max(line + dir * range, editor.firstLine()), editor.lastLine()) + dir;
            for (; line !== end; line += dir) {
                let text = editor.getLine(line), m;
                word.lastIndex = 0;
                while (m = word.exec(text)) {
                    if ((!curWord || m[0].indexOf(curWord) === 0) && !seen.hasOwnProperty(m[0])) {
                        seen[m[0]] = true;
                        list.push(m[0]);
                    }
                }
            }
        }
        scan(-1);
        scan(1);
        return { list: list, from: CodeMirror.Pos(cur.line, start), to: CodeMirror.Pos(cur.line, end) };
    });
    */

    /**
     * Toggle the language mode for livecoding scripts between Javascript and Python.
     * @memberOf LivePrinter
     */
    function setLanguageMode() {

        const pythonMode = $("#python-mode-btn").hasClass('active'); // because it becomes active *after* a push

        if (pythonMode) {
            CodeEditor.setOption("gutters", ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]);
            CodeEditor.setOption("mode", "text/x-python");
            CodeEditor.setOption("lint", true);

            HistoryCodeEditor.setOption("gutters", ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]);
            HistoryCodeEditor.setOption("mode", "text/x-python");
            HistoryCodeEditor.setOption("lint", true);

        } else {
            CodeEditor.setOption("gutters", ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "CodeMirror-foldgutter"]);
            CodeEditor.setOption("mode", "lp");
            CodeEditor.setOption("lint", false);
            //CodeEditor.setOption("lint", {
            //    globalstrict: false,
            //    strict: false,
            //    esversion: 6
            //});

            HistoryCodeEditor.setOption("gutters", ["CodeMirror-lint-markers", "CodeMirror-linenumbers", "CodeMirror-foldgutter"]);
            HistoryCodeEditor.setOption("mode", "lp");
            CodeEditor.setOption("lint", false);
            // HistoryCodeEditor.setOption("lint", {
            //     globalstrict: true,
            //     strict: false,
            //     esversion: 6
            // });
        }
    }

    //
    // python/javascript mode toggle
    //    
    $("#python-mode-btn").on("click", function (e) {
        e.preventDefault();
        const me = $(this);

        // because it becomes active *after* a push
        if (!me.hasClass('active')) {
            me.text("python mode");
        }
        else {
            me.text("javascript mode");
        }
        setLanguageMode(); // update codemirror editor
    });

    ///----------------------------------------------------------
    ///------------Examples list---------------------------------
    ///----------------------------------------------------------

    let exList = $("#examples-list > .dropdown-item").not("[id*='session']");
    exList.on("click", async function () {
        let me = $(this);
        let filename = me.data("link");
        liveprinterUI.clearError(); // clear loading errors
        const jqxhr = $.ajax({ url: filename, dataType: "text" })
            .done(function (content) {
                let newDoc = CodeMirror.Doc(content, "javascript");
                liveprinterUI.blinkElem($(".CodeMirror"), "slow", () => CodeEditor.swapDoc(newDoc));
            })
            .fail(function () {
                doError({ name: "error", message: "file load error:" + filename });
            });
    });


    ///----------------------------------------------------------
    ///------------GUI events------------------------------------
    ///----------------------------------------------------------

    $('a[data-toggle="pill"]').on('shown.bs.tab', function (e) {
        const target = $(e.target).attr("href"); // activated tab
        if (target === "#history-code-editor-area") {
            HistoryCodeEditor.refresh();
            setLanguageMode(); // have to update gutter, etc.
            liveprinterUI.clearError();
        }
        else if (target === "#code-editor-area") {
            CodeEditor.refresh();
            setTimeout(setLanguageMode, 1000); // have to update gutter, etc.
            liveprinterUI.clearError();
        }
        else if (target === "#gcode-editor-area") {
            GCodeEditor.refresh();
        }
    });

    /// extra compile button
    $("#sendCode").on("click", runCode);

    /// download all code
    $(".btn-download").on("click", () => {
        // add comment with date and time
        const dateStr = '_' + (new Date()).toLocaleString('en-US',
            {
                hour12: false,
                year: '2-digit',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }
        );
        liveprinterUI.downloadFile(CodeEditor.getDoc().getValue(), "LivePrinterCode" + dateStr + ".js", 'text/javascript');
        liveprinterUIdownloadFile(GCodeEditor.getDoc().getValue(), "LivePrinterGCode" + dateStr + ".js", 'text/javascript');
        liveprinterUIdownloadFile(HistoryCodeEditor.getDoc().getValue(), "LivePrinterHistoryCode" + dateStr + ".js", 'text/javascript');
    });


    if (storageAvailable('localStorage')) {
        // finally, load the last stored session:
        reloadHistorySession(); // actually, clear it
        reloadLocalSession();
    }
    else {
        liveprinterUIerrorHandler.error({ name: "save error", message: "no local storage available for saving files!" });
    }

    ///
    /// add GCode listener
    printer.addGCodeListener(
        { gcodeEvent: async (gcode) => recordGCode(GCodeEditor, gcode) }
        );

    return;
}

module.exports.init = init;