import type {
    StudentPreferences,
    Activity,
    Assignment,
    Schedule
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
  
  export function assignByCohorts (
    prefs: StudentPreferences[],
    activities: Activity[],
    maxCohortSize: number,
    minWeight = 1
  ): Schedule {
    // 1) Build all peer edges above minWeight
    const edges: PeerEdge[] = [];
    for (const student of prefs) {
      for (const p of student.peer) {
        if (p.weight >= minWeight) {
          edges.push({
            studentA: student.identifier,
            studentB: p.peer,
            weight: p.weight,
          });
        }
      }
    }
    // Sort descending by weight (Kruskal-like approach)
    edges.sort((a, b) => b.weight - a.weight);
  
    // 2) Initialize union-find
    const uf: UnionFind = { parent: new Map(), size: new Map() };
    for (const s of prefs) {
      uf.parent.set(s.identifier, s.identifier);
      uf.size.set(s.identifier, 1);
    }
  
    // Helper find function with path compression
    function find(x: string): string {
      const px = uf.parent.get(x)!;
      if (px !== x) {
        const root = find(px);
        uf.parent.set(x, root);
        return root;
      }
      return x;
    }
  
    // Return true if unioned, false if no union
    function union(a: string, b: string): boolean {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA === rootB) return false; // same set
  
      const sizeA = uf.size.get(rootA)!;
      const sizeB = uf.size.get(rootB)!;
      if (sizeA + sizeB > maxCohortSize) {
        // merging would exceed limit, skip
        return false;
      }
  
      // Union by size
      if (sizeA < sizeB) {
        uf.parent.set(rootA, rootB);
        uf.size.set(rootB, sizeA + sizeB);
      } else {
        uf.parent.set(rootB, rootA);
        uf.size.set(rootA, sizeA + sizeB);
      }
      return true;
    }
  
    // 3) Process edges in descending weight
    for (const e of edges) {
      union(e.studentA, e.studentB); // merges if it doesn't exceed maxCohortSize
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
    let cohorts = Array.from(rootMap.values()); // array of string[]
  
    // optional: sort cohorts by descending size
    cohorts.sort((a, b) => b.length - a.length);
  
    // 5) Assign each cohort as a block
    // Build capacity usage map
    const capMap = new Map<string, number>();
    for (const a of activities) {
      capMap.set(a.activity, 0);
    }
  
    // For quick reference, build a student->(activity->weight) map
    const studentActMap = new Map<string, Map<string, number>>();
    for (const s of prefs) {
      const m = new Map<string, number>();
      for (const a of s.activity) {
        m.set(a.activity, a.weight);
      }
      studentActMap.set(s.identifier, m);
    }
  
    const schedule: Assignment[] = [];
  
    // For each cohort, sum up the total preference for each activity
    // and pick the best feasible
    for (const cohort of cohorts) {
      // sum preference for each activity
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
      // sort activities by descending sum
      const sortedActs = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  
      let assigned = false;
      for (const [actName] of sortedActs) {
        const used = capMap.get(actName)!;
        const totalCap = activities.find(a => a.activity === actName)!.capacity;
        if (used + cohort.length <= totalCap) {
          // seat entire cohort here
          capMap.set(actName, used + cohort.length);
          for (const m of cohort) {
            schedule.push({ student: m, activity: actName });
          }
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        throw new Error(
          `Cohort of size ${cohort.length} cannot fit into any activity. 
           Consider either smaller maxCohortSize or splitting logic.`
        );
      }
    }
  
    return schedule;
  }