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
    "_extrude"
];

// regular expression used to highlight async syntax in codemirror
const asyncFunctionsInAPICMRegex = /^(setRetractSpeed|sendFirmwareRetractSettings|retract|unretract|start|temp|bed|fan|go|drawup|dup|drawdown|ddown|up|upto|down|downto|fwretract|retractspeed|polygon|rect|extrudeto|ext2|sendExtrusionGCode|travel|draw|extrude|ext|move|mov2|moveto|mov|fillDirection|fillDirectionH|sync|fill|wait|pause|resume|printPaths|printPathsThick|_extrude|repeat)[^a-zA-Z0-9\_]/;


module.exports.asyncFunctionsInAPI = asyncFunctionsInAPI;
module.exports.asyncFunctionsInAPICMRegex = asyncFunctionsInAPICMRegex;