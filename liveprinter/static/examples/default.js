// Using LivePrinter!
// Note: You've probably already done steps 1-6 but they're here 
// for reference anyway.
// ------------------
// v1.0.2 by Evan Raskob, 2020

//Step 1: Turn on printer - power switch at back. Connect to computer.
//
//Step 2: level bed (on the actual printer itself)
//
//Step 3:  start LivePrinter server (Use Visual Studio Code, or your favourite Python environment)
//
//Step 4: open http://localhost:8888 (and here you are!)
//
//Step 5: click printer settings tab, select serial port. Wait for 
// connection messages and green dots to move up top.
//
//Step 6: click code tab to load editor
//
// Single lines of liveprinter code start with '#'
// Blocks of liveprinter code start and end with '##' (more on this later)
// Run code by clicking on the line you want to run and hitting CTRL and ENTER keys,
// or SHIFT+ENTER.
// Or, highlight some code and hit CTRL+ENTER or SHIFT+ENTER.
//
// If there's a problem with your code, it should pop up at the top of this editor.
// If it's a problem with the system, you might have to open the JavaScript console
// for this web browser.

// Step 7: Home the axes so the printer knows where the print head is positioned. 
// (Do this every time it loses power). Set print head temperature to 210 (for PLA) // and turn on print head fan:
# start 210

// Step 7b.: turn on the print bed to 50C
# bed 50

// You can also set the print head temperature directly:
# temp 220

// same goes for fan (0-100%):
# fan 100

// Now check the display above - the numbers should have changed. Try:
# sync   // get back current temperature and print head position from printer
// It should update very quickly!

// Step 8: click printer tab again and hit the button to start live temperature
// polling, or keep running sync until the temperature is hot enough (190+ for PLA).
// If the temperature is too cold, it will ignore your printing command and give 
// you an error in the side info panel.

// Step 9: Get some feedback! The right panels show info and errors.
// Print out some info yourself:
loginfo("This is my info!");

// Print out an error:
logerror("ERROR! I caused this.");

// If things go wrong internally, they show up there.

// Click on the "history code editor" tab above - you should see all the code you ran, with the time you ran it. This is useful for recording a session! You can also run code directly from it, same as here.
//
// Next to it is a GCode editor that records all GCode from this session. You can At the bottom right of this window pane is a "download" button that downloads all code editors to your computer. 

// Now your printer is ready to print! (When the target temperature of 210C is reached)

//
// MOVING (traveling)
//--------------------------------------------------------
// Try moving - you can do this whilst it warms up:

//absolute move to x=20mm, y=20mm at speed 80mm/s:
# moveto x:20 y:20 speed:80

// you can also use the shorthand:
# mov2 x:20 y:20 speed:80

// relative move at 1/2 the speed - we should be at x,y (60,20) now.
# move x:40 speed:40

// you can move up and down too: try moving the print head down 10mm
// (meaning the bed moves up 10mm)
# mov z:-10

// lower the bed to 50mm less than the bottom: 
# moveto z:lp.maxz-50 speed:40



//
// EXTRUDING (drawing)
//--------------------------------------------------------
// Try moving - you can do this whilst it warms up:


// Extrude some plastic! 16mm to be exact.
// You can move the filament directly (the 'e' dimension), and negative is backwards.
// Watch the speed! Slow is good here, otherwise you'll force the material through the 
// extruder too quickly and it will grind it. 
# extrude e:5 speed:1

// Repeat that until some gunk comes out of the head in a nice stream. 
// To stop the leakage, quickly retract (pull filament backwards) by 6mm by running:
# retract 6

// On the display above, you'll see that 'retraction' is now 6. That means the filament is 
// 6mm short of the print head. When we print again, we need to unretract to prime it again.

// Now, clean that mess up and let's print!

// Move to the centre of the bed, with the head at a the layer height (0.2mm default), ready 
// for a first layer:
# moveto x:lp.cx y:lp.cy z:lp.layerHeight speed:80

// Let's slowly extrude to a set position from here. When finished, you should see a 40mm 
// horizontal line. First, we'll unretract (prime the filament). Highlight these two lines
// of code (and the ## around them) and hit CTRL+ENTER to run them together:
## 
unretract
extrudeto x:lp.minx+40 y:lp.miny speed:20
##

// Now, let's draw a line 20mm in the y (front/back) direction:
# extrude y:20

// Great! Lift up the print head so you can see what you made:
# up 50


//
// DRAWING AND TRAVELING
//--------------------------------------------------------
// The draw and travel functions use the current heading (lp.angle) to move.
// They are a bit like Logo's Turtle graphics.

// Clean your build plate and let's try again. Move back into printing position:
# moveto x:lp.cx y:lp.cy z:lp.layerHeight speed:80

// Move (don't draw) at an angle of 20 degrees (if moving to the right on the x axis as 0 degrees)
// at a distance of 30mm:
# turnto 20
# travel 30

// turn 20 degrees and move another 40mm in the same direction, but this time extrude (draw)
# turn 20
# draw 40

// Note that using this mode it automatically handles retraction/unretraction for you!
// You can manually turn that off, if you want to draw complex shapes (but that's 
// not recommended yet):
# autoretract 0

// More advanced: to change the line thickness (layerHeight):
# thick 0.15 

// or use the JavaScript way, using the 'lp' object:
lp.lh = 0.15; // lh => layerHeight

// You can also chain together commands. When you do, they are run in order from left to right:
# travelspeed 80 | mov2 x:lp.cx y:lp.cy z:lp.lh

# printspeed 30 | thick 0.2 | turnto 0 | draw 40 | upto 60 


// Shortcuts! ----------------------------------
// You can use shorter versions for brevity (at the loss of readability)
ext => extrude;
ext2 => extrudeto;
mov => move;
mov2 => moveto;
tur => turn;
tur2 => turnto;
psp => printspeed: set/get printSpeed
tsp => travelspeed: set/get move speed

