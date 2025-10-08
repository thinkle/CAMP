# Peer-Only Mode Schedule Canonicalization

## Problem

In peer-only mode (where students only express cabin/companion preferences, not activity preferences), the system was generating many duplicate schedules that differed only in which cabin name was assigned to which group.

For example, if we have:

- Group A: Alice + Bob
- Group B: Charlie + Dave
- Cabins: Cabin 1, Cabin 2 (both capacity 10)

Then these two schedules are functionally identical:

1. Group A → Cabin 1, Group B → Cabin 2
2. Group A → Cabin 2, Group B → Cabin 1

But the system was treating them as different schedules, wasting computation exploring the same peer groupings multiple times.

## Solution

We implemented a **canonical form** for schedules in peer-only mode. The canonical form ensures that permutations of cabin assignments produce the same schedule ID, eliminating duplicates.

### How It Works

1. **Group activities by capacity** - Activities with different capacities (e.g., small tent vs. large lodge) are treated separately because capacity matters even in peer-only mode.

2. **Within each capacity tier:**

   - Identify all groups (sets of students) assigned to activities in that tier
   - Sort groups canonically by their first member alphabetically
   - Sort activities alphabetically
   - Reassign: 1st sorted group → 1st sorted activity, 2nd sorted group → 2nd sorted activity, etc.

3. **Generate ID** - The schedule ID is based on the canonical assignment order.

### Example

**Input:**

- Activities: Small Cabin (capacity 5), Large Cabin (capacity 10), Medium Cabin (capacity 5)
- Groups: Alice+Bob in Large, Charlie+Dave in Small, Eve+Frank in Medium

**Canonicalization:**

- Capacity 5 tier: [Small, Medium] sorted → [Medium, Small]
  - Groups in tier: [Charlie+Dave, Eve+Frank]
  - Sort by first: [Charlie+Dave, Eve+Frank] → [Charlie+Dave, Eve+Frank]
  - Assign: Charlie+Dave → Medium, Eve+Frank → Small
- Capacity 10 tier: [Large]
  - Groups: [Alice+Bob]
  - Assign: Alice+Bob → Large

**Result:** This produces the same ID regardless of whether the original input had Charlie+Dave in Medium or Small, as long as they're in a capacity-5 cabin.

## Implementation

See `src/scheduler/hillclimbing/scheduleSaver.ts`:

- `scheduleToId()` - Takes an `isPeerOnlyMode` parameter (3rd argument)
- `normalizeScheduleAndActivities()` - Performs the canonicalization when `isPeerOnlyMode` is true

The `isPeerOnlyMode` flag is automatically inferred in `src/scheduler/hillclimbing/scheduleInfo.ts` by checking if all students have empty activity preferences or all activity weights are 0.

## Tests

See `src/scheduler/hillclimbing/peerOnlyCanonical.test.ts` for comprehensive tests covering:

- ✅ Same ID for permutations of equal-capacity activities
- ✅ Different IDs for different peer groupings
- ✅ Different IDs when capacities differ
- ✅ Same ID for permutations within capacity tiers
- ✅ No canonicalization in activities mode

## Impact

This feature significantly reduces duplicate schedule generation in peer-only mode, allowing the system to:

- Explore more diverse peer groupings
- Reduce wasted computation
- Improve schedule quality by focusing on genuinely different options

The canonicalization is **transparent** - it only affects internal deduplication and doesn't change how schedules are presented to users.
