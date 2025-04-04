# AssessDiceRoll Test Suite

This document contains a comprehensive test suite for validating the AssessDiceRoll routine. Each test case provides input dice values and expected output parameters to verify correct functionality across various scenarios.

## Test Organization

The test suite consists of 110 test cases covering:
- No chains (all different values or single occurrences)
- Single chains of all possible sizes (2, 3, 4, or 5 dice)
- Two chains of various configurations
- Edge cases with interleaved chains
- Special boundary cases

## How To Use This Test Suite

1. Each test case includes:
   - Test case number
   - Input dice values (array of 5 integers, each 1-6)
   - Expected output values for all parameters

2. Implementation suggestion:
   - Create a test harness that iterates through each test case
   - Call AssessDiceRoll with the input values
   - Compare the returned results against expected values
   - Report any discrepancies

## Test Case Data

Each row represents a single test case in the format:
`[Test#, Input Dice, ChainCount, Chain1Number, Chain2Number, Chain1Size, Chain2Size, Die1, Die2, Die3, Die4, Die5, Chain1Value, Chain2Value, TotalValue]`

### Basic Cases (No Chains, Single Chain)

| # | Input Dice | Chain Count | Chain1 Number | Chain2 Number | Chain1 Size | Chain2 Size | Die1 | Die2 | Die3 | Die4 | Die5 | Chain1 Value | Chain2 Value | Total Value |
|---|------------|-------------|---------------|---------------|-------------|-------------|------|------|------|------|------|--------------|--------------|-------------|
| 1 | 1,2,3,4,5  | 0           | 0             | 0             | 0           | 0           | 0    | 0    | 0    | 0    | 0    | 0            | 0            | 0           |
| 2 | 6,5,4,3,2  | 0           | 0             | 0             | 0           | 0           | 0    | 0    | 0    | 0    | 0    | 0            | 0            | 0           |
| 3 | 1,1,3,4,5  | 1           | 1             | 0             | 2           | 0           | 1    | 1    | 0    | 0    | 0    | 2            | 0            | 2           |
| 4 | 5,5,3,4,1  | 1           | 5             | 0             | 2           | 0           | 1    | 1    | 0    | 0    | 0    | 10           | 0            | 10          |
| 5 | 3,2,3,4,5  | 1           | 3             | 0             | 2           | 0           | 1    | 0    | 1    | 0    | 0    | 6            | 0            | 6           |
| 6 | 1,2,6,6,5  | 1           | 6             | 0             | 2           | 0           | 0    | 0    | 1    | 1    | 0    | 12           | 0            | 12          |
| 7 | 1,2,3,3,3  | 1           | 3             | 0             | 3           | 0           | 0    | 0    | 1    | 1    | 1    | 9            | 0            | 9           |
| 8 | 4,4,4,2,1  | 1           | 4             | 0             | 3           | 0           | 1    | 1    | 1    | 0    | 0    | 12           | 0            | 12          |
| 9 | 2,1,5,5,5  | 1           | 5             | 0             | 3           | 0           | 0    | 0    | 1    | 1    | 1    | 15           | 0            | 15          |
| 10 | 6,6,6,6,1 | 1           | 6             | 0             | 4           | 0           | 1    | 1    | 1    | 1    | 0    | 24           | 0            | 24          |
| 11 | 1,3,3,3,3 | 1           | 3             | 0             | 4           | 0           | 0    | 1    | 1    | 1    | 1    | 12           | 0            | 12          |
| 12 | 3,3,3,3,3 | 1           | 3             | 0             | 5           | 0           | 1    | 1    | 1    | 1    | 1    | 15           | 0            | 15          |
| 13 | 6,6,6,6,6 | 1           | 6             | 0             | 5           | 0           | 1    | 1    | 1    | 1    | 1    | 30           | 0            | 30          |

### Two Chain Cases (Various Configurations)

