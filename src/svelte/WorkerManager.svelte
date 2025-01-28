<script lang="ts">
  import BuildExplorer from "./BuildExplorer.svelte";

  import {
    compareSchedules,
    type Similarity,
  } from "./../scheduler/hillclimbing/compareSchedules";

  import ScheduleSummary from "./ScheduleSummary.svelte";

  import {
    Button,
    Bar,
    Select,
    TabBar,
    TabItem,
    Progress,
    FormItem,
  } from "contain-css-svelte";

  import type {
    StudentPreferences,
    Schedule,
    Activity,
    ScheduleInfo,
    WorkerMessage,
  } from "./../types.ts";
  import { GoogleAppsScript } from "./gasApi";
  import { onMount } from "svelte";
  import { algNames } from "../scheduler/hillclimbing/generator";
  import { WorkerPool } from "./lib/workerPool";
  import { idToSchedule } from "../scheduler";
  import type { FamilyClusters } from "../scheduler/hillclimbing/clusterSchedules";

  let generatorAlgs: string[] | undefined;

  let clustering = false; // don't duplicate clustering requests...

  export let data: {
    studentPreferences: StudentPreferences[];
    activities: Activity[];
  };

  let worker: Worker | null = null;

  let workerMessages: {
    [key: string]: WorkerMessage;
  } = {};

  let workerIds: string[] = [];
  $: workerIds = Object.keys(workerMessages);

  let workerMessage: string = "No message received yet.";
  let schedules: ScheduleInfo[] = [];
  let scheduleIdSet: Set<string> = new Set();
  let scheduleToImprove: ScheduleInfo | null = null;
  let running: boolean = false;

  const addSchedule = (schedule: ScheduleInfo) => {
    if (!scheduleIdSet.has(schedule.id)) {
      schedules = [...schedules, schedule];
      scheduleIdSet.add(schedule.id);
      return true;
    } else {
      console.log("Schedule already exists in list.");
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
      console.log("Svelte got worker message: ", message);
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
          console.log("Updated clusterMap!", clusterMap);
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

  // Generate schedules
  const generateSchedules = async () => {
    if (!worker) {
      await initializeWorker();
    }
    worker.postMessage({
      type: "generate",
      payload: {
        prefs: data.studentPreferences,
        activities: data.activities,
        rounds: rounds,
        algs: generatorAlgs,
      },
    });
    workerMessage = "Generating schedules...";
    running = true;
  };

  const improveSchedule = async (schedule) => {
    if (!worker) {
      await initializeWorker();
    }
    worker.postMessage({
      type: "improve",
      payload: {
        schedule: schedule,
        prefs: data.studentPreferences,
        activities: data.activities,
        stopAfter: null,
      },
    });
    workerMessage = "Improving the best schedule...";
    running = true;
  };

  // Improve a schedule
  const improveBestSchedule = () => {
    if (schedules.length > 0) {
      const bestSchedule = schedules.reduce((a, b) =>
        a.score > b.score ? a : b
      );
      improveSchedule(bestSchedule);
    }
  };
  const improveRandomSchedule = () => {
    if (schedules.length > 0) {
      const randomSchedule =
        schedules[Math.floor(Math.random() * schedules.length)];
      improveSchedule(randomSchedule);
    }
  };
  const improveMostRecentSchedule = () => {
    if (schedules.length > 0) {
      const mostRecentSchedule = schedules[schedules.length - 1];
      improveSchedule(mostRecentSchedule);
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

  let rounds = 10;

  // Evolve schedules
  const evolveSmatteringOfTopSchedules = (candidatePoolSize = 0.25) => {
    if (schedules.length > 2) {
      let sortedSchedules = [...schedules].sort((a, b) => b.score - a.score);
      let candidatePool = sortedSchedules.slice(
        0,
        Math.floor(sortedSchedules.length * candidatePoolSize)
      );
      let toSelect = Math.min(3 + Math.random() * 5, candidatePool.length);
      // Include best schedule in population...
      let selection = [sortedSchedules[0]];
      // Now compute similarity of each schedule to the best schedule
      let similarityScores = candidatePool.map((s) =>
        compareSchedules(s.schedule, sortedSchedules[0].schedule)
      );
      // Now sort by similarity
      let sortedSimilarityScores = similarityScores
        .map((s, i) => ({
          score: s.assignmentSimilarity + s.cohortSimilarity,
          index: i,
          schedule: candidatePool[i],
        }))
        .sort((a, b) => b.score - a.score);
      // Ensure we have at least toSelect candidates
      const stepSize =
        Math.floor(sortedSimilarityScores.length / toSelect) || 1;

      // Select evenly spaced schedules across the sorted similarity scores
      for (let i = 0; i < toSelect; i++) {
        let index = Math.min(i * stepSize, sortedSimilarityScores.length - 1);
        selection.push(sortedSimilarityScores[index].schedule);
      }
      sortedSimilarityScores
        .slice(0, toSelect)
        .forEach((s) => selection.push(s.schedule));

      let population = Array.from(selection);

      evolveScheduleGroup(population);
    }
  };

  // Select an unexplored cluster and evolve it
  function evolveUnexploredCluster() {
    if (!clusters.length) return;

    // Sort clusters by size (ascending) to prioritize less explored clusters
    let sortedClusters = clusters
      .filter((c) => c.set.size > 1) // Ensure it has at least 1 other member
      .sort((a, b) => a.set.size - b.set.size);

    if (!sortedClusters.length) return;

    let clusterToEvolve = sortedClusters[0]; // Pick the smallest unexplored cluster
    console.log(
      `Evolving unexplored cluster with ${clusterToEvolve.set.size} schedules`
    );
    evolveScheduleGroup(Array.from(clusterToEvolve.infoSet));
  }

  function crossbreedSmallClusters(numClusters = 5) {
    if (clusters.length < 2) return;
    debugger;
    // Identify clusters with small size (<= 3 schedules)
    let smallClusters = clusters.filter((c) => c.set.size <= 3);

    // If we don't have enough small clusters, take the smallest 8 clusters and pick `numClusters` randomly
    if (smallClusters.length < numClusters) {
      let smallestClusters = clusters
        .sort((a, b) => a.set.size - b.set.size) // Sort by size ascending
        .slice(0, numClusters * 2); // Take smallest numClusters * 2

      if (smallestClusters.length < 2) return; // Still need at least 2 clusters

      smallClusters = smallestClusters
        .sort(() => Math.random() - 0.5)
        .slice(0, numClusters);
    } else {
      // Pick `numClusters` random small clusters
      smallClusters = smallClusters
        .sort(() => Math.random() - 0.5)
        .slice(0, numClusters);
    }

    let schedulesToCross = new Set<ScheduleInfo>();

    // Include the best schedule from each cluster
    smallClusters.forEach((cluster) => {
      if (cluster.bestSchedule) schedulesToCross.add(cluster.bestSchedule);
    });

    // Select up to 2 additional random schedules per cluster (if available)
    const selectRandomSchedules = (cluster: (typeof smallClusters)[0]) => {
      let remainingSchedules = Array.from(cluster.infoSet).filter(
        (s) => s !== cluster.bestSchedule
      );
      while (
        remainingSchedules.length &&
        schedulesToCross.size < numClusters * 3
      ) {
        let randomIndex = Math.floor(Math.random() * remainingSchedules.length);
        schedulesToCross.add(remainingSchedules[randomIndex]);
        remainingSchedules.splice(randomIndex, 1);
      }
    };

    smallClusters.forEach(selectRandomSchedules);

    console.log(
      `Crossbreeding ${schedulesToCross.size} schedules from ${smallClusters.length} clusters`
    );

    evolveScheduleGroup(Array.from(schedulesToCross));
  }

  function evolveScheduleGroup(group: ScheduleInfo[]) {
    if (group.length > 2) {
      worker.postMessage({
        type: "evolve",
        payload: {
          population: group,
          prefs: data.studentPreferences,
          activities: data.activities,
          rounds,
        },
      });
      workerMessage = "Evolving schedules...";
      running = true;
    }
  }

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

  function camelCaseToEnglish(camelCase: string) {
    return camelCase.replace(/([A-Z])/g, " $1").replace(/^./, function (str) {
      return str.toUpperCase();
    });
  }
  let recentDiff: Similarity = {
    assignmentSimilarity: 0,
    cohortSimilarity: 0,
  };
  $: recentDiff =
    mostRecentSchedule &&
    bestSchedule &&
    compareSchedules(mostRecentSchedule.schedule, bestSchedule.schedule);
  let tab: "save" | "load" | "build" | "explore" = "load";
  let scheduleInfoTab = "recent";

  let lastSizeWeClusteredAt = 0; // length of schedules last time we built a map...
  let clusterMap: FamilyClusters = new Map();
  let clusters: {
    reference: Schedule;
    set: Set<Schedule>;
    infoSet: Set<ScheduleInfo>;
    avgScore: Number;
    bestScore: Number;
    bestSchedule: ScheduleInfo;
  }[] = [];
  // 🌍 Persistent Cache: Schedule lookup map
  let scheduleMap = new Map<string, ScheduleInfo>();

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
        });
      }
    }
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

  let clusteringThreshold = 0.9;
  let batchSize = 50; // How many schedules to accumulate before sending
  let pendingSchedules: Schedule[] = [];
  let batchTimer: ReturnType<typeof setTimeout> | null = null; // Timer for final batch flush

  function sendClusterBatch() {
    if (!pendingSchedules.length) return; // Nothing to send

    console.log(`Sending ${pendingSchedules.length} schedules for clustering`);

    clustering = true;
    lastSizeWeClusteredAt = schedules.length;

    worker.postMessage({
      type: "cluster",
      payload: {
        schedules: pendingSchedules, // ✅ Send all accumulated schedules
        prefs: data.studentPreferences,
        activities: data.activities,
        threshold: clusteringThreshold,
        clusters: clusterMap,
      },
    });

    // ✅ Clear the pending schedules array AFTER sending
    pendingSchedules = [];

    // ✅ Clear batch timer after sending
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
  }

  function scheduleBatchFlush() {
    if (batchTimer) clearTimeout(batchTimer); // Reset timer
    batchTimer = setTimeout(() => {
      if (pendingSchedules.length) sendClusterBatch(); // Send remaining schedules
    }, 2500); // Adjust delay for responsiveness
  }

  // 🚀 Batching with Immediate Send when Reaching `batchSize`
  function queueForClustering(newSchedules: Schedule[]) {
    pendingSchedules.push(...newSchedules);

    if (pendingSchedules.length >= batchSize) {
      sendClusterBatch(); // ✅ Immediate send when batch is ready
    } else {
      scheduleBatchFlush(); // ✅ Wait before sending if batch isn't full
    }
  }

  $: if (schedules.length > lastSizeWeClusteredAt && !clustering) {
    let newSchedules = schedules
      .map((s) => s.schedule)
      .filter((s) => !clusterMap.has(s)); // Only unclustered schedules

    if (newSchedules.length) {
      queueForClustering(newSchedules);
    }
  }
