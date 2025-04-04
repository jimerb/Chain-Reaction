const fs = require('fs');
const path = require('path');

// Determine the correct path to diceLogic.js relative to the tests directory
const diceLogicPath = path.join(__dirname, '..', 'diceLogic.js');

// --- Try loading AssessDiceRoll using standard require --- 
let AssessDiceRoll;
try {
    AssessDiceRoll = require(diceLogicPath);
} catch (error) {
    console.error(`Error loading ${diceLogicPath}:`, error);
    console.error("Ensure diceLogic.js exists and exports the AssessDiceRoll function using module.exports.");
    process.exit(1);
}

// Final check
if (typeof AssessDiceRoll !== 'function') {
    console.error(`AssessDiceRoll function not found or not loaded correctly from ${diceLogicPath}. It might not be exported properly.`);
    process.exit(1);
}


// --- Test Data Reading and Parsing --- 
const testFilePath = path.join(__dirname, '..', 'docs', 'dice-chain-tests.md');
const reportDir = __dirname; // Store report in the same 'tests' directory

function parseTestCaseLine(line) {
    // Updated Regex to handle potential inconsistencies and trim spaces
    const match = line.match(/\|\s*(\d+)\s*\|\s*\[?([\d,\s]+)\]?\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/);
    if (!match) return null;

    try {
        const testNum = parseInt(match[1].trim(), 10);
        // Parse input dice, removing potential brackets and extra spaces
        const inputDice = match[2].trim().replace(/[\[\]]/g, '').split(',').map(s => parseInt(s.trim(), 10));
        if (inputDice.length !== 5 || inputDice.some(isNaN)) {
            console.warn(`Skipping malformed input dice in test case #${testNum}: ${match[2]}`);
            return null;
        }

        const expected = {
            ChainCount: parseInt(match[3].trim(), 10),
            Chain1Number: parseInt(match[4].trim(), 10),
            Chain2Number: parseInt(match[5].trim(), 10),
            Chain1Size: parseInt(match[6].trim(), 10),
            Chain2Size: parseInt(match[7].trim(), 10),
            Die1: parseInt(match[8].trim(), 10),
            Die2: parseInt(match[9].trim(), 10),
            Die3: parseInt(match[10].trim(), 10),
            Die4: parseInt(match[11].trim(), 10),
            Die5: parseInt(match[12].trim(), 10),
            Chain1Value: parseInt(match[13].trim(), 10),
            Chain2Value: parseInt(match[14].trim(), 10),
            TotalValue: parseInt(match[15].trim(), 10),
        };
        return { testNum, inputDice, expected };
    } catch (e) {
        console.warn(`Error parsing line: ${line}`, e);
        return null;
    }
}

function readTestCases(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const testCases = [];
        let inTable = false;

        for (const line of lines) {
             // Look for Markdown table delimiters
             if (line.startsWith('|---|')) { 
                inTable = true;
                continue; 
             }
             // Stop if we hit a non-table line after starting
             if (inTable && !line.trim().startsWith('|')) {
                 // Allow empty lines within the table section for formatting
                 if (line.trim() === '') continue; 
                 // Check if it's a header line (e.g., ### More Test Cases)
                 if (line.trim().startsWith('#')) {
                    inTable = false; // Reset if we hit another header
                    continue;
                 } 
                 // If it's not a header or empty, assume end of current table block
                 // inTable = false; 
                 // break; // Or continue scanning for more tables?
                 // Let's continue scanning for now to potentially catch multiple tables
                 inTable = false;
                 continue;
             }
            
            if (inTable && line.trim().startsWith('|')) {
                const parsed = parseTestCaseLine(line.trim());
                if (parsed) {
                    testCases.push(parsed);
                } else if (line.trim().length > 2) { // Avoid warnings for divider lines
                    console.warn(`Could not parse test case line: ${line.trim()}`);
                }
            }
        }
        return testCases;
    } catch (error) {
        console.error(`Error reading or parsing test file ${filePath}:`, error);
        return [];
    }
}

// --- Test Execution and Reporting --- 

function generateReportTimestamp() {
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD}_${HH}-${mm}-${ss}`; 
}

function formatObject(obj) {
    // Consistent formatting for comparison
    return JSON.stringify(obj, Object.keys(obj).sort());
}

function runTests() {
    const testCases = readTestCases(testFilePath);
    if (!testCases || testCases.length === 0) {
        console.error("No test cases loaded. Exiting.");
        return;
    }

    console.log(`Loaded ${testCases.length} test cases from ${testFilePath}`);

    const reportTimestamp = generateReportTimestamp();
    const reportFileName = `AssessDiceRoll-TestResults_${reportTimestamp}.txt`;
    const reportFilePath = path.join(reportDir, reportFileName);
    let reportContent = `AssessDiceRoll Test Results - ${new Date().toISOString()}\n`;
    reportContent += `Test File: ${testFilePath}\n`;
    reportContent += `Function Source: ${diceLogicPath}\n`;
    reportContent += `Total Test Cases: ${testCases.length}\n\n`;

    let passedCount = 0;
    let failedCount = 0;

    testCases.forEach(({ testNum, inputDice, expected }) => {
        const actual = AssessDiceRoll(inputDice.slice()); // Use slice to avoid modifying original test data if function mutates input
        const isPass = JSON.stringify(expected) === JSON.stringify(actual); // Simple deep comparison

        if (isPass) {
            passedCount++;
            reportContent += `Test #${testNum}: PASSED\n`;
            reportContent += ` Input:    ${JSON.stringify(inputDice)}\n`;
            reportContent += ` Expected: ${formatObject(expected)}\n`;
            reportContent += ` Actual:   ${formatObject(actual)}\n\n`;
        } else {
            failedCount++;
            reportContent += `Test #${testNum}: FAILED <<<<<<<<<<<<<<\n`;
            reportContent += ` Input:    ${JSON.stringify(inputDice)}\n`;
            reportContent += ` Expected: ${formatObject(expected)}\n`;
            reportContent += ` Actual:   ${formatObject(actual)}\n`;
            // Highlight differences
            reportContent += ` Differences:\n`;
            for (const key in expected) {
                if (expected[key] !== actual[key]) {
                    reportContent += `  - ${key}: Expected ${expected[key]}, Got ${actual[key] !== undefined ? actual[key] : 'undefined'}\n`;
                }
            }
             for (const key in actual) { // Check for extra keys in actual
                if (!(key in expected)) {
                    reportContent += `  - ${key}: Got unexpected key with value ${actual[key]}\n`;
                }
            }
            reportContent += `\n`;
        }
    });

    reportContent += `--- Test Summary ---\n`;
    reportContent += `Passed: ${passedCount}\n`;
    reportContent += `Failed: ${failedCount}\n`;
    reportContent += `Total:  ${testCases.length}\n`;

    try {
        fs.writeFileSync(reportFilePath, reportContent);
        console.log(`Test report generated: ${reportFilePath}`);
        if (failedCount > 0) {
            console.error(`${failedCount} test(s) failed. Check the report for details.`);
        } else {
            console.log("All tests passed!");
        }
    } catch (error) {
        console.error(`Error writing report file ${reportFilePath}:`, error);
    }
}

// --- Run the tests --- 
runTests();
