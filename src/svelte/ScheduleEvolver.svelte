<script lang="ts">
  import {
    Accordion,
    Button,
    Select,
    FormItem,
    Card,
    Column,
  } from "contain-css-svelte";

  import type {
    PreferenceData,
    ScheduleInfo,
    ClusterInfo,
  } from "./../types.ts";

  export let data: PreferenceData | null = null;

  export let worker: Worker | null = null;
  export let setMessage: (message: string) => void;
  export let rounds: number;
  export let schedules: ScheduleInfo[] = [];
  export let clusters: ClusterInfo[];
  export let evolveScheduleGroup: (population: ScheduleInfo[]) => void;

  // Evolve schedules
  const evolveSmatteringOfTopSchedules = () => {
    if (schedules.length <= 2) return;
    const sortedSchedules = [...schedules].sort((a, b) => b.score - a.score);
    const topCount = Math.min(
      Math.max(5, Math.ceil(sortedSchedules.length * 0.1)),
      sortedSchedules.length
    );
    const randomCount = Math.min(5, sortedSchedules.length - topCount);
    const selection = sortedSchedules.slice(0, topCount);
    const remaining = sortedSchedules.slice(topCount);
    while (selection.length < topCount + randomCount && remaining.length) {
      const index = Math.floor(Math.random() * remaining.length);
      selection.push(remaining[index]);
      remaining.splice(index, 1);
    }
    evolveScheduleGroup(selection);
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
</script>

<details on:click>
  <summary>Schedule Evolver</summary>
  <Button
    disabled={schedules.length < 4}
    on:click={() => evolveSmatteringOfTopSchedules()}
  >
    Evolve Some Schedules
  </Button>
  <Button
    disabled={schedules.length < 4 || clusters.length < 2}
    on:click={evolveUnexploredCluster}
  >
    Evolve Unexplored Cluster
  </Button>
  <Button
    disabled={schedules.length < 4 || clusters.length < 2}
    on:click={() => crossbreedSmallClusters()}
  >
    Crossbreed Small Clusters
  </Button>
</details>
