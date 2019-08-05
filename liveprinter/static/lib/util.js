/**
 * Make an iterator from an iterable - run the returned func to iterate
 * @param {any} iterable
 * @returns {Function} Iterator function that iterates iterable, returns resulting value or false when run
 */

function makeIterator(iterable) {
    const iter = iterable[Symbol.iterator]();

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



/**
 * makeMapping :: (Num, Num) -> (Num, Num) -> Num -> Num
 * Create a map function that converts a number from one range to within another
 * from http://rosettacode.org/wiki/Map_range#JavaScript
 * @namespace LivePrinter
 * @param {Array} a 2-element array range
 * @param {Array} b 2-element array range
 * @returns {Function} mapping function
 * @example const mapping = makeMapping([0, 10], [-1, 0]);
 *          let result = mapping(5);
 */
const makeMapping = (a, b) => s => {
    const [a1, a2] = a;
    const [b1, b2] = b;
    // Scaling up an order, and then down, to bypass a potential,
    // precision issue with negative numbers.
    return (((((b2 - b1) * (s - a1)) / (a2 - a1)) * 10) + (10 * b1)) / 10;
};


/**
 * numrange: return a range of numbers quickly
 * based on http://rosettacode.org/wiki/Map_range#JavaScript 
 * @namespace LivePrinter
 * @param {Int} m minimum value of range
 * @param {Int} n maximum value of range
 * @param {Int} c number to increment each value of range by
 * @returns {Array} range of numbers
 */
const numrange = (m, n, c=1) =>
    Array.from({
        length: 1 + Math.floor((n - m)/c)
    }, (_, i) => m + i*c);


// string reversal in javascript - adapted from https://github.com/mathiasbynens/esrever/blob/master/esrever.js

var regexSymbolWithCombiningMarks = /([\0-\u02FF\u0370-\u1AAF\u1B00-\u1DBF\u1E00-\u20CF\u2100-\uD7FF\uE000-\uFE1F\uFE30-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])([\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]+)/g;
var regexSurrogatePair = /([\uD800-\uDBFF])([\uDC00-\uDFFF])/g;

String.prototype.reverse = function () {
    // Step 1: deal with combining marks and astral symbols (surrogate pairs)
    let string = this
        // Swap symbols with their combining marks so the combining marks go first
        .replace(regexSymbolWithCombiningMarks, function ($0, $1, $2) {
            // Reverse the combining marks so they will end up in the same order
            // later on (after another round of reversing)
            return $2.reverse() + $1;
        })
        // Swap high and low surrogates so the low surrogates go first
        .replace(regexSurrogatePair, '$2$1');
    // Step 2: reverse the code units in the string
    let result = '';
    let  index = string.length;
    while (index--) {
        result += string.charAt(index);
    }
    return result;
};