// Generated automatically by nearley, version 2.18.0
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
    {"name": "Chain", "symbols": ["FunctionStatement", "Space", "PIPE", "Space", "Chain"], "postprocess": d => [d[0]].concat(d[4]).join(".")},
    {"name": "Chain$ebnf$1", "symbols": ["PIPE"], "postprocess": id},
    {"name": "Chain$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Chain", "symbols": ["FunctionStatement", "Space", "Chain$ebnf$1"], "postprocess": d => d[0]},
    {"name": "FunctionStatement$subexpression$1", "symbols": ["FunctionName"], "postprocess": ([name]) => name + "("},
    {"name": "FunctionStatement$ebnf$1$subexpression$1$subexpression$1", "symbols": ["ObjArgs"], "postprocess":  
        function ([args]) {
        	let fstr = "{";
        	if (typeof args !== "string" ) {				
        		for (let i=0; i<args.length; i++) {
        			let vname = args[i];
        			fstr += vname;
        			if (i - (args.length-1)) fstr += ",";
        		}
        	}
        	else fstr += args;
        	fstr += "}";
        	return fstr;
        }
        },
    {"name": "FunctionStatement$ebnf$1$subexpression$1$subexpression$1", "symbols": ["AnyArgs"], "postprocess":  
        function ([args]) {
        	let fstr = "";
        	if (args.length) {
        		for (let i=0; i<args.length; i++) {
        			let vname = args[i];
        			fstr += vname;
        			if (i - (args.length-1)) fstr += ",";
        		}
        	}
        	return fstr;
        }
        },
    {"name": "FunctionStatement$ebnf$1$subexpression$1", "symbols": ["Spaces", "FunctionStatement$ebnf$1$subexpression$1$subexpression$1"], "postprocess": d => { let str=""; for (let dd of d) { if (dd) str+=dd}; return str; }},
    {"name": "FunctionStatement$ebnf$1", "symbols": ["FunctionStatement$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "FunctionStatement$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "FunctionStatement", "symbols": ["FunctionStatement$subexpression$1", "FunctionStatement$ebnf$1"], "postprocess": d => d.join('') + ")"},
    {"name": "FunctionName", "symbols": ["PlainVariable"]},
    {"name": "FunctionName", "symbols": ["ObjectVariable"], "postprocess": id},
    {"name": "AnyArgs", "symbols": ["AnyArg", "Spaces", "AnyArgs"], "postprocess": ([arg, ws, args]) => [arg].concat(args)},
    {"name": "AnyArgs", "symbols": ["AnyArg"], "postprocess": id},
    {"name": "ObjArgs", "symbols": ["ObjArg", "Spaces", "ObjArgs"], "postprocess": ([arg, ws, args]) => [arg].concat(args)},
    {"name": "ObjArgs", "symbols": ["ObjArg"], "postprocess": id},
    {"name": "ObjArg$ebnf$1", "symbols": ["Letter"]},
    {"name": "ObjArg$ebnf$1", "symbols": ["ObjArg$ebnf$1", "Letter"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ObjArg", "symbols": ["ObjArg$ebnf$1", "Space", "ArgSeparator", "Space", "AnyArg"], "postprocess": ([argname, ws1, separator, ws2, argVal]) => argname.join('') + separator + argVal},
    {"name": "AnyArg", "symbols": ["AnyVar"]},
    {"name": "AnyArg", "symbols": ["ParenthesisStatement"]},
    {"name": "AnyArg", "symbols": ["StringLiteral"]},
    {"name": "AnyArg", "symbols": ["MathFunc"]},
    {"name": "MathFunc", "symbols": ["AnyVar", "Space", "MathOps", "Space", "AnyVar"], "postprocess": ([var1,sp1,op,sp2,var2]) => ("" + var1 + op + var2)},
    {"name": "AnyVar", "symbols": ["Number"]},
    {"name": "AnyVar", "symbols": ["PlainVariable"]},
    {"name": "AnyVar", "symbols": ["ObjectVariable"]},
    {"name": "ObjectVariable", "symbols": ["PlainVariable", "DOT", "PlainVariable"], "postprocess": ([pv1, dot, pv2])=> pv1 + dot + pv2},
    {"name": "PlainVariable$ebnf$1", "symbols": []},
    {"name": "PlainVariable$ebnf$1", "symbols": ["PlainVariable$ebnf$1", "AnyValidCharacter"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "PlainVariable", "symbols": ["CharOrLetter", "PlainVariable$ebnf$1"], "postprocess": ([first, second])=> first + second.join('')},
    {"name": "StringLiteral$ebnf$1$subexpression$1", "symbols": ["AnyValidCharacter"]},
    {"name": "StringLiteral$ebnf$1$subexpression$1", "symbols": ["DOT"]},
    {"name": "StringLiteral$ebnf$1$subexpression$1", "symbols": [/[()\s]/]},
    {"name": "StringLiteral$ebnf$1", "symbols": ["StringLiteral$ebnf$1$subexpression$1"]},
    {"name": "StringLiteral$ebnf$1$subexpression$2", "symbols": ["AnyValidCharacter"]},
    {"name": "StringLiteral$ebnf$1$subexpression$2", "symbols": ["DOT"]},
    {"name": "StringLiteral$ebnf$1$subexpression$2", "symbols": [/[()\s]/]},
    {"name": "StringLiteral$ebnf$1", "symbols": ["StringLiteral$ebnf$1", "StringLiteral$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "StringLiteral", "symbols": ["QUOTE", "StringLiteral$ebnf$1", "QUOTE"], "postprocess": ([lquote, statement, rquote]) => lquote + statement.join('') + rquote},
    {"name": "Number", "symbols": ["Integer"], "postprocess": id},
    {"name": "Number", "symbols": ["Float"], "postprocess": id},
    {"name": "Float$subexpression$1", "symbols": ["Zero"]},
    {"name": "Float$subexpression$1", "symbols": ["Integer"]},
    {"name": "Float$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "Float$ebnf$1", "symbols": ["Float$ebnf$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Float", "symbols": ["Float$subexpression$1", {"literal":"."}, "Float$ebnf$1"], "postprocess": ([num1, dot, num2]) => num1 + dot + num2.join('')},
    {"name": "Integer", "symbols": ["Zero"]},
    {"name": "Integer$ebnf$1", "symbols": [{"literal":"-"}], "postprocess": id},
    {"name": "Integer$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Integer$ebnf$2", "symbols": []},
    {"name": "Integer$ebnf$2", "symbols": ["Integer$ebnf$2", "Digit"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "Integer", "symbols": ["Integer$ebnf$1", "NonzeroNumber", "Integer$ebnf$2"], "postprocess": ([sign, num1, num2]) => (sign ? "-" : "") + num1 + num2.join('')},
    {"name": "ParenthesisStatement$ebnf$1$subexpression$1", "symbols": ["AnyValidCharacter"]},
    {"name": "ParenthesisStatement$ebnf$1$subexpression$1", "symbols": ["DOT"]},
    {"name": "ParenthesisStatement$ebnf$1$subexpression$1", "symbols": ["MathOps"]},
    {"name": "ParenthesisStatement$ebnf$1$subexpression$1", "symbols": [/[()\s]/]},
    {"name": "ParenthesisStatement$ebnf$1", "symbols": ["ParenthesisStatement$ebnf$1$subexpression$1"]},
    {"name": "ParenthesisStatement$ebnf$1$subexpression$2", "symbols": ["AnyValidCharacter"]},
    {"name": "ParenthesisStatement$ebnf$1$subexpression$2", "symbols": ["DOT"]},
    {"name": "ParenthesisStatement$ebnf$1$subexpression$2", "symbols": ["MathOps"]},
    {"name": "ParenthesisStatement$ebnf$1$subexpression$2", "symbols": [/[()\s]/]},
    {"name": "ParenthesisStatement$ebnf$1", "symbols": ["ParenthesisStatement$ebnf$1", "ParenthesisStatement$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ParenthesisStatement", "symbols": [{"literal":"("}, "ParenthesisStatement$ebnf$1", {"literal":")"}], "postprocess": ([lparen, statement, rparen]) => statement.join('')},
    {"name": "MathOps", "symbols": [/[*+-\/]/]},
    {"name": "ArgSeparator", "symbols": [{"literal":":"}]},
    {"name": "Zero", "symbols": [{"literal":"0"}]},
    {"name": "AnyValidCharacter", "symbols": ["Letter"]},
    {"name": "AnyValidCharacter", "symbols": ["UsableCharacter"]},
    {"name": "AnyValidCharacter", "symbols": ["Digit"]},
    {"name": "CharOrLetter", "symbols": ["UsableCharacter"]},
    {"name": "CharOrLetter", "symbols": ["Letter"]},
    {"name": "UsableCharacter", "symbols": [/[\$\£\&\^\*]/]},
    {"name": "Letter", "symbols": [/[a-zA-Z]/]},
    {"name": "Digit", "symbols": [/[0-9]/]},
    {"name": "NonzeroNumber", "symbols": [/[1-9]/]},
    {"name": "ObjectLeftBrace", "symbols": [{"literal":"{"}]},
    {"name": "ObjectRightBrace", "symbols": [{"literal":"}"}]},
    {"name": "EOLPIPE", "symbols": ["EOL"]},
    {"name": "EOLPIPE", "symbols": ["PIPE"], "postprocess": function(d) {return null }},
    {"name": "PIPE", "symbols": [{"literal":"|"}]},
    {"name": "DOT", "symbols": [{"literal":"."}]},
    {"name": "QUOTE", "symbols": [{"literal":"\""}]},
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
