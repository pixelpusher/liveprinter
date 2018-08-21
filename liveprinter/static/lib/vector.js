
/**
 * A Vector object with optional fields (ex: x,y,z,e)
 * @param {any} mapping object with fields to deep copy into this Vector
 */
function Vector(mapping) {
    this.axes = {};
    if (mapping !== undefined) {
        if (mapping instanceof Vector) {
            // deep copy axes
            for (let axis in mapping.axes) {
                this.axes[axis] = mapping.axes[axis];
            }
        } else if (mapping instanceof Object) {
            for (let axis in mapping) {
                this.axes[axis] = mapping[axis];
            }
        }
    }
};

/**
* Subtract a vector object (x,y,z,e or whatever) from another and return a new vector.
* TODO: Consider using toxiclibs or other Vector lib
* @param {Vector} v0 first vector 
*/
Vector.prototype.subSelf = function (v0) {
    try {
        for (let axis in v0.axes) {
            this.axes[axis] = this.axes[axis] - v0.axes[axis];
        }
    } catch (e) {
        // rethrow, caught in GUI
        throw (e);
    }
    return this;
};

/**
* Subtract a vector object (x,y,z,e or whatever) from another and return a new vector.
* @param {Vector} v0 first vector 
* @param {Vector} v1 amount to subtract
*/
Vector.prototype.sub = function (v0, v1) {
    v2 = new Vector();
    try {
        for (let axis in v0.axes) {
            v2.axes[axis] = v0.axes[axis] - v1.axes[axis];
        }
    } catch (e) {
        // rethrow, caught in GUI
        throw (e);
    }
    return v2;
};

/**
 * Add a vector object (x,y,z,e or whatever) to another and return itself.
 * @param {Vector} v0 amount to add
 */
Vector.prototype.addSelf = function (v0) {
    try {
        for (let axis in v0.axes) {
            this.axes[axis] = this.axes[axis] + v0[axis];
        }
    } catch (e) {
        // rethrow, caught in GUI
        throw (e);
    }
    return this;
};

/**
 * Add a vector object (x,y,z,e or whatever) to another and return a new Vector.
 * TODO: Consider using toxiclibs or other Vector lib
 * @param {Vector} v0 first vector 
 * @param {Vector} v1 amount to add
 */
Vector.prototype.add = function (v0, v1) {
    v2 = new Vector();
    try {
        for (let axis in v0.axes) {
            v2.axes[axis] = v0.axes[axis] + v1.axes[axis];
        }
    } catch (e) {
        // rethrow, caught in GUI
        throw (e);
    }
    return v2;
};

/**
* Magnitude of this vector as a scalar.
*/
Vector.prototype.magSq = function (v0) {
    let v1 = (v0 === undefined ? this : v0);
    let sumAxes = 0;
    for (let v in v1.axes) {
        sumAxes += v1.axes[v] * v1.axes[v];
    }
    return sumAxes;
};

/**
 * Magnitude of this vector as a scalar.
 */
Vector.prototype.mag = function (v0) {
    let v1 = (v0 === undefined ? this : v0);
    return Math.sqrt(v1.magSq());
};

/**
 * Scalar distance between Vectors.
 * @param {Vector} v0 (required) first vector 
 * @param {Vector} v1 (optional) second vector (if not included, will use this)
 */
Vector.prototype.dist = function (v0, v1) {
    let v2 = (v1 === undefined ? this : v1);
    return Vector.sub(v0, v2).mag();
}

/**
 * Divide a vector by a scalar
 * @param {Number} amt to divide by
 */
Vector.prototype.divSelf = function (amt) {
    for (let axis in this.axes) {
        this.axes[axis] /= amt;
    }
    return this;
}

/**
* Divide a vector object (x,y,z,e or whatever) by an amount and return a new one.
* @param {Vector} v0 first vector 
* @param {number} amt amount to divide by
*/
Vector.prototype.div = function (v0, amt) {
    v1 = new Vector();
    try {
        for (let axis in v0.axes) {
            v1.axes[axis] = v0.axes[axis]/amt;
        }
    } catch (e) {
        // rethrow, caught in GUI
        throw (e);
    }
    return v1;
};


/**
 * Multiply a vector by a scalar
 * @param {Number} amt to multiply by
 */
Vector.prototype.multSelf = function (amt) {
    for (let axis in this.axes) {
        this.axes[axis] *= amt;
    }
    return this;
}

/**
* Multiply a vector object (x,y,z,e or whatever) by an amount and return a new one.
* @param {Vector} v0 first vector 
* @param {number} amt amount to divide by
*/
Vector.prototype.mult = function (v0, amt) {
    v1 = new Vector();
    try {
        for (let axis in v0.axes) {
            v1.axes[axis] = v0.axes[axis] * amt;
        }
    } catch (e) {
        // rethrow, caught in GUI
        throw (e);
    }
    return v1;
};


/**
 * Set the properties of this Vector based on another or a mapping object
 * @param {any} mapping object with fields to deep copy into this Vector
 */
Vector.prototype.set = function(mapping)
{
    if (mapping !== undefined) {
        if (mapping instanceof Vector) {
            // deep copy axes
            for (let axis in mapping.axes) {
                this.axes[axis] = mapping.axes[axis];
            }
        } else if (mapping instanceof Object) {
            for (let axis in mapping) {
                this.axes[axis] = mapping[axis];
            }
        }
    }
}