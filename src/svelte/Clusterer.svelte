<script lang="ts">
  import { Button, FormItem, MiniButton, Tooltip } from "contain-css-svelte";

  import type {
    PreferenceData,
    Schedule,
    ScheduleInfo,
  } from "./../types.ts";

  import {
    buildClusterInfoList,
    type FamilyClusters,
  } from "../scheduler/hillclimbing/clusterSchedules";

  let clustering = false; // don't duplicate clustering requests...

  export let data: PreferenceData | null = null;

  export let worker: Worker | null;

  export let schedules: ScheduleInfo[] = [];
  export let clusterMap: FamilyClusters;
  export let clusters: {
    reference: Schedule;
    set: Set<Schedule>;
    infoSet: Set<ScheduleInfo>;
    avgScore: Number;
    bestScore: Number;
    bestSchedule: ScheduleInfo;
    name: string;
  }[];

  export let setClusterMap: (clusterMap: FamilyClusters) => void;
  export let setClusters: (clusters: any) => void;

  $: if (clusterMap) {
    updateClusters();
  }

  function updateClusters() {
    console.log("Build clusters!");
    let clusters = buildClusterInfoList(clusterMap, schedules);
    for (let c of clusters) {
      c.name = namer.getName(c.reference);
    }
    setClusters(clusters);
  }

  // 🌍 Persistent Cache: Schedule lookup map
  let scheduleMap = new Map<string, ScheduleInfo>();
  import { Namer } from "./lib/uniqueNamer";
  import { scheduleToId } from "../scheduler/index.js";
  let namer = Namer();

  let lastThreshold = -1;
  let clusteringThreshold = 0.9;
  function sendClusterBatch() {
    if (lastThreshold != clusteringThreshold) {
      lastThreshold = clusteringThreshold;
      clusterMap = new Map();
      scheduleMap = new Map();
      setClusterMap(clusterMap);
      let namer = Namer();
    }
    let pendingSchedules = schedules.filter((s) => !scheduleMap.has(s.id));
    for (let s of pendingSchedules) {
      scheduleMap.set(s.id, s);
    }

    if (!worker || !data) {
      return;
    }
    worker.postMessage({
      type: "cluster",
      payload: {
        schedules: pendingSchedules,
        prefs: data.studentPreferences,
        activities: data.activities,
        threshold: clusteringThreshold,
        clusters: clusterMap,
        referenceSchedules: [...clusterMap.keys()]
          .map(
            (referenceScheduleId) =>
              scheduleMap.get(referenceScheduleId) ||
              schedules.find((s) => s.id === referenceScheduleId)
          )
          .filter(Boolean), // Removes any undefined values
      },
    });
  }

  let editClusterSizeMode = false;
</script>

<Button
  on:click={() => {
    clustering = true;
    sendClusterBatch();
  }}
>
  Find Clusters
</Button>

<Tooltip
  ><MiniButton
    primary={editClusterSizeMode}
    on:click={() => {
      editClusterSizeMode = !editClusterSizeMode;
    }}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
    >
      <path
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </svg>
  </MiniButton>

  <span slot="tooltip">Edit Cluster Size</span>
</Tooltip>
{#if editClusterSizeMode}
  <FormItem>
    <span slot="label">Clustering Threshold</span>
    <input
      type="range"
      min="0.5"
      max="2"
      step="0.05"
      bind:value={clusteringThreshold}
    />
    <span>{clusteringThreshold.toFixed(2)}</span>
  </FormItem>
{/if}

<style>
</style>
