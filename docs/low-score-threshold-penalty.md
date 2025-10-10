# Low Score Threshold Penalty

## Overview

The Low Score Threshold Penalty feature allows you to heavily penalize students who don't achieve a minimum satisfaction score. This is useful for ensuring that high-quality matches (e.g., top friends) are prioritized over lower-quality matches (e.g., acquaintances).

## The Problem It Solves

### Scenario

You have students ranking peers in tiers:

- **Top 3 friends**: 50 points each
- **Other 8 acceptable peers**: 5 points each
- **2 students to avoid**: -200 points each

**Problem:** Without threshold penalties, the optimizer treats these equally:

- Getting Student A their first top friend (+50 points)
- Getting Student B their first acceptable peer (+5 points)

But **you** want to prioritize "everyone gets a top friend" over "some people get acceptable peers."

### Solution: Low Score Threshold

Set a threshold (e.g., 25 points) and a penalty (e.g., -200 points):

- If a student's individual score < 25 → apply -200 penalty
- This makes getting someone a top friend worth: 50 points + avoiding 200 penalty = **250 effective points**
- While adding a second friend is only worth: **50 additional points**

## Configuration

In the **Scoring Settings** sheet, set two values:

| key               | value |
| ----------------- | ----- |
| lowScoreThreshold | 25    |
| lowScorePenalty   | 200   |

### Parameters

- **`lowScoreThreshold`**: The minimum individual score a student should achieve
  - If a student's total score < this value, the penalty applies
  - Set to 0 to disable this feature
- **`lowScorePenalty`**: The penalty applied for being below threshold
  - Added to the total penalty score
  - Higher values = stronger preference for getting everyone above threshold

## Example Use Cases

### Use Case 1: Prioritize Top Friends

**Setup:**

- Top friends: 50 pts
- Acceptable peers: 5 pts
- Threshold: 25
- Penalty: 200

**Result:**

- First top friend for someone: 50 + (avoids 200 penalty) = 250 effective value
- Second top friend: only 50 additional value
- First acceptable peer: 5 + (avoids 200 penalty) = 205 effective value
- Second acceptable peer: only 5 additional value

**Effect:** Optimizer strongly prioritizes getting everyone at least one good match.

### Use Case 2: Ensure Activity Preferences

**Setup:**

- Favorite activity: 100 pts
- Acceptable activity: 10 pts
- Threshold: 50
- Penalty: 150

**Result:**

- Getting someone their favorite activity: 100 + (avoids 150 penalty) = 250 effective value
- Getting someone their second favorite: Only 100 additional if first was < 50

**Effect:** Strongly prioritizes getting everyone their top activity choice.

### Use Case 3: Multiple Tiers

**Setup:**

- Best friends (3): 50 pts each
- Good friends (5): 15 pts each
- Acquaintances (8): 5 pts each
- Threshold: 40
- Penalty: 150

**Result:**

- 1 best friend alone won't meet threshold (50 > 40, does meet it!)
- 3 good friends meet threshold (45 > 40)
- Need 8 acquaintances to avoid penalty (40 points)

**Effect:** Flexible satisfaction - either get top friends OR several good friends.

## How It Works

### Individual Score Calculation

For each student in the schedule:

1. **Calculate individual score:**

   - Sum of activity preference weights that match
   - Sum of peer preference weights that match (with mutual/non-mutual multipliers)

2. **Check threshold:**

   - If individual score < `lowScoreThreshold`
   - Apply `lowScorePenalty` to total penalty

3. **Total schedule score:**
   - Sum all individual activity scores
   - Sum all individual peer scores
   - Subtract all penalties (noPeer, noActivity, lowScore)

### Code Implementation

```typescript
// Apply low score threshold penalty
if (
  scoringOptions.lowScoreThreshold > 0 &&
  scoringOptions.lowScorePenalty > 0
) {
  for (const score of individualScores) {
    if (score < scoringOptions.lowScoreThreshold) {
      penaltyScore += scoringOptions.lowScorePenalty;
    }
  }
}
```

## Tips for Setting Values

### Finding the Right Threshold

**Set threshold between your tiers:**

- If top friends = 50 and acceptable peers = 5
- Set threshold around 25-40
- This ensures top friends clear it, acceptable peers don't

**Multiple top choices:**

- If students can pick 3 top friends at 50 pts each
- Set threshold at 50 to require at least one top match
- Or set at 100 to require two top matches

### Finding the Right Penalty

**Start with 2-4x your top tier value:**

- If top friends = 50, try penalty = 100-200
- This makes "get someone a top friend" = 150-250 effective value
- Experiment and check results

**Consider diminishing returns:**

- Penalty should be > (second tier \* quantity needed to reach threshold)
- Example: If threshold = 25 and second tier = 5
  - Need 5 second-tier matches to reach threshold (5 × 5 = 25)
  - Set penalty > 25 to make top tier more valuable

## Comparison with noPeerPenalty

### `noPeerPenalty`

- Applied when student gets **zero** peer matches
- Binary: you either have 0 matches (penalty) or 1+ matches (no penalty)
- Good for: ensuring everyone gets _someone_

### `lowScoreThreshold` + `lowScorePenalty`

- Applied when student's score is below a threshold
- Graduated: different tiers of satisfaction
- Good for: ensuring everyone gets _quality_ matches

### Using Both Together

You can use both penalties simultaneously:

```
noPeerPenalty: 500        # Avoid leaving anyone completely alone
lowScoreThreshold: 50     # Prefer top friends
lowScorePenalty: 200      # But acceptable peers are better than nothing
```

**Result:**

- Getting someone from 0 to 1 acceptable peer: +5 + avoids 500 = **505 value**
- Getting someone from 1 acceptable to 1 top friend: +50 + avoids 200 = **250 value**
- Getting someone a second top friend: **50 value**

## Testing

The feature includes comprehensive test coverage:

```bash
npx vitest run src/scheduler/scoring/scoreSchedule.test.ts
```

Test cases:

- ✅ Penalty applied when students below threshold
- ✅ No penalty applied when students above threshold
- ✅ Feature disabled when threshold = 0
- ✅ Multiple students at different satisfaction levels

## Future Enhancements

Possible improvements:

1. **Tiered Penalties**: Multiple thresholds with different penalties

   - Score < 10: -500
   - Score < 25: -200
   - Score < 50: -100

2. **Progressive Penalties**: Penalty proportional to how far below threshold

   - Instead of flat penalty, scale based on deficit

3. **Per-Student Thresholds**: Different thresholds for different student needs

   - Special needs students might have higher thresholds

4. **UI Visualization**: Show distribution of student satisfaction scores
   - Help tune threshold and penalty values
