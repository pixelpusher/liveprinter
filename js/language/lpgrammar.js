// Generated automatically by nearley, version undefined
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "Main$ebnf$1", "symbols": ["EOL"]},
    {"name": "Main$ebnf$1", "symbols": ["EOL", "Main$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "Main", "symbols": ["Chain", "Main$ebnf$1", "Space", "Main"], "postprocess": d => [d[0]].concat(d[3]).join(";")},
    {"name": "Main$ebnf$2", "symbols": ["EOL"], "postprocess": id},
    {"name": "Main$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Main", "symbols": ["Chain", "Space", "Main$ebnf$2"], "postprocess": d => d[0] + ';'},
    {"name": "Chain", "symbols": ["FunctionStatement", "Space", "PIPE", "Space", "Chain"], "postprocess": d => [d[0]].concat(d[4]).join(";")},
    {"name": "Chain$ebnf$1", "symbols": ["PIPE"], "postprocess": id},
    {"name": "Chain$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Chain", "symbols": ["FunctionStatement", "Space", "Chain$ebnf$1"], "postprocess": d => d[0]},
    {"name": "FunctionStatement$subexpression$1", "symbols": ["FunctionName"], "postprocess":  
        ([name]) => {
            const asyncFunctionsInAPIRegex = /^(setRetractSpeed|sendFirmwareRetractSettings|retract|unretract|ret|unret|start|temp|bed|fan|go|fwretract|retractspeed|polygon|rect|extrudeto|sendExtrusionGCode|travel|draw|drawfill|extrude|move|moveto|mov|mov2|ext|ext2|up|upto|drawup|dup|drawdown|ddown|down|downto|fillDirection|fillDirectionH|sync|fill|wait|pause|resume|printPaths|printPathsThick|_extrude)$/;
        	const asyncFuncCall = asyncFunctionsInAPIRegex.test(name);
        
        	if (asyncFuncCall) name = "await lp." + name;
        	else name = "lp." + name;
        	return name += "("; 
        } 
        	},
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
    {"name": "ObjArg$ebnf$1", "symbols": ["Letter", "ObjArg$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "ObjArg", "symbols": ["ObjArg$ebnf$1", "Space", "ArgSeparator", "Space", "AnyArg"], "postprocess": ([argname, ws1, separator, ws2, argVal]) => argname.join('') + separator + argVal},
    {"name": "AnyArg", "symbols": ["AnyVar"]},
    {"name": "AnyArg", "symbols": ["ParenthesisStatement"]},
    {"name": "AnyArg", "symbols": ["MathFuncs"]},
    {"name": "ParenthesisStatement", "symbols": [{"literal":"(","pos":188}, "Space", "BasicStatement", "Space", {"literal":")","pos":196}], "postprocess": ([lparen, sp, statement, sp2, rparen]) => lparen+statement+rparen},
    {"name": "BasicStatement", "symbols": ["AnyVar"]},
    {"name": "BasicStatement", "symbols": ["MathFuncs"]},
    {"name": "MathFuncs", "symbols": ["MathFunc", "Space", "MathFuncs"], "postprocess": ([arg, ws, args]) => [arg].concat(args).join('')},
    {"name": "MathFuncs", "symbols": ["MathFunc"], "postprocess": id},
    {"name": "MathFunc$ebnf$1", "symbols": ["AnyVar"], "postprocess": id},
    {"name": "MathFunc$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "MathFunc", "symbols": ["MathFunc$ebnf$1", "Space", "MathOps", "Space", "AnyVar"], "postprocess": ([var1,sp1,op,sp2,var2]) => (var1 ? var1 : "")+op+var2},
    {"name": "AnyVar", "symbols": ["Number"]},
    {"name": "AnyVar", "symbols": ["PlainVariable"]},
    {"name": "AnyVar", "symbols": ["ObjectVariable"]},
    {"name": "AnyVar", "symbols": ["StringLiteral"]},
    {"name": "AnyVar", "symbols": ["ParenthesisStatement"]},
    {"name": "ObjectVariable", "symbols": ["PlainVariable", "DOT", "PlainVariable"], "postprocess": ([pv1, dot, pv2])=> pv1 + dot + pv2},
    {"name": "PlainVariable$ebnf$1", "symbols": []},
    {"name": "PlainVariable$ebnf$1", "symbols": ["AnyValidCharacter", "PlainVariable$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "PlainVariable", "symbols": ["CharOrLetter", "PlainVariable$ebnf$1"], "postprocess": ([first, second])=> first + second.join('')},
    {"name": "StringLiteral$ebnf$1$subexpression$1", "symbols": ["AnyValidCharacter"]},
    {"name": "StringLiteral$ebnf$1$subexpression$1", "symbols": ["DOT"]},
    {"name": "StringLiteral$ebnf$1$subexpression$1", "symbols": [/[()\s]/]},
    {"name": "StringLiteral$ebnf$1", "symbols": ["StringLiteral$ebnf$1$subexpression$1"]},
    {"name": "StringLiteral$ebnf$1$subexpression$2", "symbols": ["AnyValidCharacter"]},
    {"name": "StringLiteral$ebnf$1$subexpression$2", "symbols": ["DOT"]},
    {"name": "StringLiteral$ebnf$1$subexpression$2", "symbols": [/[()\s]/]},
    {"name": "StringLiteral$ebnf$1", "symbols": ["StringLiteral$ebnf$1$subexpression$2", "StringLiteral$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "StringLiteral", "symbols": ["QUOTE", "StringLiteral$ebnf$1", "QUOTE"], "postprocess": ([lquote, statement, rquote]) => lquote + statement.join('') + rquote},
    {"name": "Number", "symbols": ["Integer"], "postprocess": id},
    {"name": "Number", "symbols": ["Float"], "postprocess": id},
    {"name": "Float$subexpression$1", "symbols": ["Zero"]},
    {"name": "Float$subexpression$1", "symbols": ["Integer"]},
    {"name": "Float$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "Float$ebnf$1", "symbols": [/[0-9]/, "Float$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "Float", "symbols": ["Float$subexpression$1", {"literal":".","pos":353}, "Float$ebnf$1"], "postprocess": ([num1, dot, num2]) => num1 + dot + num2.join('')},
    {"name": "Integer", "symbols": ["Zero"]},
    {"name": "Integer$ebnf$1", "symbols": [{"literal":"-","pos":368}], "postprocess": id},
    {"name": "Integer$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "Integer$ebnf$2", "symbols": []},
    {"name": "Integer$ebnf$2", "symbols": ["Digit", "Integer$ebnf$2"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "Integer", "symbols": ["Integer$ebnf$1", "NonzeroNumber", "Integer$ebnf$2"], "postprocess": ([sign, num1, num2]) => (sign ? "-" : "") + num1 + num2.join('')},
    {"name": "MathOps", "symbols": [/[*+-/]/]},
    {"name": "ArgSeparator", "symbols": [{"literal":":","pos":390}]},
    {"name": "Zero", "symbols": [{"literal":"0","pos":396}]},
    {"name": "AnyValidCharacter", "symbols": ["Letter"]},
    {"name": "AnyValidCharacter", "symbols": ["UsableCharacter"]},
    {"name": "AnyValidCharacter", "symbols": ["Digit"]},
    {"name": "CharOrLetter", "symbols": ["UsableCharacter"]},
    {"name": "CharOrLetter", "symbols": ["Letter"]},
    {"name": "UsableCharacter", "symbols": [/[\$\£\&\^\*]/]},
    {"name": "Letter", "symbols": [/[a-zA-Z]/]},
    {"name": "Digit", "symbols": [/[0-9]/]},
    {"name": "NonzeroNumber", "symbols": [/[1-9]/]},
    {"name": "ObjectLeftBrace", "symbols": [{"literal":"{","pos":452}]},
    {"name": "ObjectRightBrace", "symbols": [{"literal":"}","pos":458}]},
    {"name": "EOLPIPE", "symbols": ["EOL"]},
    {"name": "EOLPIPE", "symbols": ["PIPE"], "postprocess": function(d) {return null }},
    {"name": "PIPE", "symbols": [{"literal":"|","pos":476}]},
    {"name": "DOT", "symbols": [{"literal":".","pos":482}]},
    {"name": "QUOTE", "symbols": [{"literal":"\"","pos":488}]},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": [/[\s]/, "_$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null }},
    {"name": "__$ebnf$1", "symbols": [/[\s]/]},
    {"name": "__$ebnf$1", "symbols": [/[\s]/, "__$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(d) {return null }},
    {"name": "EOL", "symbols": [/[\r\n]/], "postprocess": function(d) {return null }},
    {"name": "Space$ebnf$1", "symbols": []},
    {"name": "Space$ebnf$1", "symbols": [/[ ]/, "Space$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "Space", "symbols": ["Space$ebnf$1"], "postprocess": function(d) {return null }},
    {"name": "Spaces$ebnf$1", "symbols": [/[ ]/]},
    {"name": "Spaces$ebnf$1", "symbols": [/[ ]/, "Spaces$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
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
