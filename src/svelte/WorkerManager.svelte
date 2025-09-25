<script lang="ts">
  import LatestSchedules from "./LatestSchedules.svelte";
  import Clusterer from "./Clusterer.svelte";

  import ScheduleImprover from "./ScheduleImprover.svelte";

  import BuildProgress from "./BuildProgress.svelte";

  import ScheduleEvolver from "./ScheduleEvolver.svelte";
  import ScheduleGenerator from "./ScheduleGenerator.svelte";

  import BuildExplorer from "./BuildExplorer.svelte";

  import {
    Button,
    TabBar,
    TabItem,
    Progress,
    FormItem,
  } from "contain-css-svelte";

  import type {
    PreferenceData,
    Schedule,
    ScheduleInfo,
    WorkerMessage,
  } from "./../types.ts";
  import { GoogleAppsScript } from "./gasApi";
  import { onMount } from "svelte";
  import { WorkerPool } from "./lib/workerPool";
  import { idToSchedule, scoreSchedule } from "../scheduler";
  import type { FamilyClusters } from "../scheduler/hillclimbing/clusterSchedules";
  import { preparePreferencesForScheduling } from "../scheduler/utils/normalizePreferences";

  let clustering = false; // don't duplicate clustering requests...

  export let data: PreferenceData | null = null;

  let schedulerData: PreferenceData | null = null;
  $: schedulerData = data
    ? {
        ...data,
        studentPreferences: preparePreferencesForScheduling(
          data.studentPreferences,
          data.activities
        ).studentPreferences,
      }
    : null;

  let worker: Worker | null = null;

  let workerMessages: {
    [key: string]: WorkerMessage;
  } = {};

  let workerIds: string[] = [];
  $: workerIds = Object.keys(workerMessages);

  let workerMessage: string = "No message received yet.";
  let schedules: ScheduleInfo[] = [];
  let scheduleIdSet: Set<string> = new Set();
  let running: boolean = false;

  const addSchedule = (schedule: ScheduleInfo) => {
    if (!scheduleIdSet.has(schedule.id)) {
      schedules = [...schedules, schedule];
      scheduleIdSet.add(schedule.id);
      return true;
    } else {
      console.log("addSchedule: Schedule already exists in list.");
      return false;
    }
  };

  // Fetch the worker script and initialize the worker
  const initializeWorker = async () => {
    const workerScriptHtml = await GoogleAppsScript.getWorkerScript();
    const textArea = document.createElement("textarea");
    textArea.innerHTML = workerScriptHtml;
    const workerScript = textArea.value;

    // Create a Blob URL for the worker script
    const blob = new Blob([workerScript], {
      type: "application/javascript",
    });
    const blobUrl = URL.createObjectURL(blob);

    // Initialize the worker
    worker = new WorkerPool(blobUrl, 4);
    //worker = new Worker(blobUrl);

    // Listen for messages from the worker
    worker.onmessage = (event) => {
      const message = event.data;
      let id = message.id;
      // Handle different message types from the worker
      switch (message.type) {
        case "generated":
          if (addSchedule(message.schedule)) {
            workerMessages[id] = message;
          } else {
            workerMessages[id] = message;
          }
          break;

        case "improved":
          if (addSchedule(message.schedule)) {
            workerMessages[id] = message;
          } else {
            workerMessages[id] = {
              message: "Improvement yielded a duplicate...",
              ...message,
            };
          }
          break;

        case "evolved":
          if (addSchedule(message.schedule)) {
            workerMessages[id] = message;
          } else {
            workerMessages[id] = {
              ...message,
              text: "Evolution yielded a duplicate...",
            };
          }
          break;

        case "error":
          workerMessages[id] = message;
          running = false;
          break;

        case "stopped":
          workerMessages[id] = message;
          running = false;
          break;

        case "clustered":
          clusterMap = message.map;
          workerMessages[id] = message;
          running = false;
          clustering = false;
          break;

        default:
          workerMessages[id] = message;
      }
    };
  };

  // Stop the worker process
  const stopWorker = (id) => {
    worker.postMessage({
      type: "stop",
      id,
    });
    running = false;
  };

  const setWorkerMessage = (msg) => {
    workerMessage = msg;
  };

  let rounds = 10;

  // Cleanup the worker on component unmount
  onMount(() => {
    console.log("Initializing worker...");
    initializeWorker();

    return () => {
      if (worker) {
        worker.terminate();
      }
    };
  });
  let mostRecentSchedule: ScheduleInfo | undefined = undefined;
  $: mostRecentSchedule = schedules.length && schedules[schedules.length - 1];
  let bestSchedule: ScheduleInfo | undefined = undefined;
  $: bestSchedule =
    schedules.length && schedules.reduce((a, b) => (a.score > b.score ? a : b));

  let tab: "save" | "load" | "build" | "explore" = "load";

  let clusterMap: FamilyClusters = new Map();
  let clusters: {
    reference: Schedule;
    set: Set<Schedule>;
    infoSet: Set<ScheduleInfo>;
    avgScore: Number;
    bestScore: Number;
    bestSchedule: ScheduleInfo;
    name: string;
  }[] = [];
  let existingSet = new Set(schedules.map((s) => s.id));
  $: existingSet = new Set(schedules.map((s) => s.id));

  // 🌍 Persistent Cache: Schedule lookup map
  import { Namer } from "./lib/uniqueNamer";
  let namer = Namer();

  const setClusterMap = (newClusterMap: FamilyClusters) => {
    clusterMap = newClusterMap;
  };
  const setClusters = (newClusters) => {
    clusters = newClusters;
  };

  function evolveScheduleGroup(group: ScheduleInfo[]) {
    if (!schedulerData) return;
    if (group.length > 2) {
      worker.postMessage({
        type: "evolve",
        payload: {
          population: group,
          prefs: schedulerData.studentPreferences,
          activities: schedulerData.activities,
          scoringOptions: schedulerData.scoringOptions,
          existingSet,
          rounds,
        },
      });
      setWorkerMessage("Evolving schedules...");
    }
  }
  const improveSchedule = async (schedule) => {
    if (!worker) {
      await initializeWorker();
    }
    if (!schedulerData) return;
    worker.postMessage({
      type: "improve",
      payload: {
        schedule: schedule,
        prefs: schedulerData.studentPreferences,
        activities: schedulerData.activities,
        scoringOptions: schedulerData.scoringOptions,
        stopAfter: null,
        existingSet,
      },
    });
    setWorkerMessage("Improving the best schedule...");
  };

  let saveBuildBusy;
