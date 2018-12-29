
#Data model of a 3D printer (or digital manufacturing machine)
#x,y,z,e
#tool speeds
#bed size
#number of heads & assoc. temperatures 
#bed temperature

from typing import Optional, List

class PrinterModel(object):

     # set x,y,z,e, number of hotends
     def __init__(self, **fields):
        self.printingTime = 0
        self.x = 0
        self.y = 0
        self.z = 0
        self.e = 0 # filament position

        self.maxX = 0 # bed size...
        self.maxY = 0
        self.maxZ = 0
        self.maxE = 99999 # spool size? not currently used

        self.hotends = 1
        self.hotend_temperature = [0]
        self.bed_temperature = 0

        self.extrusionInmm3 = False # in some printers, the filament volume is taken into account by the firmware (like Marlin) 
        self.filamentRadius = 0  # more efficient to store this than diameter

        self.targetX = 0
        self.targetY = 0 
        self.targetZ = 0 
        self.targetE = 0 

        self.lastSpeed = -1.0

        # not sure if needed
        self.travelSpeed = 0  # speed during movements, in mm/s

        self.currentRetraction = 0 # length currently retracted
        self.retractLength = 2 # in mm - amount to retract after extrusion
        self.retractSpeed = 30 #mm/s
        self.printSpeed = 0 # movement speed during printing
        self.layerHeight = 0.2 # thickness of a 3d printed extrudion, mm by default

        for key,val in fields.items(): 
            self[key] = val

        def getHotendTemperature(self, index:Optional[int] = None):
            if index:
                return self.hotend_temperature[index]

            return self.hotend_temperature[self.hotends]

        def setHotendTemperature(self, temp:int, index:Optional[int] = None):
            if index:
                if index > this.hotends:
                    raise BufferError("bad hotend index: {}".format(index))
                else:
                    self.hotend_temperature[index] = temp 
            else:
                self.hotend_temperature[0] = temp # just use the first one



        def __repr__(self):
            return self.toDict()

        def __str__(self):
            return str(self.toDict())