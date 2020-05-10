// names of all async functions in API for replacement in minigrammar later on in RunCode
const asyncFunctionsInAPI = [
    "setRetractSpeed",
    "sendFirmwareRetractSettings",
    "retract",
    "unretract",
    "start",
    "temp",
    "bed",
    "fan",
    "go",
    "fwretract",
    "retractspeed",
    "polygon",
    "rect",
    "extrudeto",
    "ext2",
    "sendExtrusionGCode",
    "travel",
    "draw",
    "drawfill",
    "extrude",
    "ext",
    "move",
    "mov",
    "moveto",
    "mov2",
    "drawup","dup","drawdown","ddown",
    "up",
    "upto",
    "down",
    "downto",
    "fillDirection",
    "fillDirectionH",
    "sync",
    "fill",
    "wait",
    "pause",
    "resume",
    "printPaths",
    "printPathsThick",
    "_extrude",
    "repeat",
    "gcode"    
];

// regular expression used to highlight async syntax in codemirror
const asyncFunctionsInAPICMRegex = /^(setRetractSpeed|sendFirmwareRetractSettings|retract|unretract|ret|unret|start|temp|bed|fan|go|fwretract|retractspeed|polygon|rect|extrudeto|sendExtrusionGCode|travel|draw|drawfill|extrude|move|moveto|mov|mov2|ext|ext2|up|upto|drawup|dup|drawdown|ddown|down|downto|fillDirection|fillDirectionH|sync|fill|wait|pause|resume|printPaths|printPathsThick|_extrude|repeat|gcode)[^a-zA-Z0-9\_]/;

const asyncFunctionsInAPIRegex = /^setRetractSpeed|sendFirmwareRetractSettings|retract|unretract|ret|unret|start|temp|bed|fan|go|fwretract|retractspeed|polygon|rect|extrudeto|sendExtrusionGCode|travel|draw|drawfill|extrude|move|moveto|mov|mov2|ext|ext2|up|upto|drawup|dup|drawdown|ddown|down|downto|fillDirection|fillDirectionH|sync|fill|wait|pause|resume|printPaths|printPathsThick|_extrude$/;

module.exports.asyncFunctionsInAPI = asyncFunctionsInAPI;
module.exports.asyncFunctionsInAPIRegex = asyncFunctionsInAPIRegex;
module.exports.asyncFunctionsInAPICMRegex = asyncFunctionsInAPICMRegex;