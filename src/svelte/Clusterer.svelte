<script lang="ts">
  import { Button, FormItem, MiniButton, Tooltip } from "contain-css-svelte";

  import type {
    StudentPreferences,
    Schedule,
    Activity,
    ScheduleInfo,
  } from "./../types.ts";

  import type { FamilyClusters } from "../scheduler/hillclimbing/clusterSchedules";

  let clustering = false; // don't duplicate clustering requests...

  export let data: {
    studentPreferences: StudentPreferences[];
    activities: Activity[];
  };

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
  export let setClusters: (clusters: ClusterInfo[]) => void;
  export let setClusterMap: (clusterMap: FamilyClusters) => void;

  // 🌍 Persistent Cache: Schedule lookup map
  let scheduleMap = new Map<string, ScheduleInfo>();
  import { Namer } from "./lib/uniqueNamer";
  let namer = Namer();
  function buildClusters() {
    if (!clusterMap) return;

    clusters = [];
    for (let [id, cluster] of clusterMap) {
      let reference = id;
      let set = cluster;
      let infoSet: Set<ScheduleInfo> = new Set();
      let avgScore = 0;
      let bestScore = -Infinity;
      let bestSchedule: ScheduleInfo | null = null;
      let name = namer.getName(reference);

      for (let s of set) {
        let key = JSON.stringify(s);

        // 🔍 Check if we already have this schedule in the map
        let info = scheduleMap.get(key);

        if (!info) {
          // 🚀 If not cached, find it in `schedules` and store it
          info = schedules.find((si) => JSON.stringify(si.schedule) === key);
          if (info) {
            scheduleMap.set(key, info);
          } else {
            console.error("Schedule not found in schedule info: ", s);
            continue; // Skip to the next schedule
          }
        }

        // Process schedule
        infoSet.add(info);
        avgScore += info.score;
        if (info.score > bestScore) {
          bestScore = info.score;
          bestSchedule = info;
        }
      }

      if (infoSet.size > 0) {
        avgScore /= infoSet.size;
        clusters.push({
          reference,
          set,
          infoSet,
          avgScore,
          bestScore,
          bestSchedule,
          name,
        });
      }
    }
    setClusters(clusters);
  }

  // Utility: Debounce execution (waits for a small pause before running)
  function debounce(fn: Function, delay = 300) {
    let timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  const buildClustersDebounced = debounce(buildClusters, 2000);

  $: if (clusterMap) {
    buildClustersDebounced();
  }

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
    let pendingSchedules = schedules.filter(
      (s) => !scheduleMap.has(JSON.stringify(s.schedule))
    );

    worker.postMessage({
      type: "cluster",
      payload: {
        schedules: pendingSchedules.map((s) => s.schedule), // ✅ Send all accumulated schedules
        prefs: data.studentPreferences,
        activities: data.activities,
        threshold: clusteringThreshold,
        clusters: clusterMap,
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