| # | Input Dice | Chain Count | Chain1 Number | Chain2 Number | Chain1 Size | Chain2 Size | Die1 | Die2 | Die3 | Die4 | Die5 | Chain1 Value | Chain2 Value | Total Value |
|---|------------|-------------|---------------|---------------|-------------|-------------|------|------|------|------|------|--------------|--------------|-------------|
| 14 | 1,1,2,2,5 | 2           | 1             | 2             | 2           | 2           | 1    | 1    | 2    | 2    | 0    | 2            | 4            | 6           |
| 15 | 3,3,6,6,1 | 2           | 3             | 6             | 2           | 2           | 1    | 1    | 2    | 2    | 0    | 6            | 12           | 18          |
| 16 | 1,4,1,4,3 | 2           | 1             | 4             | 2           | 2           | 1    | 2    | 1    | 2    | 0    | 2            | 8            | 10          |
| 17 | 5,4,5,4,5 | 2           | 5             | 4             | 3           | 2           | 1    | 2    | 1    | 2    | 1    | 15           | 8            | 23          |
| 18 | 2,2,2,3,3 | 2           | 2             | 3             | 3           | 2           | 1    | 1    | 1    | 2    | 2    | 6            | 6            | 12          |
| 19 | 1,1,1,4,4 | 2           | 1             | 4             | 3           | 2           | 1    | 1    | 1    | 2    | 2    | 3            | 8            | 11          |
| 20 | 1,2,1,1,2 | 2           | 1             | 2             | 3           | 2           | 1    | 2    | 1    | 1    | 2    | 3            | 4            | 7           |
| 21 | 3,3,3,2,3 | 1           | 3             | 0             | 4           | 0           | 1    | 1    | 1    | 0    | 1    | 12           | 0            | 12          |
| 22 | 1,2,1,2,1 | 2           | 1             | 2             | 3           | 2           | 1    | 2    | 1    | 2    | 1    | 3            | 4            | 7           |
| 23 | 4,4,4,4,4 | 1           | 4             | 0             | 5           | 0           | 1    | 1    | 1    | 1    | 1    | 20           | 0            | 20          |
| 24 | 2,2,2,2,1 | 1           | 2             | 0             | 4           | 0           | 1    | 1    | 1    | 1    | 0    | 8            | 0            | 8           |
| 25 | 6,1,6,1,6 | 2           | 6             | 1             | 3           | 2           | 1    | 2    | 1    | 2    | 1    | 18           | 2            | 20          |
| 26 | 5,4,3,5,4 | 2           | 5             | 4             | 2           | 2           | 1    | 2    | 0    | 1    | 2    | 10           | 8            | 18          |
| 27 | 2,2,3,3,1 | 2           | 2             | 3             | 2           | 2           | 1    | 1    | 2    | 2    | 0    | 4            | 6            | 10          |
| 28 | 1,3,1,5,5 | 2           | 1             | 5             | 2           | 2           | 1    | 0    | 1    | 2    | 2    | 2            | 10           | 12          |
| 29 | 4,4,3,4,3 | 2           | 4             | 3             | 3           | 2           | 1    | 1    | 2    | 1    | 2    | 12           | 6            | 18          |
| 30 | 5,5,5,5,5 | 1           | 5             | 0             | 5           | 0           | 1    | 1    | 1    | 1    | 1    | 25           | 0            | 25          |

### More Test Cases

