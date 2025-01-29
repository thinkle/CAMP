<script lang="ts">
  import {
    compareSchedules,
    type Similarity,
  } from "./../scheduler/hillclimbing/compareSchedules";

  import { Button, TabBar, TabItem } from "contain-css-svelte";

  import type {
    StudentPreferences,
    Activity,
    ScheduleInfo,
    ClusterInfo,
  } from "./../types.ts";
  import ScheduleSummary from "./ScheduleSummary.svelte";

  export let schedules;
  export let mostRecentSchedule: ScheduleInfo;
  export let bestSchedule: ScheduleInfo;
  export let clusters: ClusterInfo[];
  export let improveSchedule = async (schedule: ScheduleInfo) => {};

  const improveRandomSchedule = () => {
    if (schedules.length > 0) {
      const randomSchedule =
        schedules[Math.floor(Math.random() * schedules.length)];
      improveSchedule(randomSchedule);
    }
  };

  const improveSingletons = () => {
    let toImprove = [];
    clusters.forEach((c) => {
      if (c.set.size === 1) {
        toImprove.push(c);
      }
    });
    if (toImprove.length > 0) {
      let randomCluster =
        toImprove[Math.floor(Math.random() * toImprove.length)];
      improveSchedule(randomCluster.bestSchedule);
    }
  };

  const improveAGoodSchedule = () => {
    const averageScore =
      schedules.reduce((a, b) => a + b.score, 0) / schedules.length;
    const goodSchedules = schedules.filter((s) => s.score > averageScore);
    if (goodSchedules.length > 0) {
      const randomSchedule =
        goodSchedules[Math.floor(Math.random() * goodSchedules.length)];
      improveSchedule(randomSchedule);
    }
  };
  let scheduleInfoTab: "best" | "recent" = "recent";

  let recentDiff: Similarity = {
    assignmentSimilarity: 0,
    cohortSimilarity: 0,
  };
  $: recentDiff =
    mostRecentSchedule &&
    bestSchedule &&
    compareSchedules(mostRecentSchedule.schedule, bestSchedule.schedule);
</script>

<details>
  <summary>Improve</summary>

  <Button disabled={schedules.length < 1} on:click={improveAGoodSchedule}
    >Improve a Good Schedule</Button
  >
  <Button disabled={schedules.length < 1} on:click={improveRandomSchedule}
    >Improve a Random Schedule</Button
  >

  <Button
    disabled={schedules.length < 4 || !clusters || clusters.length < 2}
    on:click={improveSingletons}
  >
    Improve Singletons
  </Button>
</details>
