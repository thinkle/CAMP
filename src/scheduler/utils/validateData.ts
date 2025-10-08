import type { Activity, StudentPreferences } from "../../types";

export type ValidationWarning = {
  type: "type-mismatch" | "unknown-activity" | "unknown-peer" | "capacity-insufficient";
  severity: "error" | "warning";
  message: string;
  details?: any;
};

/**
 * Validates that activity identifiers are consistently typed across
 * the activities list and student preferences.
 * 
 * This catches the bug where activities might be numbers but preferences
 * are strings (or vice versa), which causes === comparisons to fail.
 */
export function validateActivityTypes(
  activities: Activity[],
  studentPreferences: StudentPreferences[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  
  if (activities.length === 0 || studentPreferences.length === 0) {
    return warnings;
  }

  // Check types of activity identifiers
  const activityTypes = new Set(activities.map(a => typeof a.activity));
  const preferenceTypes = new Set<string>();
  
  for (const student of studentPreferences) {
    for (const pref of student.activity) {
      preferenceTypes.add(typeof pref.activity);
    }
  }

  // Check for type mismatches
  if (activityTypes.size > 1) {
    warnings.push({
      type: "type-mismatch",
      severity: "error",
      message: "Activity identifiers have inconsistent types in activities list",
      details: {
        types: Array.from(activityTypes),
        activities: activities.map(a => ({ name: a.activity, type: typeof a.activity }))
      }
    });
  }

  if (preferenceTypes.size > 1) {
    warnings.push({
      type: "type-mismatch",
      severity: "error",
      message: "Activity identifiers have inconsistent types in student preferences",
      details: {
        types: Array.from(preferenceTypes),
      }
    });
  }

  // Check if activities and preferences use different types
  if (activityTypes.size === 1 && preferenceTypes.size === 1) {
    const activityType = Array.from(activityTypes)[0];
    const preferenceType = Array.from(preferenceTypes)[0];
    
    if (activityType !== preferenceType) {
      warnings.push({
        type: "type-mismatch",
        severity: "error",
        message: `Activity type mismatch: activities are ${activityType} but student preferences are ${preferenceType}. This will cause ALL preference matching to fail because ${activityType} !== ${preferenceType} in JavaScript.`,
        details: {
          activityType,
          preferenceType,
          example: {
            activity: activities[0].activity,
            activityType: typeof activities[0].activity,
            preference: studentPreferences[0].activity[0]?.activity,
            preferenceType: typeof studentPreferences[0].activity[0]?.activity,
            wouldMatch: activities[0].activity === studentPreferences[0].activity[0]?.activity
          }
        }
      });
    }
  }

  return warnings;
}

/**
 * Validates that all activity references in student preferences
 * actually exist in the activities list.
 */
export function validateActivityReferences(
  activities: Activity[],
  studentPreferences: StudentPreferences[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const activitySet = new Set(activities.map(a => a.activity));
  const unknownActivities = new Set<string>();

  for (const student of studentPreferences) {
    for (const pref of student.activity) {
      if (!activitySet.has(pref.activity)) {
        unknownActivities.add(String(pref.activity));
      }
    }
  }

  if (unknownActivities.size > 0) {
    warnings.push({
      type: "unknown-activity",
      severity: "error",
      message: `Student preferences reference ${unknownActivities.size} activity/activities that don't exist in the activities list`,
      details: {
        unknownActivities: Array.from(unknownActivities),
        validActivities: activities.map(a => a.activity)
      }
    });
  }

  return warnings;
}

/**
 * Validates that all peer references in student preferences
 * actually exist as students.
 */
export function validatePeerReferences(
  studentPreferences: StudentPreferences[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const studentSet = new Set(studentPreferences.map(s => s.identifier));
  const unknownPeers = new Set<string>();

  for (const student of studentPreferences) {
    for (const pref of student.peer) {
      if (!studentSet.has(pref.peer)) {
        unknownPeers.add(pref.peer);
      }
    }
  }

  if (unknownPeers.size > 0) {
    warnings.push({
      type: "unknown-peer",
      severity: "warning",
      message: `Student preferences reference ${unknownPeers.size} peer(s) that don't exist in the student list`,
      details: {
        unknownPeers: Array.from(unknownPeers)
      }
    });
  }

  return warnings;
}

/**
 * Validates that there's sufficient capacity to fit all students.
 */
export function validateCapacity(
  activities: Activity[],
  studentPreferences: StudentPreferences[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const totalCapacity = activities.reduce((sum, a) => sum + a.capacity, 0);
  const studentCount = studentPreferences.length;

  if (totalCapacity < studentCount) {
    warnings.push({
      type: "capacity-insufficient",
      severity: "error",
      message: `Insufficient capacity: ${studentCount} students but only ${totalCapacity} total spots`,
      details: {
        studentCount,
        totalCapacity,
        shortage: studentCount - totalCapacity
      }
    });
  }

  return warnings;
}

/**
 * Runs all validations and returns a combined list of warnings/errors.
 */
export function validateData(
  activities: Activity[],
  studentPreferences: StudentPreferences[]
): ValidationWarning[] {
  return [
    ...validateActivityTypes(activities, studentPreferences),
    ...validateActivityReferences(activities, studentPreferences),
    ...validatePeerReferences(studentPreferences),
    ...validateCapacity(activities, studentPreferences),
  ];
}
