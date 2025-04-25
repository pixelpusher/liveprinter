/**
 * Code editing functionality for LivePrinter.
 * @module Editor
 * @typicalname editor
 */

/**
 * JQuery reference
 */
const $ = require("jquery");
import { makeVisualiser } from "vizlib";
import { transpile } from "lp-language";
import * as gridlib from "gridlib";
import { buildEvaluateFunction, evalScope } from "./evaluate.mjs";
import { cleanGCode, Logger } from "liveprinter-utils";
import { clearError, doError, downloadFile, blinkElem } from "./liveprinter.ui";
import Logger from "liveprinter-utils/logger";
import { Note } from "tonal";
const commentRegex = /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm; // https://stackoverflow.com/questions/5989315/regex-for-match-replacing-javascript-comments-both-multiline-and-inline/15123777#15123777

/////-----------------------------------------------------------
/////------grammardraw fractals---------------------------------

import { lp_functionMap as functionMap } from "grammardraw/modules/functionmaps.mjs";
import { createESequence } from "grammardraw/modules/sequences";
import {
  setNoteMods,
  setScales,
  getBaseNoteDuration,
  setBaseNoteDuration,
  step,
  on,
  off,
} from "grammardraw/modules/fractalPath.mjs";

/////-----------------------------------------------------------
/////------grammardraw fractals---------------------------------

/**
 * Log code log to history editor window of choice
 * @param {String} gcode
 *
 */
