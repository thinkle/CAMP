
import { generateAllMockData } from '../../scheduler/mockDataGenerator';

export function setupPreferencesSheet(activity_preferences: number, peer_preferences: number): void {
  
}

export function setupActivitiesSheet(): void {
  
}

export function addMockData(activityPrefs: number, peerPrefs: number, nstudents: number, nactivities: number): void {
  
}

export function doSomething(): number {
  return 17
}

export function test(): string {
  return "hello"
}

export function readData(): { activities: Activity[]; studentPreferences: StudentPreferences[]; } {
  const { activityNames, activityCapacities, rawStudents } = generateAllMockData(
    5,  // nactivities
    10, // nstudents
    4,  // activityPrefs
    4   // peerPrefs
  );

  // Convert activity data
  const activities: Activity[] = activityNames.map((name, i) => ({
    activity: name,
    capacity: activityCapacities[i],
  }));

  // Convert student data
  const studentPreferences: StudentPreferences[] = rawStudents.map(st => ({
    identifier: st.name,
    activity: st.activityPreferences.map((act, idx) => ({
      activity: act,
      weight: st.activityWeights[idx] || 0,
    })),
    peer: st.peerPreferences.map((peer, idx) => ({
      peer,
      weight: st.peerWeights[idx] || 0,
    })),
  }));

  return { activities, studentPreferences };
}