<a name="Printer"></a>

## Printer
Core Printer API of LivePrinter, an interactive programming system for live CNC manufacturing.

**Kind**: global class  

* [Printer](#Printer)
    * [new Printer()](#new_Printer_new)
    * [.boundaryMode](#Printer+boundaryMode)
    * [.time](#Printer+time)
    * [.model](#Printer+model)
    * [.cx](#Printer+cx)
    * [.cy](#Printer+cy)
    * [.angle](#Printer+angle)
    * [.angle](#Printer+angle)
    * [.angler](#Printer+angler)
    * [.angler](#Printer+angler)
    * [.layerHeight](#Printer+layerHeight) ⇒ [<code>Printer</code>](#Printer)
    * [.setProperties(model)](#Printer+setProperties)
    * [.gcodeEvent(gcode)](#Printer+gcodeEvent)
    * [.errorEvent(err)](#Printer+errorEvent)
    * [.printspeed(s)](#Printer+printspeed) ⇒
    * [.drawspeed(s)](#Printer+drawspeed) ⇒
    * [.travelspeed(s)](#Printer+travelspeed) ⇒
    * [.autoretract(state)](#Printer+autoretract) ⇒
    * [.bpm()](#Printer+bpm)
    * [.bpm()](#Printer+bpm)
    * [.retractspeed(s)](#Printer+retractspeed)
    * [.thick(val)](#Printer+thick) ⇒ [<code>Printer</code>](#Printer)
    * [.sendFirmwareRetractSettings()](#Printer+sendFirmwareRetractSettings) ⇒ [<code>Printer</code>](#Printer)
    * [.retract(len, speed)](#Printer+retract) ⇒ [<code>Printer</code>](#Printer)
    * [.unretract(len, speed)](#Printer+unretract) ⇒ [<code>Printer</code>](#Printer)
    * [.start(hotEndTemp, bedTemp)](#Printer+start) ⇒ [<code>Printer</code>](#Printer)
    * [.temp(temp)](#Printer+temp) ⇒ [<code>Printer</code>](#Printer)
    * [.bed(temp)](#Printer+bed) ⇒ [<code>Printer</code>](#Printer)
    * [.fan(speed)](#Printer+fan) ⇒ [<code>Printer</code>](#Printer)
    * [.clipToPrinterBounds(position:)](#Printer+clipToPrinterBounds) ⇒ <code>object</code>
    * [.go(extruding, retract)](#Printer+go) ⇒ [<code>Printer</code>](#Printer)
    * [.getAngle(radians)](#Printer+getAngle) ⇒ <code>Number</code>
    * [.turnto(ang, radians)](#Printer+turnto) ⇒ [<code>Printer</code>](#Printer)
    * [.run(strings)](#Printer+run) ⇒ [<code>Printer</code>](#Printer)
    * [.up(d)](#Printer+up) ⇒ [<code>Printer</code>](#Printer)
    * [.drawup(d)](#Printer+drawup) ⇒ [<code>Printer</code>](#Printer)
    * [.upto(d)](#Printer+upto) ⇒ [<code>Printer</code>](#Printer)
    * [.downto(d)](#Printer+downto) ⇒ [<code>Printer</code>](#Printer)
    * [.down(d)](#Printer+down) ⇒ [<code>Printer</code>](#Printer)
    * [.drawdown(d)](#Printer+drawdown) ⇒ [<code>Printer</code>](#Printer)
    * [.elevation(angle, radians)](#Printer+elevation) ⇒ [<code>Printer</code>](#Printer)
    * [.elev(_elev)](#Printer+elev) ⇒ [<code>Printer</code>](#Printer)
    * [.tilt(_elev)](#Printer+tilt) ⇒ [<code>Printer</code>](#Printer)
    * [.distance(d)](#Printer+distance) ⇒ [<code>Printer</code>](#Printer)
    * [.dist(d)](#Printer+dist) ⇒ [<code>Printer</code>](#Printer)
    * [.travel(d)](#Printer+travel) ⇒ [<code>Printer</code>](#Printer)
    * [.draw(d)](#Printer+draw) ⇒ [<code>Printer</code>](#Printer)
    * [.fwretract(state)](#Printer+fwretract) ⇒ [<code>Printer</code>](#Printer)
    * [.polygon(r, segs)](#Printer+polygon)
    * [.rect(w, h)](#Printer+rect) ⇒ [<code>Printer</code>](#Printer)
    * [.extrudeto(params)](#Printer+extrudeto) ⇒ [<code>Printer</code>](#Printer)
    * [.sendExtrusionGCode(speed, retract)](#Printer+sendExtrusionGCode)
    * [.sendArcExtrusionGCode(speed, retract)](#Printer+sendArcExtrusionGCode)
    * [.extrude(params)](#Printer+extrude) ⇒ [<code>Printer</code>](#Printer)
    * [.move(params)](#Printer+move) ⇒ [<code>Printer</code>](#Printer)
    * [.moveto(params)](#Printer+moveto) ⇒ [<code>Printer</code>](#Printer)
    * [.turn(angle, radians)](#Printer+turn) ⇒ [<code>Printer</code>](#Printer)
    * [.drawfill(w, h, gap)](#Printer+drawfill)
    * [.sync()](#Printer+sync)
    * [.d2r(angle)](#Printer+d2r) ⇒ <code>float</code>
    * [.r2d(angle)](#Printer+r2d) ⇒ <code>float</code>
    * [.note(note, time, axes)](#Printer+note) ⇒ [<code>Printer</code>](#Printer)
    * [.t2d(time)](#Printer+t2d) ⇒ [<code>Printer</code>](#Printer)
    * [.t2mm(time)](#Printer+t2mm) ⇒ <code>Float</code>
    * [.b2d(beats)](#Printer+b2d) ⇒ [<code>Printer</code>](#Printer)
    * [.b2t(beats)](#Printer+b2t) ⇒ <code>Number</code>
    * [.fill(w, h, lh)](#Printer+fill) ⇒ [<code>Printer</code>](#Printer)
    * [.midi2speed(note, axis)](#Printer+midi2speed) ⇒ <code>float</code>
    * [.m2s(note, axis)](#Printer+m2s) ⇒ <code>float</code>
    * [.speedScale()](#Printer+speedScale) ⇒ <code>object</code>
    * [.wait(ms)](#Printer+wait) ⇒ [<code>Printer</code>](#Printer)
    * [.pause()](#Printer+pause) ⇒ [<code>Printer</code>](#Printer)
    * [.resume(temp)](#Printer+resume) ⇒ [<code>Printer</code>](#Printer)
    * [.printPaths(paths, settings)](#Printer+printPaths) ⇒ [<code>Printer</code>](#Printer)
    * [.printPathsThick(paths, settings)](#Printer+printPathsThick) ⇒ [<code>Printer</code>](#Printer)
    * [.arcextrudeto(params)](#Printer+arcextrudeto) ⇒ [<code>Printer</code>](#Printer)

<a name="new_Printer_new"></a>

### new Printer()
Create new instance, passing a function for sending messages

<a name="Printer+boundaryMode"></a>

### lp.boundaryMode
What to do when movement or extrusion commands are out of machine bounds.
Can be clip (keep printing inside edges), bounce (bounce off edges), stop

**Kind**: instance property of [<code>Printer</code>](#Printer)  
<a name="Printer+time"></a>

### lp.time
readonly total movetime

**Kind**: instance property of [<code>Printer</code>](#Printer)  
<a name="Printer+model"></a>

### lp.model
set printer model (See Printer class for valid ones)

**Kind**: instance property of [<code>Printer</code>](#Printer)  
**See**: setProperties()  

| Param | Type | Description |
| --- | --- | --- |
| m | <code>String</code> | Valid model from Printer class |

<a name="Printer+cx"></a>

### lp.cx
Get the center horizontal (x) position on the bed

**Kind**: instance property of [<code>Printer</code>](#Printer)  
<a name="Printer+cy"></a>

### lp.cy
Get the center vertical (y) position on the bed,

**Kind**: instance property of [<code>Printer</code>](#Printer)  
<a name="Printer+angle"></a>

### lp.angle
Return internal angle in degrees (because everything is in degrees unless otherwise specified)

**Kind**: instance property of [<code>Printer</code>](#Printer)  
<a name="Printer+angle"></a>

### lp.angle
Set the internal direction of movement for the next operation in degrees.

**Kind**: instance property of [<code>Printer</code>](#Printer)  

| Param | Type | Description |
| --- | --- | --- |
| ang | <code>float</code> | Angle of movement (in xy plane) in degrees |

<a name="Printer+angler"></a>

### lp.angler
Return internal angle in radians

**Kind**: instance property of [<code>Printer</code>](#Printer)  
<a name="Printer+angler"></a>

### lp.angler
Set the internal direction of movement for the next operation in radians.

**Kind**: instance property of [<code>Printer</code>](#Printer)  

| Param | Type | Description |
| --- | --- | --- |
| ang | <code>float</code> | Angle of movement (in xy plane) in radians |

<a name="Printer+layerHeight"></a>

### lp.layerHeight ⇒ [<code>Printer</code>](#Printer)
Set/get layer height safely and easily.

**Kind**: instance property of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - Reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| height | <code>float</code> | layer height in mm |

<a name="Printer+setProperties"></a>

### lp.setProperties(model)
Set default properties for the printer based on the printer model, e.g. bed size, speeds

**Kind**: instance method of [<code>Printer</code>](#Printer)  

| Param | Type | Description |
| --- | --- | --- |
| model | <code>String</code> | Valid model from Printer class |

<a name="Printer+gcodeEvent"></a>

### lp.gcodeEvent(gcode)
Notify listeners that GCode is ready to be consumed.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns{any}**: Nothing.  

| Param | Type | Description |
| --- | --- | --- |
| gcode | <code>String</code> | GCode command string to send |

<a name="Printer+errorEvent"></a>

### lp.errorEvent(err)
Notify listeners that an error has taken place.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns{any}**: Nothing.  

| Param | Type | Description |
| --- | --- | --- |
| err | <code>Error</code> | GCode command string to send |

<a name="Printer+printspeed"></a>

### lp.printspeed(s) ⇒
Set printing speed.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: Number  

| Param | Type | Description |
| --- | --- | --- |
| s | <code>Number</code> | speed |

<a name="Printer+drawspeed"></a>

### lp.drawspeed(s) ⇒
Set drawing speed (synonym for printspeed).

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: Number drawing speed  

| Param | Type | Description |
| --- | --- | --- |
| s | <code>Number</code> | speed |

<a name="Printer+travelspeed"></a>

### lp.travelspeed(s) ⇒
Set travel speed.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: Number travel speed  

| Param | Type | Description |
| --- | --- | --- |
| s | <code>Number</code> | speed |

<a name="Printer+autoretract"></a>

### lp.autoretract(state) ⇒
Set automatic retraction state

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: Boolean automatic retraction state  

| Param | Type | Default |
| --- | --- | --- |
| state | <code>Boolean</code> | <code>true</code> | 

<a name="Printer+bpm"></a>

### lp.bpm()
set bpm for printer, for calculating beat-based movements

**Kind**: instance method of [<code>Printer</code>](#Printer)  
<a name="Printer+bpm"></a>

### lp.bpm()
set bpm for printer, for calculating beat-based movements

**Kind**: instance method of [<code>Printer</code>](#Printer)  
<a name="Printer+retractspeed"></a>

### lp.retractspeed(s)
Retraction speed - updates firmware on printer too

**Kind**: instance method of [<code>Printer</code>](#Printer)  

| Param | Type | Description |
| --- | --- | --- |
| s | <code>Number</code> | Option speed in mm/s to set, otherwise just get |

<a name="Printer+thick"></a>

### lp.thick(val) ⇒ [<code>Printer</code>](#Printer)
Set the extrusion thickness (in mm)

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| val | <code>float</code> | thickness of the extruded line in mm |

<a name="Printer+sendFirmwareRetractSettings"></a>

### lp.sendFirmwareRetractSettings() ⇒ [<code>Printer</code>](#Printer)
Send the current retract settings to the printer (useful when updating the retraction settings locally)

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  
<a name="Printer+retract"></a>

### lp.retract(len, speed) ⇒ [<code>Printer</code>](#Printer)
Immediately perform a "retract" which is a shortcut for just moving the filament back up at a speed.  Sets the internal retract variables to those passed in.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| len | <code>Number</code> | Length of filament to retract.  Set to 0 to use current setting (or leave out) |
| speed | <code>Number</code> | (optional) Speed of retraction. Will be clipped to max filament feed speed for printer model. |

<a name="Printer+unretract"></a>

### lp.unretract(len, speed) ⇒ [<code>Printer</code>](#Printer)
Immediately perform an "unretract" which is a shortcut for just extruding the filament out at a speed.  Sets the internal retract variables to those passed in.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| len | <code>Number</code> | Length of filament to unretract.  Set to 0 to use current setting (or leave out) |
| speed | <code>Number</code> | (optional) Speed of unretraction. Will be clipped to max filament feed speed for printer model. |

<a name="Printer+start"></a>

### lp.start(hotEndTemp, bedTemp) ⇒ [<code>Printer</code>](#Printer)
Performs a quick startup by resetting the axes and moving the head
to printing position (layerheight).

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| hotEndTemp | <code>float</code> | <code>190</code> | is the temperature to start warming hot end up to (only 1 supported) |
| bedTemp | <code>float</code> | <code>50</code> | is the temperature to start warming bed up to |

<a name="Printer+temp"></a>

### lp.temp(temp) ⇒ [<code>Printer</code>](#Printer)
Set hot end temperature, don't block other operation.
to printing position (layerheight).

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| temp | <code>float</code> | <code>190</code> | is the temperature to start warming up to |

<a name="Printer+bed"></a>

### lp.bed(temp) ⇒ [<code>Printer</code>](#Printer)
Set bed temperature, don't block other operation.
to printing position (layerheight).

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| temp | <code>float</code> | <code>190</code> | is the temperature to start warming up to |

<a name="Printer+fan"></a>

### lp.fan(speed) ⇒ [<code>Printer</code>](#Printer)
Set fan speed.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| speed | <code>float</code> | <code>100</code> | is the speed from 0-100 |

<a name="Printer+clipToPrinterBounds"></a>

### lp.clipToPrinterBounds(position:) ⇒ <code>object</code>
clip object's x,y,z properties to printer bounds and return it

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: <code>object</code> - position clipped object  

| Param | Type | Description |
| --- | --- | --- |
| position: | <code>object</code> | object with x,y,z properties clip |

<a name="Printer+go"></a>

### lp.go(extruding, retract) ⇒ [<code>Printer</code>](#Printer)
Execute a movement (extrusion or travel) based on the internally-set 
 direction/elevation/distance.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| extruding | <code>Boolean</code> | <code>false</code> | Whether to extrude whilst moving (true if yes, false if not) |
| retract | <code>Boolean</code> |  | Whether to retract at end (usually automatic). Set to 0 or false   if executing a few moves in a sequence |

<a name="Printer+getAngle"></a>

### lp.getAngle(radians) ⇒ <code>Number</code>
Return the current angle of movement

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: <code>Number</code> - angle of movement in degrees (default) or radians  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| radians | <code>Boolean</code> | <code>false</code> | true if you want it in radians (default is false, in degrees) |

<a name="Printer+turnto"></a>

### lp.turnto(ang, radians) ⇒ [<code>Printer</code>](#Printer)
Set the direction of movement for the next operation.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - Reference to this object for chaining  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| ang | <code>float</code> |  | Angle of movement (in xy plane) |
| radians | <code>Boolean</code> | <code>false</code> | use radians or not |

<a name="Printer+run"></a>

### lp.run(strings) ⇒ [<code>Printer</code>](#Printer)
Run a set of commands specified in a grammar (experimental.)

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - Reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| strings | <code>String</code> | commands to run - M(move),E(extrude),L(left turn),R(right turn) |

<a name="Printer+up"></a>

### lp.up(d) ⇒ [<code>Printer</code>](#Printer)
Move up quickly! (in mm)

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - Reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| d | <code>Number</code> | distance in mm to move up |

<a name="Printer+drawup"></a>

### lp.drawup(d) ⇒ [<code>Printer</code>](#Printer)
Move up quickly! (in mm)

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - Reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| d | <code>Number</code> | distance in mm to draw upwards |

<a name="Printer+upto"></a>

### lp.upto(d) ⇒ [<code>Printer</code>](#Printer)
Move up to a specific height quickly! (in mm). It might seem silly to have both, upto and downto,
but conceptually when you're making something it makes sense, even if they do the same thing.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - Reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| d | <code>Number</code> | distance in mm to move up |

<a name="Printer+downto"></a>

### lp.downto(d) ⇒ [<code>Printer</code>](#Printer)
Move up to a specific height quickly! (in mm)

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - Reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| d | <code>Number</code> | distance in mm to move up |

<a name="Printer+down"></a>

### lp.down(d) ⇒ [<code>Printer</code>](#Printer)
Move down quickly! (in mm)

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - Reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| d | <code>Number</code> | distance in mm to move up |

<a name="Printer+drawdown"></a>

### lp.drawdown(d) ⇒ [<code>Printer</code>](#Printer)
Draw downwards in mm

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - Reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| d | <code>Number</code> | distance in mm to move up |

<a name="Printer+elevation"></a>

### lp.elevation(angle, radians) ⇒ [<code>Printer</code>](#Printer)
Set the direction of movement for the next operation.
TODO: This doesn't work with other commands.  Need to implement roll, pitch, yaw?

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| angle | <code>float</code> |  | elevation angle (in z direction, in degrees) for next movement |
| radians | <code>Boolean</code> | <code>false</code> | use radians or not |

<a name="Printer+elev"></a>

### lp.elev(_elev) ⇒ [<code>Printer</code>](#Printer)
Shortcut for elevation.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  
**See**: elevation  

| Param | Type | Description |
| --- | --- | --- |
| _elev | <code>any</code> | elevation |

<a name="Printer+tilt"></a>

### lp.tilt(_elev) ⇒ [<code>Printer</code>](#Printer)
Shortcut for elevation.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  
**See**: elevation  

| Param | Type | Description |
| --- | --- | --- |
| _elev | <code>any</code> | elevation angle to tilt (degrees). 90 is up, -90 is down |

<a name="Printer+distance"></a>

### lp.distance(d) ⇒ [<code>Printer</code>](#Printer)
Set the distance of movement for the next operation.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| d | <code>float</code> | distance to move next time |

<a name="Printer+dist"></a>

### lp.dist(d) ⇒ [<code>Printer</code>](#Printer)
Shortcut to distance()

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| d | <code>float</code> | distance to move next time |

<a name="Printer+travel"></a>

### lp.travel(d) ⇒ [<code>Printer</code>](#Printer)
Shortcut to travel (no extrusion) the current set distance, in the direction of movement

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| d | <code>float</code> | distance to move (if not given, the current set distance) |

<a name="Printer+draw"></a>

### lp.draw(d) ⇒ [<code>Printer</code>](#Printer)
Shortcut to draw (extrusion) the current set distance, in the direction of movement

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| d | <code>float</code> | distance to extrude (draw) (if not given, the current set distance) |

<a name="Printer+fwretract"></a>

### lp.fwretract(state) ⇒ [<code>Printer</code>](#Printer)
Set firmware retraction on or off (for after every move).

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - this printer object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| state | <code>Boolean</code> | True if on, false if off |

<a name="Printer+polygon"></a>

### lp.polygon(r, segs)
Extrude a polygon starting at the current point on the curve (without retraction)

**Kind**: instance method of [<code>Printer</code>](#Printer)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| r | <code>any</code> |  | radius |
| segs | <code>any</code> | <code>10</code> | segments (more means more perfect circle) |

<a name="Printer+rect"></a>

### lp.rect(w, h) ⇒ [<code>Printer</code>](#Printer)
Extrude a rectangle with the current point as its centre

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| w | <code>any</code> | width |
| h | <code>any</code> | height |

<a name="Printer+extrudeto"></a>

### lp.extrudeto(params) ⇒ [<code>Printer</code>](#Printer)
Extrude plastic from the printer head to specific coordinates, within printer bounds

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | Parameters dictionary containing either: - x,y,z,e keys referring to movement and filament position - 'retract' for manual retract setting (true/false) - 'speed' for the print or travel speed of this and subsequent operations - 'thickness' or 'thick' for setting/updating layer height - 'bounce' if movement should bounce off sides (true/false), not currently implemented properly |

<a name="Printer+sendExtrusionGCode"></a>

### lp.sendExtrusionGCode(speed, retract)
Send movement update GCode to printer based on current position (this.x,y,z).

**Kind**: instance method of [<code>Printer</code>](#Printer)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| speed | <code>Int</code> |  | print speed in mm/s |
| retract | <code>boolean</code> | <code>true</code> | if true (default) add GCode for retraction/unretraction. Will use either hardware or software retraction if set in Printer object |

<a name="Printer+sendArcExtrusionGCode"></a>

### lp.sendArcExtrusionGCode(speed, retract)
Send movement update GCode to printer based on current position (this.x,y,z).

**Kind**: instance method of [<code>Printer</code>](#Printer)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| speed | <code>Int</code> |  | print speed in mm/s |
| retract | <code>boolean</code> | <code>true</code> | if true (default) add GCode for retraction/unretraction. Will use either hardware or software retraction if set in Printer object |

<a name="Printer+extrude"></a>

### lp.extrude(params) ⇒ [<code>Printer</code>](#Printer)
Extrude plastic from the printer head, relative to the current print head position, 
 within printer bounds

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | Parameters dictionary containing either x,y,z keys or   direction/angle (radians) keys and retract setting (true/false). |

<a name="Printer+move"></a>

### lp.move(params) ⇒ [<code>Printer</code>](#Printer)
Relative movement.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>any</code> | Can be specified as x,y,z,e or dist (distance), angle (xy plane), elev (z dir). All in mm. |

<a name="Printer+moveto"></a>

### lp.moveto(params) ⇒ [<code>Printer</code>](#Printer)
Absolute movement.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>any</code> | Can be specified as x,y,z. All in mm. |

<a name="Printer+turn"></a>

### lp.turn(angle, radians) ⇒ [<code>Printer</code>](#Printer)
Turn (clockwise positive, CCW negative)

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| angle | <code>Number</code> |  | in degrees by default |
| radians | <code>Boolean</code> | <code>false</code> | use radians if true |

**Example**  
```js
Turn 45 degrees twice (so 90 total) and extrude 40 mm in that direction:
lp.turn(45).turn(45).distance(40).go(1);
```
<a name="Printer+drawfill"></a>

### lp.drawfill(w, h, gap)
Fill a rectagular area (lines drawn parallel to direction).

**Kind**: instance method of [<code>Printer</code>](#Printer)  

| Param | Type | Description |
| --- | --- | --- |
| w | <code>Number</code> | width |
| h | <code>Number</code> | height |
| gap | <code>Number</code> | gap between fills |

<a name="Printer+sync"></a>

### lp.sync()
Synchronise variables like position and temp

**Kind**: instance method of [<code>Printer</code>](#Printer)  
<a name="Printer+d2r"></a>

### lp.d2r(angle) ⇒ <code>float</code>
Degrees to radians conversion.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: <code>float</code> - angle in radians  

| Param | Type | Description |
| --- | --- | --- |
| angle | <code>float</code> | in degrees |

<a name="Printer+r2d"></a>

### lp.r2d(angle) ⇒ <code>float</code>
Radians to degrees conversion.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: <code>float</code> - angle in degrees  

| Param | Type | Description |
| --- | --- | --- |
| angle | <code>float</code> | in radians |

<a name="Printer+note"></a>

### lp.note(note, time, axes) ⇒ [<code>Printer</code>](#Printer)
Convert MIDI notes and duration into direction and angle for future movement.
Low notes below 10 are treated a pauses.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| note | <code>float</code> | <code>40</code> | as midi note |
| time | <code>float</code> | <code>200</code> | in ms |
| axes | <code>string</code> | <code>&quot;x&quot;</code> | move direction as x,y,z (default "x") |

**Example**  
```js
Play MIDI note 41 for 400ms on the x & y axes
    lp.note(41, 400, "xy").go();
```
<a name="Printer+t2d"></a>

### lp.t2d(time) ⇒ [<code>Printer</code>](#Printer)
Set the movement distance based on a target amount of time to move. (Uses current print speed to calculate)

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| time | <code>Number</code> | Time to move in milliseconds |

<a name="Printer+t2mm"></a>

### lp.t2mm(time) ⇒ <code>Float</code>
Calculate the movement distance based on a target amount of time to move. (Uses current print speed to calculate)

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: <code>Float</code> - distance in mm  

| Param | Type | Description |
| --- | --- | --- |
| time | <code>Number</code> | Time to move in milliseconds |

<a name="Printer+b2d"></a>

### lp.b2d(beats) ⇒ [<code>Printer</code>](#Printer)
Set the movement distance based on number of beats (uses bpm to calculate)

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| beats | <code>Number</code> | Time to move in whole or partial beats |

<a name="Printer+b2t"></a>

### lp.b2t(beats) ⇒ <code>Number</code>
Get the time in ms based on number of beats (uses bpm to calculate)

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: <code>Number</code> - Time in ms equivalent to the number of beats  

| Param | Type | Description |
| --- | --- | --- |
| beats | <code>Number</code> | In whole or partial beats |

<a name="Printer+fill"></a>

### lp.fill(w, h, lh) ⇒ [<code>Printer</code>](#Printer)
Fills an area based on layerHeight (as thickness of each line)

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| w | <code>float</code> | width of the area in mm |
| h | <code>float</code> | height of the area in mm |
| lh | <code>float</code> | the layerheight (or gap, if larger) |

<a name="Printer+midi2speed"></a>

### lp.midi2speed(note, axis) ⇒ <code>float</code>
**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: <code>float</code> - speed in mm/s  

| Param | Type | Description |
| --- | --- | --- |
| note | <code>number</code> | as midi note |
| axis | <code>string</code> | of movement: x,y,z |

<a name="Printer+m2s"></a>

### lp.m2s(note, axis) ⇒ <code>float</code>
Calculate and set both the travel and print speed in mm/s based on midi note

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: <code>float</code> - new speed  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| note | <code>float</code> |  | midi note |
| axis | <code>string</code> | <code>&quot;x&quot;</code> | axis (x,y,z,e) of movement |

<a name="Printer+speedScale"></a>

### lp.speedScale() ⇒ <code>object</code>
Convenience function for getting speed scales for midi notes from printer model.

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: <code>object</code> - x,y,z speed scales  
<a name="Printer+wait"></a>

### lp.wait(ms) ⇒ [<code>Printer</code>](#Printer)
Causes the printer to wait for a number of milliseconds

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| ms | <code>float</code> | to wait |

<a name="Printer+pause"></a>

### lp.pause() ⇒ [<code>Printer</code>](#Printer)
Temporarily pause the printer: move the head up, turn off fan & temp

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  
<a name="Printer+resume"></a>

### lp.resume(temp) ⇒ [<code>Printer</code>](#Printer)
Resume the printer printing: turn on fan & temp

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| temp | <code>float</code> | <code>190</code> | target temp |

<a name="Printer+printPaths"></a>

### lp.printPaths(paths, settings) ⇒ [<code>Printer</code>](#Printer)
Print paths

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  
**Test**: const p = [
    [20,20],
           [30,30],
           [50,30]];
        lp.printPaths({paths:p,minZ:0.2,passes:10});  

| Param | Type | Description |
| --- | --- | --- |
| paths | <code>Array</code> | List of paths (lists of coordinates in x,y) to print |
| settings | <code>Object</code> | Settings for the scaling, etc. of this object. useaspect means respect aspect ratio (width/height). A width or height of 0 means to use the original paths' width/height. |

<a name="Printer+printPathsThick"></a>

### lp.printPathsThick(paths, settings) ⇒ [<code>Printer</code>](#Printer)
Print paths using drawFill. NEVER TESTED!

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  
**Test**: const p = [
    [20,20],
               [30,30],
               [50,30]];
            lp.printPaths({paths:p,minZ:0.2,passes:10});  

| Param | Type | Description |
| --- | --- | --- |
| paths | <code>Array</code> | List of paths (lists of coordinates in x,y) to print |
| settings | <code>Object</code> | Settings for the scaling, etc. of this object. useaspect means respect aspect ratio (width/height). A width or height of 0 means to use the original paths' width/height. |

<a name="Printer+arcextrudeto"></a>

### lp.arcextrudeto(params) ⇒ [<code>Printer</code>](#Printer)
Extrude plastic from the printer head to specific coordinates, within printer bounds

**Kind**: instance method of [<code>Printer</code>](#Printer)  
**Returns**: [<code>Printer</code>](#Printer) - reference to this object for chaining  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | Parameters dictionary containing either: - x,y,z,i,j,e keys referring to movement and filament position - 'retract' for manual retract setting (true/false) - 'speed' for the print or travel speed of this and subsequent operations - 'thickness' or 'thick' for setting/updating layer height - 'bounce' if movement should bounce off sides (true/false), not currently implemented properly |

