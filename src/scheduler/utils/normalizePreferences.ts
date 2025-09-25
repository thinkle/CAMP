import type {
  Activity,
  PreferenceMode,
  StudentPreferences,
} from "../../types";

export type NormalizedPreferencesResult = {
  studentPreferences: StudentPreferences[];
  mode: PreferenceMode;
};

const cloneStudentPreferences = (
  prefs: StudentPreferences[]
): StudentPreferences[] => {
  return prefs.map((pref) => ({
    identifier: pref.identifier,
    activity: pref.activity.map((activityPref) => ({
      activity: activityPref.activity,
      weight: activityPref.weight,
    })),
    peer: pref.peer.map((peerPref) => ({
      peer: peerPref.peer,
      weight: peerPref.weight,
    })),
  }));
};

export const preparePreferencesForScheduling = (
  prefs: StudentPreferences[],
  activities: Activity[]
): NormalizedPreferencesResult => {
  const cloned = cloneStudentPreferences(prefs);
  if (cloned.length === 0) {
    return { studentPreferences: cloned, mode: "activities-and-peers" };
  }

  const fallbackActivities = activities.map((activity) => ({
    activity: activity.activity,
    weight: 0,
  }));

  let emptyActivityCount = 0;
  for (const student of cloned) {
    if (student.activity.length === 0) {
      emptyActivityCount += 1;
      // Provide a copy of fallback activities so downstream sorts do not mutate shared arrays.
      student.activity = fallbackActivities.map((pref) => ({ ...pref }));
    }
  }

  const mode: PreferenceMode =
    emptyActivityCount === cloned.length ? "peer-only" : "activities-and-peers";

  return {
    studentPreferences: cloned,
    mode,
  };
};