| # | Input Dice | Chain Count | Chain1 Number | Chain2 Number | Chain1 Size | Chain2 Size | Die1 | Die2 | Die3 | Die4 | Die5 | Chain1 Value | Chain2 Value | Total Value |
|---|------------|-------------|---------------|---------------|-------------|-------------|------|------|------|------|------|--------------|--------------|-------------|
| 31 | 2,1,1,6,6 | 2           | 1             | 6             | 2           | 2           | 0    | 1    | 1    | 2    | 2    | 2            | 12           | 14          |
| 32 | 6,3,6,6,6 | 1           | 6             | 0             | 4           | 0           | 1    | 0    | 1    | 1    | 1    | 24           | 0            | 24          |
| 33 | 3,1,3,2,3 | 1           | 3             | 0             | 3           | 0           | 1    | 0    | 1    | 0    | 1    | 9            | 0            | 9           |
| 34 | 1,1,1,3,3 | 2           | 1             | 3             | 3           | 2           | 1    | 1    | 1    | 2    | 2    | 3            | 6            | 9           |
| 35 | 2,6,2,6,2 | 2           | 2             | 6             | 3           | 2           | 1    | 2    | 1    | 2    | 1    | 6            | 12           | 18          |
| 36 | 5,5,2,2,6 | 2           | 5             | 2             | 2           | 2           | 1    | 1    | 2    | 2    | 0    | 10           | 4            | 14          |
| 37 | 1,1,3,4,5 | 1           | 1             | 0             | 2           | 0           | 1    | 1    | 0    | 0    | 0    | 2            | 0            | 2           |
| 38 | 1,2,1,3,3 | 2           | 1             | 3             | 2           | 2           | 1    | 0    | 1    | 2    | 2    | 2            | 6            | 8           |
| 39 | 4,5,6,5,6 | 2           | 5             | 6             | 2           | 2           | 0    | 1    | 2    | 1    | 2    | 10           | 12           | 22          |
| 40 | 1,1,5,1,5 | 2           | 1             | 5             | 3           | 2           | 1    | 1    | 2    | 1    | 2    | 3            | 10           | 13          |
| 41 | 2,1,2,3,3 | 2           | 2             | 3             | 2           | 2           | 1    | 0    | 1    | 2    | 2    | 4            | 6            | 10          |
| 42 | 4,4,4,2,2 | 2           | 4             | 2             | 3           | 2           | 1    | 1    | 1    | 2    | 2    | 12           | 4            | 16          |
| 43 | 3,3,1,1,5 | 2           | 3             | 1             | 2           | 2           | 1    | 1    | 2    | 2    | 0    | 6            | 2            | 8           |
| 44 | 5,5,5,5,1 | 1           | 5             | 0             | 4           | 0           | 1    | 1    | 1    | 1    | 0    | 20           | 0            | 20          |
| 45 | 6,3,4,3,6 | 2           | 3             | 6             | 2           | 2           | 2    | 1    | 0    | 1    | 2    | 6            | 12           | 18          |
| 46 | 1,1,1,1,3 | 1           | 1             | 0             | 4           | 0           | 1    | 1    | 1    | 1    | 0    | 4            | 0            | 4           |
| 47 | 6,1,6,1,1 | 2           | 6             | 1             | 2           | 3           | 1    | 2    | 1    | 2    | 2    | 12           | 3            | 15          |
| 48 | 2,2,2,5,5 | 2           | 2             | 5             | 3           | 2           | 1    | 1    | 1    | 2    | 2    | 6            | 10           | 16          |
| 49 | 1,1,1,6,5 | 1           | 1             | 0             | 3           | 0           | 1    | 1    | 1    | 0    | 0    | 3            | 0            | 3           |
| 50 | 3,4,3,3,4 | 2           | 3             | 4             | 3           | 2           | 1    | 2    | 1    | 1    | 2    | 9            | 8            | 17          |
| 51 | 5,3,2,3,5 | 2           | 3             | 5             | 2           | 2           | 2    | 1    | 0    | 1    | 2    | 6            | 10           | 16          |
| 52 | 4,4,4,3,3 | 2           | 4             | 3             | 3           | 2           | 1    | 1    | 1    | 2    | 2    | 12           | 6            | 18          |
| 53 | 2,3,2,4,4 | 2           | 2             | 4             | 2           | 2           | 1    | 0    | 1    | 2    | 2    | 4            | 8            | 12          |
| 54 | 1,1,1,1,1 | 1           | 1             | 0             | 5           | 0           | 1    | 1    | 1    | 1    | 1    | 5            | 0            | 5           |
| 55 | 6,6,5,5,5 | 2           | 6             | 5             | 2           | 3           | 1    | 1    | 2    | 2    | 2    | 12           | 15           | 27          |
| 56 | 3,3,2,4,4 | 2           | 3             | 4             | 2           | 2           | 1    | 1    | 0    | 2    | 2    | 6            | 8            | 14          |
| 57 | 4,2,4,2,4 | 2           | 4             | 2             | 3           | 2           | 1    | 2    | 1    | 2    | 1    | 12           | 4            | 16          |
| 58 | 6,6,6,6,1 | 1           | 6             | 0             | 4           | 0           | 1    | 1    | 1    | 1    | 0    | 24           | 0            | 24          |
| 59 | 1,6,6,1,6 | 2           | 6             | 1             | 3           | 2           | 2    | 1    | 1    | 2    | 1    | 18           | 2            | 20          |
| 60 | 2,2,3,3,3 | 2           | 2             | 3             | 2           | 3           | 1    | 1    | 2    | 2    | 2    | 4            | 9            | 13          |
| 61 | 4,4,5,5,5 | 2           | 4             | 5             | 2           | 3           | 1    | 1    | 2    | 2    | 2    | 8            | 15           | 23          |
| 62 | 2,2,1,2,1 | 2           | 2             | 1             | 3           | 2           | 1    | 1    | 2    | 1    | 2    | 6            | 2            | 8           |
| 63 | 5,1,5,5,5 | 1           | 5             | 0             | 4           | 0           | 1    | 0    | 1    | 1    | 1    | 20           | 0            | 20          |
| 64 | 3,4,4,3,3 | 2           | 4             | 3             | 2           | 3           | 2    | 1    | 1    | 2    | 2    | 8            | 9            | 17          |
| 65 | 6,6,6,1,1 | 2           | 6             | 1             | 3           | 2           | 1    | 1    | 1    | 2    | 2    | 18           | 2            | 20          |
| 66 | 1,2,3,4,1 | 1           | 1             | 0             | 2           | 0           | 1    | 0    | 0    | 0    | 1    | 2            | 0            | 2           |
| 67 | 2,5,2,5,3 | 2           | 2             | 5             | 2           | 2           | 1    | 2    | 1    | 2    | 0    | 4            | 10           | 14          |
| 68 | 5,5,3,3,4 | 2           | 5             | 3             | 2           | 2           | 1    | 1    | 2    | 2    | 0    | 10           | 6            | 16          |
| 69 | 2,2,1,2,3 | 1           | 2             | 0             | 3           | 0           | 1    | 1    | 0    | 1    | 0    | 6            | 0            | 6           |
| 70 | 2,3,2,3,4 | 2           | 2             | 3             | 2           | 2           | 1    | 2    | 1    | 2    | 0    | 4            | 6            | 10          |

