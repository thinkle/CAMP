# Minimum Activity Size Support

## Overview

Activities can now specify a minimum number of students required to run. If an activity is assigned students but doesn't meet the minimum, the schedule will be marked as invalid.

## How It Works

### Configuration

In the **Activities** sheet, there is now a "Minimum" column (column C) between "Activity" and "Capacity":

| Activity | Capacity | Minimum | # Assigned | Roster |
| -------- | -------- | ------- | ---------- | ------ |
| Archery  | 12       | 4       | ...        | ...    |
| Swimming | 15       | 5       | ...        | ...    |
| Crafts   | 10       | 3       | ...        | ...    |

- **Minimum**: The minimum number of students required for the activity to run
- Leave blank or set to 0 if no minimum is required
- Must be ≤ Capacity

### Validation Logic

Schedules are validated with the following rules:

1. ✅ **Valid**: Activity has students ≥ minimum (and ≤ capacity)
2. ✅ **Valid**: Activity is empty (0 students) - activity doesn't run
3. ❌ **Invalid**: Activity has 1+ students but < minimum

**Example:**

- Archery has minimum of 4, capacity of 12
- If 0 students assigned → Valid (activity cancelled)
- If 1-3 students assigned → Invalid (below minimum)
- If 4-12 students assigned → Valid (meets minimum)
- If 13+ students assigned → Invalid (over capacity)

### Real-World Use Case

This feature is useful when:

- Activities have staff costs that require minimum attendance
- Safety requirements dictate minimum group sizes
- Equipment rentals have minimum numbers
- You want to avoid running activities that won't be viable

## Implementation Details

### Data Structure

```typescript
export type Activity = {
  activity: string;
  capacity: number;
  minSize?: number; // Optional, defaults to 0
};
```

### Validation

The `validateSchedule()` function checks:

- Activities over capacity → "Activity overbooked"
- Activities with students but below minimum → "Activity below minimum size"
- Activities with 0 students → No error (activity doesn't run)

### Files Modified

1. **src/types.ts** - Added `minSize?: number` to Activity type
2. **src/gas/readData.ts** - Reads minSize from sheet column C
3. **src/gas/setupSheets.ts** - Added "Minimum" column with validation
4. **src/scheduler/scoring/scoreSchedule.ts** - Added minimum size validation
5. **src/svelte/DataPreview.svelte** - Displays minimum in activity details
6. **src/scheduler/scoring/scoreSchedule.test.ts** - Added test coverage

## Future Enhancements

Possible improvements for future versions:

1. **Heuristic Awareness**: Make scheduling heuristics aware of minimums to avoid generating invalid schedules
2. **Activity Merging**: Automatically merge under-minimum activities with similar ones
3. **Warnings**: Show warnings in UI when activities are at risk of not meeting minimums
4. **Flexible Minimums**: Allow "soft" minimums that prefer but don't require the threshold

## Testing

Run tests with:

```bash
npx vitest run src/scheduler/scoring/scoreSchedule.test.ts
```

Test coverage includes:

- ✅ Valid schedules meeting minimums
- ✅ Invalid schedules below minimums
- ✅ Empty activities (no minimum error)
- ✅ Boundary conditions
