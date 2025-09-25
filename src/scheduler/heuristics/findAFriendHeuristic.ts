import { assignByPeer } from "./peerFirstHeuristic";
import { improveSchedule } from "../hillclimbing/improveSchedule";
import { DEFAULT_SCORING_OPTIONS } from "../../types";

import type {
  Activity,
  Schedule,
  StudentPreferences,
} from "../../types";

const countPeerMatches = (
  student: StudentPreferences,
  scheduleMap: Map<string, string>,
  rosterMap: Map<string, Set<string>>
): number => {
  const activity = scheduleMap.get(student.identifier);
  if (!activity) return 0;
  const roster = rosterMap.get(activity);
  if (!roster) return 0;
  let matches = 0;
  for (const peer of student.peer) {
    if (roster.has(peer.peer)) {
      matches += 1;
    }
  }
  return matches;
};

const buildRosters = (
  scheduleMap: Map<string, string>
): Map<string, Set<string>> => {
  const roster = new Map<string, Set<string>>();
  for (const [student, activity] of scheduleMap.entries()) {
    if (!roster.has(activity)) {
      roster.set(activity, new Set());
    }
    roster.get(activity)!.add(student);
  }
  return roster;
};

const moveStudent = (
  studentId: string,
  newActivity: string,
  scheduleMap: Map<string, string>,
  rosterMap: Map<string, Set<string>>
) => {
  const previous = scheduleMap.get(studentId);
  if (previous) {
    rosterMap.get(previous)?.delete(studentId);
  }
  scheduleMap.set(studentId, newActivity);
  if (!rosterMap.has(newActivity)) {
    rosterMap.set(newActivity, new Set());
  }
  rosterMap.get(newActivity)!.add(studentId);
};

const activityHasCapacity = (
  activity: string,
  rosterMap: Map<string, Set<string>>,
  activities: Activity[]
): boolean => {
  const capacity = activities.find((a) => a.activity === activity)?.capacity ?? 0;
  const size = rosterMap.get(activity)?.size ?? 0;
  return size < capacity;
};

export const assignFindAFriend = (
  prefs: StudentPreferences[],
  activities: Activity[]
): Schedule => {
  const baseSchedule = assignByPeer(prefs, activities);
  const scheduleMap = new Map(baseSchedule.map((a) => [a.student, a.activity]));
  const rosterMap = buildRosters(scheduleMap);
  const prefMap = new Map(prefs.map((p) => [p.identifier, p]));

  // Iterate over students sorted by scarcity of options.
  const scarcityScore = (student: StudentPreferences) => {
    const mutual = student.peer.filter((peerPref) => {
      const peer = prefMap.get(peerPref.peer);
      if (!peer) return false;
      return peer.peer.some((p) => p.peer === student.identifier);
    }).length;
    const totalOptions = student.peer.length;
    return mutual * 100 + totalOptions;
  };

  const students = [...prefs].sort((a, b) => scarcityScore(a) - scarcityScore(b));

  for (const student of students) {
    const currentMatches = countPeerMatches(student, scheduleMap, rosterMap);
    if (currentMatches > 0) continue;

    for (const peerPref of student.peer.sort((a, b) => b.weight - a.weight)) {
      const peerActivity = scheduleMap.get(peerPref.peer);
      if (!peerActivity) continue;
      if (activityHasCapacity(peerActivity, rosterMap, activities)) {
        moveStudent(student.identifier, peerActivity, scheduleMap, rosterMap);
        break;
      }
    }
  }

  const schedule: Schedule = prefs.map((student) => ({
    student: student.identifier,
    activity: scheduleMap.get(student.identifier) || activities[0].activity,
  }));

  return improveSchedule(
    schedule,
    prefs,
    activities,
    5,
    DEFAULT_SCORING_OPTIONS
  );
};
