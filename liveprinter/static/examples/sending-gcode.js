// By Evan Raskob, 2020
// --------------------------------
// GCode reference: https://github.com/Ultimaker/Ultimaker2Marlin

// home all axes - this is useful to make sure the print head position is accurate

# gcode "G28"

//get the current positions of all the motors (x,y,z,e)
// will display in the Info panel
await lp.gcode("M114");

//turn on hot end to 190C
# gcode "M104 S190"

//heat bed to 60C
# gcode "M140 S40"

//heat bed to 60C and wait until fully heated to proceed: will time out!
// DANGER: this will likely stop the server so you have to reboot.
# gcode "M190 S60"

// get the current temperature (will show in the lower right side box)
// this is what happens when we poll the temperature
# gcode "M105"

# gcode "M104 S0" // turn off the heater for the hot end
# gcode "M106 S100" // turn fan on to full (100)

// turn off fan
# gcode "M107"

// BEEPING!
// beep at 440Hz for 2 seconds (2000ms)
# gcode "M300 S440 P2000"

// RETRACTION:
// NOTE: LivePrinter by default uses hardware retraction but you can disable it and use software retraction explicity
// or no retraction on a command if you'd like by adding a {retract: false} property in the extrude functions or
// setting lp.retractLength to 0

//M207 - set retract length S[positive mm] F[feedrate mm/sec] Z[additional zlift/hop]
// setting this manually is a bad idea because of what goes on in 
// liveprinter internally
# gcode "M207 S4.5 F1500 Z0.2"

//M208 - set recover=unretract length S[positive mm surplus to the M207 S*] F[feedrate mm/sec]
# gcode "M208 S4.5 F1000"
