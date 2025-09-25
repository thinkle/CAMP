import type { Activity, StudentPreferences, ScoringOptions } from "../types";
import { DEFAULT_SCORING_OPTIONS } from "../types";

export type ScoringVariant = {
  name: string;
  scoring: ScoringOptions;
};

export type BenchmarkScenario = {
  name: string;
  activities: Activity[];
  studentPreferences: StudentPreferences[];
  scoring: ScoringOptions;
  scoringVariants?: ScoringVariant[];
};

const buildActivities = (names: string[], capacity: number): Activity[] =>
  names.map((activity) => ({ activity, capacity }));

type PreferenceBuilder = (index: number) => {
  activity: { activity: string; weight: number }[];
  peer: { peer: string; weight: number }[];
};

const makeStudents = (
  baseId: string,
  count: number,
  build: PreferenceBuilder
): StudentPreferences[] =>
  Array.from({ length: count }, (_, i) => {
    const identifier = `${baseId}${i + 1}`;
    const { activity, peer } = build(i);
    return { identifier, activity, peer };
  });

const ensureActivityFallbacks = (
  prefs: StudentPreferences[],
  activities: Activity[],
  fallbackWeight = 1
) => {
  for (const student of prefs) {
    if (student.activity.length === 0) {
      student.activity = activities.map((a) => ({
        activity: a.activity,
        weight: fallbackWeight,
      }));
    }
  }
  return prefs;
};

export const activityOnlyScenario = (): BenchmarkScenario => {
  const activities = [
    { activity: "Archery", capacity: 18 },
    { activity: "Climbing", capacity: 18 },
    { activity: "Drama", capacity: 22 },
    { activity: "Coding", capacity: 22 },
    { activity: "Sailing", capacity: 20 },
  ];

  type Band = {
    count: number;
    baseWeights: number[];
    jitter: number;
  };

  const bands: Band[] = [
    { count: 32, baseWeights: [26, 18, 10, 4, 2], jitter: 3 }, // Archery heavy
    { count: 28, baseWeights: [25, 8, 20, 6, 3], jitter: 2 }, // Archery & Drama
    { count: 20, baseWeights: [10, 8, 6, 24, 18], jitter: 4 }, // Coding & Sailing
    { count: 20, baseWeights: [12, 24, 18, 8, 3], jitter: 3 }, // Climbing & Drama
  ];

  const students: StudentPreferences[] = [];
  let identifier = 1;
  for (const band of bands) {
    for (let i = 0; i < band.count; i++, identifier++) {
      const prefs = activities
        .map((activity, idx) => {
          const base = band.baseWeights[idx] ?? 0;
          const noise = (i + idx) % band.jitter;
          return {
            activity: activity.activity,
            weight: Math.max(base - noise, 0),
          };
        })
        .sort((a, b) => b.weight - a.weight);
      students.push({
        identifier: `A${identifier}`,
        activity: prefs,
        peer: [],
      });
    }
  }
  return {
    name: "Activity Only",
    activities,
    studentPreferences: students,
    scoring: {
      ...DEFAULT_SCORING_OPTIONS,
      noPeerPenalty: 0,
      noActivityPenalty: 0,
    },
    scoringVariants: [
      {
        name: "Balanced",
        scoring: {
          ...DEFAULT_SCORING_OPTIONS,
          noPeerPenalty: 0,
          noActivityPenalty: 0,
        },
      },
      {
        name: "ActivityPenaltyHeavy",
        scoring: {
          ...DEFAULT_SCORING_OPTIONS,
          mutualPeerMultiplier: 0.9,
          nonMutualPeerMultiplier: 0.2,
          noPeerPenalty: 0,
          noActivityPenalty: 12,
        },
      },
    ],
  };
};

