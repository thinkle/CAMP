import { describe, it, expect } from 'vitest';
import { improveSchedule } from './improveSchedule';
import type { Schedule, StudentPreferences, Activity } from '../../types';
import { a2 } from 'vitest/dist/chunks/reporters.Y8BYiXBN.js';

describe('improveSchedule', () => {
    it('should improve the schedule when possible (by activity preference)', () => {
        const schedule: Schedule = [
            { student: 'student1', activity: 'activity1' },
            { student: 'student2', activity: 'activity2' },
        ];

        const studentPreferences: StudentPreferences[] = [
            { identifier: 'student1', activity: [{ activity: 'activity2', weight: 10 }] , peer : []},
            { identifier: 'student2', activity: [{ activity: 'activity1', weight: 10 }] , peer : []},
        ];

        const activities: Activity[] = [
            { activity: 'activity1', capacity: 1 },
            { activity: 'activity2', capacity: 1 },
        ];

        const improvedSchedule = improveSchedule(schedule, studentPreferences, activities);

        expect(improvedSchedule).toEqual([
            { student: 'student1', activity: 'activity2' },
            { student: 'student2', activity: 'activity1' },
        ]);
    });

    it('should improve the schedule when possible (by peer preference)', () => {
        const schedule : Schedule = [
            { student: 'a1', activity: 'activity1' },
            { student: 'a2', activity: 'activity2' },
            { student: 'b1', activity: 'activity1' },
            { student: 'b2', activity: 'activity2' },
        ];
        const studentPreferences : StudentPreferences[] = [
            { identifier: 'a1', activity: [{activity: 'activity1',weight:5},{activity:'activity2',weight:4}], peer: [{peer: 'a2', weight: 10}] },
            { identifier: 'a2', activity: [
                {activity: 'activity1',weight:4},
                {activity:'activity2',weight:5}
            ], peer: [{peer: 'a1', weight: 10}] },
            { identifier: 'b1', activity: [{activity: 'activity1',weight:5},{activity:'activity2',weight:4}], peer: [{peer: 'b2', weight: 10}] },
            { identifier: 'b2', activity: [
                {activity: 'activity1',weight:4},
                {activity:'activity2',weight:5}
            ], peer: [{peer: 'b1', weight: 10}] },            
        ];
        const activities : Activity[] = [
            { activity: 'activity1', capacity: 2 },
            { activity: 'activity2', capacity: 2 },
        ];
        const improvedSchedule = improveSchedule(schedule, studentPreferences, activities);
        let a1Activity = improvedSchedule.find(s => s.student === 'a1')?.activity;
        let a2Activity = improvedSchedule.find(s => s.student === 'a2')?.activity;
        let b1Activity = improvedSchedule.find(s => s.student === 'b1')?.activity;
        let b2Activity = improvedSchedule.find(s => s.student === 'b2')?.activity;
        expect(a1Activity, "Should put peers together who want to be together").toBe(a2Activity);
        expect(b1Activity, "Should put peers together who want to be together").toBe(b2Activity);
        expect(a1Activity, "Should respect limits").not.toBe(b1Activity);
    })

    it('Should honor negative weights', () => {
        const schedule : Schedule = [
            { student: 'a1', activity: 'activity1' },
            { student: 'a2', activity: 'activity1' },
            { student: 'b1', activity: 'activity2' },
            { student: 'b2', activity: 'activity2' },
        ];
        const activities : Activity[] = [
            { activity: 'activity1', capacity: 2 },
            { activity: 'activity2', capacity: 2 },
        ];
        const studentPreferences : StudentPreferences[] = [
            { identifier: 'a1', activity: [{activity: 'activity1',weight:5},{activity:'activity2',weight:4}], peer: [{peer: 'a2', weight: -10}] },
            { identifier: 'a2', activity: [
                {activity: 'activity1',weight:4},
                {activity:'activity2',weight:5}
            ], peer: [{peer: 'a1', weight: -10}] },
            { identifier: 'b1', activity: [{activity: 'activity1',weight:5},{activity:'activity2',weight:4}], peer: [{peer: 'b2', weight: -10}] },
            { identifier: 'b2', activity: [
                {activity: 'activity1',weight:4},
                {activity:'activity2',weight:5}
            ], peer: [{peer: 'b1', weight: -10}] },            
        ];
        const improvedSchedule = improveSchedule(schedule, studentPreferences, activities);
        let a1Activity = improvedSchedule.find(s => s.student === 'a1')?.activity;
        let a2Activity = improvedSchedule.find(s => s.student === 'a2')?.activity;
        let b1Activity = improvedSchedule.find(s => s.student === 'b1')?.activity;
        let b2Activity = improvedSchedule.find(s => s.student === 'b2')?.activity;
        console.log('kept peers apart?',improvedSchedule)
        expect(a1Activity, "Should keep apart peers w/ negative weights").not.toBe(a2Activity);
        expect(b1Activity, "Should keep apart peers w/ negative weights").not.toBe(b2Activity);
    });

    it('should not change the schedule if no improvements are possible', () => {
        const schedule: Schedule = [
            { student: 'student1', activity: 'activity1' },
            { student: 'student2', activity: 'activity2' },
        ];

        const studentPreferences: StudentPreferences[] = [
            { identifier: 'student1', activity: [{ activity: 'activity2', weight: 10 }] , peer : []},
            { identifier: 'student2', activity: [{ activity: 'activity2', weight: 10 }] , peer : []},
        ];

        const activities: Activity[] = [
            { activity: 'activity1', capacity: 2 },
            { activity: 'activity2', capacity: 1 },
        ];

        const improvedSchedule = improveSchedule(schedule, studentPreferences, activities);

        expect(improvedSchedule).toEqual(schedule);
    });

   
});