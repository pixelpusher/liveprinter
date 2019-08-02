// L-systems test
// Uses a modified verion of the Lindenmayer library for JavaScript that uses ES6 Generators
// https://github.com/pixelpusher/lindenmayer


lp.start(195);

attachScript("http://localhost:8888/static/lib/linden/linden.js");

lp.moveto({ x: 20, y: lp.maxy - 20, z: lp.lh, speed: 30 });

lp.unretract();


// Now initialize the L-System to generate the Hilbert curve
global hilbert = new LSystem({
    axiom: 'L',
    ignoredSymbols: "",
    productions: {
        'L': "+RF-LFL-FR+",
        'R': "-LF+RFR+FL-",
    },
    finals: {
        'F': () => { loginfo("F") },
        '+': () => { loginfo("+") },
        '-': () => { loginfo("-") }
    }
});

// Run the 5 iterations of the L-System

hilbert.iterate(1);

// print some info
loginfo(hilbert.getString());

// run through drawing commands in order (index < total)
{
    let i = hilbert.run();
    console.log(i);
    //i.next()

    for (let iter of i) {
        for (let p in iter) {
            loginfo(p + " " + iter[p]);
        }
        if (iter.index === iter.total) loginfo("DONE!");
    }
}

// step through manually
// works with run or steps
s.iterator = hilbert.steps()[Symbol.iterator](); // run once to initialise  
s.result = s.iterator.next(); // keep running this to draw next line


// run all functions and print out parts and index -- this can be faster but you don't know how many you have
// last part is false and index is -1
for (let v of hilbert.steps()) {
    for (let p in v) {
        loginfo(p + " " + v[p]);
    }
}

// running through steps repeatedly
{
    let iter = hilbert.steps(true); // step through all steps forever, for 30 steps

    let i = 0; // counter for safety!
    while (i++ < 30) {
        let v = iter.next().value;
        console.log(v);

        if (v.part) // part is false at loop
            for (let p in v) {
                loginfo(i + ": " + p + " " + v[p]);
            }
    }
}

// better to reverse the fractal after each loop
{
    let iter = hilbert.steps(true); // step through all steps forever, for 30 steps

    let i = 0; // counter for safety!
    while (i++ < 30) {
        let v = iter.next().value;
        console.log(v);

        if (v.part) { // part is false at loop
            for (let p in v) {
                loginfo(i + ": " + p + " " + v[p]);
            }
        } else {
            loginfo(hilbert.axiom);
            let str = "";
            for (let a of hilbert.axiom) {
                if (a === "+") str += "-";
                else if (a === "-") str += "+";
                else str += a;
            }
            hilbert.axiom = str;
            loginfo(hilbert.axiom);
        }
    }
}


s.iterator = function (iterable) {
    let iter = iterable[Symbol.iterator]();

    return () => {
        const result = iter.next();
        let retVal = result.value;

        if (result.done || result.value === "done") {
            loginfo("DONE");
            retVal = false;
        }
        return retVal;
    };
};

// make iterator for all drawing steps
s.steptree = s.iterator(hilbert.steps());

loginfo(s.steptree().part); // will be undefined when all steps have been looped through


// or built-in makeIterator:
global stepFunc = makeIterator(hilbert.steps());
loginfo(stepFunc().part);


// run whole fractal at once
while (s.steptree().part);
