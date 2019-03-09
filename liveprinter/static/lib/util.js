
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
