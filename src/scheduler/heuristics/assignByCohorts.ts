import type {
  StudentPreferences,
  Activity,
  Assignment,
  Schedule,
} from "../../types";

// A small helper for union-find
type UnionFind = {
  parent: Map<string, string>;
  size: Map<string, number>;
};

type PeerEdge = {
  studentA: string;
  studentB: string;
  weight: number;
};

function sanitizeDuplicateIdentifiers(
  prefs: StudentPreferences[]
): StudentPreferences[] {
  // Map from identifier => number of occurrences
  const identifiers = new Set<string>();
  let outputPrefs: StudentPreferences[] = [];
  for (const s of prefs) {
    if (identifiers.has(s.identifier)) {
      console.error("Ignoring duplicate row: ", s.identifier);
    } else {
      identifiers.add(s.identifier);
      outputPrefs.push(s);
    }
  }
  return outputPrefs;
}

export function getCohorts(
  prefs: StudentPreferences[],
  maxCohortSize: number,
  minWeight = 1
): string[][] {
  prefs = sanitizeDuplicateIdentifiers(prefs);

  // 1) Build edges above minWeight, ignoring non-existent peers
  const edges: PeerEdge[] = [];
  const validIdentifiers = new Set(prefs.map((s) => s.identifier));

  for (const student of prefs) {
    for (const p of student.peer) {
      if (!validIdentifiers.has(p.peer)) {
        continue; // Skip invalid peer references
      }
      if (p.weight >= minWeight) {
        edges.push({
          studentA: student.identifier,
          studentB: p.peer,
          weight: p.weight,
        });
      }
    }
  }

  // Sort descending by weight
  edges.sort((a, b) => b.weight - a.weight);

  // 2) Initialize union-find
  const uf: UnionFind = {
    parent: new Map(),
    size: new Map(),
  };
  for (const s of prefs) {
    uf.parent.set(s.identifier, s.identifier);
    uf.size.set(s.identifier, 1);
  }

  // Path compression
  function find(x: string): string {
    const px = uf.parent.get(x)!;
    if (px !== x) {
      uf.parent.set(x, find(px));
    }
    return uf.parent.get(x)!;
  }

  // Union by size, respecting maxCohortSize
  function union(a: string, b: string): boolean {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA === rootB) return false;

    const sizeA = uf.size.get(rootA)!;
    const sizeB = uf.size.get(rootB)!;
    if (sizeA + sizeB > maxCohortSize) {
      return false; // Skip if merging exceeds maxCohortSize
    }

    // Merge smaller set into larger set
    if (sizeA < sizeB) {
      uf.parent.set(rootA, rootB);
      uf.size.set(rootB, sizeA + sizeB);
    } else {
      uf.parent.set(rootB, rootA);
      uf.size.set(rootA, sizeA + sizeB);
    }
    return true;
  }

  // 3) Process edges
  for (const e of edges) {
    union(e.studentA, e.studentB);
  }

  // 4) Build cohorts from union-find sets
  const rootMap = new Map<string, string[]>();
  for (const s of prefs) {
    const r = find(s.identifier);
    if (!rootMap.has(r)) {
      rootMap.set(r, []);
    }
    rootMap.get(r)!.push(s.identifier);
  }

  // Sort cohorts by descending size (optional)
  const cohorts = Array.from(rootMap.values()).sort(
    (a, b) => b.length - a.length
  );
  return cohorts;
}

export function assignByCohorts(
  prefs: StudentPreferences[],
  activities: Activity[],
  maxCohortSize: number,
  minWeight = 1
): Schedule {
  // 1) Get cohorts
  const cohorts = getCohorts(prefs, maxCohortSize, minWeight);

  // 2) Prepare capacity usage
  const capMap = new Map<string, number>();
  for (const a of activities) {
    capMap.set(a.activity, 0);
  }

  // 3) Build a quick lookup: student -> (activity -> weight)
  const studentActMap = new Map<string, Map<string, number>>();
  for (const s of prefs) {
    const m = new Map<string, number>();
    for (const a of s.activity) {
      m.set(a.activity, a.weight);
    }
    studentActMap.set(s.identifier, m);
  }

  // 4) Assign each cohort to the best feasible activity
  const schedule: Assignment[] = [];
  for (const cohort of cohorts) {
    // Sum preference for each activity
    const scores = new Map<string, number>();
    for (const act of activities) {
      scores.set(act.activity, 0);
    }
    for (const member of cohort) {
      const map = studentActMap.get(member)!;
      for (const [actName, w] of map.entries()) {
        scores.set(actName, scores.get(actName)! + w);
      }
    }
    // Sort by descending sum
    const sortedActs = [...scores.entries()].sort((a, b) => b[1] - a[1]);

    let assigned = false;
    for (const [actName] of sortedActs) {
      const used = capMap.get(actName)!;
      const totalCap = activities.find((a) => a.activity === actName)!.capacity;
      if (used + cohort.length <= totalCap) {
        // seat entire cohort here
        capMap.set(actName, used + cohort.length);
        for (const studentId of cohort) {
          schedule.push({ student: studentId, activity: actName });
        }
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      console.log("We had max size of ", maxCohortSize);
      console.log("We generated cohorts: ", cohorts);
      console.log("We had activities: ", activities);
      console.log("We had prefs: ", prefs);
      throw new Error(
        `Cohort of size ${cohort.length} cannot fit into any activity. 
         Consider smaller maxCohortSize or splitting logic.`
      );
    }
  }

  return schedule;
}
