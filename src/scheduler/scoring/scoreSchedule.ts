import type { StudentPreferences, Schedule, Activity } from '../../types';

export const DuplicateError = 'Student assigned to multiple activities';
export const CapacityError = 'Activity overbooked';

export const validateSchedule = (schedule: Schedule, activities: Activity[]): string | null => {
    const activityMap = new Map<string, number>();
    const studentMap = new Map<string, number>();    
    for (const { activity } of activities) {
        activityMap.set(activity, 0);
    }
    for (const { activity, student } of schedule) {
        if (!activityMap.has(activity)) {
            return `Unknown activity: ${activity}`;
        }
        activityMap.set(activity, activityMap.get(activity)! + 1);
        if (studentMap.has(student)) {
            return DuplicateError;
        }
        studentMap.set(student, 1);
    }
    for (const [activity, count] of activityMap.entries()) {
        const capacity = activities.find(a => a.activity === activity)!.capacity;
        if (count > capacity) {
            return CapacityError;
        }
    }        
    return null;
}
export const scoreSchedule = (
    schedule: Schedule,
    studentPreferences: StudentPreferences[]
  ): number => {
    let peerScore = 0;
    let activityScore = 0;
  
    // Precompute studentPreferences map
    const preferencesMap = new Map(
      studentPreferences.map((prefs) => [prefs.identifier, prefs])
    );
  
    // Build activity rosters
    const activityRosters = new Map<string, Set<string>>();
    for (const { activity, student } of schedule) {
      if (!activityRosters.has(activity)) {
        activityRosters.set(activity, new Set());
      }
      activityRosters.get(activity)!.add(student);
    }
  
    // Calculate scores
    for (let { student, activity } of schedule) {
      const prefs = preferencesMap.get(student);
      if (!prefs) continue;
  
      // Activity score
      const activityPref = prefs.activity.find((a) => a.activity === activity);
      if (activityPref) {
        activityScore += activityPref.weight;
      }
  
      // Peer score
      const roster = activityRosters.get(activity);
      if (!roster) continue;
  
      for (let peer of prefs.peer) {
        if (roster.has(peer.peer)) {
          peerScore += peer.weight;
        }
      }
    }
  
    return activityScore + peerScore;
  };