### Additional Test Cases

| # | Input Dice | Chain Count | Chain1 Number | Chain2 Number | Chain1 Size | Chain2 Size | Die1 | Die2 | Die3 | Die4 | Die5 | Chain1 Value | Chain2 Value | Total Value |
|---|------------|-------------|---------------|---------------|-------------|-------------|------|------|------|------|------|--------------|--------------|-------------|
| 71 | 1,1,5,1,4 | 1           | 1             | 0             | 3           | 0           | 1    | 1    | 0    | 1    | 0    | 3            | 0            | 3           |
| 72 | 3,5,3,3,5 | 2           | 3             | 5             | 3           | 2           | 1    | 2    | 1    | 1    | 2    | 9            | 10           | 19          |
| 73 | 4,3,4,3,3 | 2           | 4             | 3             | 2           | 3           | 1    | 2    | 1    | 2    | 2    | 8            | 9            | 17          |
| 74 | 5,5,4,4,6 | 2           | 5             | 4             | 2           | 2           | 1    | 1    | 2    | 2    | 0    | 10           | 8            | 18          |
| 75 | 6,5,6,5,6 | 2           | 6             | 5             | 3           | 2           | 1    | 2    | 1    | 2    | 1    | 18           | 10           | 28          |
| 76 | 3,3,2,3,2 | 2           | 3             | 2             | 3           | 2           | 1    | 1    | 2    | 1    | 2    | 9            | 4            | 13          |
| 77 | 6,5,5,6,5 | 2           | 5             | 6             | 3           | 2           | 2    | 1    | 1    | 2    | 1    | 15           | 12           | 27          |
| 78 | 3,3,4,4,3 | 2           | 3             | 4             | 3           | 2           | 1    | 1    | 2    | 2    | 1    | 9            | 8            | 17          |
| 79 | 6,4,6,4,6 | 2           | 6             | 4             | 3           | 2           | 1    | 2    | 1    | 2    | 1    | 18           | 8            | 26          |
| 80 | 1,5,6,1,6 | 2           | 1             | 6             | 2           | 2           | 1    | 0    | 2    | 1    | 2    | 2            | 12           | 14          |
| 81 | 3,4,5,4,3 | 2           | 4             | 3             | 2           | 2           | 2    | 1    | 0    | 1    | 2    | 8            | 6            | 14          |
| 82 | 2,3,2,2,2 | 1           | 2             | 0             | 4           | 0           | 1    | 0    | 1    | 1    | 1    | 8            | 0            | 8           |
| 83 | 6,6,6,5,5 | 2           | 6             | 5             | 3           | 2           | 1    | 1    | 1    | 2    | 2    | 18           | 10           | 28          |
| 84 | 1,3,1,3,1 | 2           | 1             | 3             | 3           | 2           | 1    | 2    | 1    | 2    | 1    | 3            | 6            | 9           |
| 85 | 5,2,5,2,2 | 2           | 5             | 2             | 2           | 3           | 1    | 2    | 1    | 2    | 2    | 10           | 6            | 16          |
| 86 | 6,6,1,1,2 | 2           | 6             | 1             | 2           | 2           | 1    | 1    | 2    | 2    | 0    | 12           | 2            | 14          |
| 87 | 6,3,3,3,6 | 2           | 3             | 6             | 3           | 2           | 2    | 1    | 1    | 1    | 2    | 9            | 12           | 21          |
| 88 | 4,4,4,5,5 | 2           | 4             | 5             | 3           | 2           | 1    | 1    | 1    | 2    | 2    | 12           | 10           | 22          |
| 89 | 3,6,3,6,3 | 2           | 3             | 6             | 3           | 2           | 1    | 2    | 1    | 2    | 1    | 9            | 12           | 21          |
| 90 | 1,4,4,1,4 | 2           | 4             | 1             | 3           | 2           | 2    | 1    | 1    | 2    | 1    | 12           | 2            | 14          |
| 91 | 5,5,2,3,3 | 2           | 5             | 3             | 2           | 2           | 1    | 1    | 0    | 2    | 2    | 10           | 6            | 16          |
| 92 | 2,2,5,2,5 | 2           | 2             | 5             | 3           | 2           | 1    | 1    | 2    | 1    | 2    | 6            | 10           | 16          |
| 93 | 1,2,3,1,2 | 2           | 1             | 2             | 2           | 2           | 1    | 2    | 0    | 1    | 2    | 2            | 4            | 6           |
| 94 | 4,2,3,4,2 | 2           | 4             | 2             | 2           | 2           | 1    | 2    | 0    | 1    | 2    | 8            | 4            | 12          |
| 95 | 5,4,5,4,6 | 2           | 5             | 4             | 2           | 2           | 1    | 2    | 1    | 2    | 0    | 10           | 8            | 18          |
| 96 | 3,1,3,1,3 | 2           | 3             | 1             | 3           | 2           | 1    | 2    | 1    | 2    | 1    | 9            | 2            | 11          |
| 97 | 2,6,2,6,6 | 2           | 2             | 6             | 2           | 3           | 1    | 2    | 1    | 2    | 2    | 4            | 18           | 22          |
| 98 | 3,3,4,4,6 | 2           | 3             | 4             | 2           | 2           | 1    | 1    | 2    | 2    | 0    | 6            | 8            | 14          |
| 99 | 1,6,2,1,2 | 2           | 1             | 2             | 2           | 2           | 1    | 0    | 2    | 1    | 2    | 2            | 4            | 6           |
| 100 | 3,4,3,3,4 | 2           | 3             | 4             | 3           | 2           | 1    | 2    | 1    | 1    | 2    | 9            | 8            | 17          |

