# transpiles mini language into JavaScript
# compile with  "nearleyc liveprinter.ne -o lpgrammar.js"
# nearley 2.16.0 https://nearley.js.org
# transpiles mini language into JavaScript

# A complete line (terminated by EOL)

Main -> Chain EOL:+ Space Main {% d => [d[0]].concat(d[3]).join(";") %} 
	| Chain Space EOL:? {% d => d[0] + ';' %}

Chain -> Statement Space PIPE Space Chain {% d => [d[0]].concat(d[4]).join(".") %} 
	| Statement Space PIPE:? {% d => d[0] %}

Statement -> 	(Number {% id %} 
				| ObjArg {% id %} 
				| FunctionName {% id %}
				| FunctionStatement {% id %}
				) {% id %} 

FunctionStatement -> (FunctionName _ {% d => d[0] %}) 
		( ObjArgs 
		{% 
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
		%}
| Numbers {% 
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
%}) {% ([name, args]) => name + args %}

FunctionName -> Letter AnyValidCharacter:* {% ([first, second]) => first + second.join('') %}

Numbers -> Number Spaces Numbers {% ([num, ws, numbers]) => [num].concat(numbers) %} 
	| Number {% id %}

ObjArgs -> ObjArg Spaces ObjArgs {% ([arg, ws, args]) => [arg].concat(args) %} 
| ObjArg {% id %}

ObjArg	-> Letter:+ Space ArgSeparator Space ArgValue {% ([argname, ws1, separator, ws2, argVal]) => argname.join('') + separator + argVal %}

ArgValue -> (Letter:+ {% d=> d.join('') %} | Number {% id %}) 

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

UsableCharacter -> [\$\£\&\^\*\`\.]

Letter -> [a-zA-Z]

Digit -> [0-9]

NonzeroNumber -> [1-9]

ObjectLeftBrace -> "{"

ObjectRightBrace -> "}"

EOLPIPE -> EOL | PIPE  {% function(d) {return null } %}

PIPE -> "|"

# Whitespace. The important thing here is that the postprocessor
# is a null-returning function. This is a memory efficiency trick.
_ -> [\s]:*     {% function(d) {return null } %}

__ -> [\s]:+     {% function(d) {return null } %}

EOL -> [\r\n]	{% function(d) {return null } %}

Space -> [ ]:*	{% function(d) {return null } %}

Spaces -> [ ]:+	{% function(d) {return null } %}