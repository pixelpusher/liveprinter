/**
 * Core Printer API of LivePrinter, an interactive programming system for live CNC manufacturing.
 * @version 1.0
 * @example <caption>Log GCode to console:</caption>
 * let printer = new Printer(msg => console.log(msg)); * Communications between server, GUI, and events functionality for LivePrinter.
 * @author Evan Raskob <evanraskob+nosp4m@gmail.com>
 * @version 1.0
 * @license
 * Copyright (c) 2022 Evan Raskob and others
 * Licensed under the GNU Affero 3.0 License (the "License"); you may
* not use this file except in compliance with the License. You may obtain
* a copy of the License at
*
*     {@link https://www.gnu.org/licenses/gpl-3.0.en.html}
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
* WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
* License for the specific language governing permissions and limitations
* under the License.
*/
 
import { Vector } from 'liveprinter-utils';

/**
 * Core Printer API of LivePrinter, an interactive programming system for live CNC manufacturing.
 * @typicalname lp
 */
class Printer {

    ///////
    // Printer API /////////////////
    ///////

    /**
     * Create new instance, passing a function for sending messages
     * @constructor
     */
    constructor() {

        /////---------------------------------------------
        // Shortcuts --------------------------------------
        this.ext = this.extrude;
        this.ext2 = this.extrudeto;
        this.mov = this.move;
        this.mov2 = this.moveto;
        this.tur = this.turn;
        this.tur2 = this.turnto;
        this.ret = this.retract;
        this.unret = this.unretract;

        this.gcodeListeners = []; // will be notified of gcode events
        this.errorListeners = []; // will be notified of error events

        this._layerHeight = 0.2; // thickness of a 3d printed extrudion, mm by default
        this.lastSpeed = -1.0;

        ////////////////////////////////////////////
        // these are used in in the go() function
        this._heading = 0;   // current angle of movement (xy) in radians
        this._elevation = Math.PI / 2; // current angle of elevated movement (z) in radians, starts up
        this._distance = 0; // next L/R distance to move
        this._zdistance = 0; // next up/down distance to move
        this._waitTime = 0;
        this._autoRetract = true; // automatically unretract/retract - see get/set autoretract
        this._bpm = 120; // for beat-based movements
        ////////////////////////////////////////////

        this.totalMoveTime = 0; // time spent moving/extruding

        this.maxFilamentPerOperation = 30; // safety check to keep from using all filament, in mm
        this.minFilamentPerOperation = 0.005; // sanity check to keep from grinding filament, in mm
        
        this.maxTimePerOperation = 15; // prevent very long operations, by accident - this is in seconds

        // NOTE: disabled for now to use hardware retraction settings
        this.currentRetraction = 0; // length currently retracted
        this.retractLength = 8.5; // in mm - amount to retract after extrusion.  This is high because most moves are slow...
        this._retractSpeed = 30 * 60; //mm/min, see getter/setter
        this.firmwareRetract = false;    // use Marlin or printer for retraction
        this.extraUnretract = 0; // extra amount to unretract each time (recovery filament) in mm
        this.unretractZHop = 0; //little z-direction hop on retracting to avoid blobs, in mm

        /**
         * What to do when movement or extrusion commands are out of machine bounds.
         * Can be clip (keep printing inside edges), bounce (bounce off edges), stop
         */
        this.boundaryMode = "stop";

        this.maxMovePerCycle = 200; // max mm to move per calculation (see _extrude method)
        this.setProperties();
    }

    /**
     * Set default properties for the printer based on the printer model, e.g. bed size, speeds
     * @param {String} model Valid model from Printer class
     */
    setProperties(model = Printer.UM2plus) {
        // TODO: not sure about this being valid - maybe check for max speed?
        this._printSpeed = Printer.defaultPrintSpeed;
        this._model = model; // default
        this._travelSpeed = Printer.maxTravelSpeed[this._model].z;

        this.minPosition = new Vector({
            x: 0, // x position in mm
            y: 0,// y position in mm
            z: 0, // z position in mm
            e: -99999
        });

        this.maxPosition = new Vector({
            x: Printer.bedSize[this._model]["x"], // x position in mm
            y: Printer.bedSize[this._model]["y"], // y position in mm
            z: Printer.bedSize[this._model]["z"], // z position in mm
            e: 999999
        });

        this.position = new Vector({
            x: this.minPosition.axes.x, // x position in mm
            y: this.minPosition.axes.y, // y position in mm
            z: this.minPosition.axes.z, // z position in mm
            e: 0
        });
    }

    /**
     *  Notify listeners that GCode is ready to be consumed.
     *  @param {String} gcode GCode command string to send
     *  @returns{any} Nothing.
     */
    async gcodeEvent(gcode) {
        const results = await Promise.all(this.gcodeListeners.map(async (l) => l.gcodeEvent(gcode)));
    }

    //
    // shorthand for livecoding
    //
    async gcode(gc) {
        return this.gcodeEvent(gc); 
    }

    /**
     *  Notify listeners that an error has taken place.
     *  @param {Error} err GCode command string to send
     *  @returns{any} Nothing.
     */
    async errorEvent(err) {
        const results = await Promise.all(this.errorListeners.map(async (el) => el.errorEvent(gcode)));
    }

    addGCodeListener(gl) {
        if (this.gcodeListeners.indexOf(gl) < 0){
            this.gcodeListeners.push(gl);
        }
    }

    addErrorListener(gl) {
        if (this.errorListeners.indexOf(gl) < 0){
            this.errorListeners.push(gl);
        }
    }

    removeGCodeListener(gl) {
        const index = this.gcodeListeners.indexOf(gl);
        if (index > -1) {
            this.gcodeListeners.splice(index,1);
        }
    }

    removeErrorListener(gl) {
        const index = this.errorListeners.indexOf(gl);
        if (index > -1) {
            this.errorListeners.splice(index,1);
        }
    }

    /// -------------------------------------------------------------------
    /// -------- getters/setters - note these are lower case -------------- 
    /// ----------------  on purpose for easier typing --------------------
    /// -------------------------------------------------------------------

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

    set optime(t) { this.maxTimePerOperation = t; }
    get optime() { return this.maxTimePerOperation; }

    /**
     * set printer model (See Printer class for valid ones)
     * @param {String} m Valid model from Printer class
     * @see setProperties()
     */
    set model(m) {
        // TODO: check valid model
        this.setProperties(m);

        // if invalid, throw exception
    }
    get model() { return this._model; }

    /**
     * Set printing speed.
     * @param {Number} s speed 
     * @returns Number
     */
    printspeed(s) {
        if (s !== undefined) {
            let maxs = Printer.maxPrintSpeed[this._model];
            this._printSpeed = Math.min(parseFloat(s), parseFloat(maxs.x)); // pick in x direction...
        }
        return this._printSpeed;
    }
    
    /**
     * Shortcut for printspeed
     * @param {Number} s speed 
     * @returns {Number} speed in mm/s     
     */
    psp(s) {
        return this.printspeed(s);
    }
    /**
     * Shortcut for printspeed for consistency when using "draw" functions
     * @param {Number} s speed 
     * @returns {Number} speed in mm/s     
     */
     drawspeed(s) {
        return this.printspeed(s);
    }
    /**
     * Shortcut for printspeed for consistency when using "draw" functions
     * @param {Number} s speed 
     * @returns {Number} speed in mm/s     
     */
    dsp(s) {
        return this.printspeed(s);
    }

    /**
     * Set travel speed.
     * @param {Number} s speed 
     * @returns {Number} speed in mm/s     
     */
     travelspeed(s) {
        if (s !== undefined) {
            let maxs = Printer.maxTravelSpeed[this._model];
            this._travelSpeed = Math.min(parseFloat(s), parseFloat(maxs.x)); // pick in x direction...
        }
        return this._travelSpeed;
    }
    // shortcut
    tsp(s) {
        return this.travelspeed(s);
    }

    /**
     * Set both travel and printing speeds at once.
     * @param {Number} s speed 
     * @returns {Number} speed in mm/s
     */
    speed(s) {
        return this.printspeed(this.travelspeed(s));
    }

    get maxspeed() { return Printer.maxPrintSpeed[this._model].x; } // in mm/s

    get extents() {
        return this.maxPosition.axes;
    }
    /**
     * Set automatic retraction state
     * @param {Boolean} state 
     * @returns Boolean automatic retraction state
     */
    autoretract(state = true) {
        if (state) {
            this._autoRetract = state;
        } else {
            this._autoRetract = false;
        }
        return this._autoRetract;
    }

