// LIVEPRINTER - a livecoding system for live CNC manufacturing
//-------------------------------------------------------------

/**
 * Basic properties, settings and functions for the physical printer like speeds, dimensions, extrusion.
 * Uses a function passed in to send messages (strings of G Code), usually a websockets one.
 * @version 0.8
 * @example <caption>Log GCode to console:</caption>
 * let printer = new Printer(msg => console.log(msg));
 * @license
 * Copyright 2018 Evan Raskob
 * Licensed under the GNU Affero 3.0 License (the "License"); you may
 * not use this file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 *     https://www.gnu.org/licenses/gpl-3.0.en.html
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
class Printer {

    ///////
    // Printer API /////////////////
    ///////

    // FUTURE NOTE: make this not a class but use object inheritance and prototyping

    /**
     * Create new instance, passing a function for sending messages
     * @constructor
     * @param {Function} _messageSendFunc function to pass in that will send messages to the server/physical printer
     */
    constructor(_messageSendFunc = null) {

        /**
         *  the function (Websockets or other) that this object will use to send gcode to the printer
         *  @type {Function}
         */
        this.send = _messageSendFunc;

        if (this.send === null) {
            this.send = msg => console.log(msg);
        }

        // TODO: not sure about this being valid - maybe check for max speed?
        this._printSpeed = Printer.defaultPrintSpeed;
        this._model = Printer.UM2plus; // default
        this.layerHeight = 0.2; // thickness of a 3d printed extrudion, mm by default

        let coords = {
            x: 0, // x position in mm
            y: 0,// y position in mm
            z: 0, // z position in mm
            e: -99999
        }; //filament position in mm

        this.minPosition = new Vector(coords);

        coords = {
            x: Printer.bedSize[this.model]["x"], // x position in mm
            y: Printer.bedSize[this.model]["y"], // y position in mm
            z: Printer.bedSize[this.model]["z"], // z position in mm
            e: 999999
        }; //filament position in mm

        this.maxPosition = new Vector(coords);

        coords = {
            x: this.minPosition.axes.x, // x position in mm
            y: this.minPosition.axes.y, // y position in mm
            z: this.minPosition.axes.z, // z position in mm
            e: 0
        }; //filament position in mm

        this.position = new Vector(coords);

        this.lastSpeed = -1.0;

        ////////////////////////////////////////////
        // these are used in in the go() function
        this._heading = 0;   // current angle of movement (xy) in radians
        this._elevation = 0; // current angle of elevated movement (z) in radians
        this._distance = 0; // next distance to move
        this._waitTime = 0;
        ////////////////////////////////////////////

        this.totalMoveTime = 0; // time spent moving/extruding

        this.maxFilamentPerOperation = 30; // safety check to keep from using all filament, in mm
        this.maxTimePerOperation = 10; // prevent very long operations, by accident - this is in seconds

        // NOTE: disabled for now to use hardware retraction settings
        this.currentRetraction = 0; // length currently retracted
        this.retractLength = 10; // in mm - amount to retract after extrusion.  This is high because most moves are slow...
        this.retractSpeed = 300; //mm/s
        this.firmwareRetract = true;    // use Marlin or printer for retraction

        /**
         * What to do when movement or extrusion commands are out of machine bounds.
         * Can be clip (keep printing inside edges), bounce (bounce off edges), stop
         */
        this.boundaryMode = "stop";

        this.maxMovePerCycle = 400; // max mm to move per calculation (see _extrude method)

        this.queuedMessages = []; // messages queued to be sent by this.send(...)
    }

    get x() { return this.position.axes.x; }
    get y() { return this.position.axes.y; }
    get z() { return this.position.axes.z; }
    get e() { return this.position.axes.e; }

    set x(val) { this.position.axes.x = val; }
    set y(val) { this.position.axes.y = val; }
    set z(val) { this.position.axes.z = val; }
    set e(val) { this.position.axes.e = val; }

    /**
     * readonly total movetime
     */
    get time() { return this.totalMoveTime; }

    //
    // set printer model - should be one definined in this class!
    //
    set model(m) {
        // TODO: check valid model
        this._model = m;
        // if invalid, throw exception
    }
    get model() { return this._model; }

    set printSpeed(s) {
        let maxs = Printer.maxPrintSpeed[this._model];
        this._printSpeed = Math.min(parseFloat(s), parseFloat(maxs.x)); // pick in x direction...
    }

    get maxSpeed() { return Printer.maxPrintSpeed[this._model]; } // in mm/s

    get printSpeed() { return this._printSpeed; }

    get extents() {
        return this.maxPosition.axes;
    }

    /**
     * Get the center horizontal (x) position on the bed
     */
    get cx() {
        return (this.maxPosition.axes.x - this.minPosition.axes.x) / 2;
    }
    /**
     * Get the center vertical (y) position on the bed,
     */
    get cy() {
        return (this.maxPosition.axes.y - this.minPosition.axes.y) / 2;
    }
    /// maximum values
    get minx() {
        return this.minPosition.axes.x;
    }
    get miny() {
        return this.minPosition.axes.y;
    }
    get minz() {
        return this.minPosition.axes.z;
    }
    /// maximum values
    set minx(v) {
        this.minPosition.axes.x = v;
    }
    set miny(v) {
        this.minPosition.axes.y = v;
    }
    set minz(v) {
        this.minPosition.axes.z = v;
    }


    // maximum values
    get maxx() {
        return this.maxPosition.axes.x;
    }
    get maxy() {
        return this.maxPosition.axes.y;
    }
    get maxz() {
        return this.maxPosition.axes.z;
    }

    set maxx(v) {
        this.maxPosition.axes.x = v;
    }
    set maxy(v) {
        this.maxPosition.axes.y = v;
    }
    set maxz(v) {
        this.maxPosition.axes.z = v;
    }


    /**
     * Set the extrusion thickness (in mm)
     * @param {float} val thickness of the extruded line in mm
     * @returns {Printer} reference to this object for chaining
     */
    thick(val) {
        this.thickness = val;
        return this;
    }

    /**
     * Set the overall speed of the extrusion in mm/s
     * @param {float} val Speed for the extrusion in mm/s
     * @returns {Printer} reference to this object for chaining
     */
    speed(val) {
        this.printSpeed = val;
        return this;
    }

    /**
     * Immediately perform a "retract" which is a shortcut for just moving the filament back up at a speed.  Sets the internal retract variables to those passed in.
     * @param {any} len Length of filament to retract.  Set to 0 to use current setting (or leave out)
     * @param {any} speed Speed of retraction. Will be clipped to max filament feed speed for printer model.  Set to 0 for current or leave out.
     * @returns {Printer} reference to this object for chaining
     * @example 
     * Custom retraction:
     * lp.extrude({x:40,y:80, retract:false}).retract(6,30);
     * // next move, will unretract that amount too
     * 
     * // or extrude an angle/distance and then force retract
     * lp.firmwareRetract = false; // turn off automatic retraction in firmware
     * lp.angle(45).dist(50).go(1).retract(6,30);
     * 
     * // retract again with same settings
     * lp.angle(45).dist(50).go(1).retract();
     */
    retract(len = this.retractLength, speed = this.retractSpeed) {
        if (len < 0) throw new Error("retract length can't be less than 0: " + len);
        this.retractLength = len;

        if (speed <= 0) throw new Error("retract speed can't be 0 or less: " + speed);
        // set speed safely!
        if (speed > Printer.maxPrintSpeed["e"]) throw new Error("retract speed to high: " + speed);
        this.retractSpeed = speed;

        // RETRACT        
        this.currentRetraction += this.retractLength;
        this.e -= this.retractLength;
        this.send("G1 " + "E" + this.e.toFixed(4) + " F" + this.retractSpeed.toFixed(4));
            
        return this;
    }

    /**
     * Immediately perform an "unretract" which is a shortcut for just extruding the filament out at a speed.  Sets the internal retract variables to those passed in.
     * @param {any} len Length of filament to unretract.  Set to 0 to use current setting (or leave out)
     * @param {any} speed Speed of unretraction. Will be clipped to max filament feed speed for printer model.  Set to 0 for current or leave out.
     * @returns {Printer} reference to this object for chaining
     * @example 
     * Custom unretraction:
     * lp.extrude({x:40,y:80, retract:false}).retract(6,30);
     * lp.unretract();
     * 
     * // next move, will unretract that amount too
     * 
     * // or extrude an angle/distance and then force retract
     * lp.firmwareRetract = false; // turn off automatic retraction in firmware
     * lp.angle(45).dist(50).go(1).retract(6,30);
     * lp.unretract(8,30); // extract a little more to get it going
     */
    unretract(len = this.retractLength, speed = this.retractSpeed) {
        if (len < 0) throw new Error("retract length can't be less than 0: " + len);
        this.retractLength = len;

        if (speed <= 0) throw new Error("retract speed can't be 0 or less: " + speed);
        if (speed > Printer.maxPrintSpeed["e"]) throw new Error("retract speed to high: " + speed);

        // set speed safely!
        this.retractSpeed = speed;

        // UNRETRACT
        this.e += this.retractLength;
        this.send("G1 " + "E" + this.e.toFixed(4) + " F" + this.retractSpeed.toFixed(4));
        this.currentRetraction = 0;

        return this;
    }


    /**
     * Performs a quick startup by resetting the axes and moving the head
     * to printing position (layerheight).
     * @param {float} temp is the temperature to start warming up to
     * @returns {Printer} reference to this object for chaining
     */
    start(temp = "190") {
        this.send("G28");
        this.send("M104 S" + temp);
        //set retract length
        this.send("M207 S"+this.retractLength+" F" + this.retractSpeed + " Z0.2");
        //set retract recover
        this.send("M208 S0 F" + this.retractSpeed);
        this.moveto({ x: this.cx, y: this.cy, z: this.layerHeight, speed: Printer.defaultPrintSpeed });
        this.send("M106 S100"); // set fan to full

        return this;
    }

    /**
    * clip object's x,y,z properties to printer bounds and return it
    * @param {object} position: object with x,y,z properties clip
    * @returns {object} position clipped object
    */
    clipToPrinterBounds(position) {
        position.x = Math.min(position.x, this.maxx);
        position.y = Math.min(position.y, this.maxy);
        position.z = Math.min(position.z, this.maxz);

        // stop at min edges
        position.x = Math.max(position.x, this.minx);
        position.y = Math.max(position.y, this.miny);
        position.z = Math.max(position.z, this.minz);

        return position;
    }

    /**
     * Perform current operations (extrusion) based on direction/elevation/distance.
     * @param {Boolean} extruding Whether to extrude whilst moving (true if yes, false if not)
     * @param {Boolean} retract Whether to retract at end (usually true). Set to 0 if executing a few moves in a row
     * @returns {Printer} reference to this object for chaining
     */
    go(extruding = false, retract=true) {
        // wait, if necessary
        if (this._waitTime > 0) {
            return this.wait();
        }
        else {
            const _x = this._distance * Math.cos(this._heading);
            const _y = this._distance * Math.sin(this._heading);
            const _z = this._distance * Math.sin(this._elevation);
            const _e = extruding ? undefined : 0; // no filament extrusion

            return this.extrude({ x: _x, y: _y, z: _z, e: _e });
        }
        // never reached
        return this;
        
    }

    /**
     * Set the direction of movement for the next operation.
     * @param {float} ang Angle of movement (in xy plane)
     * @returns {Printer} Reference to this object for chaining
     */
    angle(ang) {
        if (!radians) {
            a = this.d2r(ang);
        }
        this._heading = a;
        return this;
    }

    /**
     * Set the direction of movement for the next operation.
     * @param {float} angle elevation angle (in z direction, in degrees) for next movement
     * @returns {Printer} reference to this object for chaining
     */
    elevation(angle) {
        if (!radians) {
            a = this.d2r(angle);
        }
        this._elevation = a;
        return this;
    }

    // shortcut
    elev(_elev) {
        return this.elevation(_elev); 
    }

    /**
     * Set the distance of movement for the next operation.
     * @param {float} d distance to move next time
     * @returns {Printer} reference to this object for chaining
     */
    distance(d) {
        this._distance = d;
        return this;
    }

    /**
     * Shortcut to distance()
     * @param {float} d distance to move next time
     * @returns {Printer} reference to this object for chaining
     */
    dist(d) {
        return this.distance(d);
    }

    /**
     * Set firmware retraction on or off (for after every move).
     * @param {Boolean} state True if on, false if off
     */
    fwretract(state) {
        this.firmwareRetract = state;
        return this;
    }

    /**
    *  Send all the queued command messages via the send function (probably websockets)
    * @returns {Printer} reference to this object for chaining
    */
    sendQueued() {
        for (let msg of this.queuedMessages) {
            this.send(msg);
        }
        return this;
    }

    /**
     * Extrude a circle with the current point as its centre
     * @param {any} xx x pos of center
     * @param {any} yy y pos of center
     * @param {any} r radius
     * @param {any} segs segments (more means more perfect circle)
     * @param {any} props normal extrude properties like speed, retract
     */
    circle(xx,yy,r, segs = 10, props) {
        for (let i = 0; i < segs-1; i++) {
            const angle = Math.PI * 2 * i / segs;
            const _x = Math.cos(angle) * r;
            const _y = Math.sin(angle) * r;
            let args = { 'x': xx + _x, 'y': yy + _y };
            // tack on args like fill, etc.
            if (props !== undefined) {
                for (let prop in props) {
                    args[prop] = props[prop];
                }
            }
            this.extrudeto(args);
        }
    }

    /**
     * Extrude a circle with the current point as its centre
     * @param {any} xx x pos of center
     * @param {any} yy y pos of center
     * @param {any} r radius
     * @param {any} segs segments (more means more perfect circle)
     * @param {any} props normal extrude properties like speed, retract
     */
    rect(xx, yy, r, props) {
        return this.circle(xx, yy, r, 4, props);
    }

    /**
    * Extrude plastic from the printer head to specific coordinates, within printer bounds
    * @param {Object} params Parameters dictionary containing either x,y,z keys or direction/angle (radians) keys and retract setting (true/false).
    *      Optional bounce (Boolean) key if movement should bounce off sides.
    * @returns {Printer} reference to this object for chaining
    */
    extrudeto(params) {
        let extrusionSpecified = (params.e !== undefined);
        let retract = ((params.retract === undefined) || params.retract);

        let __x = (params.x !== undefined) ? parseFloat(params.x) : this.x;
        let __y = (params.y !== undefined) ? parseFloat(params.y) : this.y;
        let __z = (params.z !== undefined) ? parseFloat(params.z) : this.z;
        let __e = (extrusionSpecified) ? parseFloat(params.e) : this.e;

        let newPosition = new Vector({ x: __x, y: __y, z: __z, e: __e });

        this.printSpeed = parseFloat((params.speed !== undefined) ? params.speed : this.printSpeed);
        this.layerHeight = parseFloat((params.thickness !== undefined) ? params.thickness : this.layerHeight);

        //////////////////////////////////////
        /// START CALCULATIONS      //////////
        //////////////////////////////////////

        let distanceVec = Vector.sub(newPosition, this.position);
        let distanceMag = distanceVec.mag();

        // FYI:
        //  nozzle_speed{mm/s} = (radius_filament^2) * PI * filament_speed{mm/s} / layer_height^2
        //  filament_speed{mm/s} = layer_height^2 * nozzle_speed{mm/s}/(radius_filament^2)*PI

        if (!extrusionSpecified) {
            // otherwise, calculate filament length needed based on layerheight, etc.
            const filamentRadius = Printer.filamentDiameter[this.model] / 2;

            // for extrusion into free space
            // apparently, some printers take the filament into account (so this is in mm3)
            // this was helpful: https://github.com/Ultimaker/GCodeGenJS/blob/master/js/gcode.js
            const filamentLength = distanceMag * this.layerHeight * this.layerHeight;//(Math.PI*filamentRadius*filamentRadius);

            //
            // safety check:
            //
            if (filamentLength > this.maxFilamentPerOperation) {
                throw Error("Too much filament in move:" + filamentLength);
            }
            if (!Printer.extrusionInmm3[this.model]) {
                filamentLength /= (filamentRadius * filamentRadius * Math.PI);
            }

            //console.log("filament speed: " + filamentSpeed);
            //console.log("filament distance : " + filamentLength + "/" + dist);

            distanceVec.axes.e = filamentLength;
            newPosition.axes.e = this.e + distanceVec.axes.e;
        }

        const velocity = Vector.div(distanceVec, distanceMag);
        const moveTime = distanceMag / this.printSpeed; // in sec, doesn't matter that new 'e' not taken into account because it's not in firmware

        this.totalMoveTime += moveTime; // update total movement time for the printer

        this._heading = Math.atan2(velocity.axes.y, velocity.axes.x);
        //this._elevation = Math.asin(velocity.axes.z); // removed because it was non-intuitive

        console.log("time: " + moveTime + " / dist:" + distanceMag);

        //
        // BREAK AT LARGE MOVES
        //
        if (moveTime > this.maxTimePerOperation) {
            throw Error("move time too long:" + moveTime);
        }

        const nozzleSpeed = Vector.div(distanceVec, moveTime);
        //
        // safety checks
        //
        if (nozzleSpeed.axes.x > this.maxSpeed["x"]) {
            throw Error("X travel too fast:" + nozzleSpeed.axes.x);
        }
        if (nozzleSpeed.axes.y > this.maxSpeed["y"]) {
            throw Error("Y travel too fast:" + nozzleSpeed.axes.y);
        }
        if (nozzleSpeed.axes.z > this.maxSpeed["z"]) {
            throw Error("Z travel too fast:" + nozzleSpeed.axes.z);
        }
        if (nozzleSpeed.axes.e > this.maxSpeed["e"]) {
            throw Error("Z travel too fast:" + nozzleSpeed.axes.z);
        }

        // Handle movements outside printer boundaries if there's a need.
        // Tail recursive.
        //
        this._extrude(velocity, distanceMag, retract);

        return this;
    } // end extrudeto

    /**
     * Send movement update GCode to printer based on current position (this.x,y,z).
     * 
     * @param {boolean} retract if true (default) add GCode for retraction/unretraction. Will use either hardware or software retraction if set in Printer object
     * */
    sendExtrusionGCode(retract = true) {
        //unretract first if needed
        if (!this.firmwareRetract && this.currentRetraction) {
            this.e += this.currentRetraction;
            // account for previous retraction
            this.send("G1 " + "E" + this.e.toFixed(4) + " F" + this.retractSpeed.toFixed(4));
            this.currentRetraction = 0;
        }
        // unretract
        if (this.firmwareRetract && this.currentRetraction > 0) { // ugh what an ungly check
            this.send("G11");
            this.currentRetraction = 0;
        }
        // G1 - Coordinated Movement X Y Z E
        let moveCode = ["G1"];
        moveCode.push("X" + this.x.toFixed(4));
        moveCode.push("Y" + this.y.toFixed(4));
        moveCode.push("Z" + this.z.toFixed(4));
        moveCode.push("E" + this.e.toFixed(4));
        moveCode.push("F" + (this.printSpeed * 60).toFixed(4)); // mm/s to mm/min
        this.send(moveCode.join(" "));

        // RETRACT
        if (retract && this.retractLength) {
            if (this.firmwareRetract) {
                this.send("G10");
                this.currentRetraction = this.retractLength; // this is handled in hardware                       
            } else {
                this.currentRetraction = this.retractLength;
                this.e -= this.currentRetraction;
                this.send("G1 " + "E" + this.e.toFixed(4) + " F" + this.retractSpeed.toFixed(4));
            }
        }
    } // end sendExtrusionGCode


    // TODO: have this chop up moves and call a callback function each time,
    // like in _extrude
    //             
    // call movement callback function with this lp object
    // if(that.moveCallback)
    //        that.moveCallback(that);

    /**
     * Extrude plastic from the printer head, relative to the current print head position, within printer bounds
     * @param {Object} params Parameters dictionary containing either x,y,z keys or direction/angle (radians) keys and retract setting (true/false).
     * @returns {Printer} reference to this object for chaining
     */
    extrude(params) {
        // first, handle distance/angle mode
        if (params.dist !== undefined) {
            params.dist = parseFloat(params.dist);

            if (params.angle === undefined) {
                params.angle = this.heading; // use current heading angle
            }
            else {
                params.angle = parseFloat(params.angle);
            }
            params.x = params.dist * Math.cos(params.angle);
            params.y = params.dist * Math.sin(params.angle);
            if (params.elev === undefined) {
                params.elev = this.elevation; // use current elevation angle
            }
            params.z = params.dist * Math.sin(parseFloat(params.elev));
            params.e = (params.e !== undefined) ? parseFloat(params.e) + this.e : undefined;
        }
        //otherwise, handle cartesian coordinates mode
        else {
            params.x = (params.x !== undefined) ? parseFloat(params.x) + this.x : this.x;
            params.y = (params.y !== undefined) ? parseFloat(params.y) + this.y : this.y;
            params.z = (params.z !== undefined) ? parseFloat(params.z) + this.z : this.z;
            params.e = (params.e !== undefined) ? parseFloat(params.e) + this.e : undefined;
        }

        // extrude using absolute cartesian coords
        return this.extrudeto(params);
    } // end extrude


    /**
     * Relative movement.
     * @param {any} params Can be specified as x,y,z,e or dist (distance), angle (xy plane), elev (z dir). All in mm.
     * @returns {Printer} reference to this object for chaining
     */
    move(params) {
        params.e = 0; // no filament extrusion
        params.retract = false;
        return this.extrude(params);
    }

    /**
     * Absolute movement.
     * @param {any} params Can be specified as x,y,z,e. All in mm.
     * @returns {Printer} reference to this object for chaining
     */
    moveto(params) {
        params.e = this.e; // keep filament at current position
        params.retract = false;
        return this.extrudeto(params);
    }

    /**
     * Turn (clockwise positive, CCW negative)
     * @param {Number} angle in degrees by default
     * @param {Boolean} radians use radians if true
     * @returns {Printer} reference to this object for chaining
     * @example
     * Turn 45 degrees twice (so 90 total) and extrude 40 mm in that direction:
     * lp.turn(45).turn(45).distance(40).go(1);
     */
    turn(angle, radians = false) {
        let a = angle;

        if (!radians) {
            a = this.d2r(angle);
        }

        this._heading += a;
        return this;
    }

    /**
     * Degrees to radians conversion.
     * @param {float} angle in degrees
     * @returns {float} angle in radians
     */
    d2r(angle) {
        return Math.PI * angle / 180;
    }

    /**
     * Convert MIDI notes and duration into direction and angle for future movement.
     * Low notes below 10 are treated a pauses.
     * @param {float} note as midi note
     * @param {float} time in ms
     * @param {string} axes move direction as x,y,z (default "x") 
     * @returns {Printer} reference to this object for chaining
     * @example
     * Play MIDI note 41 for 400ms on the x & y axes
     *     lp.note(41, 400, "xy").go();
     */
    note(note=40, time=200, axes="x") {
        const a = [];
        a.push(...axes); // turn into array of axes
        // total movement
        let totalSpeed = 0;
        let yangle = 0, xangle = 0, zangle = 0;

        for (const axis of a) {
            // low notes below 10 are treated as pauses
            if (note < 10) {
                // set the next movement as a wait
                this._waitTime = time;
                break;
            }
            else {
                let _speed = this.midi2speed(note, axis); // mm/s

                totalSpeed += _speed * _speed;

                if (axis === "x") {
                    if (this._heading < Math.PI / 2 && this._heading > -Math.PI / 2) xangle = -90;
                    else xangle = 90;
                } else if (axis === "y") {
                    if (this._heading > 0 && this._heading < Math.PI) yangle = 90;
                    else yangle = -90;
                }
                else if (axis === "z") {
                    if (this._elevation > 0) zangle = 90;
                    else zangle = -90;
                }
            }
        }
        // combine all separate distances and speeds into one
        this._heading = Math.atan2(yangle, xangle);
        this._elevation = zangle;
        this.printSpeed = Math.sqrt(totalSpeed);
        this._distance = this.printSpeed * time / 1000; // time in ms

        return this;
    }

    /**
     * Fills an area based on layerHeight (as thickness of each line)
     * @param {float} w width of the area in mm
     * @param {float} h height of the area in mm
     * @param {float} lh the layerheight (or gap, if larger)
     * @returns {Printer} reference to this object for chaining
     */
    fill(w, h, lh = this.layerHeight) {
        let inc = lh * Math.PI; // not totally sure why this works, but experimentally it does
        for (var i = 0, y = 0; y < h; i++ , y += inc) {
            let m = (i % 2 === 0) ? 1 : -1;
            this.move({ y: inc });
            this.extrude({ x: m * w });
        }
        return this;
    }

    /**
     * @param {number} note as midi note 
     * @param {string} axis of movement: x,y,z 
     * @returns {float} speed in mm/s
     */
    midi2speed(note, axis) {
        // MIDI note 69     = A4(440Hz)
        // 2 to the power (69-69) / 12 * 440 = A4 440Hz
        // 2 to the power (64-69) / 12 * 440 = E4 329.627Hz
        // Ultimaker:
        // 47.069852, 47.069852, 160.0,
        //freq_xyz[j] = Math.pow(2.0, (note-69)/12.0)*440.0 

        let freq = Math.pow(2.0, (note - 69) / 12.0) * 440.0;
        let speed = freq / parseFloat(this.speedScale()[axis]);

        return speed;
    }

    /**
     * Calculate the tool speed in mm/s based on midi note
     * @param {float} note midi note
     * @param {string} axis axis (x,y,z,e) of movement 
     * @returns {float} tool speed in mm/s
     */
    m2s(note, axis) {
        return this.midi2speed(note, axis);
    }

    /**
     * Convenience function for getting speed scales for midi notes from printer model.
     * @returns {object} x,y,z speed scales
     */ 
    speedScale() {
        let bs = Printer.speedScale[this.model];
        return { "x": bs["x"], "y": bs["y"], "z": bs["z"] };
    }

    /**
     * Causes the printer to wait for a number of milliseconds
     * @param {float} ms to wait
     * @returns {Printer} reference to this object for chaining
     */
    wait(ms = this._waitTime) {
        this.send("M0 P" + ms);
        this._waitTime = 0;
        return this;
    }

    /**
     * Temporarily pause the printer: move the head up, turn off fan & temp
     * @returns {Printer} reference to this object for chaining
     */
    pause() {
        // retract filament, turn off fan and heater wait
        this.extrude({ e: -16, speed: 250 });
        this.move({ z: -3 });
        this.send("M104 S0"); // turn off temp
        this.send("M107 S0"); // turn off fan
        return this;
    }

    /**
     * Resume the printer printing: turn on fan & temp
     * @param {float} temp target temp
     * @returns {Printer} reference to this object for chaining
     */
    resume(temp = "190") {
        this.send("M109 S" + temp); // turn on temp, but wait until full temp reached
        this.send("M106 S100"); // turn on fan
        this.extrude({ e: 16, speed: 250 });
        return this;
    }
    // end Printer class
}