### Edge Cases and Boundary Conditions

| # | Input Dice | Chain Count | Chain1 Number | Chain2 Number | Chain1 Size | Chain2 Size | Die1 | Die2 | Die3 | Die4 | Die5 | Chain1 Value | Chain2 Value | Total Value |
|---|------------|-------------|---------------|---------------|-------------|-------------|------|------|------|------|------|--------------|--------------|-------------|
| 101 | 6,5,4,3,2 | 0           | 0             | 0             | 0           | 0           | 0    | 0    | 0    | 0    | 0    | 0            | 0            | 0           |
| 102 | 2,2,2,2,2 | 1           | 2             | 0             | 5           | 0           | 1    | 1    | 1    | 1    | 1    | 10           | 0            | 10          |
| 103 | 1,1,2,2,3 | 2           | 1             | 2             | 2           | 2           | 1    | 1    | 2    | 2    | 0    | 2            | 4            | 6           |
| 104 | 3,1,1,1,3 | 2           | 1             | 3             | 3           | 2           | 2    | 1    | 1    | 1    | 2    | 3            | 6            | 9           |
| 105 | 4,5,4,3,3 | 2           | 4             | 3             | 2           | 2           | 1    | 0    | 1    | 2    | 2    | 8            | 6            | 14          |
| 106 | 2,2,2,3,3 | 2           | 2             | 3             | 3           | 2           | 1    | 1    | 1    | 2    | 2    | 6            | 6            | 12          |
| 107 | 5,5,5,4,4 | 2           | 5             | 4             | 3           | 2           | 1    | 1    | 1    | 2    | 2    | 15           | 8            | 23          |
| 108 | 1,2,3,2,1 | 2           | 2             | 1             | 2           | 2           | 2    | 1    | 0    | 1    | 2    | 4            | 2            | 6           |
| 109 | 6,6,5,5,4 | 2           | 6             | 5             | 2           | 2           | 1    | 1    | 2    | 2    | 0    | 12           | 10           | 22          |
| 110 | 3,3,3,4,4 | 2           | 3             | 4             | 3           | 2           | 1    | 1    | 1    | 2    | 2    | 9            | 8            | 17          |

