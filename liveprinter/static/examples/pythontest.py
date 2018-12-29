from browser import document as doc
from browser import window as win
from browser import alert
from browser.html import *

geo = win.navigator.geolocation

def navi(pos):
	xyz = pos.coords
	print ("{} {}".format(xyz.latitude, xyz.longitude))

def nonavi(error):
	print(error)

if geo:
	geo.getCurrentPosition(navi, nonavi)

print(win.scope.printer.cx)
