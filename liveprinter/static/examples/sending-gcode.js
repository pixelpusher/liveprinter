// By Evan Raskob, 2018
// --------------------------------
// G Code reference: https://github.com/Ultimaker/Ultimaker2Marlin

// home all axes - this is useful to make sure the print head position is accurate
// this is also run as part of lp.start()
await gcode("G28");

# send "G28"

//get the current positions of all the motors (x,y,z,e)
// will display in the Info panel
await gcode("M114");

//turn on hot end to 190C
await gcode("M104 S190");

//heat bed to 60C
await gcode("M140 S60");

//heat bed to 60C and wait until fully heated to proceed
await gcode("M190 S60");

// get the current temperature (will show in the lower right side box)
// this is what happens when we poll the temperature
await gcode("M119");

await gcode("M104 S0"); // turn off the heater for the hot end
await gcode("M106 S100"); // turn fan on to full (100)

//have the printer wait until the temperature is reached
await gcode("M109 S200"); // turn on the heater for the hot end to 200C and wait until temperature is reached to proceeed

// turn off fan
await gcode("M107");

// BEEPING!
// beep at 440Hz for 2 seconds (2000ms)
await gcode("M300 S440 P2000");


// RETRACTION:
// NOTE: LivePrinter by default uses hardware retraction but you can disable it and use software retraction explicity
// or no retraction on a command if you'd like by adding a {retract: false} property in the extrude functions or
// setting lp.retractLength to 0

//M207 - set retract length S[positive mm] F[feedrate mm/sec] Z[additional zlift/hop]
gcode("M207 S4.5 F1500 Z0.2");

//M208 - set recover=unretract length S[positive mm surplus to the M207 S*] F[feedrate mm/sec]
gcode("M208 S4.5 F1000");
