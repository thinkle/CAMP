import { describe, it, expect } from 'vitest';
import { assignByActivity } from './activityFirstHeuristic';
import type { StudentPreferences, Activity, Assignment } from '../../types';

describe('assignByActivity', () => {
    it('should assign students to their preferred activities within capacity', () => {
        const prefs: StudentPreferences[] = [
            { identifier: 'student1', peer: [],
                activity: [{ activity: 'activity2', weight: 5 },{ activity: 'activity1', weight: 10 }, ] },
            { identifier: 'student2', peer: [],activity: [{ activity: 'activity1', weight: 10 }, { activity: 'activity2', weight: 5 }] },
            { identifier: 'student3', peer: [], activity: [{ activity: 'activity2', weight: 10 }, { activity: 'activity1', weight: 5 }] }
        ];

        const activities: Activity[] = [
            { activity: 'activity1', capacity: 2 },
            { activity: 'activity2', capacity: 1 }
        ];

        const expectedAssignments: Assignment[] = [
            { activity: 'activity1', student: 'student1' },
            { activity: 'activity1', student: 'student2' },
            { activity: 'activity2', student: 'student3' }
        ];

        const result = assignByActivity(prefs, activities);
        expect(result).toEqual(expectedAssignments);
    });

    it('should throw an error if a student has no available activities', () => {
        const prefs: StudentPreferences[] = [
            { identifier: 'student1', activity: [{ activity: 'activity1', weight: 10 }],peer:[] },
            { identifier: 'student2', activity: [{ activity: 'activity1', weight: 10 }], peer:[] },
            { identifier: 'student3', activity: [{ activity: 'activity1', weight: 10 }], peer:[] }
        ];

        const activities: Activity[] = [
            { activity: 'activity1', capacity: 2 }
        ];

        expect(() => assignByActivity(prefs, activities)).toThrow('No available activities for student: student3');
    });

    it('should throw an error if an unknown activity is encountered', () => {
        const prefs: StudentPreferences[] = [
            { identifier: 'student1', peer:[],activity: [{ activity: 'unknownActivity', weight: 10 }] }
        ];

        const activities: Activity[] = [
            { activity: 'activity1', capacity: 2 }
        ];

        expect(() => assignByActivity(prefs, activities)).toThrow('Unknown activity: unknownActivity');
    });
});