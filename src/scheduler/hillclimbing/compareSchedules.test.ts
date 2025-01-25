import { describe, it, expect } from 'vitest';
import { compareSchedules, getAssignmentSimilarity, getCohortSimilarity } from './compareSchedules';
import { Schedule } from '../../types';

describe('compareSchedules', () => {
    it('should return correct similarity for identical schedules', () => {
        const schedule1: Schedule = [
            { student: 'Alice', activity: 'Math' },
            { student: 'Bob', activity: 'Science' },
            { student: 'Charlie', activity: 'History' },
        ];
        const schedule2: Schedule = [
            { student: 'Alice', activity: 'Math' },
            { student: 'Bob', activity: 'Science' },
            { student: 'Charlie', activity: 'History' },
        ];

        const result = compareSchedules(schedule1, schedule2);
        expect(result.assignmentSimilarity).toBe(1);
        expect(result.cohortSimilarity).toBe(1);
    });

    it('should return correct similarity for different schedules', () => {
        const schedule1: Schedule = [
            { student: 'Alice', activity: 'Math' },
            { student: 'Bob', activity: 'Science' },
            { student: 'Charlie', activity: 'History' },
        ];
        const schedule2: Schedule = [
            { student: 'Alice', activity: 'Science' },
            { student: 'Bob', activity: 'Math' },
            { student: 'Charlie', activity: 'Math' },
        ];

        const result = compareSchedules(schedule1, schedule2);
        expect(result.assignmentSimilarity).toBe(0);
        expect(result.cohortSimilarity).toBeGreaterThan(0);
    });

    it('should throw error if schedules have different students', () => {
        const schedule1: Schedule = [
            { student: 'Alice', activity: 'Math' },
            { student: 'Bob', activity: 'Science' },
        ];
        const schedule2: Schedule = [
            { student: 'Alice', activity: 'Math' },
            { student: 'Charlie', activity: 'History' },
        ];

        expect(() => compareSchedules(schedule1, schedule2)).toThrowError(
            'Schedules must have the same students in the same order'
        );
    });
});

describe('getAssignmentSimilarity', () => {
    it('should return 1 for identical schedules', () => {
        const schedule1: Schedule = [
            { student: 'Alice', activity: 'Math' },
            { student: 'Bob', activity: 'Science' },
        ];
        const schedule2: Schedule = [
            { student: 'Alice', activity: 'Math' },
            { student: 'Bob', activity: 'Science' },
        ];

        const result = getAssignmentSimilarity(schedule1, schedule2);
        expect(result).toBe(1);
    });

    it('should return 0 for completely different schedules', () => {
        const schedule1: Schedule = [
            { student: 'Alice', activity: 'Math' },
            { student: 'Bob', activity: 'Science' },
        ];
        const schedule2: Schedule = [
            { student: 'Alice', activity: 'History' },
            { student: 'Bob', activity: 'Math' },
        ];

        const result = getAssignmentSimilarity(schedule1, schedule2);
        expect(result).toBe(0);
    });
});

describe('getCohortSimilarity', () => {
    it('should return 1 for identical cohorts', () => {
        const schedule1: Schedule = [
            { student: 'Alice', activity: 'Math' },
            { student: 'Bob', activity: 'Math' },
        ];
        const schedule2: Schedule = [
            { student: 'Alice', activity: 'Math' },
            { student: 'Bob', activity: 'Math' },
        ];

        const result = getCohortSimilarity(schedule1, schedule2);
        expect(result).toBe(1);
    });
    it('should return higher for more similar cohorts', () => {
        const schedule1: Schedule = [
            { student: 'Alice', activity: 'Math' },
            { student: 'Bob', activity: 'Math' },
            { student: 'Carter', activity: 'Science' },
            { student: 'Dwayne', activity: 'Science' },
            { student: 'Eve', activity: 'History' },
            { student: 'Frank', activity: 'History' },
            { student: 'Gina', activity: 'History' },
            { student: 'Hank', activity: 'History' },
        ];
        const similarSchedule: Schedule = [
            { student: 'Alice', activity: 'Science' },
            { student: 'Bob', activity: 'Science' },
            { student: 'Carter', activity: 'Math' },
            { student: 'Dwayne', activity: 'Math' },
            { student: 'Eve', activity: 'History' },
            { student: 'Frank', activity: 'History' },
            { student: 'Gina', activity: 'History' },
            { student: 'Hank', activity: 'Math' }, // only difference
        ];
        const differentSchedule: Schedule = [
            // multiple cohort changes...
            { student: 'Alice', activity: 'Science' },
            { student: 'Bob', activity: 'History' },
            { student: 'Carter', activity: 'Science' },
            { student: 'Dwayne', activity: 'Math' },
            { student: 'Eve', activity: 'Science' },
            { student: 'Frank', activity: 'Math' },
            { student: 'Gina', activity: 'History' },
            { student: 'Hank', activity: 'Math' }, 
        ];


        const similarResult = getCohortSimilarity(schedule1, similarSchedule);
        const differentResult = getCohortSimilarity(schedule1, differentSchedule);
        console.log(similarResult, differentResult);
        expect(similarResult).toBeGreaterThan(differentResult);
    });

    it('should return 0 for completely different cohorts', () => {
        const schedule1: Schedule = [
            { student: 'Alice', activity: 'Math' },            
            { student: 'Bob', activity: 'Science' },
            { student: 'Carter', activity: 'Math'},
            { student: 'Dwayne', activity: 'Science'},
        ];
        const schedule2: Schedule = [
            { student: 'Alice', activity: 'Math' },
            { student: 'Bob', activity: 'Science' },
            { student: 'Carter', activity: 'Science'},
            { student: 'Dwayne', activity: 'Math'},
        ];

        const result = getCohortSimilarity(schedule1, schedule2);
        expect(result).toBe(1/3);
    });
});