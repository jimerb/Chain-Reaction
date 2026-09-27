'use strict';
// Exact enumeration, not a sampling estimate. One roll, then bank the best legal result.
// No enhancements; bank immediately after this roll (no later recycled-dice rolls).
function extensionEV(value, count) {
    const remaining = 5 - count;
    let total = 0, survive = 0;
    for (let n = 0; n < 6 ** remaining; n++) {
        let code = n; const counts = Array(7).fill(0);
        for (let i = 0; i < remaining; i++) { counts[code % 6 + 1]++; code = Math.floor(code / 6); }
        let best = counts[value] ? value * (count + counts[value]) : 0;
        for (let v = 1; v <= 6; v++) if (v !== value && counts[v] >= 2) best = Math.max(best, v * counts[v]);
        total += best; if (best > 0) survive++;
    }
    return { value, count, bank: value * count, expectedAfterOneRoll: +(total / (6 ** remaining)).toFixed(3), survival: +(survive / (6 ** remaining) * 100).toFixed(3) };
}
const rows = [];
for (let count = 2; count <= 4; count++) for (let value = 1; value <= 6; value++) rows.push(extensionEV(value, count));
console.table(rows);
console.log('Opening leak:', 720 / 7776 * 100, '%; opening Critical Mass:', 6 / 7776 * 100, '%');
module.exports = { extensionEV };
