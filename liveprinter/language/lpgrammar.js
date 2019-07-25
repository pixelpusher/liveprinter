// Generated automatically by nearley, version 2.16.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "Main$ebnf$1", "symbols": ["EOL"]},
    {"name": "Main$ebnf$1", "symbols": ["Main$ebnf$1", "EOL"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Main", "symbols": ["Chain", "Main$ebnf$1", "Space", "Main"], "postprocess": d => [d[0]].concat(d[3]).join(";")},
    {"name": "Main$ebnf$2", "symbols": ["EOL"], "postprocess": id},
    {"name": "Main$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Main", "symbols": ["Chain", "Space", "Main$ebnf$2"], "postprocess": d => d[0] + ';'},
    {"name": "Chain", "symbols": ["Statement", "Space", "PIPE", "Space", "Chain"], "postprocess": d => [d[0]].concat(d[4]).join(".")},
    {"name": "Chain$ebnf$1", "symbols": ["PIPE"], "postprocess": id},
    {"name": "Chain$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Chain", "symbols": ["Statement", "Space", "Chain$ebnf$1"], "postprocess": d => d[0]},
    {"name": "Statement$subexpression$1", "symbols": ["Number"], "postprocess": id},
    {"name": "Statement$subexpression$1", "symbols": ["ObjArg"], "postprocess": id},
    {"name": "Statement$subexpression$1", "symbols": ["FunctionName"], "postprocess": id},
    {"name": "Statement$subexpression$1", "symbols": ["FunctionStatement"], "postprocess": id},
    {"name": "Statement", "symbols": ["Statement$subexpression$1"], "postprocess": id},
    {"name": "FunctionStatement$subexpression$1", "symbols": ["FunctionName", "_"], "postprocess": d => d[0]},
    {"name": "FunctionStatement$subexpression$2", "symbols": ["ObjArgs"], "postprocess":  
        function ([args]) {
        	let fstr = name + "({";
        	if (typeof args !== "string" ) {				
        		for (let i=0; i<args.length; i++) {
        			let vname = args[i];
        			fstr += vname;
        			if (i - (args.length-1)) fstr += ",";
        		}
        	}
        	else fstr += args;
        	fstr += "})";
        	return fstr;
        }
        },
    {"name": "FunctionStatement$subexpression$2", "symbols": ["Numbers"], "postprocess":  
        function (args) {
        	let fstr = name + "(";
        	if (args.length) {
        		for (let i=0; i<args.length; i++) {
        			let vname = args[i];
        			fstr += vname;
        			if (i - (args.length-1)) fstr += ",";
        		}
        		fstr += ")"
        	}
        	return fstr;
        }
        },
    {"name": "FunctionStatement", "symbols": ["FunctionStatement$subexpression$1", "FunctionStatement$subexpression$2"], "postprocess": ([name, args]) => name + args},
    {"name": "FunctionName$ebnf$1", "symbols": []},
    {"name": "FunctionName$ebnf$1", "symbols": ["FunctionName$ebnf$1", "AnyValidCharacter"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "FunctionName", "symbols": ["Letter", "FunctionName$ebnf$1"], "postprocess": ([first, second]) => first + second.join('')},
    {"name": "Numbers", "symbols": ["Number", "Spaces", "Numbers"], "postprocess": ([num, ws, numbers]) => [num].concat(numbers)},
    {"name": "Numbers", "symbols": ["Number"], "postprocess": id},
    {"name": "ObjArgs", "symbols": ["ObjArg", "Spaces", "ObjArgs"], "postprocess": ([arg, ws, args]) => [arg].concat(args)},
    {"name": "ObjArgs", "symbols": ["ObjArg"], "postprocess": id},
    {"name": "ObjArg$ebnf$1", "symbols": ["Letter"]},
    {"name": "ObjArg$ebnf$1", "symbols": ["ObjArg$ebnf$1", "Letter"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ObjArg", "symbols": ["ObjArg$ebnf$1", "Space", "ArgSeparator", "Space", "ArgValue"], "postprocess": ([argname, ws1, separator, ws2, argVal]) => argname.join('') + separator + argVal},
    {"name": "ArgValue$subexpression$1$ebnf$1", "symbols": ["Letter"]},
    {"name": "ArgValue$subexpression$1$ebnf$1", "symbols": ["ArgValue$subexpression$1$ebnf$1", "Letter"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ArgValue$subexpression$1", "symbols": ["ArgValue$subexpression$1$ebnf$1"], "postprocess": d=> d.join('')},
    {"name": "ArgValue$subexpression$1", "symbols": ["Number"], "postprocess": id},
    {"name": "ArgValue", "symbols": ["ArgValue$subexpression$1"]},
    {"name": "Number", "symbols": ["Integer"], "postprocess": id},
    {"name": "Number", "symbols": ["Float"], "postprocess": id},
    {"name": "Float$subexpression$1", "symbols": ["Zero"]},
    {"name": "Float$subexpression$1", "symbols": ["Integer"]},
    {"name": "Float$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "Float$ebnf$1", "symbols": ["Float$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Float", "symbols": ["Float$subexpression$1", {"literal":"."}, "Float$ebnf$1"], "postprocess": ([num1, dot, num2]) => num1 + dot + num2.join('')},
    {"name": "Integer", "symbols": ["Zero"]},
    {"name": "Integer$ebnf$1", "symbols": []},
    {"name": "Integer$ebnf$1", "symbols": ["Integer$ebnf$1", "Digit"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Integer", "symbols": ["NonzeroNumber", "Integer$ebnf$1"], "postprocess": ([num1, num2]) => num1 + num2.join('')},
    {"name": "ArgSeparator", "symbols": [{"literal":":"}]},
    {"name": "Zero", "symbols": [{"literal":"0"}]},
    {"name": "AnyValidCharacter", "symbols": ["Letter"]},
    {"name": "AnyValidCharacter", "symbols": ["UsableCharacter"]},
    {"name": "AnyValidCharacter", "symbols": ["Digit"]},
    {"name": "UsableCharacter", "symbols": [/[\$\£\&\^\*\`\.]/]},
    {"name": "Letter", "symbols": [/[a-zA-Z]/]},
    {"name": "Digit", "symbols": [/[0-9]/]},
    {"name": "NonzeroNumber", "symbols": [/[1-9]/]},
    {"name": "ObjectLeftBrace", "symbols": [{"literal":"{"}]},
    {"name": "ObjectRightBrace", "symbols": [{"literal":"}"}]},
    {"name": "EOLPIPE", "symbols": ["EOL"]},
    {"name": "EOLPIPE", "symbols": ["PIPE"], "postprocess": function(d) {return null }},
    {"name": "PIPE", "symbols": [{"literal":"|"}]},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null }},
    {"name": "__$ebnf$1", "symbols": [/[\s]/]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", /[\s]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(d) {return null }},
    {"name": "EOL", "symbols": [/[\r\n]/], "postprocess": function(d) {return null }},
    {"name": "Space$ebnf$1", "symbols": []},
    {"name": "Space$ebnf$1", "symbols": ["Space$ebnf$1", /[ ]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Space", "symbols": ["Space$ebnf$1"], "postprocess": function(d) {return null }},
    {"name": "Spaces$ebnf$1", "symbols": [/[ ]/]},
    {"name": "Spaces$ebnf$1", "symbols": ["Spaces$ebnf$1", /[ ]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Spaces", "symbols": ["Spaces$ebnf$1"], "postprocess": function(d) {return null }}
]
  , ParserStart: "Main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
