import time

class PrinterResponse():
    def __init__(self, **fields):
        self._time = time.time() * 1000 #ms for javascript front end
        self._type = fields['type']
        self._command = fields['command']
        self._properties = {}

        for key,val in fields.items(): 
            if key != "type" and key != "command":
                self._properties[key] = val
        
    def getTime(self):
        return self._time

    def getType(self):
        return self._type

    def toDict(self):
        return {
                'type': self._type,
                'time': self._time,
                'command': self._command, 
                'properties': self._properties
                }

    def toJSONRPC(self):
        json = {
                'jsonrpc': '2.0',
                'id': 3, 
                'method': self._type,
                'params': {
                    'time': self._time,
                    'command': self._command
                    }
                }
        for key,val in self._properties.items(): 
            json['params'][key] = val
        
        return json
    
    def __repr__(self):
        return self.toDict()

    def __str__(self):
        return str(self.toDict())

    
# TEST
#pr = PrinterResponse(**{
#    'type': "temperature",
#    'command': "M105",
#    'bed': 200,
#    'bed_target': 201,
#    'hotend': 180,
#    'hotend_target': 181
#    })

#Logger.log("d", "{}".format(pr))