export const peerOnlyScenario = (): BenchmarkScenario => {
  const activities = [
    { activity: "Cabin Alpha", capacity: 18 },
    { activity: "Cabin Beta", capacity: 18 },
    { activity: "Cabin Gamma", capacity: 20 },
    { activity: "Cabin Delta", capacity: 22 },
    { activity: "Cabin Echo", capacity: 22 },
  ];

  const clusterSizes = [7, 9, 5, 11, 6, 8, 4, 10, 12, 7, 8, 13];
  const clusters: string[][] = [];
  const students: StudentPreferences[] = [];

  let nextId = 1;
  for (const size of clusterSizes) {
    const ids = Array.from({ length: size }, (_, i) => `P${nextId + i}`);
    nextId += size;
    clusters.push(ids);
  }

  const linkMatrix: Array<[number, number, number]> = [
    [0, 3, 5],
    [1, 4, 4],
    [2, 5, 3],
    [6, 8, 4],
    [7, 9, 3],
    [10, 11, 2],
  ];

  const buildPeerList = (self: string, clusterIdx: number): { peer: string; weight: number }[] => {
    const localPeers = clusters[clusterIdx]
      .filter((peer) => peer !== self)
      .map((peer, idx) => ({ peer, weight: Math.max(16 - idx * 2, 2) }));

    const crossPeers = linkMatrix
      .filter(([source]) => source === clusterIdx)
      .flatMap(([, target, limit]) => {
        const peers = clusters[target].slice(0, limit);
        return peers.map((peerId, idx) => ({ peer: peerId, weight: Math.max(8 - idx * 2, 1) }));
      });

    const inverseCross = linkMatrix
      .filter(([, target]) => target === clusterIdx)
      .flatMap(([source, , limit]) => {
        const peers = clusters[source].slice(-limit);
        return peers.map((peerId, idx) => ({ peer: peerId, weight: Math.max(6 - idx * 2, 1) }));
      });

    return [...localPeers, ...crossPeers, ...inverseCross]
      .filter((peer) => peer.peer !== self)
      .sort((a, b) => b.weight - a.weight);
  };

  let studentOffset = 0;
  for (let clusterIdx = 0; clusterIdx < clusters.length; clusterIdx++) {
    for (const id of clusters[clusterIdx]) {
      const peers = buildPeerList(id, clusterIdx)
        .map((peer, idx) => ({
          peer: peer.peer,
          weight: Math.max(peer.weight - ((studentOffset + idx) % 3), 1),
        }))
        .slice(0, 6);
      students.push({
        identifier: id,
        activity: [],
        peer: peers,
      });
      studentOffset++;
    }
  }

  ensureActivityFallbacks(students, activities, 1);
  return {
    name: "Peer Only",
    activities,
    studentPreferences: students,
    scoring: {
      ...DEFAULT_SCORING_OPTIONS,
      noPeerPenalty: 100,
      noActivityPenalty: 0,
    },
    scoringVariants: [
      {
        name: "Balanced",
        scoring: {
          ...DEFAULT_SCORING_OPTIONS,
          noPeerPenalty: 100,
          noActivityPenalty: 0,
        },
      },
      {
        name: "MutualFocus",
        scoring: {
          ...DEFAULT_SCORING_OPTIONS,
          mutualPeerMultiplier: 1.6,
          nonMutualPeerMultiplier: 0.1,
          noPeerPenalty: 150,
          noActivityPenalty: 0,
        },
      },
      {
        name: "Lenient",
        scoring: {
          ...DEFAULT_SCORING_OPTIONS,
          mutualPeerMultiplier: 1.1,
          nonMutualPeerMultiplier: 0.6,
          noPeerPenalty: 60,
          noActivityPenalty: 0,
        },
      },
    ],
  };
};