// defined outside class because we have to

/**
 * Tail-recursive extrusion function.  Don't call this directly. Uses {@link https://github.com/glathoud/fext fext}
 * See [extrudeto()]{@link Printer#extrudeto}
 * @function
 * @param {Vector} moveVector
 * @param {Number} leftToMove
 * @returns {Boolean} false when done
 * @memberof Printer
 */
Printer.prototype._extrude = meth("_extrude", function (that, moveVector, leftToMove, retract) {
    // if there's nowhere to move, return
    //console.log(that);
    //console.log("left to move:" + leftToMove);
    //console.log(moveVector);

    if (isNaN(leftToMove) || leftToMove < 0.08) {
        return false;
    }

    let amountMoved = Math.min(leftToMove, that.maxMovePerCycle);

    // calculate next position
    let nextPosition = Vector.add(that.position, Vector.mult(moveVector, amountMoved));

    //console.log("VECTOR:");
    //console.log(moveVector);

    //console.log("CURRENT:");
    //console.log(that.position);

    //console.log("NEXT:");
    //console.log(nextPosition);

    if (that.boundaryMode === "bounce") {
        let moved = new Vector();
        let outsideBounds = false; 

        // calculate movement time per axis, based on printer bounds

        for (const axis in nextPosition.axes) {
            // TODO:
            // for each axis, see where it intersects the printer bounds
            // then, using velocity, get other axes positions at that point
            // if any of them are over, skip to next axis
            if (axis !== "e")
            {
                if (nextPosition.axes[axis] > that.maxPosition.axes[axis]) {
                    // hit - calculate up to min position
                    moved.axes[axis] = (that.maxPosition.axes[axis] - that.position.axes[axis]) / moveVector.axes[axis];
                    outsideBounds = true;
                } else if (nextPosition.axes[axis] < that.minPosition.axes[axis]) {
                    // hit - calculate up to min position
                    moved.axes[axis] = (that.minPosition.axes[axis] - that.position.axes[axis]) / moveVector.axes[axis];
                    outsideBounds = true;
                }
            }            //else {
            //    moved.axes[axis] = nextPosition.axes[axis] - that.position.axes[axis];
            //}
        }
        //console.log("moved:");
        //console.log(moved);

        if (outsideBounds) {
            let shortestAxisTime = 99999;
            let shortestAxes = [];

            // find shortest time before an axis was hit
            // if it hits two (or more?) at the same time, mark both
            for (const axis in moved.axes) {
                if (moved.axes[axis] === shortestAxisTime) {
                    shortestAxes.push(axis);
                } else if (moved.axes[axis] < shortestAxisTime) {
                    shortestAxes = [axis];
                    shortestAxisTime = moved.axes[axis];
                }
            }
            //console.log("shortest axis:");
            //console.log(shortestAxes);
            //console.log("shortest axis TIME:");
            //console.log(shortestAxisTime);


            const amountMovedVec = Vector.mult(moveVector, shortestAxisTime);
            amountMoved = amountMovedVec.mag();
            //console.log("amt moved:" + amountMoved + " / " + leftToMove);
            //console.log("next:");
            //console.log(nextPosition);
            nextPosition.axes = that.clipToPrinterBounds(Vector.add(that.position, amountMovedVec).axes);
            //console.log(nextPosition);

            // reverse velocity if axis bounds hit, for shortest axis
            for (const axis of shortestAxes) {
                moveVector.axes[axis] = moveVector.axes[axis] * -1;
            }
        }
    } else {
        that.clipToPrinterBounds(nextPosition.axes);
    }
    leftToMove -= amountMoved;


    // update current position
    //console.log("current pos:")
    //console.log(that.position);
    that._heading = Math.atan2(moveVector.axes.y, moveVector.axes.x);
    // DON'T DO THIS ANYMORE... counter-intuitive!
    //that._elevation = Math.asin(moveVector.axes.z);
    that.position.set(nextPosition);
    //console.log("next pos:");
    //console.log(nextPosition);
    //console.log(that.position);
    //console.log(that);

    that.sendExtrusionGCode(retract);

    // Tail recursive, until target x,y,z is hit
    //
    return mret(that._extrude, moveVector, leftToMove, retract);
    //return false;

} // end _extrude 
);


