<script lang="ts">
  import {
    compareSchedules,
    type Similarity,
  } from "../scheduler/hillclimbing/compareSchedules";

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

  // Improve a schedule
  const improveBestSchedule = () => {
    if (schedules.length > 0) {
      const bestSchedule = schedules.reduce((a, b) =>
        a.score > b.score ? a : b
      );
      improveSchedule(bestSchedule);
    }
  };

  const improveMostRecentSchedule = () => {
    if (schedules.length > 0) {
      const mostRecentSchedule = schedules[schedules.length - 1];
      improveSchedule(mostRecentSchedule);
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

<details open>
  <summary>Latest...</summary>
  {#if bestSchedule && mostRecentSchedule}
    <TabBar>
      <TabItem
        active={scheduleInfoTab == "best"}
        on:click={() => (scheduleInfoTab = "best")}
        >Best ({bestSchedule.score})</TabItem
      >
      <TabItem
        active={scheduleInfoTab == "recent"}
        on:click={() => (scheduleInfoTab = "recent")}
        >Latest ({mostRecentSchedule.score})</TabItem
      >
    </TabBar>
    {#if bestSchedule && scheduleInfoTab == "best"}
      <h3>Best Schedule Yet</h3>
      <Button on:click={improveBestSchedule}>Improve Best Schedule</Button>
      <ScheduleSummary schedule={bestSchedule} {clusters}></ScheduleSummary>
    {/if}
    {#if mostRecentSchedule && scheduleInfoTab == "recent"}
      <h3>Most Recent Schedule</h3>
      <ScheduleSummary
        schedule={mostRecentSchedule}
        comparison={recentDiff}
        {clusters}
      ></ScheduleSummary>
      <Button
        on:click={() => {
          improveMostRecentSchedule();
        }}>Improve this Schedule</Button
      >
    {/if}
  {:else}
    <p>No schedules generated yet.</p>
  {/if}
</details>
