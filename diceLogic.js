/**
 * Analyzes a set of five six-sided dice values to identify chains of identical numbers,
 * their properties, and relationships according to the specification in
 * docs/AssessDiceRoll design-spec.md.
 *
 * @param {number[]} diceValues - An ordered array/list of 5 integer values, each between 1-6.
 * @returns {object} An object containing the analysis results:
 *  - ChainCount: Number of chains found (0, 1, or 2)
 *  - Chain1Number: Value of the first chain (0 if none)
 *  - Chain2Number: Value of the second chain (0 if none)
 *  - Chain1Size: Number of dice in the first chain (0 if none)
 *  - Chain2Size: Number of dice in the second chain (0 if none)
 *  - Die1-Die5: Chain membership of each die (0=none, 1=Chain1, 2=Chain2)
 *  - Chain1Value: Sum of dice values in Chain 1 (0 if none)
 *  - Chain2Value: Sum of dice values in Chain 2 (0 if none)
 *  - TotalValue: Sum of all chain values
 */
function AssessDiceRoll(diceValues) {
    // Input validation (basic)
    if (!Array.isArray(diceValues) || diceValues.length !== 5 || !diceValues.every(v => v >= 1 && v <= 6 && Number.isInteger(v))) {
        console.error("Invalid diceValues input:", diceValues);
        // Return default structure or throw error, depending on desired handling
        // For now, returning default structure
         return {
            ChainCount: 0,
            Chain1Number: 0, Chain2Number: 0,
            Chain1Size: 0, Chain2Size: 0,
            Die1: 0, Die2: 0, Die3: 0, Die4: 0, Die5: 0,
            Chain1Value: 0, Chain2Value: 0,
            TotalValue: 0
        };
    }

    // 1. Initialization
    const results = {
        ChainCount: 0,
        Chain1Number: 0, Chain2Number: 0,
        Chain1Size: 0, Chain2Size: 0,
        Die1: 0, Die2: 0, Die3: 0, Die4: 0, Die5: 0,
        Chain1Value: 0, Chain2Value: 0,
        TotalValue: 0
    };
    
    // Track occurrences of each value as we scan left to right
    const seen = {};
    const dieMembership = [0, 0, 0, 0, 0]; // Membership of each die (0=none, 1=Chain1, 2=Chain2)
    
    // 2. Left-to-right scan for chain identification and assignment
    for (let i = 0; i < diceValues.length; i++) {
        const value = diceValues[i];
        
        // If we've seen this value before
        if (seen[value]) {
            // First time seeing a second occurrence - establish Chain 1
            if (results.ChainCount === 0) {
                results.ChainCount = 1;
                results.Chain1Number = value;
                // Assign current die and its previous occurrence to Chain 1
                dieMembership[i] = 1;
                dieMembership[seen[value] - 1] = 1; // Adjust index (seen is 1-based)
                results.Chain1Size = 2;
            } 
            // We've already established Chain 1, but current value is not Chain 1's value
            else if (results.Chain1Number !== value && results.Chain2Number === 0) {
                results.ChainCount = 2;
                results.Chain2Number = value;
                // Assign current die and its previous occurrence to Chain 2
                dieMembership[i] = 2;
                dieMembership[seen[value] - 1] = 2; // Adjust index (seen is 1-based)
                results.Chain2Size = 2;
            }
            // Adding more dice to existing chains
            else if (value === results.Chain1Number) {
                dieMembership[i] = 1;
                results.Chain1Size++;
            }
            else if (value === results.Chain2Number) {
                dieMembership[i] = 2;
                results.Chain2Size++;
            }
        } 
        // First time seeing this value - just record its position (1-based for easier math)
        else {
            seen[value] = i + 1;
        }
    }
    
    // 3. Assign die memberships to results
    results.Die1 = dieMembership[0];
    results.Die2 = dieMembership[1];
    results.Die3 = dieMembership[2];
    results.Die4 = dieMembership[3];
    results.Die5 = dieMembership[4];
    
    // 4. Calculate chain values
    results.Chain1Value = results.Chain1Number * results.Chain1Size;
    results.Chain2Value = results.Chain2Number * results.Chain2Size;
    results.TotalValue = results.Chain1Value + results.Chain2Value;
    
    return results;
}

// Example Usage (from spec):
const example1 = [1, 5, 3, 2, 3];
const result1 = AssessDiceRoll(example1);
console.log(`Input: ${example1}`);
console.log("Output:", result1);
/* Expected Output 1:
{
  ChainCount: 1, Chain1Number: 3, Chain2Number: 0,
  Chain1Size: 2, Chain2Size: 0,
  Die1: 0, Die2: 0, Die3: 1, Die4: 0, Die5: 1,
  Chain1Value: 6, Chain2Value: 0, TotalValue: 6
}
*/

const example2 = [2, 2, 3, 3, 6];
const result2 = AssessDiceRoll(example2);
console.log(`\nInput: ${example2}`);
console.log("Output:", result2);
/* Expected Output 2:
{
  ChainCount: 2, Chain1Number: 2, Chain2Number: 3,
  Chain1Size: 2, Chain2Size: 2,
  Die1: 1, Die2: 1, Die3: 2, Die4: 2, Die5: 0,
  Chain1Value: 4, Chain2Value: 6, TotalValue: 10
}
*/

// Add more test cases if needed
const example3 = [1, 1, 1, 1, 1]; // Single large chain
const result3 = AssessDiceRoll(example3);
console.log(`\nInput: ${example3}`);
console.log("Output:", result3);

const example4 = [6, 5, 4, 3, 2]; // No chains
const result4 = AssessDiceRoll(example4);
console.log(`\nInput: ${example4}`);
console.log("Output:", result4);

const example5 = [4, 4, 1, 4, 4]; // Chain of 4
const result5 = AssessDiceRoll(example5);
console.log(`\nInput: ${example5}`);
console.log("Output:", result5);

// Remove Node.js specific export for browser compatibility
// module.exports = AssessDiceRoll;

// Remove redundant global assignment - defining the function is enough