    /**
     * Get the center horizontal (x) position on the bed
     */
    get cx() {
        return this.minx + (this.maxx - this.minx) / 2;
    }
    /**
     * Get the center vertical (y) position on the bed,
     */
    get cy() {
        return this.miny + (this.maxy - this.miny) / 2;
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
     * Return internal angle in degrees (because everything is in degrees unless otherwise specified) 
     */
    get angle() {
        return this.r2d(this._heading);
    }

    /**
     * Set the internal direction of movement for the next operation in degrees.
     * @param {float} ang Angle of movement (in xy plane) in degrees
     */
    set angle(ang) {
        this._heading = this.d2r(ang);
    }

    /**
     * Return internal angle in radians 
     */
    get angler() {
        return this._heading;
    }

    /**
     * Set the internal direction of movement for the next operation in radians.
     * @param {float} ang Angle of movement (in xy plane) in radians
     */
    set angler(ang) {
        this._heading = ang;
    }

    /**
     * set bpm for printer, for calculating beat-based movements
     */
    bpm(beats) {
        this._bpm = beats;
    } 

    /**
     * set bpm for printer, for calculating beat-based movements
     */
    bpm() {
        return this._bpm;
    } 
    
    /**
     * Retraction speed - updates firmware on printer too
     * @param {Number} s Option speed in mm/s to set, otherwise just get
     */
    async retractspeed(s) {
        if (s !== undefined) {
            this._retractSpeed = s * 60;
            await this.sendFirmwareRetractSettings();
        }
        return this._retractSpeed;
    }

    /**
     * Set the extrusion thickness (in mm)
     * @param {float} val thickness of the extruded line in mm
     * @returns {Printer} reference to this object for chaining
     */
    thick(val) {
        if (val !== undefined)
            this.layerHeight = parseFloat(val);
        return this.layerHeight;
    }

    /**
     * Send the current retract settings to the printer (useful when updating the retraction settings locally)
     * @returns {Printer} reference to this object for chaining
    */
    async sendFirmwareRetractSettings() {
        // update firmware retract settings
        await this.gcodeEvent("M207 S" + this.retractLength.toFixed(2) + " F" + this._retractSpeed.toFixed(2) + " Z" + this.unretractZHop.toFixed(2));
        //set retract recover
        await this.gcodeEvent("M208 S" + (this.retractLength.toFixed(2) + this.extraUnretract.toFixed(2)) + " F" + this._retractSpeed.toFixed(2));

        return this;
    }

    /**
     * Immediately perform a "retract" which is a shortcut for just moving the filament back up at a speed.  Sets the internal retract variables to those passed in.
     * @param {Number} len Length of filament to retract.  Set to 0 to use current setting (or leave out)
     * @param {Number} speed (optional) Speed of retraction. Will be clipped to max filament feed speed for printer model.
     * @returns {Printer} reference to this object for chaining
     */
    async retract(len = this.retractLength, speed) {
        if (this.currentRetraction > 0) return; // don't retract twice!

        if (len < 0) throw new Error("[API] retract length can't be less than 0: " + len);
        let lengthUpdated = false;
        if (len !== this.retractLength) lengthUpdated = true;
        this.retractLength = len;

        let speedUpdated = false;
        if (speed !== undefined) {
            if (speed <= 0) throw new Error("[API] retract speed can't be 0 or less: " + speed);
            // set speed safely!
            if (speed > Printer.maxPrintSpeed["e"]) throw new Error("[API] retract speed to high: " + speed);
            speedUpdated = true;
            this._retractSpeed = speed * 60; // avoid calling next line twice
        }

        // RETRACT        
        this.currentRetraction = this.retractLength;
        this.e -= this.currentRetraction;

        if (!this.firmwareRetract) {
            const fixedE = this.e.toFixed(4);
            await this.gcodeEvent("G1 " + "E" + fixedE + " F" + this._retractSpeed.toFixed(4));
            this.e = parseFloat(fixedE); // make sure e is actually e even with rounding errors!
        } else {
            if (speedUpdated || lengthUpdated) await this.sendFirmwareRetractSettings();// might slow things down...
            // retract via firmware otherwise
            await this.gcodeEvent("G10");
        }

        return this;
    }

    /**
     * Immediately perform an "unretract" which is a shortcut for just extruding the filament out at a speed.  Sets the internal retract variables to those passed in.
     * @param {Number} len Length of filament to unretract.  Set to 0 to use current setting (or leave out)
     * @param {Number} speed (optional) Speed of unretraction. Will be clipped to max filament feed speed for printer model.
     * @returns {Printer} reference to this object for chaining
     */
    async unretract(len = this.currentRetraction, speed) {
        if (this.currentRetraction < 0.01) 
        {
            //loginfo('no unretract:' + len + '/' + this.currentRetraction);
            return; // don't unretract if we don't have to!
        }
        if (len < 0) throw new Error("[API] retract length can't be less than 0: " + len);

        let lengthUpdated = false;
        if (len !== this.retractLength) lengthUpdated = true;
        this.retractLength = len;

        let speedUpdated = false;
        if (speed !== undefined) {
            if (speed <= 0) throw new Error("[API] retract speed can't be 0 or less: " + speed);
            // set speed safely!
            if (speed > Printer.maxPrintSpeed["e"]) throw new Error("[API] retract speed too high: " + speed);
            speedUpdated = true;
            this._retractSpeed = speed * 60;
        }

        this.e += this.retractLength + this.extraUnretract;

        //unretract manually first if needed
        if (!this.firmwareRetract) {
            // if we don't do this first, things get out of sync when chaining. Not ideal
            this.e = parseFloat(this.e.toFixed(4));
            this.currentRetraction = 0;

            // account for previous retraction
            await this.gcodeEvent("; unretract");
            await this.gcodeEvent("G1 " + "E" + this.e + " F" + this._retractSpeed.toFixed(4));

        } else {
            if (speedUpdated || lengthUpdated) await this.sendFirmwareRetractSettings();// might slow things down...

            // unretract via firmware otherwise
            await this.gcodeEvent("G11");
        }
        //this.e = parseFloat(this.e.toFixed(4));
        

        return this;
    }


    /**
     * Performs a quick startup by resetting the axes and moving the head
     * to printing position (layerheight).
     * @param {float} hotEndTemp is the temperature to start warming hot end up to (only 1 supported)
     * @param {float} bedTemp is the temperature to start warming bed up to
     * @returns {Printer} reference to this object for chaining
     */
    async start(hotEndTemp = "190", bedTemp = "50") {
        await this.gcodeEvent("G28");
        await this.gcodeEvent("M114"); // get current position
        await this.gcodeEvent("M106 S0"); // set fan to full
        await this.gcodeEvent("M104 S" + hotEndTemp); //heater 1 temp
        //this.gcodeEvent("M140 S" + bedTemp); // bed temp
        await this.sendFirmwareRetractSettings();
        this.x = 0;
        this.y = this.maxy;
        this.z = this.maxz;

        this.printspeed(Printer.defaultPrintSpeed);
        this.travelspeed(Printer.defaultPrintSpeed);
        await this.sync();
        //this.moveto({ x: this.cx, y: this.cy, z: this.maxz, speed: Printer.defaultPrintSpeed });
        //this.gcodeEvent("M106 S100"); // set fan to full

        return this;
    }



    /**
     * Set hot end temperature, don't block other operation.
     * to printing position (layerheight).
     * @param {float} temp is the temperature to start warming up to
     * @returns {Printer} reference to this object for chaining
     */
    async temp(temp = "190") {
        await this.gcodeEvent("M104 S" + temp);
        return this;
    }

    /**
     * Set bed temperature, don't block other operation.
     * to printing position (layerheight).
     * @param {float} temp is the temperature to start warming up to
     * @returns {Printer} reference to this object for chaining
     */
    async bed(temp = "190") {
        await this.gcodeEvent("M140 S" + temp);
        return this;
    }

    /**
     * Set fan speed.
     * @param {float} speed is the speed from 0-100 
     * @returns {Printer} reference to this object for chaining
     */
    async  fan(speed = "100") {
        await this.gcodeEvent("M106 S" + speed);
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
     * Execute a movement (extrusion or travel) based on the internally-set 
     *  direction/elevation/distance.
     * @param {Boolean} extruding Whether to extrude whilst moving (true if yes, false if not)
     * @param {Boolean} retract Whether to retract at end (usually automatic). Set to 0 or false 
     *  if executing a few moves in a sequence
     * @returns {Printer} reference to this object for chaining
     */
    async go(extruding = false, retract) 
    {
        let params = {}; // params for passing to extrudeto

        // wait, if necessary
        if (this._waitTime > 0) {
            return this.wait();
        }
        
        // retraction can be forced, or is automagic if undefined
        if (retract !== undefined) params.retract = retract;

        // take into account stored distance, angle, elevation and
        // add to current position (cartesian), then clear and
        // run extrudeto function

        let horizDist = this._distance;
        // add projection of vertical distance into horizontal plane.
        // vertical distances are specified absolutely, so we need to find corresponding
        // horizontal distance using the tangent
        if (Math.abs(this._zdistance) > Number.EPSILON) {
            let horizProjection = this._zdistance / Math.tan(this._elevation);
            if (Math.abs(horizProjection) > 0.001) // smallest moveable unit, in mm
                horizDist += horizProjection;
        }
        const vertDist = this._zdistance;

        params.x = this.x + horizDist * Math.cos(this._heading);
        params.y = this.y + horizDist * Math.sin(this._heading);
        params.z = this.z + vertDist; // this is set separately in tiltup
        if (!extruding) {
            params.e = this.e; // e stays same
            params.speed = this._travelSpeed;
        }

        // debugging
        //let _div = Math.sqrt(params.x * params.x + params.y * params.y);
        //let _normx = params.x / _div;
        //let _normy = params.y / _div;

        /* for debugging -- test if start and end are same
        console.log("[go] end position:" + (this.x + params.x) + "," + (this.y + params.y) + "," + (this.z + params.z) + "," + params.e);
        console.log("[go] move vec:" + _normx + ", " + _normy);
        */

        // reset distance to 0 because we've used in calculating new position
        this._distance = 0;
        this._zdistance = 0;
        this._elevation = 0;

        //everything else handled in extrudeto
        return this.extrudeto(params);
    }

    /**
     * Set/get layer height safely and easily.
     *
     * @param {float} height layer height in mm
     * @returns {Printer} Reference to this object for chaining
     */
    set layerHeight(height) {
        this._layerHeight = Math.max(Printer.MinLayerHeight, height);
    }
    //shortcut
    set lh(height) {
        this._layerHeight = Math.max(Printer.MinLayerHeight, height);
    }
    get layerHeight() {
        return this._layerHeight;
    }
    //shortcut
    get lh() {
        return this._layerHeight;
    }

    /**
     * Return the current angle of movement
     * @param {Boolean} radians true if you want it in radians (default is false, in degrees)
     * @returns {Number} angle of movement in degrees (default) or radians
     */
    getAngle(radians = false) {
        return radians ? this._heading : this.r2d(this._heading);
    }

    /**
     * Set the direction of movement for the next operation.
     * @param {float} ang Angle of movement (in xy plane)
     * @param {Boolean} radians use radians or not
     * @returns {Printer} Reference to this object for chaining
     */
    turnto(ang, radians = false) {
        this._heading = radians ? ang : this.d2r(ang);
        return this;
    }
    /**
     * Run a set of commands specified in a grammar (experimental.)
     * @param {String} strings commands to run - M(move),E(extrude),L(left turn),R(right turn)
     * @returns {Printer} Reference to this object for chaining
     */
    run(strings) {
        const mvChar = "M";
        const exChar = "E";
        const ltChar = "L";
        const rtChar = "R";
        const upChar = "U";
        const dnChar = "D";
        const rtrChar = "<";
        const urtrChar = ">";

        // Match whole command
        const cmdRegExp = /([a-zA-Z<>][0-9]+\.?[0-9]*)/gim;
        const subCmdRegExp = /([a-zA-Z<>])([0-9]+\.?[0-9]*)/;
        const found = strings.match(cmdRegExp);
        //console.log(found);
        for (let cmd of found) {
            //console.log(cmd);
            let matches = cmd.match(subCmdRegExp);

            if (matches.length !== 3) throw new Error("[API] Error in command string: " + found);

            const cmdChar = matches[1].toUpperCase();
            const value = parseFloat(matches[2]);

            switch (cmdChar) {
                case mvChar: this.distance(value).go();
                    break;
                case exChar: this.distance(value).go(1, false);
                    break;
                case ltChar: this.turn(value);
                    break;
                case rtChar: this.turn(-value);
                    break;
                case upChar: this.up(value).go();
                    break;
                case dnChar: this.down(value).go();
                    break;
                case rtrChar: this.retract(value);
                    break;
                case urtrChar: this.unretract(value);
                    break;
                default:
                    throw new Error("[API] Error in command - unknown command char: " + cmdChar);
            }
        }

        return this;
    }

    /**
     * Move up quickly! (in mm)
     * @param {Number} d distance in mm to move up
     * @returns {Printer} Reference to this object for chaining
     */
    async up(d, extruding = false, _retract = false) {
        if (Math.abs(this._elevation) < Number.EPSILON) this._elevation = Math.PI / 2;
        this._zdistance += d;
        return this.go(extruding, _retract);
    }


    /**
     * Move up quickly! (in mm)
     * @param {Number} d distance in mm to draw upwards
     * @returns {Printer} Reference to this object for chaining
     */
    async drawup(d, _retract) {
        if (Math.abs(this._elevation) < Number.EPSILON) this._elevation = Math.PI / 2;
        this._zdistance += d;
        return this.go(true, _retract);
    }

    // shortcut
    async dup(d, _retract) {
        return this.drawup(d, _ret);
    }

    /**
     * Move up to a specific height quickly! (in mm). It might seem silly to have both, upto and downto,
     * but conceptually when you're making something it makes sense, even if they do the same thing.
     * @param {Number} d distance in mm to move up
     * @returns {Printer} Reference to this object for chaining
     */
    async upto(d, extruding = false, _retract = false) {
        this._elevation = Math.PI / 2;
        this._zdistance = d - this.z;
        return this.go(extruding, _retract);
    }

    /**
     * Move up to a specific height quickly! (in mm)
     * @param {Number} d distance in mm to move up
     * @returns {Printer} Reference to this object for chaining
     */
    async downto(d, extruding = false, _retract = false) {
        return this.upto(d, extruding, _retract);
    }

    /**
     * Move down quickly! (in mm)
     * @param {Number} d distance in mm to move up
     * @returns {Printer} Reference to this object for chaining
     */
    async down(d, extruding = false, _retract = false) {
        if (Math.abs(this._elevation) < Number.EPSILON) this._elevation = -Math.PI / 2;

        this._zdistance += -d;
        return this.go(extruding, _retract);
    }

    /**
     * Draw downwards in mm
     * @param {Number} d distance in mm to move up
     * @returns {Printer} Reference to this object for chaining
     */
    async drawdown(d, _retract) {
        if (Math.abs(this._elevation) < Number.EPSILON) this._elevation = -Math.PI / 2;

        this._zdistance += -d;
        return this.go(true, _retract);
    }

    // shortcut
    async ddown(d, _ret) {
        return this.drawdown(d, _ret);
    }


    /**
     * Set the direction of movement for the next operation.
     * TODO: This doesn't work with other commands.  Need to implement roll, pitch, yaw? 
     * @param {float} angle elevation angle (in z direction, in degrees) for next movement
     * @param {Boolean} radians use radians or not 
     * @returns {Printer} reference to this object for chaining
     */
    elevation(angle, radians = false) {
        if (!radians) {
            angle = this.d2r(angle);
        }
        this._elevation = angle;
        return this;
    }


    /**
     * Shortcut for elevation.
     * @see elevation
     * @param {any} _elev elevation
     * @returns {Printer} reference to this object for chaining
     */
    elev(_elev) {
        return this.elevation(_elev);
    }

    /**
     * Shortcut for elevation.
     * @see elevation
     * @param {any} _elev elevation angle to tilt (degrees). 90 is up, -90 is down
     * @returns {Printer} reference to this object for chaining
     */
    tilt(_elev) {
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
     * Shortcut to travel (no extrusion) the current set distance, in the direction of movement
     * @param {float} d distance to move (if not given, the current set distance)
     * @returns {Printer} reference to this object for chaining
     */
    async travel(d) {
        if (d !== undefined) {
            this._distance = d;
        }
        return await this.go(0);
    }

    /**
     * Shortcut to draw (extrusion) the current set distance, in the direction of movement
     * @param {float} d distance to extrude (draw) (if not given, the current set distance)
     * @returns {Printer} reference to this object for chaining
     */
    async draw(d, retract) {
        if (d !== undefined) {
            this._distance = d;
        }
        return this.go(1, retract);
    }

    /**
     * Set firmware retraction on or off (for after every move).
     * @param {Boolean} state True if on, false if off
     * @returns {Printer} this printer object for chaining
     */
    async fwretract(state) {
        this.firmwareRetract = state;
        // tell firmware we're handling it, or not
        if (this.fwretract) {
            await this.gcodeEvent("M209 S" + 0);
        }
        else {
            await this.gcodeEvent("M209 S" + 1);
        }
        return this;
    }

    /**
     * Extrude a polygon starting at the current point on the curve (without retraction)
     * @param {any} r radius
     * @param {any} segs segments (more means more perfect circle)
     */
    async polygon(r, segs = 10) {
        // law of cosines
        const r2x2 = r * r * 2;
        const segAngle = Math.PI * 2 / segs;
        const arc = Math.sqrt(r2x2 - r2x2 * Math.cos(segAngle));

        const prevAutoRetract = this._autoRetract; // save previous state
        this._autoRetract = false; // turn off for this operation

        //this.turn(Math.PI / 2, true); // use radians
        // we're in the middle of segment
        //this.turn(-segAngle / 2, true); // use radians

        for (let i = 0; i < segs; i++) {
            this.turn(segAngle, true); // use radians
            await this.draw(arc);
        }

        this._autoRetract = prevAutoRetract; // turn to prev state
        if (this._autoRetract) await this.retract();
        return this;
    }

    /**
     * Extrude a rectangle with the current point as its centre
     * @param {any} w width
     * @param {any} h height
     * @returns {Printer} reference to this object for chaining
     */
    async rect(w, h) {
        const prevAutoRetract = this._autoRetract; // save previous state
        this._autoRetract = false; // turn off for this operation
        // move into place

        for (let i = 0; i < 2; i++) {
            await this.draw(w);
            this.turn(90);
            await this.draw(h);
            this.turn(90);
        }

        this._autoRetract = prevAutoRetract; // turn to prev state
        if (this._autoRetract) await this.retract();
        return this;
    }

    /**
    * Extrude plastic from the printer head to specific coordinates, within printer bounds
    * @param {Object} params Parameters dictionary containing either:
    * - x,y,z,e keys referring to movement and filament position
    * - 'retract' for manual retract setting (true/false)
    * - 'speed' for the print or travel speed of this and subsequent operations
    * - 'thickness' or 'thick' for setting/updating layer height
    * - 'bounce' if movement should bounce off sides (true/false), not currently implemented properly
    * @returns {Printer} reference to this object for chaining
    */
    async extrudeto(params) {

        // if no extrusion specified, auto calculate
        const extrusionNotSpecified = (params.e === undefined); 

        const __x = (params.x !== undefined) ? parseFloat(params.x) : this.x;
        const __y = (params.y !== undefined) ? parseFloat(params.y) : this.y;
        const __z = (params.z !== undefined) ? parseFloat(params.z) : this.z;
        const __e = (params.e !== undefined) ? parseFloat(params.e) : this.e;

        // did we specify a length of filament to extrude?
        const extrusionNotZero = (Math.abs(__e - this.e) > 0.001);

        // only extrude if there is something to extrude!
        const extruding = (extrusionNotSpecified || extrusionNotZero); 
        // if not, traveling

        // Set retract true, but if only if extruding and it is either specified
        // or not specified but we're also using autoretraction
        
        const retract = extrusionNotSpecified 
            && extrusionNotZero 
            && ((params.retract === true) 
                || ((params.retract === undefined) && this._autoRetract));

        // clear retraction if filament is manually being moved
        if (!extrusionNotSpecified && extrusionNotZero)
        {
            this.currentRetraction = 0; //clear retraction if we go manual
        }
        
        if (retract) {
            await this.unretract();
        }

        // calculate movement properties

        let newPosition = new Vector({ x: __x, y: __y, z: __z, e: __e });

        // check if speed is passed in
        // if auto extrusion, or some extrusion was specified, speed is print speed
        let _speed = parseFloat(
            (params.speed !== undefined) 
                ? params.speed 
                : extruding ? this._printSpeed : this._travelSpeed
            );

        // update layer height if necessary
        this.layerHeight = parseFloat((params.thickness !== undefined) 
            ? params.thickness 
            : this.layerHeight);

        // update layer height if necessary
        if (params.thick !== undefined) {
            this.layerHeight = parseFloat(params.thick);
        } 
    

        //////////////////////////////////////
        /// START CALCULATIONS      //////////
        //////////////////////////////////////

        let distanceVec = Vector.sub(newPosition, this.position);
        let distanceMag = 1; // calculated later

        // FYI:
        //  nozzle_speed{mm/s} = (radius_filament^2) * PI * filament_speed{mm/s} / layer_height^2
        //  filament_speed{mm/s} = layer_height^2 * nozzle_speed{mm/s}/(radius_filament^2)*PI


        // only calculate filament distance if we are not traveling and filament
        // length wasn't specified

        let filamentLength = __e; 

        if (extrusionNotSpecified) {
            // distance is purely 3D movement, not filament movement
            distanceMag = Math.sqrt(distanceVec.axes.x * distanceVec.axes.x + distanceVec.axes.y * distanceVec.axes.y + distanceVec.axes.z * distanceVec.axes.z);

            // otherwise, calculate filament length needed based on layerheight, etc.
            const filamentRadius = Printer.filamentDiameter[this._model] / 2;

            // for extrusion into free space
            // apparently, some printers take the filament into account (so this is in mm3)
            // this was helpful: https://github.com/Ultimaker/GCodeGenJS/blob/master/js/gcode.js
            filamentLength = distanceMag * this.layerHeight * this.layerHeight;//(Math.PI*filamentRadius*filamentRadius);

            //
            // safety check:
            //
            if (filamentLength > this.maxFilamentPerOperation) {
                throw Error("[API] Too much filament in move:" + filamentLength);
            }
            if (!Printer.extrusionInmm3[this._model]) {
                filamentLength /= (filamentRadius * filamentRadius * Math.PI);
            }

            //console.log("filament speed: " + filamentSpeed);
            //console.log("filament distance : " + filamentLength + "/" + dist);

            distanceVec.axes.e = filamentLength;
            newPosition.axes.e = this.e + distanceVec.axes.e;

            // arbitrary smallest printable length
            if (filamentLength < this.minFilamentPerOperation) {
                throw new Error("[API] Filament length too short (same position?): " + filamentLength);
            } 
        }
        else {
            // distance is 3D movement PLUS filament movement
            distanceMag = distanceVec.mag();
        }
        // note: velocity in 'e' direction is always layerHeight^2
        const velocity = Vector.div(distanceVec, distanceMag);
        const moveTime = distanceMag / _speed; // in sec, doesn't matter that new 'e' not taken into account because it's not in firmware

        this.totalMoveTime += moveTime; // update total movement time for the printer

        //this._elevation = Math.asin(velocity.axes.z); // removed because it was non-intuitive!!!

        //console.log("time: " + moveTime + " / dist:" + distanceMag);

        //
        // BREAK AT LARGE MOVES
        //
        if (moveTime > this.maxTimePerOperation) {
            throw new Error("[API] move time too long:" + moveTime);
        }

        const nozzleSpeed = Vector.div(distanceVec, moveTime);
        //
        // safety checks
        //
        if (extruding) {
            if (nozzleSpeed.axes.x > Printer.maxPrintSpeed[this._model]["x"]) {
                throw Error("[API] X printing speed too fast:" + nozzleSpeed.axes.x);
            }
            if (nozzleSpeed.axes.y > Printer.maxPrintSpeed[this._model]["y"]) {
                throw Error("[API] Y printing speed too fast:" + nozzleSpeed.axes.y);
            }
            if (nozzleSpeed.axes.z > Printer.maxPrintSpeed[this._model]["z"]) {
                throw Error("[API] Z printing speed too fast:" + nozzleSpeed.axes.z);
            }
            if (nozzleSpeed.axes.e > Printer.maxPrintSpeed[this._model]["e"]) {
                throw Error("[API] E printing speed too fast:" + nozzleSpeed.axes.e + "/" + Printer.maxPrintSpeed[this._model]["e"]);
            }
        } else {
            // just traveling
            if (nozzleSpeed.axes.x > Printer.maxTravelSpeed[this._model]["x"]) {
                throw Error("[API] X travel too fast:" + nozzleSpeed.axes.x);
            }
            if (nozzleSpeed.axes.y > Printer.maxTravelSpeed[this._model]["y"]) {
                throw Error("[API] Y travel too fast:" + nozzleSpeed.axes.y);
            }
            if (nozzleSpeed.axes.z > Printer.maxTravelSpeed[this._model]["z"]) {
                throw Error("[API] Z travel too fast:" + nozzleSpeed.axes.z);
            }
        }
        // Handle movements outside printer boundaries if there's a need.
        // Tail recursive.
        //
        return this._extrude(_speed, velocity, distanceMag, retract);

    } // end extrudeto

    /**
     * Send movement update GCode to printer based on current position (this.x,y,z).
     * @param {Int} speed print speed in mm/s
     * @param {boolean} retract if true (default) add GCode for retraction/unretraction. Will use either hardware or software retraction if set in Printer object
     * */
    async sendExtrusionGCode(speed, retract = true) {

        // G1 - Coordinated Movement X Y Z E
        let moveCode = ["G1"];
        moveCode.push("X" + this.x.toFixed(4));
        moveCode.push("Y" + this.y.toFixed(4));
        moveCode.push("Z" + this.z.toFixed(4));
        moveCode.push("E" + this.e.toFixed(4));
        moveCode.push("F" + (speed * 60).toFixed(4)); // mm/s to mm/min
        await this.gcodeEvent(moveCode.join(" "));

        // account for errors in decimal precision
        this.e = parseFloat(this.e.toFixed(4));
        this.x = parseFloat(this.x.toFixed(4));
        this.y = parseFloat(this.y.toFixed(4));
        this.z = parseFloat(this.z.toFixed(4));

        //await this.gcodeEvent("M400"); // finish all moves

        return this;
    } // end sendExtrusionGCode

/**
     * Send movement update GCode to printer based on current position (this.x,y,z).
     * @param {Int} speed print speed in mm/s
     * @param {boolean} retract if true (default) add GCode for retraction/unretraction. Will use either hardware or software retraction if set in Printer object
     * */
    async sendArcExtrusionGCode(speed, clockWise= true, retract = true) {

        // G1 - Coordinated Movement X Y Z E
        let moveCode = clockwise ? ["G2"] : ["G3"];
        moveCode.push("X" + this.x.toFixed(4));
        moveCode.push("Y" + this.y.toFixed(4));
        moveCode.push("Z" + this.z.toFixed(4));
        moveCode.push("E" + this.e.toFixed(4));
        moveCode.push("F" + (speed * 60).toFixed(4)); // mm/s to mm/min
        await this.gcodeEvent(moveCode.join(" "));

        // account for errors in decimal precision
        this.e = parseFloat(this.e.toFixed(4));
        this.x = parseFloat(this.x.toFixed(4));
        this.y = parseFloat(this.y.toFixed(4));
        this.z = parseFloat(this.z.toFixed(4));

        //await this.gcodeEvent("M400"); // finish all moves

        return this;
    } // end sendArcExtrusionGCode



    // TODO: have this chop up moves and call a callback function each time,
    // like in _extrude
    //             
    // call movement callback function with this lp object
    // if(that.moveCallback)
    //        that.moveCallback(that);

    /**
     * Extrude plastic from the printer head, relative to the current print head position, 
     *  within printer bounds
     * @param {Object} params Parameters dictionary containing either x,y,z keys or 
     *  direction/angle (radians) keys and retract setting (true/false).
     * @returns {Printer} reference to this object for chaining
     */
    async extrude(params) {

        // First, handle distance/angle mode. If set, overrides everything else.
        // uses stored values and is actually handled by go() --> extrudeto()
        if (params.dist || params.angle)
        {
            if (params.dist !== undefined) {
                this._distance += parseFloat(params.dist);
            }
            if (params.angle !== undefined) {
                this._heading = parseFloat(params.angle);
            }
            return this.go(true, params.retract); // go, with extrusion
        }

        //otherwise, handle cartesian coordinates mode, relative to current position
        let newparams = {};
        newparams.x = (params.x !== undefined) ? parseFloat(params.x) + this.x : this.x;
        newparams.y = (params.y !== undefined) ? parseFloat(params.y) + this.y : this.y;
        newparams.z = (params.z !== undefined) ? parseFloat(params.z) + this.z : this.z;
        newparams.e = (params.e !== undefined) ? parseFloat(params.e) + this.e : undefined;

        // pass through
        newparams.retract = params.retract;
        newparams.speed = params.speed;
        
        // extrude using absolute cartesian coords
        return this.extrudeto(newparams);

    } // end extrude


    /**
     * Relative movement.
     * @param {any} params Can be specified as x,y,z,e or dist (distance), angle (xy plane), elev (z dir). All in mm.
     * @returns {Printer} reference to this object for chaining
     */
    async move(params) {
        // first, handle distance/angle mode
        // uses stored values, handled in go()
        if (params.dist || params.angle)
        {
            if (params.dist !== undefined) {
                this._distance += parseFloat(params.dist);
            }
            if (params.angle !== undefined) {
                this._heading = parseFloat(params.angle);
            }
            return this.go(false); // go, with extrusion
        }

        //otherwise, handle cartesian coordinates mode
        let newparams = {};
        newparams.x = (params.x !== undefined) ? parseFloat(params.x) + this.x : this.x;
        newparams.y = (params.y !== undefined) ? parseFloat(params.y) + this.y : this.y;
        newparams.z = (params.z !== undefined) ? parseFloat(params.z) + this.z : this.z;
        newparams.e = this.e;
        if (params.speed !== undefined) 
            this.travelspeed(parseFloat(params.speed));
        newparams.speed = this._travelSpeed; // update travel speed

        // extrude using absolute cartesian coords
        return this.extrudeto(newparams);
    } // end move
    

    /**
     * Absolute movement.
     * @param {any} params Can be specified as x,y,z. All in mm.
     * @returns {Printer} reference to this object for chaining
     */
    async moveto(params) {
        params.e = this.e;
        params.speed = (params.speed === undefined) ? this._travelSpeed : parseFloat(params.speed);
        this._travelSpeed = params.speed; // update travel speed
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
     * Fill a rectagular area (lines drawn parallel to direction).
     * @param {Number} w width
     * @param {Number} h height
     * @param {Number} gap gap between fills
     */
    async drawfill(w, h, gap) {
        if (gap === undefined) gap = 1.5 * this.layerHeight;

        const prevAutoRetract = this._autoRetract; // save previous state
        this._autoRetract = false; // turn off for this operation
o
        let times = w / gap;
        if (times < 3) {
            // just room for one
            await this.draw(h);
        }
        else {
            if (times % 2 !== 0) times += 1; // got to be odd so we return to same place smoothly
            for (let i = 0; i < times; i++) {
                let m = (i % 2 === 0) ? -1 : 1;
                await this.draw(h);
                this.turn(m * 90);
                await this.draw(gap);
                this.turn(m * 90); //turn back
            }
            this.turn(180);
        }
        this._autoRetract = prevAutoRetract; // turn back to prev state
        if (this._autoRetract) await this.retract();

        return this;
    }

    /**
     * Synchronise variables like position and temp
     */
    async sync() {
        await this.gcodeEvent("M105"); // temperature
        await this.gcodeEvent("M114"); // position
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
     * Radians to degrees conversion.
     * @param {float} angle in radians
     * @returns {float} angle in degrees
     */
    r2d(angle) {
        return angle * 180 / Math.PI;
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
    note(note = 40, time = 200, axes = "x") {
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
                    if (this._elevation > 0) zangle = Math.PI / 2;
                    else zangle = -Math.PI / 2;
                }
            }
        }
        // combine all separate distances and speeds into one
        this._heading = Math.atan2(yangle, xangle);
        this._elevation = zangle;
        this._distance = this.printpeed(Math.sqrt(totalSpeed)) * time / 1000; // time in ms
        return this;
    }

    /**
     * Set the movement distance based on a target amount of time to move. (Uses current print speed to calculate)
     * @param {Number} time Time to move in milliseconds
     * @returns {Printer} reference to this object for chaining
     */
    t2d(time, speed = this._travelSpeed) {
        this._distance = this.t2mm(time, speed); // time in ms
        return this;
    }

    /**
     * Calculate the movement distance based on a target amount of time to move. (Uses current print speed to calculate)
     * @param {Number} time Time to move in milliseconds
     * @returns {Number} distance in mm
     */
    t2mm(time, speed = this._printSpeed) {
        return speed * time / 1000; // time in ms
    }

    /**
     * Set the movement distance based on number of beats (uses bpm to calculate)
     * @param {Number} beats Time to move in whole or partial beats
     * @returns {Printer} reference to this object for chaining
     */
    b2d(beats, speed = this._printSpeed) {
        this._distance = this.t2mm(this.b2t(beats), speed); // speed is in ms already
        return this;
    }

    /**
     * Set the movement distance based on number of beats (uses bpm to calculate)
     * @param {Number} beats Time to move in whole or partial beats
     * @returns {Number} distance per beat
     */
    b2mm(beats, speed = this._printSpeed) {
        return this._distance = this.t2mm(this.b2t(beats), speed); // speed is in ms already
    }

    /**
     * Get the time in ms based on number of beats (uses bpm to calculate)
     * @param {Number} beats In whole or partial beats
     * @returns {Number} Time in ms equivalent to the number of beats
     */
    b2t(beats, bpm = this._bpm) {
        return (beats/this._bpm)*60000; // speed is in ms already
    }

    /**
     * Fills an area based on layerHeight (as thickness of each line)
     * @param {float} w width of the area in mm
     * @param {float} h height of the area in mm
     * @param {float} lh the layerheight (or gap, if larger)
     * @returns {Printer} reference to this object for chaining
     */
    async fill(w, h, lh = this.layerHeight) {
        let inc = lh * Math.PI; // not totally sure why this works, but experimentally it does
        for (var i = 0, y = 0; y < h; i++, y += inc) {
            let m = (i % 2 === 0) ? 1 : -1;
            await this.move({ y: inc });
            await this.extrude({ x: m * w });
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
     * Calculate and set both the travel and print speed in mm/s based on midi note
     * @param {float} note midi note
     * @param {string} axis axis (x,y,z,e) of movement 
     * @returns {float} new speed
     */
    m2s(note, axis = 'x') {
        return this.travelspeed(this.printspeed(this.midi2speed(note, axis)));
    }

    /**
     * Convenience function for getting speed scales for midi notes from printer model.
     * @returns {object} x,y,z speed scales
     */
    speedScale() {
        let bs = Printer.speedScale[this._model];
        return { "x": bs["x"], "y": bs["y"], "z": bs["z"] };
    }

    /**
     * Causes the printer to wait for a number of milliseconds
     * @param {float} ms to wait
     * @returns {Printer} reference to this object for chaining
     */
    async wait(ms = this._waitTime) {
        await this.gcodeEvent("G4 P" + ms);
        this._waitTime = 0;
        return this;
    }

    /**
     * Temporarily pause the printer: move the head up, turn off fan & temp
     * @returns {Printer} reference to this object for chaining
     */
    async pause() {
        // retract filament, turn off fan and heater wait
        await this.extrude({ e: -16, speed: 250 });
        await this.move({ z: -3 });
        await this.gcodeEvent("M104 S0"); // turn off temp
        await this.gcodeEvent("M107 S0"); // turn off fan
        return this;
    }

    /**
     * Resume the printer printing: turn on fan & temp
     * @param {float} temp target temp
     * @returns {Printer} reference to this object for chaining
     */
    async resume(temp = "190") {
        await this.gcodeEvent("M109 S" + temp); // turn on temp, but wait until full temp reached
        await this.gcodeEvent("M106 S100"); // turn on fan
        await this.extrude({ e: 16, speed: 250 });
        return this;
    }

    /**
     * Print paths 
     * @param {Array} paths List of paths (lists of coordinates in x,y) to print
     * @param {Object} settings Settings for the scaling, etc. of this object. useaspect means respect aspect ratio (width/height). A width or height
     * of 0 means to use the original paths' width/height.
     * @returns {Printer} reference to this object for chaining
     * @test const p = [
     *     [20,20],
           [30,30],
           [50,30]];
        lp.printPaths({paths:p,minZ:0.2,passes:10});
     */
    async printPaths({ paths = [[]], y = 0, x = 0, z = 0, w = 0, h = 0, useaspect = true, passes = 1, safeZ = 0 }) {
        safeZ = safeZ || (this.layerHeight * passes + 10);   // safe z for traveling

        // total bounds
        let boundsMinX = Infinity,
            boundsMinY = Infinity,
            boundsMaxX = -Infinity,
            boundsMaxY = -Infinity;

        let idx = paths.length;
        while (idx--) {
            let subidx = paths[idx].length;
            let bounds = { x: Infinity, y: Infinity, x2: -Infinity, y2: -Infinity, area: 0 };

            // find lower and upper bounds
            while (subidx--) {
                boundsMinX = Math.min(paths[idx][subidx][0], boundsMinX);
                boundsMinY = Math.min(paths[idx][subidx][1], boundsMinY);
                boundsMaxX = Math.max(paths[idx][subidx][0], boundsMaxX);
                boundsMaxY = Math.max(paths[idx][subidx][1], boundsMaxY);

                if (paths[idx][subidx][0] < bounds.x) {
                    bounds.x = paths[idx][subidx][0];
                }

                if (paths[idx][subidx][1] < bounds.y) {
                    bounds.y = paths[idx][subidx][0];
                }

                if (paths[idx][subidx][0] > bounds.x2) {
                    bounds.x2 = paths[idx][subidx][0];
                }
                if (paths[idx][subidx][1] > bounds.y2) {
                    bounds.y2 = paths[idx][subidx][0];
                }
            }

            // calculate area
            bounds.area = (1 + bounds.x2 - bounds.x) * (1 + bounds.y2 - bounds.y);
            paths[idx].bounds = bounds;
        }


        // make range mapping functions for scaling - see util.js
        const boundsW = boundsMaxX - boundsMinX;
        const boundsH = boundsMaxY - boundsMinY;

        const useBoth = w && h;
        const useOne = w || h;

        if (!useBoth) {
            if (useOne) {
                if (w > 0) {
                    const ratio = boundsH / boundsW;
                    h = w * ratio;
                } else {
                    const ratio = boundsW / boundsH;
                    w = h * ratio;
                }
            } else {
                w = boundsW;
                h = boundsH;
            }
        }

        const xmapping = makeMapping([boundsMinX, boundsMaxX], [x, x + w]);
        const ymapping = makeMapping([boundsMinY, boundsMaxY], [y, y + h]);

        // print the inside parts first
        paths.sort(function (a, b) {
            // sort by area
            //return (a.bounds.area < b.bounds.area) ? -1 : 1;
            return (a.bounds.x < b.bounds.x) ? -1 : 1;

        });
        /*
        paths.sort(function (a, b) {
            // sort by horizontal position
            return (a.bounds.x < b.bounds.x) ? -1 : 1;
        });
        */
        for (let pathIdx = 0, pathLength = paths.length; pathIdx < pathLength; pathIdx++) {
            let pathCopy = paths[pathIdx].slice();
            for (let i = 1; i <= passes; i++) {
                const currentHeight = i * this.layerHeight + z;

                await this.moveto({ 'x': xmapping(pathCopy[0][0]), 'y': ymapping(pathCopy[0][1]) });
                await this.moveto({ 'z': currentHeight });
                await this.unretract(); // makes sense to do this every time

                // print each segment, one by one
                for (let segmentIdx = 0, segmentLength = pathCopy.length; segmentIdx < segmentLength; segmentIdx++) {
                    const segment = pathCopy[segmentIdx];
                    await this.extrudeto({
                        'x': xmapping(segment[0]),
                        'y': ymapping(segment[1]),
                        'retract': false
                    });
                }

                if (i < passes) {
                    pathCopy.reverse(); //save time, do it backwards
                }
                else {
                    // path finished, retract and raise up head
                    await this.retract();
                    await this.moveto({ 'z': safeZ });
                }
            }
        }
        return this;
    }


    /**
         * Print paths using drawFill. NEVER TESTED!
         * @param {Array} paths List of paths (lists of coordinates in x,y) to print
         * @param {Object} settings Settings for the scaling, etc. of this object. useaspect means respect aspect ratio (width/height). A width or height
         * of 0 means to use the original paths' width/height.
         * @returns {Printer} reference to this object for chaining
         * @test const p = [
         *     [20,20],
               [30,30],
               [50,30]];
            lp.printPaths({paths:p,minZ:0.2,passes:10});
         */
    async printPathsThick({ paths = [[]], y = 0, x = 0, z = 0, w = 0, h = 0, t = 1, useaspect = true, passes = 1, safeZ = 0 }) {
        safeZ = safeZ || (this.layerHeight * passes + 10);   // safe z for traveling

        t = this.layerHeight * 2.5 * t;

        // total bounds
        let boundsMinX = Infinity,
            boundsMinY = Infinity,
            boundsMaxX = -Infinity,
            boundsMaxY = -Infinity;

        let idx = paths.length;
        while (idx--) {
            let subidx = paths[idx].length;
            let bounds = { x: Infinity, y: Infinity, x2: -Infinity, y2: -Infinity, area: 0 };

            // find lower and upper bounds
            while (subidx--) {
                boundsMinX = Math.min(paths[idx][subidx][0], boundsMinX);
                boundsMinY = Math.min(paths[idx][subidx][1], boundsMinY);
                boundsMaxX = Math.max(paths[idx][subidx][0], boundsMaxX);
                boundsMaxY = Math.max(paths[idx][subidx][1], boundsMaxY);

                if (paths[idx][subidx][0] < bounds.x) {
                    bounds.x = paths[idx][subidx][0];
                }

                if (paths[idx][subidx][1] < bounds.y) {
                    bounds.y = paths[idx][subidx][0];
                }

                if (paths[idx][subidx][0] > bounds.x2) {
                    bounds.x2 = paths[idx][subidx][0];
                }
                if (paths[idx][subidx][1] > bounds.y2) {
                    bounds.y2 = paths[idx][subidx][0];
                }
            }
            paths[idx].bounds = bounds;
        }


        // make range mapping functions for scaling - see util.js
        const boundsW = boundsMaxX - boundsMinX;
        const boundsH = boundsMaxY - boundsMinY;

        const useBoth = w && h;
        const useOne = w || h;

        if (!useBoth) {
            if (useOne) {
                if (w > 0) {
                    const ratio = boundsH / boundsW;
                    h = w * ratio;
                } else {
                    const ratio = boundsW / boundsH;
                    w = h * ratio;
                }
            } else {
                w = boundsW;
                h = boundsH;
            }
        }

        const xmapping = makeMapping([boundsMinX, boundsMaxX], [x, x + w]);
        const ymapping = makeMapping([boundsMinY, boundsMaxY], [y, y + h]);

        // print the inside parts first
        paths.sort(function (a, b) {
            // sort by area
            //return (a.bounds.area < b.bounds.area) ? -1 : 1;
            return (a.bounds.x < b.bounds.x) ? -1 : 1;
        });

        // only fill if changed direction
        for (let i = 1; i <= passes; i++) {
            for (let pathIdx = 0, pathLength = paths.length; pathIdx < pathLength; pathIdx++) {

                let pathCopy = paths[pathIdx].slice();
                const currentHeight = i * this.layerHeight + z;

                await this.moveto({ 'x': xmapping(pathCopy[0][0]), 'y': ymapping(pathCopy[0][1]) });
                await this.moveto({ 'z': currentHeight });
                // this.unretract(); // makes sense to do this every time

                if (pathCopy.length > 1) {

                    let currentW = 0;
                    let currentH = 0;
                    let prevX = xmapping(pathCopy[0][0]);
                    let prevY = ymapping(pathCopy[0][1]);

                    let currentAngle = Math.atan2(ymapping(pathCopy[1][1]) - prevY, xmapping(pathCopy[1][0]) - prevX);

                    // print each segment, one by one
                    for (let segmentIdx = 1, segmentLength = pathCopy.length; segmentIdx < segmentLength; segmentIdx++) {
                        const segment = pathCopy[segmentIdx];
                        const currentX = xmapping(segment[0]);
                        const currentY = ymapping(segment[1]);
                        const xDiff = currentX - prevX;
                        const yDiff = currentY - prevY;
                        const newAngle = Math.atan2(yDiff, xDiff);

                        if (newAngle !== currentAngle) {
                            // print current path and make new w/h
                            await this.drawfill(currentW || 2, currentH || 2, t);
                            currentW = currentH = 0;
                            this.turn(newAngle);
                            currentAngle = newAngle;
                        }
                        else {
                            currentW += xDiff;
                            currentH += yDiff;
                        }
                    }
                }
                if (i < passes) {
                    pathCopy.reverse(); //save time, do it backwards
                }
                else {
                    // path finished, retract and raise up head
                    await this.moveto({ 'z': safeZ });
                }
            }
        }
        return this;
    }

    async _extrude(speed, moveVector, leftToMove, retract) {
        // if there's nowhere to move, return
        //console.log(that);
        //console.log("left to move:" + leftToMove);
        //console.log(moveVector);

        if (isNaN(leftToMove) || leftToMove < 0.01) {
            //console.log("(extrude) end position:" + that.x + ", " + that.y + ", " + that.z + ", " + that.e);
            return false;
        }

        let amountMoved = Math.min(leftToMove, this.maxMovePerCycle);

        // calculate next position
        let nextPosition = Vector.add(this.position, Vector.mult(moveVector, amountMoved));

        //console.log("VECTOR:");
        //console.log(moveVector);

        //console.log("CURRENT:");
        //console.log(that.position);

        //console.log("NEXT:");
        //console.log(nextPosition);

        if (this.boundaryMode === "bounce") {
            let moved = new Vector();
            let outsideBounds = false;

            // calculate movement time per axis, based on printer bounds

            for (const axis in nextPosition.axes) {
                // TODO:
                // for each axis, see where it intersects the printer bounds
                // then, using velocity, get other axes positions at that point
                // if any of them are over, skip to next axis
                if (axis !== "e") {
                    if (nextPosition.axes[axis] > this.maxPosition.axes[axis]) {
                        // hit - calculate up to min position
                        moved.axes[axis] = (this.maxPosition.axes[axis] - this.position.axes[axis]) / moveVector.axes[axis];
                        outsideBounds = true;
                    } else if (nextPosition.axes[axis] < this.minPosition.axes[axis]) {
                        // hit - calculate up to min position
                        moved.axes[axis] = (this.minPosition.axes[axis] - this.position.axes[axis]) / moveVector.axes[axis];
                        outsideBounds = true;
                    }
                }            //else {
                //    moved.axes[axis] = nextPosition.axes[axis] - that.position.axes[axis];
                //}
            }
            //console.log("moved:");
            //console.log(moved);

            if (outsideBounds) {
                //console.log("outside");
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
                nextPosition.axes = this.clipToPrinterBounds(Vector.add(this.position, amountMovedVec).axes);
                //console.log(nextPosition);

                // reverse velocity if axis bounds hit, for shortest axis
                for (const axis of shortestAxes) {
                    moveVector.axes[axis] = moveVector.axes[axis] * -1;
                }
            }
        } else {
            this.clipToPrinterBounds(nextPosition.axes);
        }
        leftToMove -= amountMoved;

        // update current position
        //console.log("current pos:")
        //console.log(that.position);

        // DON'T DO THIS ANYMORE... counter-intuitive!
        //that._elevation = Math.asin(moveVector.axes.z);
        this.position.set(nextPosition);
        //console.log("next pos:");
        //console.log(nextPosition);
        //console.log(that.position);
        //console.log(that);        

        await this.sendExtrusionGCode(speed, retract);

        if (retract)
            await this.retract();


        // handle cases where velocity is 0 (might be movement up or down)

        //console.log("prev heading:" + this._heading);
        //console.log("move vec:" + moveVector.axes.x + ", " + moveVector.axes.y);

        let _test = moveVector.axes.y * moveVector.axes.y + moveVector.axes.x * moveVector.axes.x;

        if (_test > Number.EPSILON) {
            //console.log("not not going nowhere __" + that._heading);
            let newHeading = Math.atan2(moveVector.axes.y, moveVector.axes.x);
            if (!isNaN(newHeading)) this._heading = newHeading;
            //console.log("new heading:" + that._heading);
        }

        // Tail recursive, until target x,y,z is hit
        return await this._extrude(speed, moveVector, leftToMove, retract);
    } // end _extrude 



/**
    * Extrude plastic from the printer head to specific coordinates, within printer bounds
    * @param {Object} params Parameters dictionary containing either:
    * - x,y,z,i,j,e keys referring to movement and filament position
    * - 'retract' for manual retract setting (true/false)
    * - 'speed' for the print or travel speed of this and subsequent operations
    * - 'thickness' or 'thick' for setting/updating layer height
    * - 'bounce' if movement should bounce off sides (true/false), not currently implemented properly
    * @returns {Printer} reference to this object for chaining
    */
   async arcextrudeto(params) {

    // if no extrusion specified, auto calculate
    const extrusionNotSpecified = (params.e === undefined); 

    const __x = (params.x !== undefined) ? parseFloat(params.x) : this.x;
    const __y = (params.y !== undefined) ? parseFloat(params.y) : this.y;
    const __z = (params.z !== undefined) ? parseFloat(params.z) : this.z;
    const __e = (params.e !== undefined) ? parseFloat(params.e) : this.e;

    let __i = (params.i !== undefined) ? parseFloat(params.i) : 0;
    let __j = (params.j !== undefined) ? parseFloat(params.j) : 0;

    if ((__i + __j) < 0.1) throw new ValueError("[API] arcextrude needs both i and j specified!");

    console.log(`E:${this.e}`);
    // did we specify a length of filament to extrude?
    const extrusionNotZero = Math.abs(__e - this.e) > Number.EPSILON;

    // only extrude if there is something to extrude!
    const extruding = (extrusionNotSpecified || (!extrusionNotSpecified && extrusionNotZero)); 

    // if not, traveling 

    // Set retract true, but if only if extrusion wasn't specified, because
    // specifying it implies overriding retraction. Otherwise, use 
    // autoretraction.
    let retract = (params.retract === undefined) 
        ? extrusionNotSpecified && this._autoRetract 
        : params.retract;

    // clear retraction if filament is manually being moved
    if (extrusionNotZero) 
    {
        this.currentRetraction = 0; //clear retraction if we go manual
        retract = false;
    }
    else {
        // not a travel or manual extrusion so try
        // to unretract if needed
        await this.unretract();
    }

    // calculate movement properties

    let newPosition = new Vector({ x: __x, y: __y, z: __z, e: __e });

    // check if speed is passed in
    // if auto extrusion, or some extrusion was specified, speed is print speed
    let _speed = parseFloat(
        (params.speed !== undefined) 
            ? params.speed 
            : extruding ? this._printSpeed : this._travelSpeed
        );

    // update layer height if necessary
    this.layerHeight = parseFloat((params.thickness !== undefined) 
        ? params.thickness 
        : this.layerHeight);

    // update layer height if necessary
    if (params.thick !== undefined) {
        this.layerHeight = parseFloat(params.thick);
    } 


    //////////////////////////////////////
    /// START CALCULATIONS      //////////
    //////////////////////////////////////

    let distanceVec = Vector.sub(newPosition, this.position);
    let distanceMag = 1; // calculated later

    // FYI:
    //  nozzle_speed{mm/s} = (radius_filament^2) * PI * filament_speed{mm/s} / layer_height^2
    //  filament_speed{mm/s} = layer_height^2 * nozzle_speed{mm/s}/(radius_filament^2)*PI


    // only calculate filament distance if we are not traveling and filament
    // length wasn't specified

    let filamentLength = __e; 

    if (extrusionNotSpecified) {
        // distance is purely 3D movement, not filament movement
        distanceMag = Math.sqrt(distanceVec.axes.x * distanceVec.axes.x + distanceVec.axes.y * distanceVec.axes.y + distanceVec.axes.z * distanceVec.axes.z);

        // otherwise, calculate filament length needed based on layerheight, etc.
        const filamentRadius = Printer.filamentDiameter[this._model] / 2;

        // for extrusion into free space
        // apparently, some printers take the filament into account (so this is in mm3)
        // this was helpful: https://github.com/Ultimaker/GCodeGenJS/blob/master/js/gcode.js
        filamentLength = distanceMag * this.layerHeight * this.layerHeight;//(Math.PI*filamentRadius*filamentRadius);

        //
        // safety check:
        //
        if (filamentLength > this.maxFilamentPerOperation) {
            throw Error("[API] Too much filament in move:" + filamentLength);
        }
        if (!Printer.extrusionInmm3[this._model]) {
            filamentLength /= (filamentRadius * filamentRadius * Math.PI);
        }

        //console.log("filament speed: " + filamentSpeed);
        //console.log("filament distance : " + filamentLength + "/" + dist);

        distanceVec.axes.e = filamentLength;
        newPosition.axes.e = this.e + distanceVec.axes.e;

        // arbitrary smallest printable length
        if (filamentLength < this.minFilamentPerOperation) {
            throw new Error("[API] filament length too short: " + filamentLength);
        } 
    }
    else {
        // distance is 3D movement PLUS filament movement
        distanceMag = distanceVec.mag();
    }
    // note: velocity in 'e' direction is always layerHeight^2
    const velocity = Vector.div(distanceVec, distanceMag);
    const moveTime = distanceMag / _speed; // in sec, doesn't matter that new 'e' not taken into account because it's not in firmware

    this.totalMoveTime += moveTime; // update total movement time for the printer

    //this._elevation = Math.asin(velocity.axes.z); // removed because it was non-intuitive!!!

    //console.log("time: " + moveTime + " / dist:" + distanceMag);

    //
    // BREAK AT LARGE MOVES
    //
    if (moveTime > this.maxTimePerOperation) {
        throw new Error("[API] move time too long:" + moveTime);
    }

    const nozzleSpeed = Vector.div(distanceVec, moveTime);
    //
    // safety checks
    //
    if (extruding) {
        if (nozzleSpeed.axes.x > Printer.maxPrintSpeed[this._model]["x"]) {
            throw Error("[API] X printing speed too fast:" + nozzleSpeed.axes.x);
        }
        if (nozzleSpeed.axes.y > Printer.maxPrintSpeed[this._model]["y"]) {
            throw Error("[API] Y printing speed too fast:" + nozzleSpeed.axes.y);
        }
        if (nozzleSpeed.axes.z > Printer.maxPrintSpeed[this._model]["z"]) {
            throw Error("[API] Z printing speed too fast:" + nozzleSpeed.axes.z);
        }
        if (nozzleSpeed.axes.e > Printer.maxPrintSpeed[this._model]["e"]) {
            throw Error("[API] E printing speed too fast:" + nozzleSpeed.axes.e + "/" + Printer.maxPrintSpeed[this._model]["e"]);
        }
    } else {
        // just traveling
        if (nozzleSpeed.axes.x > Printer.maxTravelSpeed[this._model]["x"]) {
            throw Error("[API] X travel too fast:" + nozzleSpeed.axes.x);
        }
        if (nozzleSpeed.axes.y > Printer.maxTravelSpeed[this._model]["y"]) {
            throw Error("[API] Y travel too fast:" + nozzleSpeed.axes.y);
        }
        if (nozzleSpeed.axes.z > Printer.maxTravelSpeed[this._model]["z"]) {
            throw Error("[API] Z travel too fast:" + nozzleSpeed.axes.z);
        }
    }
    // Handle movements outside printer boundaries if there's a need.
    // Tail recursive.
    //
    return this._extrude(_speed, velocity, distanceMag, retract);

} // end extrudeto


    async _arcExtrude(speed, newPosition, clockwise, retract) {
 
        let amountMoved = Math.min(leftToMove, this.maxMovePerCycle);

        // calculate next position
        let nextPosition = Vector.add(this.position, Vector.mult(moveVector, amountMoved));

        //console.log("VECTOR:");
        //console.log(moveVector);

        //console.log("CURRENT:");
        //console.log(that.position);

        //console.log("NEXT:");
        //console.log(nextPosition);

        if (this.boundaryMode === "bounce") {
            let moved = new Vector();
            let outsideBounds = false;

            // calculate movement time per axis, based on printer bounds

            for (const axis in nextPosition.axes) {
                // TODO:
                // for each axis, see where it intersects the printer bounds
                // then, using velocity, get other axes positions at that point
                // if any of them are over, skip to next axis
                if (axis !== "e") {
                    if (nextPosition.axes[axis] > this.maxPosition.axes[axis]) {
                        // hit - calculate up to min position
                        moved.axes[axis] = (this.maxPosition.axes[axis] - this.position.axes[axis]) / moveVector.axes[axis];
                        outsideBounds = true;
                    } else if (nextPosition.axes[axis] < this.minPosition.axes[axis]) {
                        // hit - calculate up to min position
                        moved.axes[axis] = (this.minPosition.axes[axis] - this.position.axes[axis]) / moveVector.axes[axis];
                        outsideBounds = true;
                    }
                }            //else {
                //    moved.axes[axis] = nextPosition.axes[axis] - that.position.axes[axis];
                //}
            }
            //console.log("moved:");
            //console.log(moved);

            if (outsideBounds) {
                //console.log("outside");
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
                nextPosition.axes = this.clipToPrinterBounds(Vector.add(this.position, amountMovedVec).axes);
                //console.log(nextPosition);

                // reverse velocity if axis bounds hit, for shortest axis
                for (const axis of shortestAxes) {
                    moveVector.axes[axis] = moveVector.axes[axis] * -1;
                }
            }
        } else {
            this.clipToPrinterBounds(nextPosition.axes);
        }
        leftToMove -= amountMoved;

        // update current position

        this.position.set(nextPosition);
     

        await this.sendExtrusionGCode(speed, retract);

        if (retract)
            await this.retract();

    } // end _extrude 

}


// end Printer class



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
/*
Printer.prototype._extrude = meth("_extrude", function (that, speed, moveVector, leftToMove, retract) {
    // if there's nowhere to move, return
    //console.log(that);
    //console.log("left to move:" + leftToMove);
    //console.log(moveVector);

    if (isNaN(leftToMove) || leftToMove < 0.01) {
        //console.log("(extrude) end position:" + that.x + ", " + that.y + ", " + that.z + ", " + that.e);
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
            if (axis !== "e") {
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
            //console.log("outside");
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

    // DON'T DO THIS ANYMORE... counter-intuitive!
    //that._elevation = Math.asin(moveVector.axes.z);
    that.position.set(nextPosition);
    //console.log("next pos:");
    //console.log(nextPosition);
    //console.log(that.position);
    //console.log(that);

    that.sendExtrusionGCode(speed, retract);

    // handle cases where velocity is 0 (might be movement up or down)

    //console.log("prev heading:" + this._heading);
    //console.log("move vec:" + moveVector.axes.x + ", " + moveVector.axes.y);

    let _test = moveVector.axes.y * moveVector.axes.y + moveVector.axes.x * moveVector.axes.x;

    if (_test > Number.EPSILON) {
        //console.log("not not going nowhere __" + that._heading);
        let newHeading = Math.atan2(moveVector.axes.y, moveVector.axes.x);
        if (!isNaN(newHeading)) that._heading = newHeading;
        //console.log("new heading:" + that._heading);
    }

    // Tail recursive, until target x,y,z is hit
    return mret(that._extrude, speed, moveVector, leftToMove, retract);
    //return false;

} // end _extrude 
);
*/

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

Printer.MinLayerHeight = 0.05; // in mm

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

Printer.defaultPrintSpeed = 50; // mm/s

Printer.speedScale = {};
Printer.speedScale[Printer.UM2] = { 'x': 47.069852, 'y': 47.069852, 'z': 160.0 };
Printer.speedScale[Printer.UM2plus] = { 'x': 47.069852, 'y': 47.069852, 'z': 160.0 };

//////////////////////////////////////////////////////////

module.exports = Printer;