// TODO: this is dumb.  SHould be in another data model class called "printer model"

// supported printers
Printer.UM2 = "UM2";
Printer.UM2plus = "UM2plus";
Printer.UM2plusExt = "UM2plusExt";
Printer.UM3 = "UM3";
Printer.REPRAP = "REP";

Printer.PRINTERS = [Printer.UM2, Printer.UM3, Printer.REPRAP];

// dictionary of first GCODE sent to printer at start
Printer.GCODE_HEADERS = {};
Printer.GCODE_HEADERS[Printer.UM2] = [
    ";FLAVOR:UltiGCode",
    ";TIME:1",
    ";MATERIAL:1"
];
Printer.GCODE_HEADERS[Printer.UM2plus] = [
    ";FLAVOR:UltiGCode",
    ";TIME:1",
    ";MATERIAL:1"
];

Printer.GCODE_HEADERS[Printer.UM3] = [
    ";START_OF_HEADER",
    ";HEADER_VERSION:0.1",
    ";FLAVOR:Griffin",
    ";GENERATOR.NAME:GCodeGenJS",
    ";GENERATOR.VERSION:?",
    ";GENERATOR.BUILD_DATE:2016-11-26",
    ";TARGET_MACHINE.NAME:Ultimaker Jedi",
    ";EXTRUDER_TRAIN.0.INITIAL_TEMPERATURE:200",
    ";EXTRUDER_TRAIN.0.MATERIAL.VOLUME_USED:1",
    ";EXTRUDER_TRAIN.0.NOZZLE.DIAMETER:0.4",
    ";BUILD_PLATE.INITIAL_TEMPERATURE:0",
    ";PRINT.TIME:1",
    ";PRINT.SIZE.MIN.X:0",
    ";PRINT.SIZE.MIN.Y:0",
    ";PRINT.SIZE.MIN.Z:0",
    ";PRINT.SIZE.MAX.X:215",
    ";PRINT.SIZE.MAX.Y:215",
    ";PRINT.SIZE.MAX.Z:200",
    ";END_OF_HEADER",
    "G92 E0"
];
Printer.GCODE_HEADERS[Printer.REPRAP] = [
    ";RepRap target",
    "G28",
    "G92 E0"
];

