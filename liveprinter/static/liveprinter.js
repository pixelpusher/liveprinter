// LIVEPRINTER - a livecoding system for live CNC manufacturing 
//-------------------------------------------------------------
// Copyright 2018 Evan Raskob
//
// Licensed under the GNU Affero 3.0 License (the "License"); you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
//     https://www.gnu.org/licenses/gpl-3.0.en.html
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

(function () {
    "use strict";

    $(document).ready(function () {
        if (!window.console) window.console = {};
        if (!window.console.log) window.console.log = function () { };


        //////////////////////////////////////////////////////////////////////////////////////////
        // Codemirror:
        // https://codemirror.net/doc/manual.html
        //////////////////////////////////////////////////////////////////////////////////////////

        // config options
        //CodeMirror.defaults.value = "\n\n\n";
        CodeMirror.defaults.lineWrapping = true;
        CodeMirror.defaults.lineNumbers = true;
        //CodeMirror.defaults.autofocus = true;
        CodeMirror.defaults.undoDepth = 100;

        var ed_trigger = function (ed) {
            parseCode();
            //console.log("trigger", line);
        };

        // start CodeMirror
        var CodeEditor = CodeMirror.fromTextArea(document.getElementById("gcode_input"), {
            lineNumbers: true,
            styleActiveLine: true,
            lineWrapping: true,
            mode: "htmlmixed",
            extraKeys: {
                "Ctrl-Enter": ed_trigger,
                "Cmd-Enter": ed_trigger,
            }
        });
        CodeEditor.on('change', function (editor, changeObj) {
            // info
            //for (var p in changeObj)
            //    console.log("change[" + p + "]=" + changeObj[p]);

            // check syntax
            if (changeObj["text"] || changeObj["removed"]) {
                clearError();
                parseCode();
            }
        });
    

        // borrowed from https://github.com/cncjs/gcode-parser/blob/master/src/index.js (MIT License)
        // See http://linuxcnc.org/docs/html/gcode/overview.html#gcode:comments
        // Comments can be embedded in a line using parentheses () or for the remainder of a lineusing a semi-colon. The semi-colon is not treated as the start of a comment when enclosed in parentheses.
        const stripComments = (() => {
            const re1 = new RegExp(/\s*\([^\)]*\)/g); // Remove anything inside the parentheses
            const re2 = new RegExp(/\s*;.*/g); // Remove anything after a semi-colon to the end of the line, including preceding spaces
            //const re3 = new RegExp(/\s+/g);
            return (line => line.replace(re1, '').replace(re2, '')); //.replace(re3, ''));
        })();

        //if (!lines) return;
        //gcode = [];
        //var i;
        //for (i = 0; i < lines.length; i++) {
        //    if (lines[i].match(/^(G0|G1|G90|G91|G92|M82|M83|G28)/i)) gcode.push(lines[i]);
        //}
        //lines = [];

        function sendGCode(text) {
            var gcode = stripComments(text);

            var message = {
                'jsonrpc': '2.0',
                'id': 1,
                'method': 'gcode',
                'params': [gcode],
            };

            var message_json = JSON.stringify(message);
            // debugging
            console.log(message_json);

            updater.socket.send(message_json);
        }

 
        function newMessage(form) {
            var line = CodeEditor.getLine(CodeEditor.getCursor().line)
    
            console.log("trigger", line);
        
            sendGCode(line);
        }

        var updater = {
            socket: null,

            start: function () {
                var url = "ws://" + location.host + "/json";
                updater.socket = new WebSocket(url);
                console.log('opening socket');
                updater.socket.onmessage = function (event) {
                    updater.showMessage(JSON.parse(event.data));
                }
            },

            showMessage: function (message) {
                var existing = $("#m" + message.id);
                if (existing.length > 0) return;
                var node = $(message.html);
                node.hide();
                $("#inbox").append(node);
                node.slideDown();
            }
        };


        // CodeMirror stuff

        var WORD = /[\w$]+/g, RANGE = 500;

        CodeMirror.registerHelper("hint", "anyword", function (editor, options) {
            var word = options && options.word || WORD;
            var range = options && options.range || RANGE;
            var cur = editor.getCursor(), curLine = editor.getLine(cur.line);
            var start = cur.ch, end = start;
            while (end < curLine.length && word.test(curLine.charAt(end)))++end;
            while (start && word.test(curLine.charAt(start - 1)))--start;
            var curWord = start != end && curLine.slice(start, end);

            var list = [], seen = {};
            function scan(dir) {
                var line = cur.line, end = Math.min(Math.max(line + dir * range, editor.firstLine()), editor.lastLine()) + dir;
                for (; line != end; line += dir) {
                    var text = editor.getLine(line), m;
                    word.lastIndex = 0;
                    while (m = word.exec(text)) {
                        if ((!curWord || m[0].indexOf(curWord) == 0) && !seen.hasOwnProperty(m[0])) {
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

        /**
         * JS-Interpreter stuff (modified from https://github.com/NeilFraser/JS-Interpreter)
         * 
         * */
        var myInterpreter;

        function initFuncs(interpreter, scope) {
            var wrapper = function (text) {
                return alert(arguments.length ? text : '');
            };
            interpreter.setProperty(scope, 'alert',
                interpreter.createNativeFunction(wrapper));

             wrapper = function (text) {
                sendGCode(text);
                console.log("sent gcode: " + text)
            };
            interpreter.setProperty(scope, 'sendGCode',
                interpreter.createNativeFunction(wrapper));

        }

        function clearError() {
            document.getElementById("errors").innerHTML = "<p>...</p>";
        }

        function doError(e) {
            // report to user
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SyntaxError
            document.getElementById("errors").innerHTML = "<p>" + e.name + ":" + e.message + "(line:" + e.lineNumber + " / col: " + e.columnNumber + "</p>";
            console.log("SyntaxError? " + (e instanceof SyntaxError)); // true
            console.log(e); // true
            console.log("SyntaxError? " + (e instanceof SyntaxError)); // true
            console.log("ReferenceError? " + (e instanceof ReferenceError)); // true
            console.log(e.message);                // "missing ; before statement"
            console.log(e.name);                   // "SyntaxError"
            console.log(e.fileName);               // "Scratchpad/1"
            console.log(e.lineNumber);             // 1
            console.log(e.columnNumber);           // 4
            console.log(e.stack);                  // "@Scratchpad/1:2:3\n"
            if (e.lineNumber) {
                CodeEditor.setSelection({ line: e.lineNumber, ch: e.columnNumber }, { line: e.lineNumber, ch: e.columnNumber + 1 });
            }
        }
        function parseCode() {
            var code = CodeEditor.getSelection();
            if (!code) {
                // info level
                console.log("no selections");
                code = CodeEditor.getValue();
            }
            try {
                myInterpreter = new Interpreter(code, initFuncs);
            } catch (e) {
                doError(e);
            }
            disable('');
        }

        function stepCode() {
            if (myInterpreter.stateStack.length) {
                var node =
                    myInterpreter.stateStack[myInterpreter.stateStack.length - 1].node;
                var start = node.start;
                var end = node.end;
            } else {
                var start = 0;
                var end = 0;
            }
            console.log("start:" + start + " end:" + end);

            CodeEditor.setSelection({ line: start, ch: 0 }, { line: end, ch: 0 });
            
            try {
                var ok = myInterpreter.step();

            } catch (e) {
                doError(e);
            } finally {
                if (!ok) {
                    disable('disabled');
                }
            }
        }

        function runCode() {
            disable('disabled');
            try {
                myInterpreter.run();
            } catch (e) {
                doError(e);
            }
        }

        function disable(disabled) {
            document.getElementById('stepButton').disabled = disabled;
            document.getElementById('runButton').disabled = disabled;
        }

        document.getElementById("parseButton").onclick = parseCode;
        document.getElementById("stepButton").onclick = stepCode;
        document.getElementById("runButton").onclick = runCode;


        $("#gcodeform").on("submit", function () {
            newMessage($(this));
            return false;
        });

        $("#gcode").select();
        updater.start();
    });
})();