</script>

{#if data}
  <div>
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
    {#if tab == "load"}
      <Button
        on:click={() => {
          GoogleAppsScript.readBuildData(data).then((scheduleInfo) => {
            for (let s of scheduleInfo) {
              if (!s.schedule) {
                s.schedule = idToSchedule(
                  s.id,
                  data.studentPreferences,
                  data.activities
                );
              }
            }
            schedules = scheduleInfo;
          });
        }}>Load Build Data</Button
      >
    {:else if tab == "save"}
      <Button
        on:click={() => {
          GoogleAppsScript.writeBuildData(schedules, data);
        }}>Save Build Data</Button
      >
    {:else if tab == "build"}
      <div class="progress">
        {#each workerIds as id}
          {@const message = workerMessages[id]}
          <Bar>
            <Progress
              state={message.complete ? "complete" : "inprogress"}
              indeterminate={!message.total}
              --progress-font-size="12px"
              --progress-height="4em"
              max={message.total}
              value={message.count}
              key={id}
            >
              {#if message.message}{message.message}
              {/if}
              {#if message.schedule}
                <b>{message.schedule.score}</b>
                ({message.schedule.alg})
                <span style="font-size:x-small"
                  >{message.schedule.id.slice(
                    0,
                    3
                  )}...{message.schedule.id.slice(-3)}</span
                >
              {/if}
            </Progress>
            <Button on:click={() => stopWorker(id)}>Stop</Button>
          </Bar>
        {/each}
      </div>
      <FormItem>
        <span slot="label">Algorithms to Use</span>
        <Select bind:value={generatorAlgs}>
          <option value={undefined}>All</option>
          {#each algNames as algName}
            <option value={[algName]}>{camelCaseToEnglish(algName)}</option>
          {/each}
        </Select>
      </FormItem>
      <FormItem>
        <span slot="label">Rounds</span>
        <input type="number" bind:value={rounds} />
      </FormItem>
      <Button primary disabled={0 && running} on:click={generateSchedules}
        >Generate Schedules</Button
      >
      {#if schedules.length}
        <hr />
        <Button disabled={0 && running} on:click={improveAGoodSchedule}
          >Improve a Good Schedule</Button
        >
        <Button disabled={0 && running} on:click={improveRandomSchedule}
          >Improve a Random Schedule</Button
        >
        <Button
          disabled={(0 && running) || schedules.length < 4}
          on:click={() => evolveSmatteringOfTopSchedules(0.25)}
        >
          Evolve Some Schedules
        </Button>
        <Button
          disabled={(0 && running) || schedules.length < 4}
          on:click={evolveUnexploredCluster}
        >
          Evolve Unexplored Cluster
        </Button>
        <Button
          disabled={(0 && running) || schedules.length < 4}
          on:click={() => crossbreedSmallClusters()}
        >
          Crossbreed Small Clusters
        </Button>
        <Button
          disabled={(0 && running) || schedules.length < 4}
          on:click={improveSingletons}
        >
          Improve Singletons
        </Button>
        <hr />
        <b>{schedules.length} Total Schedules ({clusterMap.size} clusters)</b>
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
            <Button disabled={0 && running} on:click={improveBestSchedule}
              >Improve Best Schedule</Button
            >
            <ScheduleSummary schedule={bestSchedule}></ScheduleSummary>
          {/if}
          {#if mostRecentSchedule && scheduleInfoTab == "recent"}
            <h3>Most Recent Schedule</h3>
            <ScheduleSummary
              schedule={mostRecentSchedule}
              comparison={recentDiff}
            ></ScheduleSummary>
            <Button
              disabled={0 && running}
              on:click={() => {
                improveMostRecentSchedule();
              }}>Improve this Schedule</Button
            >
          {/if}
        {:else}
          <p>No schedules generated yet.</p>
        {/if}
      {/if}
    {:else if tab == "explore"}
      <BuildExplorer
        {data}
        schedules={clusters.map((c) => c.bestSchedule)}
        {bestSchedule}
        {clusterMap}
        onEvolve={evolveScheduleGroup}
        onImprove={improveSchedule}
        onWrite={(schedInfo) =>
          GoogleAppsScript.writeSchedule(schedInfo.schedule)}
      />
    {/if}
  </div>
{/if}

<style>
  .progress {
    margin-bottom: 1rem;
  }
</style>
