import type { StudentPreferences } from "../../types";

export type ConflictGraph = Map<string, Set<string>>;

const ensureEntry = (
  graph: ConflictGraph,
  id: string
): Set<string> => {
  if (!graph.has(id)) {
    graph.set(id, new Set());
  }
  return graph.get(id)!;
};

/**
 * Builds a symmetric conflict graph based on negative peer preference weights.
 * Any peer edge with weight <= 0 is treated as a hard conflict that should be avoided.
 */
export const buildConflictGraph = (
  prefs: StudentPreferences[]
): ConflictGraph => {
  const graph: ConflictGraph = new Map();
  const idSet = new Set(prefs.map((p) => p.identifier));

  for (const student of prefs) {
    const studentConflicts = ensureEntry(graph, student.identifier);
    for (const peerPref of student.peer) {
      if (peerPref.weight >= 0) {
        continue;
      }
      if (!idSet.has(peerPref.peer)) {
        continue;
      }
      studentConflicts.add(peerPref.peer);
      ensureEntry(graph, peerPref.peer).add(student.identifier);
    }
  }

  return graph;
};

export const getConflictCount = (
  graph: ConflictGraph,
  studentId: string,
  occupants: Iterable<string>
): number => {
  const conflicts = graph.get(studentId);
  if (!conflicts || conflicts.size === 0) {
    return 0;
  }
  let count = 0;
  for (const occupant of occupants) {
    if (conflicts.has(occupant)) {
      count += 1;
    }
  }
  return count;
};