## Test Case Categories

The test cases cover the following scenarios:

1. **No chains (all dice different)**: 
   - Cases: 1, 2, 101

2. **Single chain scenarios**:
   - Chain of 2 dice: 3, 4, 5, 6
   - Chain of 3 dice: 7, 8, 9, 33
   - Chain of 4 dice: 10, 11, 21, 24, 46, 82
   - Chain of 5 dice (all same): 12, 13, 23, 30, 54, 102

3. **Two chain scenarios**:
   - Two chains of 2 dice each: 14, 15, 27, 36, 56, 68, 74
   - One chain of 2 and one of 3: 17, 48, 55, 61, 85, 97
   - One chain of 3 and one of 2: 18, 19, 34, 42, 52, 60, 107, 110

4. **Interleaved chains**:
   - Chains with interleaved positions: 16, 22, 25, 26, 35, 40, 45, 50, 51, 57, 59, 62, 67, 70, 72, 75, 76, 77, 78, 79, 80, 81, 84, 89, 90, 92, 93, 94, 95, 96

5. **Special patterns**:
   - Increasing position of chain elements: 16, 20, 28, 43, 69, 93, 99
   - Decreasing/mixed position patterns: 25, 35, 47, 57, 70, 72, 75

## Cross-Check Validations

During testing, implement these cross-checks to verify result integrity:

1. **Mathematical Consistency**:
   - Chain1Value must equal Chain1Number × Chain1Size
   - Chain2Value must equal Chain2Number × Chain2Size
   - TotalValue must equal Chain1Value + Chain2Value

2. **Logical Consistency**:
   - ChainCount should match the number of non-zero chain sizes
   - The number of dice assigned to Chain 1 should equal Chain1Size
   - The number of dice assigned to Chain 2 should equal Chain2Size
   - Chain numbers should be between 1-6 when assigned
   - Die assignments should only be 0, 1, or 2
   
## Die Assignment Rules

It's important to understand how the Die1-Die5 values should be assigned:

1. The Die assignments indicate which chain (if any) each die position belongs to:
   - 0: Die is not part of any chain (either unique value or first occurrence before chain formation)
   - 1: Die is part of Chain 1
   - 2: Die is part of Chain 2

2. Chain membership is determined by the die's value:
   - If the die's value matches Chain1Number, it belongs to Chain 1
   - If the die's value matches Chain2Number, it belongs to Chain 2
   - If the die's value doesn't match either chain number, it doesn't belong to any chain

3. IMPORTANT: Some values in the test cases may have been initially incorrect. If you encounter discrepancies when testing, please verify the die assignments according to these rules.

## Usage Notes

This test suite can be used to validate the AssessDiceRoll routine through:

1. **Unit Testing**: Test each case individually and verify outputs.
2. **Regression Testing**: Ensure changes to the routine don't break existing functionality.
3. **Performance Testing**: Batch-process all test cases to evaluate execution speed.
