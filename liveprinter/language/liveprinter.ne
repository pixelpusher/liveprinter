# transpiles mini language into JavaScript
# compile with  "nearleyc liveprinter.ne -o lpgrammar.js"
# then copy to live server: "cp lpgrammar.js ../static/lib/nearley/"
# nearley 2.16.0 https://nearley.js.org
# transpiles mini language into JavaScript

# A complete line (terminated by EOL)

Main -> Chain EOL:+ Space Main {% d => [d[0]].concat(d[3]).join(";") %} 
	| Chain Space EOL:? {% d => d[0] + ';' %}

Chain -> FunctionStatement Space PIPE Space Chain {% d => [d[0]].concat(d[4]).join(".") %} 
	| FunctionStatement Space PIPE:? {% d => d[0] %}

#Statement -> 	(Number {% id %} 
#				| ObjArg {% id %} 
#				| FunctionName {% id %}
#				| FunctionStatement {% id %}
#				) {% id %} 

FunctionStatement -> (FunctionName Spaces {% d => d[0] + "(" %}) 
		( ObjArgs 
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
		| (AnyArgs {% 
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
		%})
		) {% d => d.join('') + ")" %}

FunctionName -> (AnyValidCharacter:* Letter AnyValidCharacter:* {% ([first, second, third]) => first.join('') + second + third.join('') %}) | ObjectVariable {% id %}

AnyArgs -> AnyArg Spaces AnyArgs {% ([arg, ws, args]) => [arg].concat(args) %} 
| AnyArg {% id %}

ObjectVariable -> Letter AnyValidCharacter:* DOT Letter AnyValidCharacter:* {% d=> d[0] + d[1].join('') + d[2] + d[3] + d[4].join('') %}  
	
ObjArgs -> ObjArg Spaces ObjArgs {% ([arg, ws, args]) => [arg].concat(args) %} 
| ObjArg {% id %}

ObjArg	-> Letter:+ Space ArgSeparator Space AnyArg {% ([argname, ws1, separator, ws2, argVal]) => argname.join('') + separator + argVal %}

AnyArg -> Number 
	| PlainVariable 
	| ObjectVariable 

PlainVariable -> CharOrLetter:+ {% d=> d[0].join('') %}

#StringLiteral -> QUOTE (AnyValidCharacter | Space):+ QUOTE {% d => d[1].join('') %}

Number -> Integer 	{% id %}
	| Float 		{% id %}
	
Float -> (Zero | Integer) "." [0-9]:+		{% ([num1, dot, num2]) => num1 + dot + num2.join('') %}

Integer -> Zero |
		NonzeroNumber Digit:*   {% ([num1, num2]) => num1 + num2.join('') %}
		#{% d => ({ d:d[0] + d[1].join(''), v: parseInt(d[0] + d[1].join('')) }) %}

ArgSeparator -> ":"

Zero -> "0"

AnyValidCharacter -> Letter | UsableCharacter | Digit
#Letter {% id %} | Digit {% id %} | UsableCharacters {% id %}

CharOrLetter -> UsableCharacter | Letter

UsableCharacter -> [\$\£\&\^\*]

Letter -> [a-zA-Z]

Digit -> [0-9]

NonzeroNumber -> [1-9]

ObjectLeftBrace -> "{"

ObjectRightBrace -> "}"

EOLPIPE -> EOL | PIPE  {% function(d) {return null } %}

PIPE -> "|"

DOT -> "."

QUOTE -> "\""

# Whitespace. The important thing here is that the postprocessor
# is a null-returning function. This is a memory efficiency trick.
_ -> [\s]:*     {% function(d) {return null } %}

__ -> [\s]:+     {% function(d) {return null } %}

EOL -> [\r\n]	{% function(d) {return null } %}

Space -> [ ]:*	{% function(d) {return null } %}

Spaces -> [ ]:+	{% function(d) {return null } %}