Printer.filamentDiameter = {};
Printer.filamentDiameter[Printer.UM2] = Printer.filamentDiameter[Printer.UM2plus] =
    Printer.filamentDiameter[Printer.REPRAP] = 2.85;
Printer.extrusionInmm3 = {};
Printer.extrusionInmm3[Printer.UM2] = Printer.extrusionInmm3[Printer.REPRAP] = false;
Printer.extrusionInmm3[Printer.UM2plus] = Printer.extrusionInmm3[Printer.UM3] = true;

// TODO: FIX THESE!
// https://ultimaker.com/en/products/ultimaker-2-plus/specifications

// TODO: check these: there are max speeds for each motor (x,y,z,e)

Printer.maxTravelSpeed = {};

Printer.maxTravelSpeed[Printer.UM3] =
    Printer.maxTravelSpeed[Printer.UM2plus] =
    Printer.maxTravelSpeed[Printer.UM2] = { 'x': 300, 'y': 300, 'z': 80, 'e': 45 };
Printer.maxTravelSpeed[Printer.REPRAP] = { 'x': 300, 'y': 300, 'z': 80, 'e': 45 };

Printer.maxPrintSpeed = {};
Printer.maxPrintSpeed[Printer.UM2] =
    Printer.maxPrintSpeed[Printer.REPRAP] = { 'x': 150, 'y': 150, 'z': 80, 'e': 45 };
Printer.maxPrintSpeed[Printer.UM3] = Printer.maxPrintSpeed[Printer.UM2plus] = { 'x': 150, 'y': 150, 'z': 80, 'e': 45 };

Printer.bedSize = {};
Printer.bedSize[Printer.UM2plus] = Printer.bedSize[Printer.UM2]
    = Printer.bedSize[Printer.UM3] = { 'x': 223, 'y': 223, 'z': 205 };
Printer.bedSize[Printer.UM2plusExt] = { 'x': 223, 'y': 223, 'z': 305 };
Printer.bedSize[Printer.REPRAP] = { 'x': 150, 'y': 150, 'z': 80 };

Printer.defaultPrintSpeed = 30; // mm/s

Printer.speedScale = {};
Printer.speedScale[Printer.UM2] = { 'x': 47.069852, 'y': 47.069852, 'z': 160.0 };
Printer.speedScale[Printer.UM2plus] = { 'x': 47.069852, 'y': 47.069852, 'z': 160.0 };

        //////////////////////////////////////////////////////////