</script>

{#if data}
  <div
    style:--accordion-summary-bg="var(--material-color-blue-grey-100)"
    style:--accordion-summary-fg="var(--material-color-blue-grey-900)"
    style:--accordion-summary-open-bg="var(--material-color-blue-grey-800)"
    style:--accordion-summary-open-fg="var(--material-color-blue-grey-50)"
  >
    <TabBar>
      <TabItem active={tab == "load"} on:click={() => (tab = "load")}
        >Load</TabItem
      >
      <TabItem active={tab == "save"} on:click={() => (tab = "save")}
        >Save</TabItem
      >
      <TabItem active={tab == "build"} on:click={() => (tab = "build")}
        >Build</TabItem
      >
      <TabItem active={tab == "explore"} on:click={() => (tab = "explore")}
        >Explore</TabItem
      >
    </TabBar>
    <div class="content" class:visible={tab == "load"}>
      <Button
        on:click={() => {
          saveBuildBusy = "Reading build data...";
          GoogleAppsScript.readBuildData(data).then((scheduleInfo) => {
            for (let s of scheduleInfo) {
              if (!s.schedule) {
                s.schedule = idToSchedule(
                  s.id,
                  data.studentPreferences,
                  data.activities
                );
                s.score = scoreSchedule(
                  s.schedule,
                  data.studentPreferences,
                  data.scoringOptions
                );
              }
            }
            schedules = scheduleInfo;
            saveBuildBusy = "";
          });
        }}>Load Build Data</Button
      >
      {#if saveBuildBusy}
        <Progress state="inprogress" indeterminate={true}>
          {saveBuildBusy}
        </Progress>
      {/if}
    </div>
    <div class="content" class:visible={tab == "save"}>
      <Button
        on:click={async () => {
          saveBuildBusy = "Saving build data...";
          // Batch it if we have too much data...
          let bestHalf = schedules
            .sort((a, b) => b.score - a.score)
            .slice(0, schedules.length / 2);
          while (bestHalf.length) {
            await GoogleAppsScript.writeBuildData(
              bestHalf.splice(0, 200),
              data
            );
          }
          saveBuildBusy = "";
        }}>Save Build Data</Button
      >
      {#if saveBuildBusy}
        <Progress state="inprogress" indeterminate={true}>
          {saveBuildBusy}
        </Progress>
      {/if}
    </div>
    <div class="content" class:visible={tab == "build"}>
      <BuildProgress {workerIds} {workerMessages} {stopWorker}></BuildProgress>
      <b>{schedules.length} Total Schedules ({clusterMap.size} clusters)</b>
      {#if schedules.length}
        <Clusterer
          data={schedulerData}
          {schedules}
          {clusterMap}
          {setClusterMap}
          {setClusters}
          {worker}
          {clusters}
        ></Clusterer>
      {/if}
      <FormItem --margin-bottom="1rem">
        <span slot="label">Rounds</span>
        <input type="number" bind:value={rounds} />
      </FormItem>
      <ScheduleGenerator
        data={schedulerData}
        {worker}
        {initializeWorker}
        setMessage={setWorkerMessage}
        {rounds}
      />
      <ScheduleEvolver
        data={schedulerData}
        {worker}
        setMessage={setWorkerMessage}
        {rounds}
        {schedules}
        {clusters}
        {evolveScheduleGroup}
      />
      {#if schedules.length}
        <ScheduleImprover
          {improveSchedule}
          {schedules}
          {clusters}
          {mostRecentSchedule}
          {bestSchedule}
        />
        <LatestSchedules
          {schedules}
          {clusters}
          {mostRecentSchedule}
          {bestSchedule}
          {improveSchedule}
        />
      {/if}
    </div>
    <div class="content" class:visible={tab == "explore"}>
      <BuildExplorer
        data={schedulerData}
        {schedules}
        {bestSchedule}
        {clusterMap}
        {clusters}
        onEvolve={evolveScheduleGroup}
        onImprove={improveSchedule}
        onWrite={(schedInfo) =>
          GoogleAppsScript.writeSchedule(schedInfo.schedule)}
      />
    </div>
  </div>
{/if}

<style>
  .content {
    display: none;
  }
  .visible {
    display: block;
  }
</style>
