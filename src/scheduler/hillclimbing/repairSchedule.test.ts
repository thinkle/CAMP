import { describe, it, expect } from 'vitest';
import { repairSchedule } from './repairSchedule';
import { Activity, Schedule, StudentPreferences } from '../../types';


describe('repairSchedule', () => {
    it('should remove students from overflowing activities', () => {
        const schedule: Schedule = [
            { student: 'student1', activity: 'activity1' },
            { student: 'student2', activity: 'activity1' },
            { student: 'student3', activity: 'activity1' }
        ];
        const preferences: StudentPreferences[] = [
            { identifier: 'student1', activity: [{ activity: 'activity1', weight: 5 },{activity:'activity2',weight:1}], peer: [] },
            { identifier: 'student2', activity: [{ activity: 'activity1', weight: 1 }], peer: [] },
            { identifier: 'student3', activity: [{ activity: 'activity1', weight: 1 }], peer: [] }
        ];
        const activities: Activity[] = [
            { activity: 'activity1', capacity: 2 },
            { activity: 'activity2', capacity: 2 }
        ];

        const repairedSchedule = repairSchedule(schedule, preferences, activities);

        expect(repairedSchedule.length).toBe(3);
        expect(repairedSchedule).toEqual(expect.arrayContaining([{ student: 'student1', activity: 'activity2' }]));
    });

    it('should assign unassigned students to their preferred activities', () => {
        const schedule: Schedule = [
            { student: 'student1', activity: 'activity1' }
        ];
        const preferences: StudentPreferences[] = [
            { identifier: 'student1', activity: [], peer: [] },
            { identifier: 'student2', activity: [{ activity: 'activity1', weight: 1 }], peer: [] }
        ];
        const activities: Activity[] = [
            { activity: 'activity1', capacity: 2 }
        ];

        const repairedSchedule = repairSchedule(schedule, preferences, activities);

        expect(repairedSchedule.length).toBe(2);
        expect(repairedSchedule).toEqual(expect.arrayContaining([{ student: 'student2', activity: 'activity1' }]));
    });

    it('should throw an error if no available activities for a student', () => {
        const schedule: Schedule = [];
        const preferences: StudentPreferences[] = [
            { identifier: 'student1', activity: [{ activity: 'activity1', weight: 1 }], peer: [] }
        ];
        const activities: Activity[] = [
            { activity: 'activity1', capacity: 0 }
        ];

        expect(() => repairSchedule(schedule, preferences, activities)).toThrowError('No available activities for student: student1');
    });

    it('should assign unassigned students to activities based on peers', () => {
        const schedule: Schedule = [
            { student: 'student1', activity: 'activity1' }
        ];
        const preferences: StudentPreferences[] = [
            { identifier: 'student2', activity: [], peer: [{ peer: 'student1' }] }
        ];
        const activities: Activity[] = [
            { activity: 'activity1', capacity: 2 }
        ];

        const repairedSchedule = repairSchedule(schedule, preferences, activities);

        expect(repairedSchedule.length).toBe(2);
        expect(repairedSchedule).toEqual(expect.arrayContaining([{ student: 'student2', activity: 'activity1' }]));
    });

    it('should not change the schedule if it is already valid', () => {
        const schedule: Schedule = [
            { student: 'student1', activity: 'activity1' },
            { student: 'student2', activity: 'activity1' }
        ];
        const preferences: StudentPreferences[] = [
            { identifier: 'student1', activity: [{ activity: 'activity1', weight: 1 }], peer: [] },
            { identifier: 'student2', activity: [{ activity: 'activity1', weight: 1 }], peer: [] }
        ];
        const activities: Activity[] = [
            { activity: 'activity1', capacity: 2 }
        ];

        const repairedSchedule = repairSchedule(schedule, preferences, activities);

        expect(repairedSchedule).toEqual(schedule);
    });
});
it('should assign students to alternative activities if their preferred one is full', () => {
    const schedule: Schedule = [
        { student: 'student1', activity: 'activity1' },
        { student: 'student2', activity: 'activity1' }
    ];
    const preferences: StudentPreferences[] = [
        { identifier: 'student1', activity: [{ activity: 'activity1', weight: 1 }], peer: [] },
        { identifier: 'student2', activity: [{ activity: 'activity1', weight: 1 }], peer: [] },
        { identifier: 'student3', activity: [{ activity: 'activity1', weight: 1 }, { activity: 'activity2', weight: 1 }], peer: [] }
    ];
    const activities: Activity[] = [
        { activity: 'activity1', capacity: 2 },
        { activity: 'activity2', capacity: 2 }
    ];

    const repairedSchedule = repairSchedule(schedule, preferences, activities);

    expect(repairedSchedule.length).toBe(3);
    expect(repairedSchedule).toEqual(expect.arrayContaining([{ student: 'student3', activity: 'activity2' }]));
});
it('should remove students from overflowing activities and assign them to alternative activities', () => {
    const schedule: Schedule = [
        { student: 'student1', activity: 'activity1' },
        { student: 'student2', activity: 'activity1' },
        { student: 'student3', activity: 'activity1' }
    ];
    const preferences: StudentPreferences[] = [
        { identifier: 'student1', activity: [{ activity: 'activity1', weight: 1 }], peer: [] },
        { identifier: 'student2', activity: [{ activity: 'activity1', weight: 1 }], peer: [] },
        { identifier: 'student3', activity: [{ activity: 'activity1', weight: 1 }, { activity: 'activity2', weight: 1 }], peer: [] }
    ];
    const activities: Activity[] = [
        { activity: 'activity1', capacity: 2 },
        { activity: 'activity2', capacity: 2 }
    ];

    const repairedSchedule = repairSchedule(schedule, preferences, activities);

    expect(repairedSchedule.length).toBe(3);
    expect(repairedSchedule).toEqual(expect.arrayContaining([{ student: 'student3', activity: 'activity2' }]));
});