/**
 * A Vector object with optional fields (ex: x,y,z,e)
 * @class 
 * @constructor
 * @param {any} mapping object with fields to deep copy into this Vector
 */
class Vector {
    constructor(mapping) {
        this.axes = {};
        if (arguments.length > 1) {
            this.axes.x = arguments[0];
            this.axes.y = arguments[1];
            if (arguments.length > 2)
                this.axes.z = arguments[2];
            if (arguments.length > 3)
                this.axes.e = arguments[3];
        }
        else if (mapping !== undefined) {
            if (mapping instanceof Vector) {
                // deep copy axes
                for (const axis in mapping.axes) {
                    this.axes[axis] = mapping.axes[axis];
                }
            } else if (mapping instanceof Object) {
                for (const axis in mapping) {
                    this.axes[axis] = mapping[axis];
                }
            }
        }
        else {
            this.axes.x = 0;
            this.axes.y = 0;
            this.axes.z = 0;
        }
    }

    /**
     * Subtract a vector object (x,y,z,e or whatever) from another and return a new vector.
     * TODO: Consider using toxiclibs or other Vector lib
     * @param {Vector} v0 first vector 
     * @returns {object} reference to this for chaining
     */
    subSelf(v0) {
        try {
            for (const axis in v0.axes) {
                this.axes[axis] = this.axes[axis] - v0.axes[axis];
            }
        } catch (e) {
            // rethrow, caught in GUI
            throw e;
        }
        return this;
    }

    /**
     * Add a vector object (x,y,z,e or whatever) to another and return itself.
     * @param {Vector} v0 amount to add
     * @returns {object} reference to this for chaining
     */
    addSelf(v0) {
        try {
            for (const axis in v0.axes) {
                this.axes[axis] = this.axes[axis] + v0[axis];
            }
        } catch (e) {
            // rethrow, caught in GUI
            throw (e);
        }
        return this;
    }


    /**
     * Magnitude squared of this vector as a scalar.
     * @returns {float} magnitude
     */
    magSq(v0) {
        const v1 = (v0 === undefined ? this : v0);
        let sumAxes = 0;
        for (const v in v1.axes) {
            sumAxes += v1.axes[v] * v1.axes[v];
        }
        return sumAxes;
    }

    /**
     * Magnitude of this vector as a scalar.
     * @param {float} v0 new length of vector
     * @returns {float} magnitude
     */
    mag(v0) {
        const v1 = (v0 === undefined ? this : v0);
        return Math.sqrt(v1.magSq());
    }

    /**
     * Scalar distance between Vectors.
     * @param {Vector} v0 (required) first vector 
     * @param {Vector} v1 (optional) second vector (if not included, will use this)
     * @returns {float} scalar vector
     */
    dist(v0, v1) {
        const v2 = (v1 === undefined ? this : v1);
        return Vector.sub(v0, v2).mag();
    }

    /**
     * Divide a vector by a scalar
     * @param {Number} amt to divide by
     * @returns {Vector} this object for chaining
     */
    divSelf(amt) {
        for (const axis in this.axes) {
            this.axes[axis] /= amt;
        }
        return this;
    }


    /**
     * Multiply a vector by a scalar
     * @param {Number} amt to multiply by
     * @returns {Vector} this object for chaining
     */
    multSelf(amt) {
        for (const axis in this.axes) {
            this.axes[axis] *= amt;
        }
        return this;
    }


    /**
     * Set the properties of this Vector based on another or a mapping object
     * @param {object} mapping object with fields to deep copy into this Vector
     * @returns {Vector} this object for chaining
     */
    set(mapping) {
        if (mapping !== undefined) {
            if (mapping instanceof Vector) {
                // deep copy axes
                for (const axis in mapping.axes) {
                    this.axes[axis] = mapping.axes[axis];
                }
            } else if (mapping instanceof Object) {
                for (const axis in mapping) {
                    this.axes[axis] = mapping[axis];
                }
            }
        }
        return this;
    }



    /**
     * Add a vector object (x,y,z,e or whatever) to another and return a new Vector.
     * TODO: Consider using toxiclibs or other Vector lib
     * @param {Vector} v0 first vector 
     * @param {Vector} v1 amount to add
     * @returns {object} reference to this for chaining
     */
    static add(v0, v1) {
        const v2 = new Vector();
        try {
            for (const axis in v0.axes) {
                v2.axes[axis] = v0.axes[axis] + v1.axes[axis];
            }
        } catch (e) {
            // rethrow, caught in GUI
            throw (e);
        }
        return v2;
    }

    /**
    * Divide a vector object (x,y,z,e or whatever) by an amount and return a new one.
    * @param {Vector} v0 first vector 
    * @param {number} amt amount to divide by
    * @returns {Vector} new Vector
    */
    static div(v0, amt) {
        const v1 = new Vector();
        try {
            for (const axis in v0.axes) {
                v1.axes[axis] = v0.axes[axis] / amt;
            }
        } catch (e) {
            // rethrow, caught in GUI
            throw (e);
        }
        return v1;
    }



    /**
    * Subtract a vector object (x,y,z,e or whatever) from another and return a new vector.
    * @param {Vector} v0 first vector 
    * @param {Vector} v1 amount to subtract
    * @returns {Vector} result vector
    */
    static sub(v0, v1) {
        const v2 = new Vector();
        try {
            for (const axis in v0.axes) {
                v2.axes[axis] = v0.axes[axis] - v1.axes[axis];
            }
        } catch (e) {
            // rethrow, caught in GUI
            throw (e);
        }
        return v2;
    }

    /**
    * Multiply a vector object (x,y,z,e or whatever) to another and return a new vector.
    * @param {Vector} v0 first vector 
    * @param {Vector} v1 second vector
    * @returns {Vector} result vector 
    */
    static mult(v0, v1) {
        const v2 = new Vector();
        if (typeof v1 === "object") {
            try {
                for (const axis in v0.axes) {
                    v2.axes[axis] = v0.axes[axis] * v1.axes[axis];
                }
            } catch (e) {
                // rethrow, caught in GUI
                throw (e);
            }
        }
        else if (typeof v1 === "number") {
            try {
                for (const axis in v0.axes) {
                    v2.axes[axis] = v0.axes[axis] * v1;
                }
            } catch (e) {
                // rethrow, caught in GUI
                throw (e);
            }        
        }
        return v2;
    }
}


// export vector class
module.exports = Vector;