export const mixedScenario = (): BenchmarkScenario => {
  const activities = buildActivities(
    ["Waterfront", "Arts", "Sports", "Robotics", "Hiking"],
    20
  );
  const count = 100;
  const students = makeStudents("M", count, (i) => {
    const fav = activities[i % activities.length].activity;
    const alt1 = activities[(i + 1) % activities.length].activity;
    const alt2 = activities[(i + 2) % activities.length].activity;
    const alt3 = activities[(i + 3) % activities.length].activity;
    return {
      activity: [
        { activity: fav, weight: 18 },
        { activity: alt1, weight: 12 },
        { activity: alt2, weight: 6 },
        { activity: alt3, weight: 3 },
      ],
      peer: Array.from({ length: 4 }, (_, j) => ({
        peer: `M${((i + 7 + j * 11) % count) + 1}`,
        weight: 9 - j * 2,
      })),
    };
  });
  return {
    name: "Mixed Preferences",
    activities,
    studentPreferences: students,
    scoring: {
      ...DEFAULT_SCORING_OPTIONS,
      noPeerPenalty: 100,
      noActivityPenalty: 10,
    },
    scoringVariants: [
      {
        name: "Balanced",
        scoring: {
          ...DEFAULT_SCORING_OPTIONS,
          noPeerPenalty: 100,
          noActivityPenalty: 10,
        },
      },
      {
        name: "PeerPriority",
        scoring: {
          ...DEFAULT_SCORING_OPTIONS,
          mutualPeerMultiplier: 1.5,
          nonMutualPeerMultiplier: 0.25,
          noPeerPenalty: 150,
          noActivityPenalty: 6,
        },
      },
      {
        name: "ActivityPriority",
        scoring: {
          ...DEFAULT_SCORING_OPTIONS,
          mutualPeerMultiplier: 0.8,
          nonMutualPeerMultiplier: 0.4,
          noPeerPenalty: 60,
          noActivityPenalty: 18,
        },
      },
    ],
  };
};

export const mutualClusterScenario = (): BenchmarkScenario => {
  const activities = [
    { activity: "Adventure", capacity: 16 },
    { activity: "STEM", capacity: 16 },
    { activity: "Art", capacity: 16 },
    { activity: "Music", capacity: 20 },
    { activity: "Outdoors", capacity: 20 },
    { activity: "Leadership", capacity: 20 },
  ];

  const groupCount = 18;
  const groupSizes = [6, 5, 7, 6, 6, 5];
  const groups: string[][] = [];
  for (let g = 0; g < groupCount; g++) {
    const size = groupSizes[g % groupSizes.length];
    const ids = Array.from({ length: size }, (_, i) => `MC${g + 1}_${i + 1}`);
    groups.push(ids);
  }

  const students: StudentPreferences[] = [];

  const addDirectedPeers = (
    sourceGroup: number,
    targetGroup: number,
    weights: number[],
    collector: Map<string, number>
  ) => {
    const targetIds = groups[targetGroup % groups.length];
    for (let i = 0; i < weights.length && i < targetIds.length; i++) {
      const weight = weights[i];
      if (weight <= 0) {
        continue;
      }
      const peerId = targetIds[i];
      const existing = collector.get(peerId);
      if (existing === undefined || weight > existing) {
        collector.set(peerId, weight);
      }
    }
  };

  for (let g = 0; g < groups.length; g++) {
    const ids = groups[g];
    const baseActivity = activities[g % activities.length];
    const secondaryActivity = activities[(g + 1) % activities.length];
    const tertiaryActivity = activities[(g + 2) % activities.length];

    for (let idx = 0; idx < ids.length; idx++) {
      const id = ids[idx];
      const noise = (idx + g) % 3;
      const activityPrefs = [
        { activity: baseActivity.activity, weight: 18 - noise },
        { activity: secondaryActivity.activity, weight: 12 - (noise % 2) },
        { activity: tertiaryActivity.activity, weight: 8 - noise },
      ];

      for (const activity of activities) {
        if (!activityPrefs.some((pref) => pref.activity === activity.activity)) {
          const offset = (idx + activity.activity.length + g) % 4;
          activityPrefs.push({ activity: activity.activity, weight: 4 - offset });
        }
      }

      activityPrefs.sort((a, b) => b.weight - a.weight);

      const peerWeights = new Map<string, number>();
      const peersInGroup = ids.filter((peer) => peer !== id);
      peersInGroup.forEach((peer, peerIdx) => {
        const weight = Math.max(12 - peerIdx * 2 - (idx % 2), 3);
        peerWeights.set(peer, weight);
      });

      if (g % 3 === 0) {
        addDirectedPeers(g, g + 1, [7, 5, 3], peerWeights);
        addDirectedPeers(g, g + 4, [5, 3], peerWeights);
      } else if (g % 3 === 1) {
        addDirectedPeers(g, g + 2, [6, 4], peerWeights);
        addDirectedPeers(g, g + 5, [4, 2], peerWeights);
      } else {
        addDirectedPeers(g, g + 1, [5, 3, 2], peerWeights);
        addDirectedPeers(g, g + 3, [6, 4], peerWeights);
      }

      const peerPrefs = Array.from(peerWeights.entries())
        .map(([peer, weight], orderIdx) => ({
          peer,
          weight: Math.max(weight - ((idx + orderIdx) % 3), 1),
        }))
        .filter((pref) => pref.weight > 0)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 8);

      students.push({
        identifier: id,
        activity: activityPrefs,
        peer: peerPrefs,
      });
    }
  }

  return {
    name: "Mutual Clusters",
    activities,
    studentPreferences: students,
    scoring: {
      ...DEFAULT_SCORING_OPTIONS,
      mutualPeerMultiplier: 1.3,
      nonMutualPeerMultiplier: 0.35,
      noPeerPenalty: 100,
      noActivityPenalty: 6,
    },
    scoringVariants: [
      {
        name: "Balanced",
        scoring: {
          ...DEFAULT_SCORING_OPTIONS,
          mutualPeerMultiplier: 1.3,
          nonMutualPeerMultiplier: 0.35,
          noPeerPenalty: 100,
          noActivityPenalty: 6,
        },
      },
      {
        name: "MutualStrict",
        scoring: {
          ...DEFAULT_SCORING_OPTIONS,
          mutualPeerMultiplier: 1.8,
          nonMutualPeerMultiplier: 0.1,
          noPeerPenalty: 150,
          noActivityPenalty: 4,
        },
      },
      {
        name: "PenaltyHeavy",
        scoring: {
          ...DEFAULT_SCORING_OPTIONS,
          mutualPeerMultiplier: 1.2,
          nonMutualPeerMultiplier: 0.25,
          noPeerPenalty: 120,
          noActivityPenalty: 14,
        },
      },
    ],
  };
};

