# start it up
lp.start() 

#move to the side
lp.moveto({'z':0.2, 'x':lp.minx,'y':lp.miny, 'speed':100})

# mary had a little lamb in 2 axes, two octaves
notes = [40,38,36,38,40,40,40,0,38,38,38,0,40,43,43,0]
for i in range(1,3):
	for n in notes:
		lp.note(n+12*i,200,'x')
		lp.note(n+24+12*i,200,'y')
