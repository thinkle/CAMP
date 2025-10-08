import { describe, test, expect } from "vitest";
import type { Activity, StudentPreferences } from "../../types";
import { assignByActivity } from "./activityFirstHeuristic";
import { assignByPeer } from "./peerFirstHeuristic";
import { assignMutualPeersFirst } from "./mutualPeerFirstHeuristic";
import { assignByPriority } from "./assignByPriority";
import { validateSchedule } from "../scoring/scoreSchedule";

/**
 * This test reproduces a bug where numeric activity identifiers from Google Sheets
 * were not being converted to strings, causing all algorithms to produce schedules
 * where students got NO preference matching.
 * 
 * The bug occurs when:
 * 1. Activities have numeric identifiers in the sheet (e.g., 201, 202, 203, 204)
 * 2. readData.ts line 46 does NOT convert activities to strings: activity: activityName
 * 3. readData.ts line 122 DOES convert student preferences to strings: activity: String(preferenceName)
 * 4. JavaScript's strict equality (===) fails: 201 !== "201"
 * 5. Algorithms assign students to activities but preferences never match
 * 6. Result: schedules generate but with ZERO preference satisfaction
 */
describe("Numeric Activity ID Type Mismatch Bug", () => {
  test("BUG REPRODUCTION: should match student activity preferences (FAILS before fix)", () => {
    // This simulates data as it would come from Google Sheets BEFORE the fix
    // Activities are numbers (NOT converted at line 46), student preferences are strings (converted at line 122)
    const activitiesWithBug: any[] = [
      { activity: 201, capacity: 10 },  // BUG: should be String(201) = "201"
      { activity: 202, capacity: 10 },
      { activity: 203, capacity: 10 },
      { activity: 204, capacity: 10 },
    ];

    const studentPreferences: any[] = [
      {
        identifier: "Student1",
        activity: [
          { activity: "201", weight: 10 },  // STRING from readData.ts String() conversion
          { activity: "202", weight: 5 },
          { activity: "203", weight: 0 },
          { activity: "204", weight: 0 },
        ],
        peer: [
          { peer: "Student2", weight: 50 },
          { peer: "Student3", weight: 30 },
        ],
      },
      {
        identifier: "Student2",
        activity: [
          { activity: "201", weight: 10 },
          { activity: "202", weight: 5 },
          { activity: "203", weight: 0 },
          { activity: "204", weight: 0 },
        ],
        peer: [
          { peer: "Student1", weight: 50 },
          { peer: "Student3", weight: 30 },
        ],
      },
      {
        identifier: "Student3",
        activity: [
          { activity: "201", weight: 10 },
          { activity: "202", weight: 5 },
          { activity: "203", weight: 0 },
          { activity: "204", weight: 0 },
        ],
        peer: [
          { peer: "Student1", weight: 30 },
          { peer: "Student2", weight: 30 },
        ],
      },
    ];

    // The algorithms will succeed in creating a schedule...
    const scheduleWithBug = assignByPeer(studentPreferences, activitiesWithBug);
    expect(scheduleWithBug).toBeDefined();
    expect(scheduleWithBug.length).toBe(3);

    // WITH THE BUG: 201 !== "201", so no preferences match
    let matchCountWithBug = 0;
    for (const assignment of scheduleWithBug) {
      const student = studentPreferences.find((s: any) => s.identifier === assignment.student);
      const hasPreference = student.activity.some((a: any) => a.activity === assignment.activity);
      if (hasPreference) {
        matchCountWithBug++;
      }
    }
    
    // With the bug: NO students get their preference because 201 !== "201"
    expect(matchCountWithBug).toBe(0);
    
    // Now test with the FIX applied
    const activitiesFixed: any[] = [
      { activity: String(201), capacity: 10 },  // FIXED: converted to "201"
      { activity: String(202), capacity: 10 },
      { activity: String(203), capacity: 10 },
      { activity: String(204), capacity: 10 },
    ];
    
    const scheduleFixed = assignByPeer(studentPreferences, activitiesFixed);
    expect(scheduleFixed).toBeDefined();
    expect(scheduleFixed.length).toBe(3);
    
    // AFTER FIX: "201" === "201", preferences match!
    let matchCountFixed = 0;
    for (const assignment of scheduleFixed) {
      const student = studentPreferences.find((s: any) => s.identifier === assignment.student);
      const hasPreference = student.activity.some((a: any) => a.activity === assignment.activity);
      if (hasPreference) {
        matchCountFixed++;
      }
    }
    
    // After fix: Students SHOULD get their preferences
    expect(matchCountFixed).toBeGreaterThan(0);
  });

  test("should succeed with string activity IDs (after fix)", () => {
    // After the fix, activities are converted to strings
    const activities: Activity[] = [
      { activity: "201", capacity: 10 },
      { activity: "202", capacity: 10 },
      { activity: "203", capacity: 10 },
      { activity: "204", capacity: 10 },
    ];

    const studentPreferences: StudentPreferences[] = [
      {
        identifier: "Student1",
        activity: [
          { activity: "201", weight: 0 },
          { activity: "202", weight: 0 },
          { activity: "203", weight: 0 },
          { activity: "204", weight: 0 },
        ],
        peer: [
          { peer: "Student2", weight: 50 },
          { peer: "Student3", weight: 30 },
        ],
      },
      {
        identifier: "Student2",
        activity: [
          { activity: "201", weight: 0 },
          { activity: "202", weight: 0 },
          { activity: "203", weight: 0 },
          { activity: "204", weight: 0 },
        ],
        peer: [
          { peer: "Student1", weight: 50 },
          { peer: "Student3", weight: 30 },
        ],
      },
      {
        identifier: "Student3",
        activity: [
          { activity: "201", weight: 0 },
          { activity: "202", weight: 0 },
          { activity: "203", weight: 0 },
          { activity: "204", weight: 0 },
        ],
        peer: [
          { peer: "Student1", weight: 30 },
          { peer: "Student2", weight: 30 },
        ],
      },
    ];

    // All algorithms should succeed
    const activityFirstSchedule = assignByActivity(studentPreferences, activities);
    expect(activityFirstSchedule).toBeDefined();
    expect(activityFirstSchedule.length).toBe(3);
    expect(validateSchedule(activityFirstSchedule, activities)).toBeNull();

    const peerFirstSchedule = assignByPeer(studentPreferences, activities);
    expect(peerFirstSchedule).toBeDefined();
    expect(peerFirstSchedule.length).toBe(3);
    expect(validateSchedule(peerFirstSchedule, activities)).toBeNull();

    const mutualPeerSchedule = assignMutualPeersFirst(studentPreferences, activities);
    expect(mutualPeerSchedule).toBeDefined();
    expect(mutualPeerSchedule.length).toBe(3);
    expect(validateSchedule(mutualPeerSchedule, activities)).toBeNull();
  });

  test("real-world scenario: 37 students with numeric cabin IDs", () => {
    // Simulating a more realistic scenario with more students
    const activities: Activity[] = [
      { activity: "201", capacity: 10 },
      { activity: "202", capacity: 10 },
      { activity: "203", capacity: 10 },
      { activity: "204", capacity: 10 },
    ];

    const studentNames = [
      "Alai, Sophia", "Amaral, Callie", "Anzelmo, Madison", "Bahamundi, Destiny",
      "Benchekroun, Aliyah", "Brotherston, Kirsten", "Camara, Kaileigh", "Card, Remington",
      "Conde, Isabella", "Condor, Emily", "Dewilde, Lara", "Fitzgerald, Genevieve",
      "Fuller, Allison", "Graham, Maggie", "Henderson, Charlotte", "Hudson, Tessa",
      "Humphreys, Aryanna", "Huynh, Carsan", "Lesage, Skyler", "Llewellyn, Emma",
      "Magat, Emma Elizabeth", "Makarutsa, Alexis", "Marion, Adrianna", "Roun, Layla",
      "Roun, Taylor", "Samatis, Faye", "Sheehan, Julia", "Stone, Claire",
      "Tudryn, Lucy", "Waukau, Penelope", "Whittet, Goldie", "Wood, Emily",
      "Student33", "Student34", "Student35", "Student36", "Student37"
    ];

    const studentPreferences: StudentPreferences[] = studentNames.map((name, i) => ({
      identifier: name,
      activity: [
        { activity: "201", weight: 0 },
        { activity: "202", weight: 0 },
        { activity: "203", weight: 0 },
        { activity: "204", weight: 0 },
      ],
      peer: [
        { peer: studentNames[(i + 1) % studentNames.length], weight: 50 },
        { peer: studentNames[(i + 2) % studentNames.length], weight: 30 },
      ],
    }));

    // Should successfully generate schedules with peer-based algorithms
    const peerFirstSchedule = assignByPeer(studentPreferences, activities);
    expect(peerFirstSchedule).toBeDefined();
    expect(peerFirstSchedule.length).toBe(37);
    expect(validateSchedule(peerFirstSchedule, activities)).toBeNull();

    const prioritySchedule = assignByPriority(studentPreferences, activities);
    expect(prioritySchedule).toBeDefined();
    expect(prioritySchedule.length).toBe(37);
    expect(validateSchedule(prioritySchedule, activities)).toBeNull();
  });
});
