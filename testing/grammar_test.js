// Grammar parser for GCode

PrimaryExpression
	= (GCommand __)+

__
  = (WhiteSpace / LineTerminatorSequence / Comment)*

GCommand
  = commandType:GCommandPrefix command:(Number+) {
  	  var r = {};
 	  switch(commandType) {
       case	"G": r = { type: "movement", value: command };
       	break;
      case "M": r = { type: "setting", value: command };
       	break; 
	  case "X": r = { type: "x-movement", value: command };
       	break; 
      case "Y": r = { type: "y-movement", value: command };
       	break;
      }
      return r;
     }

Number = DecimalLiteral / DecimalIntegerLiteral

GCommandPrefix "G code character (G,T,M,X,Y,Z,S,E)"
 = $[GTMYXZSE]

SourceCharacter = .

WhiteSpace "whitespace"
  = "\t"
  / "\v"
  / "\f"
  / " "
  / "\u00A0"
  / "\uFEFF"
  / Zs

LineTerminator
  = [\n\r\u2028\u2029]

LineTerminatorSequence "end of line"
  = "\n"
  / "\r\n"
  / "\r"
  / "\u2028"
  / "\u2029"

Comment "comment"
  = MultiLineComment
  / SingleLineComment

MultiLineComment
  = "/*" (!"*/" SourceCharacter)* "*/"

MultiLineCommentNoLineTerminator
  = "/*" (!("*/" / LineTerminator) SourceCharacter)* "*/"

SingleLineComment
  = "//" (!LineTerminator SourceCharacter)*  
 
DecimalLiteral
  = DecimalIntegerLiteral "." DecimalDigit* ExponentPart? {
      return { type: "Literal", value: parseFloat(text()) };
    }
  / "." DecimalDigit+ ExponentPart? {
      return { type: "Literal", value: parseFloat(text()) };
    }
  / DecimalIntegerLiteral ExponentPart? {
      return { type: "Literal", value: parseFloat(text()) };
    }

DecimalIntegerLiteral
  = "0"
  / NonZeroDigit DecimalDigit*

DecimalDigit
  = [0-9]

NonZeroDigit
  = [1-9]

ExponentPart
  = ExponentIndicator SignedInteger

ExponentIndicator
  = "e"i

SignedInteger
  = [+-]? DecimalDigit+
  
  // Unicode //////////////////////
  // Separator, Space
Zs = [\u0020\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]