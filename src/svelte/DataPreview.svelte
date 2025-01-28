<script lang="ts">
  import type { StudentPreferences, Activity } from "./../types.ts";
  import SetupSheets from "./SetupSheets.svelte";

  import { GoogleAppsScript } from "./gasApi";
  import { onMount } from "svelte";
  import {
    Bar,
    Button,
    FormItem,
    Input,
    MiniButton,
    Select,
    TabBar,
    TabItem,
    Table,
  } from "contain-css-svelte";

  export let data: {
    studentPreferences: StudentPreferences[];
    activities: Activity[];
  };
  const readData = async () => {
    data = await GoogleAppsScript.readData();
  };
  $: console.log("Data Preview: ", data);
  let item = 1;
  let sp = data ? data.studentPreferences[0] : null;
  let activity = data ? data.activities[0] : null;
  $: if (data && !sp) sp = data.studentPreferences[0];
  $: if (data && !activity) activity = data.activities[0];

  let mode: "students" | "activity" = "students";
  let activityRequestsByWeight: {
    [key: number]: StudentPreferences[];
  } = {};
  let activityRequestWeights = [];
  $: {
    if (activity) {
      activityRequestsByWeight = {};
      activityRequestWeights = [];
      data.studentPreferences.forEach((sp) => {
        sp.activity.forEach((ap) => {
          if (ap.activity == activity.activity) {
            if (!activityRequestsByWeight[ap.weight]) {
              activityRequestsByWeight[ap.weight] = [];
              activityRequestWeights.push(ap.weight);
            }
            activityRequestsByWeight[ap.weight].push(sp);
          }
        });
      });
      activityRequestWeights.sort((a, b) => b - a);
    }
  }
</script>

{#if data}
  <div>
    <TabBar>
      <TabItem active={mode == "students"} on:click={() => (mode = "students")}
        >Students</TabItem
      >
      <TabItem active={mode == "activity"} on:click={() => (mode = "activity")}
        >Activity</TabItem
      >
    </TabBar>
    {#if mode == "students"}
      <Bar>
        <h2>{data.studentPreferences.length} Students</h2>
      </Bar>
      <FormItem>
        <span slot="label">Student:</span>
        <Select bind:value={sp}>
          {#each data.studentPreferences as sp}
            <option value={sp}>{sp.identifier}</option>
          {/each}
        </Select>
        <div slot="after" style="display:flex; align-items: center; gap: 4px">
          <MiniButton
            on:click={() =>
              (sp =
                data.studentPreferences[
                  (data.studentPreferences.indexOf(sp) - 1) %
                    data.studentPreferences.length
                ])}
          >
            &lt;
          </MiniButton>
          <MiniButton
            on:click={() =>
              (sp =
                data.studentPreferences[
                  (data.studentPreferences.indexOf(sp) + 1) %
                    data.studentPreferences.length
                ])}
          >
            &gt;
          </MiniButton>
        </div></FormItem
      >
      <h3>{sp.identifier}</h3>
      <ul>
        {#each sp.activity as ap}
          <li>{ap.activity} ({ap.weight})</li>
        {/each}
      </ul>
      <ul>
        {#each sp.peer as pp}
          <li>{pp.peer} ({pp.weight})</li>
        {/each}
      </ul>
    {:else if mode == "activity"}
      <Bar>
        <h2>{data.activities.length} Activities</h2>
      </Bar>
      <FormItem>
        <span slot="label">Activity:</span>
        <Select bind:value={activity}>
          {#each data.activities as act}
            <option value={act}>{act.activity}</option>
          {/each}
        </Select>
        <div slot="after" style="display:flex; align-items: center; gap: 4px">
          <MiniButton
            on:click={() =>
              (activity =
                data.activities[
                  (data.activities.indexOf(activity) - 1) %
                    data.activities.length
                ])}
          >
            &lt;
          </MiniButton>
          <MiniButton
            on:click={() =>
              (activity =
                data.activities[
                  (data.activities.indexOf(activity) + 1) %
                    data.activities.length
                ])}
          >
            &gt;
          </MiniButton>
        </div>
      </FormItem>

      <Table>
        <tr>
          <th>Activity</th>
          <td>{activity.activity}</td>
        </tr>
        <tr>
          <th>Capacity</th>
          <td>{activity.capacity}</td>
        </tr>
        <tr>
          <th colspan="2">Requests</th>
        </tr>
        <tr>
          <th>Weight</th>
          <th>Requests</th>
        </tr>
        {#each activityRequestWeights as weight ([activity, weight])}
          <tr>
            <th>{weight}</th>
            <td>
              {activityRequestsByWeight[weight].length}
            </td>
          </tr>
        {/each}
      </Table>
    {/if}
  </div>
{/if}

<style>
</style>
