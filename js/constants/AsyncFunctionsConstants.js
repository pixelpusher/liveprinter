// TODO: automate this file! Hard to maintain

// names of all async functions in API for replacement in minigrammar later on in RunCode
const asyncFunctionsInAPI = "stop|prime|mov2|ext|gcodeEvent|gcode|errorEvent|retractspeed|sendFirmwareRetractSettings|retract|unretract|start|temp|bed|fan|drawtime|draw|up|drawup|dup|upto|downto|down|drawdown|dd|travel|traveltime|fwretract|polygon|rect|extrudeto|sendExtrusionGCode|sendArcExtrusionGCode|extrude|move|moveto|drawfill|sync|fill|wait|pause|resume|printPaths|printPathsThick|_extrude".split('|');

// regular expression used to highlight async syntax in codemirror
const asyncFunctionsInAPICMRegex = /^(stop|prime|mov2|ext|gcodeEvent|gcode|errorEvent|retractspeed|sendFirmwareRetractSettings|retract|unretract|start|temp|bed|fan|drawtime|draw|up|drawup|dup|upto|downto|down|drawdown|dd|travel|traveltime|fwretract|polygon|rect|extrudeto|sendExtrusionGCode|sendArcExtrusionGCode|extrude|move|moveto|drawfill|sync|fill|wait|pause|resume|printPaths|printPathsThick|_extrude)[^a-zA-Z0-9\_]/;

const asyncFunctionsInAPIRegex = /^stop|prime|mov2|ext|gcodeEvent|gcode|errorEvent|retractspeed|sendFirmwareRetractSettings|retract|unretract|start|temp|bed|fan|drawtime|draw|up|drawup|dup|upto|downto|down|drawdown|dd|travel|traveltime|fwretract|polygon|rect|extrudeto|sendExtrusionGCode|sendArcExtrusionGCode|extrude|move|moveto|drawfill|sync|fill|wait|pause|resume|printPaths|printPathsThick|_extrude$/;

module.exports.asyncFunctionsInAPI = asyncFunctionsInAPI;
module.exports.asyncFunctionsInAPIRegex = asyncFunctionsInAPIRegex;
module.exports.asyncFunctionsInAPICMRegex = asyncFunctionsInAPICMRegex;