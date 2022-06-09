import { Logger  } from "liveprinter-utils";

const logger = new Logger();

const nearley = require('nearley'); // grammar parser
const grammar = require('./lpgrammar');

// in code, find blocks inside ## ## and feed to grammar

const grammarBlockRegex = /\#\#\s*([^\#][\w\d\s\(\)\{\}\.\,\|\:\"\'\+\-\/\*]+)\s*\#\#\s*/gm;

const grammarOneLineRegex = /\s*\#{1,}\s*([^\#][\w\d\ \t\(\)\{\}\.\,\|\:\"\'\+\-\/\*]+)[\ \t]*(\#?)\s*/gm;

function compile(code) {

    // Create a Parser object from our grammar.
    // global var grammar created by /static/lib/nearley/lpgrammar.js
    // global var nearley created by /static/lib/nearley/nearley.js



    //
    // try block element grammar replacement FIRST because one-liner matches part
    //
    //code = code.replace(/([\r\n]+)/gm, "|").substring(^\s*(\|), "").replace(grammarFinderRegex, (match, p1) => {
    // TODO: fix multiline (split?)

    const blockparser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar)); // parser for entire block

    code = code.replace(grammarBlockRegex, (match, p1) => {
        //logger.log("Match: " + p1);

        let result = "";
        let lines = p1.split(/[\r\n]/);

        lines.map((line) => {
            // get ride of remaining line breaks and leading spaces
            line = line.replace(/([\r\n]+)/gm, "").replace(/(^[\s]+)/, "");
            if (line.length === 0) {
                return;
            } else {
                // errors bubble up to calling function
                blockparser.feed(line + '\n'); // EOL terminates command
            }
        }); // end compiling line by line

        result += blockparser.results[0];

        return ' ' + result + "\n"; // need leading space
    });

    logger.log("code AFTER block-grammar processing -------------------------------");
    logger.log(code);
    logger.log("========================= -------------------------------");


    //
    // try one liner grammar replacement
    //
    let grammarFound = false; // if this line contains the lp grammar
    // note: p3 is the optional trailing # that can be ignored
    code = code.replace(grammarOneLineRegex, (match, p1, p2) => {
        const lineparser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

        //logger.log("!!!"+match+"!!!");
        //logger.log("!!!"+p2+"!!!");
        grammarFound = true; // found!
        let result = "";
        let fail = false; // if not successful
        // .replace(/(^[\s]+)/, "")
        let line = p1.replace(/([\r\n]+)/gm, "").replace(/([\s]+)$/, "");

        //logger.log("LINE::" + line + "::LINE");
        if (line) {
                lineparser.feed(line + '\n');
                //result += "/*ERROR IN PARSE: [" + fail + "] + offending code: [" + line + "]" + "*/\n";
            
                result = lineparser.results[0];
                //logger.log(result);
        }
        return ' ' + result;
    });

    logger.log("code AFTER one-line-grammar processing -------------------------------");
    logger.log(code);
    logger.log("========================= -------------------------------");
 
    return code;
}

module.exports = compile;