export const forbiddenPairingsScenario = (): BenchmarkScenario => {
  const activities: Activity[] = [
    { activity: "Redwood", capacity: 22 },
    { activity: "Birch", capacity: 22 },
    { activity: "Cedar", capacity: 20 },
    { activity: "Maple", capacity: 20 },
    { activity: "Spruce", capacity: 18 },
    { activity: "Oak", capacity: 18 },
  ];

  type Cohort = {
    label: string;
    count: number;
    activityWeights: number[];
    jitterStep: number;
    peerWeights: number[];
  };

  const cohorts: Cohort[] = [
    {
      label: "Senior",
      count: 32,
      activityWeights: [100, 80, 60, 40, 30, 20],
      jitterStep: 6,
      peerWeights: [36, 30, 24, 18, 12],
    },
    {
      label: "Intermediate",
      count: 40,
      activityWeights: [80, 65, 55, 35, 25, 15],
      jitterStep: 5,
      peerWeights: [28, 22, 16, 12, 8],
    },
    {
      label: "Junior",
      count: 44,
      activityWeights: [60, 50, 40, 30, 20, 10],
      jitterStep: 4,
      peerWeights: [20, 16, 12, 8, 4],
    },
  ];

  const cohortIds: string[][] = [];
  const students: StudentPreferences[] = [];
  let globalIndex = 0;
  for (const cohort of cohorts) {
    const ids = Array.from({ length: cohort.count }, (_, i) => `F${globalIndex + i + 1}`);
    cohortIds.push(ids);
    globalIndex += cohort.count;
  }

  cohortIds.forEach((ids, cohortIndex) => {
    const cohort = cohorts[cohortIndex];
    ids.forEach((id, position) => {
      const activityPrefs = activities
        .map((activity, idx) => {
          const base = cohort.activityWeights[idx % cohort.activityWeights.length] ?? 0;
          const noise = ((position + idx) % cohort.jitterStep) * 3;
          return {
            activity: activity.activity,
            weight: Math.max(base - noise, 0),
          };
        })
        .filter((pref) => pref.weight > 0)
        .sort((a, b) => b.weight - a.weight);

      const peerPrefs: { peer: string; weight: number }[] = [];
      const sameCohortPeers = ids.filter((peerId) => peerId !== id);
      const rotatedPeers = [
        ...sameCohortPeers.slice(position % sameCohortPeers.length),
        ...sameCohortPeers.slice(0, position % sameCohortPeers.length),
      ];
      rotatedPeers.slice(0, cohort.peerWeights.length).forEach((peerId, idx) => {
        const weight = Math.max(
          cohort.peerWeights[idx] - ((position + idx) % 3) * 2,
          1
        );
        peerPrefs.push({ peer: peerId, weight });
      });

      students.push({
        identifier: id,
        activity: activityPrefs,
        peer: peerPrefs,
      });
    });
  });

  const studentMap = new Map<string, StudentPreferences>(
    students.map((s) => [s.identifier, s])
  );

  const addOrReplacePeer = (
    studentId: string,
    peerId: string,
    weight: number
  ) => {
    const student = studentMap.get(studentId);
    if (!student) return;
    const existingIndex = student.peer.findIndex((pref) => pref.peer === peerId);
    if (existingIndex >= 0) {
      student.peer.splice(existingIndex, 1);
    }
    student.peer.push({ peer: peerId, weight });
  };

  const seniorIds = cohortIds[0];
  const juniorIds = cohortIds[2];
  const intermediateIds = cohortIds[1];

  const forbiddenPairs: Array<[string, string]> = [];
  for (let i = 0; i < 10; i++) {
    forbiddenPairs.push([
      seniorIds[i % seniorIds.length],
      juniorIds[(i * 3) % juniorIds.length],
    ]);
  }
  for (let i = 0; i < 6; i++) {
    forbiddenPairs.push([
      intermediateIds[(i * 5) % intermediateIds.length],
      juniorIds[(i * 4 + 7) % juniorIds.length],
    ]);
  }

  for (const [a, b] of forbiddenPairs) {
    addOrReplacePeer(a, b, -5000);
    addOrReplacePeer(b, a, -5000);
  }

  return {
    name: "Forbidden Pairs",
    activities,
    studentPreferences: students,
    scoring: {
      ...DEFAULT_SCORING_OPTIONS,
      mutualPeerMultiplier: 1.2,
      nonMutualPeerMultiplier: 0.4,
      noPeerPenalty: 120,
      noActivityPenalty: 8,
    },
    scoringVariants: [
      {
        name: "Balanced",
        scoring: {
          ...DEFAULT_SCORING_OPTIONS,
          mutualPeerMultiplier: 1.2,
          nonMutualPeerMultiplier: 0.4,
          noPeerPenalty: 120,
          noActivityPenalty: 8,
        },
      },
      {
        name: "ForbiddenStrict",
        scoring: {
          ...DEFAULT_SCORING_OPTIONS,
          mutualPeerMultiplier: 1.6,
          nonMutualPeerMultiplier: 0.2,
          noPeerPenalty: 160,
          noActivityPenalty: 10,
        },
      },
      {
        name: "ActivityLenient",
        scoring: {
          ...DEFAULT_SCORING_OPTIONS,
          mutualPeerMultiplier: 1.1,
          nonMutualPeerMultiplier: 0.6,
          noPeerPenalty: 80,
          noActivityPenalty: 4,
        },
      },
    ],
  };
};

export const scenarios = [
  activityOnlyScenario(),
  peerOnlyScenario(),
  mixedScenario(),
  mutualClusterScenario(),
  forbiddenPairingsScenario(),
];
