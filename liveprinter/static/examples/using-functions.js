// Using functions with LivePrinter
// By Evan Raskob, 2020
// --------------------------------

// You can mix liveprinter code with javascript.
// There are some utility functions to help you do things faster...

await repeat (5, async () => {
	# gcode "M105"
    # wait 500
    loginfo("got temp!");
})


await repeat (8, async () => {
	# gcode "M105"
    # wait 500
    loginfo("got temp!");
})
