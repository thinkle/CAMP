# Numeric Activity ID Type Mismatch Bug

## Summary

A bug was discovered where numeric activity identifiers from Google Sheets caused complete failure of preference matching, resulting in schedules with zero preference satisfaction.

## The Bug

### Root Cause
In `src/gas/readData.ts`:
- **Line 46** (BEFORE FIX): `activities.push({ activity: activityName, capacity })`
  - Activity identifiers from sheets were stored as-is (often numbers like 201, 202, etc.)
- **Line 122**: `activityPrefs.push({ activity: String(preferenceName), weight })`
  - Student activity preferences were explicitly converted to strings

This created a type mismatch:
- Activities array: `[{ activity: 201, capacity: 10 }, ...]` (numbers)
- Student preferences: `[{ activity: "201", weight: 10 }, ...]` (strings)

### Impact
JavaScript's strict equality (`===`) is used throughout the scheduler:
```typescript
201 === "201"  // false!
```

**Result**: NO student preferences would ever match ANY activities, leading to:
- Algorithms would assign students to activities based solely on available capacity
- Zero preference satisfaction
- No meaningful schedule generation despite the algorithms "succeeding"

## The Fix

### Code Change
In `src/gas/readData.ts`, line 46:
```typescript
// BEFORE
activities.push({ activity: activityName, capacity });

// AFTER  
activities.push({ activity: String(activityName), capacity });
```

Also fixed at line 131 for override values:
```typescript
// BEFORE
activity: [{ activity: override, weight: 1000 }]

// AFTER
activity: [{ activity: String(override), weight: 1000 }]
```

### Rationale
Since the TypeScript types declare activity identifiers as strings:
```typescript
export type Activity = {
  activity: string;  // <-- string type
  capacity: number;
};
```

And student preferences were already being converted to strings, the fix ensures consistency by converting activity identifiers to strings when reading from Google Sheets.

## Tests

### Bug Reproduction Test
`src/scheduler/heuristics/numericActivityBug.test.ts`

Demonstrates:
1. **With Bug**: Activities as numbers, preferences as strings → 0 matches
2. **With Fix**: Both as strings → preferences match correctly
3. **Real-world scenario**: 37 students with numeric cabin IDs

Run with:
```bash
npx vitest run src/scheduler/heuristics/numericActivityBug.test.ts
```

## Data Validation

### New Validation Utilities
`src/scheduler/utils/validateData.ts`

Provides validation functions to detect this class of errors:

1. **`validateActivityTypes()`** - Detects type mismatches between activities and preferences
2. **`validateActivityReferences()`** - Ensures all activity references exist
3. **`validatePeerReferences()`** - Ensures all peer references exist
4. **`validateCapacity()`** - Ensures sufficient capacity for all students
5. **`validateData()`** - Runs all validations

### Usage Example
```typescript
import { validateData } from "./scheduler/utils/validateData";

const warnings = validateData(activities, studentPreferences);

for (const warning of warnings) {
  if (warning.severity === "error") {
    console.error(`ERROR: ${warning.message}`, warning.details);
  } else {
    console.warn(`WARNING: ${warning.message}`, warning.details);
  }
}
```

### Example Output
When the bug is present:
```
ERROR: Activity type mismatch: activities are number but student preferences are string. 
This will cause ALL preference matching to fail because number !== string in JavaScript.
{
  activityType: 'number',
  preferenceType: 'string',
  example: {
    activity: 201,
    activityType: 'number',
    preference: '201',
    preferenceType: 'string',
    wouldMatch: false  // <-- Problem!
  }
}
```

## Prevention

### For Future Development
1. **Use the validation utilities** before running scheduling algorithms
2. **Add type assertions** in data reading code
3. **Consider using branded types** to enforce string activity IDs at compile time
4. **Add integration tests** that test the full data flow from Google Sheets through scheduling

### Recommended Integration
In your scheduler initialization:
```typescript
const data = readData();
const warnings = validateData(data.activities, data.studentPreferences);

const errors = warnings.filter(w => w.severity === "error");
if (errors.length > 0) {
  // Show errors to user, prevent scheduling
  throw new Error(`Data validation failed: ${errors.map(e => e.message).join("; ")}`);
}

// Proceed with scheduling...
```

## Related Files
- `src/gas/readData.ts` - Where the fix was applied
- `src/scheduler/heuristics/numericActivityBug.test.ts` - Bug reproduction test
- `src/scheduler/utils/validateData.ts` - Validation utilities
- `src/scheduler/utils/validateData.test.ts` - Validation tests
- `src/types.ts` - Type definitions (activity should always be string)