function recordCode(editor, code) {
  ///
  /// log code to code history window -------------------
  ///

  // add comment with date and time
  const dateStr =
    new Date().toLocaleString("en-US", {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + "\n";

  const codeText = "//" + dateStr + code + (code.endsWith("\n") ? "" : "\n");

  //return [code,lastLine];
}

/**
 * Log GCode log to history window of choice
 * @param {Editor} editor
 * @param {Array | String} gcode
 */

function recordGCode(editor, gcode) {
  // add comment with date and time
  const dateStr =
    new Date().toLocaleString("en-US", {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + "\n";

  const gcodeArray = Array.isArray(gcode) ? gcode : [gcode];
  // ignore temperature or other info commands - no need to save these!
  const usefulGCode = gcodeArray.filter((_gcode) => !/M114|M105/.test(_gcode));

  const doc = editor.getDoc();
  let line = doc.lastLine();
  const pos = {
    line: line,
    ch: doc.getLine(line).length,
  };
  const gcodeText = "\n" + dateStr + usefulGCode.join("\n");
  doc.replaceRange(gcodeText, pos);
  editor.refresh();
  let newpos = { line: doc.lastLine(), ch: doc.getLine(line).length };
  editor.setSelection(pos, newpos);
  editor.scrollIntoView(newpos);

  return usefulGCode;
}

/**
 * This function takes the highlighted "local" code from the editor and runs the compiling and error-checking functions.
 * @param {Editor} editor
 * @param {Function} callback
 * @param {Boolean} immediate If true, run immediately, otherwise schedule to run
 * @returns {Boolean} success
 */
async function runCode(code) {
  // if printer isn't connected, we shouldn't run!
  const printerConnected = $("#header").hasClass("blinkgreen");
  if (!printerConnected) {
    clearError();
    const err = new Error(
      "Printer not connected! Please connect first using the printer settings tab."
    );
    doError(err);
    throw err;
    //TODO: BIGGER ERROR MESSAGE HERE
  } else {
    if (Array.isArray(code)) {
      immediate = false;
    }

    clearError();

    code = code.replace(commentRegex, (match, p1) => {
      return p1;
    });

    // replace globals in js
    code = code.replace(/^[ ]*global[ ]+/gm, "globalThis.");

    Logger.debug("code before pre-processing-------------------------------");
    Logger.debug(code);
    Logger.debug("========================= -------------------------------");

    const results = buildEvaluateFunction(txt, transpile);
    const resultFunction = results.result;
    Logger.debug(
      `Evaluated code[immediate]: ${JSON.stringify(results.code, null, 2)}`
    );

    if (immediate) {
      await resultFunction();
      // console.log( 'editor 1:', txt )
    } else {
      await schedule(resultFunction);
    }

    // blink the form
    blinkElem($("form"));
  }
  return true;
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
 */
function storageAvailable(type) {
  try {
    const storage = window[type],
      x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException &&
      // everything except Firefox
      (e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === "QuotaExceededError" ||
        // Firefox
        e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
      // acknowledge QuotaExceededError only if there's something already stored
      storage.length !== 0
    );
  }
}

export let immediate = false; // immediate evaluation (ignore queue) or add to queue

/**
 * Initialise editors and events, etc.
 * @returns {PromiseFulfilledResult}
 */
export async function initEditors(lp) {
  const jsrules = {
    comments: /(\/\/.*)/g,
    keywords:
      /\b(global|new|if|else|do|while|switch|for|of|continue|break|return|typeof|function|var|const|let|\.length)(?=[^\w])/g,
    numbers: /\b(\d+)/g,
    strings: /(".*?"|'.*?'|\`.*?\`)/g,
  };

  // do the main thing we came here for
  const visualiser = makeVisualiser(lp, "visualiser", {
    title: "LivePrinter2",
    delay: false,
    debug: false,
  });

  // grammardraw -----------------------------------

  const listener = {
    step: (v) => loginfo(`step event: ${v}`),
    action: ({
      noteString,
      noteMidi,
      noteSpeed,
      notesPlayed,
      noteDuration,
      noteDist,
      currentTotalDuration,
      totalSequenceDuration,
      moved,
    }) => {
      loginfo(`action: ${noteMidi},${noteSpeed},${notesPlayed},${noteDuration},${noteDist},
               ${currentTotalDuration}, 
               ${totalSequenceDuration},
               ${moved}}`);
      //    document.getElementById('cur-time').innerHTML = `${currentTotalDuration}s`;
      //    document.getElementById('note-string').innerHTML = `${noteString}`;
    },
    done: (v) => {
      animating = false;
      loginfo(`done event: ${v}`);
      // ???
      // cancelAnimationFrame(animationFrameHandle);
    },
  };

  const midi = Note.midi;
  const transpose = Note.transpose;

  // Note.midi("A4"); // => 60
  // Note.transpose("C4", "5P"); // => "G4"

  const grammarlib = {
    functionMap,
    createESequence,
    setNoteMods,
    setScales,
    getBaseNoteDuration,
    setBaseNoteDuration,
    step,
    on,
    off,
    midi,
    transpose
  };

  // setup listeners

  for (let eventName in listener) {
    on(eventName, listener[eventName]);
  }

  // set up global module and function references
  evalScope({ lp, gridlib, visualiser, Logger, grammarlib });

  const CodeEditor = bitty.create({
    flashColor: "black",
    flashTime: 100,
    value: "code editor",
    el: document.querySelector("#code-editor"),
    rules: jsrules,
  });

  const HistoryCodeEditor = bitty.create({
    flashColor: "black",
    flashTime: 100,
    value: "code editor",
    el: document.querySelector("#history-code-editor"),
    rules: jsrules,
  });

  const editors = [CodeEditor, HistoryCodeEditor];

  // map code evaluation
  editors.map((v) => v.subscribe("run", runCode));

  ///----------------------------------------------------------
  ///------------Examples list---------------------------------
  ///----------------------------------------------------------

  let exList = $("#examples-list > .dropdown-item").not("[id*='session']");
  exList.on("click", async function () {
    const me = $(this);
    const filename = me.data("link");
    clearError(); // clear loading errors
    $.ajax({ url: filename, dataType: "text" })
      .done(function (content) {
        // const newDoc = CodeMirror.Doc(content, "lp");
        // blinkElem($(".CodeMirror"), "slow", () => {
        //     CodeEditor.swapDoc(newDoc);
        //     CodeEditor.refresh();
        //     CodeEditor.on('changes', () => handleChanges(CodeEditor));
        //     CodeEditor.on('blur', () => handleChanges(CodeEditor));
        // });
      })
      .fail(function () {
        doError({ name: "error", message: "file load error:" + filename });
      });
  });

  ///----------------------------------------------------------
  ///------------GUI events------------------------------------
  ///----------------------------------------------------------

  $('a[data-toggle="pill"]').on("shown.bs.tab", function (e) {
    const target = $(e.target).attr("href"); // activated tab
    if (target === "#history-code-editor-area") {
      //HistoryCodeEditor.refresh();
      //setLanguageMode(); // have to update gutter, etc.
      clearError();
    } else if (target === "#code-editor-area") {
      //CodeEditor.refresh();
      //setTimeout(setLanguageMode, 1000); // have to update gutter, etc.
      clearError();
    } else if (target === "#gcode-editor-area") {
      // visualiser
    }
  });

  /// extra compile button
  $("#sendCode").on("click", runCode);

  /// download all code
  $(".btn-download").on("click", async () => {
    // add comment with date and time
    const dateStr =
      "_" +
      new Date().toLocaleString("en-US", {
        hour12: false,
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    await downloadFile(
      CodeEditor.getDoc().getValue(),
      "LivePrinterCode" + dateStr + ".js",
      "text/javascript"
    );
    await downloadFile(
      GCodeEditor.getDoc().getValue(),
      "LivePrinterGCode" + dateStr + ".js",
      "text/javascript"
    );
    await downloadFile(
      HistoryCodeEditor.getDoc().getValue(),
      "LivePrinterHistoryCode" + dateStr + ".js",
      "text/javascript"
    );
  });

  // // set up events
  // editors.map(cm => cm.on("changes", (cm) => handleChanges(cm)));
  // editors.map(cm => cm.on("blur", (cm) => handleChanges(cm)));

  // if (storageAvailable('localStorage')) {
  //     // finally, load the last stored session:
  //     editors.map(cm => reloadSession(cm));
  // }
  // else {
  //     doError({ name: "save error", message: "no local storage available for saving files!" });
  // }

  return;
}
