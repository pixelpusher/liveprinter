# transpiles mini language into JavaScript
# compile with  "nearleyc liveprinter.ne -o lpgrammar.js"
# nearley 2.16.0 https://nearley.js.org
# transpiles mini language into JavaScript

# A complete line (terminated by EOL)

Main -> Chain EOL:+ Space Main {% d => [d[0]].concat(d[3]).join(";") %} 
	| Chain Space EOL:? {% d => d[0] + ';' %}

Chain -> FunctionStatement Space PIPE Space Chain {% d => [d[0]].concat(d[4]).join(";") %} 
	| FunctionStatement Space PIPE:? {% d => d[0] %}

#Statement -> 	(Number {% id %} 
#				| ObjArg {% id %} 
#				| FunctionName {% id %}
#				| FunctionStatement {% id %}
#				) {% id %} 

FunctionStatement -> (FunctionName {% 
		([name]) => {
            const asyncFunctionsInAPIRegex = /^(stop|prime|mov2|ext|gcodeEvent|gcode|errorEvent|retractspeed|sendFirmwareRetractSettings|retract|unretract|start|temp|bed|fan|drawtime|draw|up|drawup|dup|upto|downto|down|drawdown|dd|travel|traveltime|fwretract|polygon|rect|extrudeto|sendExtrusionGCode|sendArcExtrusionGCode|extrude|move|moveto|drawfill|sync|fill|wait|pause|resume|printPaths|printPathsThick|_extrude)$/;
			
			const asyncFuncCall = asyncFunctionsInAPIRegex.test(name);

			if (asyncFuncCall) name = "await lp." + name;
			else name = "lp." + name;
			return name += "("; 
		} 
	%})  ( Spaces 
	
		( FunctionName Space "(" Space AnyArgs:? Space ")" {% ([fn,s1,p1,s2,args,s3,p2]) => fn + p1 + (Array.isArray(args) ? args.join(',') : args) + p2  %}
		| ObjArgs 
		{% 
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
		%}
		| AnyArgs {% 
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
		%}

 	)
	{% d => { let str=""; for (let dd of d) { if (dd) str+=dd}; return str; } %}):? {% d => d.join('') + ")" %}
# 
FunctionName -> PlainVariable | ObjectVariable {% id %}

AnyArgs -> AnyArg Spaces AnyArgs {% ([arg, ws, args]) => [arg].concat(args) %} 
| AnyArg {% id %}

ObjArgs -> ObjArg Spaces ObjArgs {% ([arg, ws, args]) => [arg].concat(args) %} 
| ObjArg {% id %}

# object arguments inside the curly braces, like { x:32 }
ObjArg	-> Letter:+ Space ArgSeparator Space AnyArg {% ([argname, ws1, separator, ws2, argVal]) => argname.join('') + separator + argVal %}

# valid arguments for functions
AnyArg -> AnyVar
	| ParenthesisStatement # these are for passing js directly in brackets
	| MathFuncs

ParenthesisStatement -> "(" Space BasicStatement Space ")" {% ([lparen, sp, statement, sp2, rparen]) => lparen+statement+rparen %}
# "(" (AnyValidCharacter | DOT | MathOps | [()\s]):+ ")" {% ([lparen, statement, rparen]) => statement.join('') %}

BasicStatement -> AnyVar | MathFuncs

MathFuncs -> MathFunc Space MathFuncs {% ([arg, ws, args]) => [arg].concat(args).join('') %} 
	| MathFunc {% id %}

# math functions
MathFunc -> AnyVar:? Space MathOps Space AnyVar {% ([var1,sp1,op,sp2,var2]) => (var1 ? var1 : "")+op+var2 %}
#{% ([var1,sp1,op,sp2,var2]) => (var1 ? var1 : "") + op + var2 }  %}

# valid variable types for math ops etc
AnyVar -> Number # int or float
	| PlainVariable # named variable
	| ObjectVariable # something.something
	| StringLiteral
	| ParenthesisStatement

ObjectVariable -> PlainVariable DOT PlainVariable {% ([pv1, dot, pv2])=> pv1 + dot + pv2 %} 

PlainVariable -> CharOrLetter AnyValidCharacter:* {% ([first, second])=> first + second.join('') %}

StringLiteral -> QUOTE [^|]:* QUOTE {% ([lquote, statement, rquote]) => lquote + statement.join('') + rquote %}

Number -> Integer 	{% id %}
	| Float 		{% id %}
	
Float -> Integer "." [0-9]:+		{% ([num1, dot, num2]) => num1 + dot + num2.join('') %}

Integer -> "-":? Zero {% ([sign, num1]) => (sign ? "-" : "") + num1 %} | 
		"-":? NonzeroNumber Digit:*   {% ([sign, num1, num2]) => (sign ? "-" : "") + num1 + num2.join('') %}
		#{% d => ({ d:d[0] + d[1].join(''), v: parseInt(d[0] + d[1].join('')) }) %}

MathOps -> [*+-/]

ArgSeparator -> ":"

Zero -> "0"

AnyValidCharacter -> Letter | UsableCharacter | Digit
#Letter {% id %} | Digit {% id %} | UsableCharacters {% id %}

CharOrLetter -> UsableCharacter | Letter

UsableCharacter -> [\$\£\&\^\*\_\#]

Letter -> [a-zA-Z]

Digit -> [0-9]

NonzeroNumber -> [1-9]

ObjectLeftBrace -> "{"

ObjectRightBrace -> "}"

EOLPIPE -> EOL | PIPE  {% function(d) {return null } %}

PIPE -> "|"

DOT -> "."

QUOTE -> "\"" | "'"

# Whitespace. The important thing here is that the postprocessor
# is a null-returning function. This is a memory efficiency trick.
_ -> [\s]:*     {% function(d) {return null } %}

__ -> [\s]:+     {% function(d) {return null } %}

EOL -> [\r\n]	{% function(d) {return null } %}

Space -> [ ]:*	{% function(d) {return null } %}

Spaces -> [ ]:+	{% function(d) {return null } %}