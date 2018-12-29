
# the second time around, use this to unretract!
# lp.extrude({'e':12,'speed':30})

# draw a circle
import math

# number of segments in circle
ticks = 5
# radius - set to 1/10 the max x coordinate
r = lp.maxx/10 
layers = 5
lp.layerHeight = 0.3 # in mm

# lp.cx gives you the center x
# lp.cy gives you the center y

lp.moveto({'x':lp.cx+r, 'y':lp.cy,'z':lp.layerHeight, 'speed':80})
for _ in range(layers):
	arange = (a*math.pi*2/ticks for a in range(0,ticks+1))
	for a in arange:
		lp.extrudeto({'x':lp.cx+r*math.cos(a), 'y':lp.cy+r*math.sin(a),
                     'speed':10})
	lp.move({'z':lp.layerHeight, 'speed':80})
# try to stop the goo, make sure to unretract at end
lp.extrude({'e':-12,'speed':80})
