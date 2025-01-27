<script lang="ts">
  import SimilarityIndicator from "./SimilarityIndicator.svelte";
  import type { Similarity } from "./../scheduler/hillclimbing/compareSchedules.ts";
  import { Button } from "contain-css-svelte";

  import type { ScheduleInfo } from "./../types.ts";
  import { GoogleAppsScript } from "./gasApi.js";
  export let schedule: ScheduleInfo;
  export let comparison: Similarity | undefined = undefined;
  let timestamp = new Date().getTime();
  let lastId = null;

  function updateTimestamp(id: string) {
    if (id !== lastId) {
      timestamp = new Date().getTime();
      lastId = id;
    }
  }

  $: updateTimestamp(schedule.id);
</script>

<table>
  <tr>
    <th>Score</th>
    <td>{schedule.score}</td>
  </tr>
  <tr>
    <th>Algorithm</th>
    <td>{schedule.alg}</td>
  </tr>
  <tr>
    <th>Generation</th>
    <td>{schedule.generation}</td>
  </tr>
  <tr>
    <th>Generated at</th>
    <td>{new Date(timestamp).toLocaleTimeString()}</td>
  </tr>
  <tr>
    <th>Write Schedule?</th>
    <td
      ><Button
        on:click={() => GoogleAppsScript.writeSchedule(schedule.schedule)}
        >Write Schedule</Button
      ></td
    >
  </tr>
  {#if comparison}
    <tr>
      <th>Similarity to Best</th>
      <td>
        <SimilarityIndicator similarity={comparison}></SimilarityIndicator>
      </td>
    </tr>
  {/if}
</table>
