# AssessDiceRoll Routine Specification

## Purpose
The AssessDiceRoll routine analyzes a set of five six-sided dice values to identify chains of identical numbers, their properties, and relationships. The routine identifies which dice form chains of matching values, the number and size of these chains, and calculates values derived from these chains.

## Input Parameters
- **diceValues**: An ordered array/list of 5 integer values, each between 1-6 (representing dice rolls)
  - Example: [1,5,3,2,3]
  - Data type: Array/List of 5 integers
  - Constraints: Each value must be between 1 and 6 inclusive

## Output Parameters
The routine should return a data structure (object, struct, record, etc.) containing the following information:

1. **ChainCount**: Number of chains found (0, 1, or 2)
   - Type: Integer
   - Range: 0-2

2. **Chain Numbers**:
   - **Chain1Number**: Value of the first chain encountered (0 if none exists)
     - Type: Integer
     - Range: 0-6
   - **Chain2Number**: Value of the second chain encountered (0 if none exists)
     - Type: Integer
     - Range: 0-6

3. **Chain Sizes**:
   - **Chain1Size**: Number of dice in the first chain (0 if none exists)
     - Type: Integer
     - Range: 0-5
   - **Chain2Size**: Number of dice in the second chain (0 if none exists)
     - Type: Integer
     - Range: 0-5

4. **Die Participation**: For each die position (1-5), which chain it belongs to
   - **Die1**: Chain membership of first die
     - Type: Integer
     - Range: 0-2 (0=none, 1=Chain1, 2=Chain2)
   - **Die2**: Chain membership of second die
   - **Die3**: Chain membership of third die
   - **Die4**: Chain membership of fourth die
   - **Die5**: Chain membership of fifth die

5. **Chain Values**:
   - **Chain1Value**: Sum of all dice values in Chain 1 (0 if none exists)
     - Type: Integer
     - Range: 0-30
   - **Chain2Value**: Sum of all dice values in Chain 2 (0 if none exists)
     - Type: Integer
     - Range: 0-30
   - **TotalValue**: Sum of all chain values
     - Type: Integer
     - Range: 0-30

## Processing Logic

The routine should follow this logical sequence:

1. **Initialization**:
   - Set all output values to their defaults (zeros)
   - Create data structures to track frequencies of each dice value

2. **Frequency Analysis**:
   - Count occurrences of each unique dice value (1-6) in the input array
   - Identify values that appear at least twice (potential chains)

3. **Chain Identification**:
   - Scan the input array from left to right
   - When encountering the second occurrence of any value, assign it as Chain 1
   - When encountering the second occurrence of a different value, assign it as Chain 2
   - Continue until all dice are processed

4. **Chain Assignment**:
   - For each die in the input array, determine which chain it belongs to (if any)
   - Assign 0 for no chain, 1 for Chain 1, 2 for Chain 2
   - Record these assignments in the Die1-Die5 output parameters

5. **Value Calculation**:
   - Calculate Chain1Value = Chain1Number × Chain1Size
   - Calculate Chain2Value = Chain2Number × Chain2Size
   - Calculate TotalValue = Chain1Value + Chain2Value

6. **Result Compilation**:
   - Assemble all calculated values into the output structure
   - Return the complete structure

## Key Rules and Constraints

1. **Chain Definition**: A chain consists of two or more dice showing identical values
   - Single occurrences of values do not form chains

2. **Chain Ordering**:
   - Chain 1 is always the first chain encountered in the left-to-right scan
   - Chain 2 is always the second chain encountered (if any)

3. **Processing Order**:
   - Process dice in the order they appear in the input array (left to right)
   - The second occurrence of any value defines the start of Chain 1
   - The second occurrence of a different value defines the start of Chain 2

4. **Performance Considerations**:
   - The routine should be optimized for speed
   - Processing should be efficient to support batch testing

## Examples

For input [1,5,3,2,3]:
```
ChainCount: 1
Chain1Number: 3
Chain2Number: 0
Chain1Size: 2
Chain2Size: 0
Die1: 0
Die2: 0
Die3: 1
Die4: 0
Die5: 1
Chain1Value: 6
Chain2Value: 0
TotalValue: 6
```

For input [2,2,3,3,6] (two chains):
```
ChainCount: 2
Chain1Number: 2
Chain2Number: 3
Chain1Size: 2
Chain2Size: 2
Die1: 1
Die2: 1
Die3: 2
Die4: 2
Die5: 0
Chain1Value: 4
Chain2Value: 6
TotalValue: 10
```

## Testing Note

This routine will be subjected to comprehensive testing with a separate test script. The test script will generate random dice combinations and validate the routine's outputs against expected results. The routine should be designed with performance in mind to handle batch processing efficiently.
