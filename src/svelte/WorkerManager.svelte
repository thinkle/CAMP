<script lang="ts">
  import ScheduleSummary from './ScheduleSummary.svelte';

    import { Button } from 'contain-css-svelte';
    import type { StudentPreferences, Activity, ScheduleInfo } from './../types.ts';
    import { GoogleAppsScript } from "./gasApi";
    import { onMount } from "svelte";
  
    export let data: {
      studentPreferences: StudentPreferences[],
      activities: Activity[],
    };
  
    let worker: Worker | null = null;
    let workerMessage: string = "No message received yet.";
    let schedules: ScheduleInfo[] = [];
    let scheduleToImprove: ScheduleInfo | null = null;
    let running: boolean = false;
  
    // Fetch the worker script and initialize the worker
    const initializeWorker = async () => {
      const workerScriptHtml = await GoogleAppsScript.getWorkerScript();
      const textArea = document.createElement("textarea");
      textArea.innerHTML = workerScriptHtml;
      const workerScript = textArea.value;
  
      // Create a Blob URL for the worker script
      const blob = new Blob([workerScript], { type: "application/javascript" });
      const blobUrl = URL.createObjectURL(blob);
  
      // Initialize the worker
      worker = new Worker(blobUrl);
  
      // Listen for messages from the worker
      worker.onmessage = (event) => {
        const message = event.data;
        console.log('Svelte got worker message: ',message);
        // Handle different message types from the worker
        switch (message.type) {
          case "generated":
          schedules = [...schedules,message.schedule];
            workerMessage = "Generated a new schedule.";
            break;
  
          case "improved":
            schedules = [...schedules,message.schedule];
            workerMessage = "Improved a schedule.";
            break;
  
          case "evolved":
            schedules = [...schedules,message.schedule];
            workerMessage = "Evolved a schedule.";
            break;
  
          case "error":
            workerMessage = `Error: ${message.message}`;
            running = false;
            break;
  
          case "stopped":
            workerMessage = "Worker process stopped.";
            running = false;
            break;
  
          default:
            workerMessage = `Unknown message: (see console)`;
        }
      };
    };
  
    // Stop the worker process
    const stopWorker = () => {
      if (worker && running) {
        worker.postMessage({ type: "stop" });
        running = false;
      }
    };
  
    // Generate schedules
    const generateSchedules = () => {
      if (worker && !running) {
        worker.postMessage({
          type: "generate",
          payload: {
            prefs: data.studentPreferences,
            activities: data.activities,
            rounds: 10,
          },
        });
        workerMessage = "Generating schedules...";
        running = true;
      }
    };
  
    const improveSchedule = (schedule) => {
        worker.postMessage({
          type: "improve",
          payload: {
            schedule: schedule,
            prefs: data.studentPreferences,
            activities: data.activities,
          },
        });
        workerMessage = "Improving the best schedule...";
        running = true;
    }

    // Improve a schedule
    const improveBestSchedule = () => {
      if (worker && schedules.length > 0 && !running) {
        const bestSchedule = schedules.reduce((a, b) =>
          a.score > b.score ? a : b
        );
        improveSchedule(bestSchedule);
      }
    };
    const improveRandomSchedule = () => {
      if (worker && schedules.length > 0 && !running) {
        const randomSchedule = schedules[Math.floor(Math.random() * schedules.length)];
        improveSchedule(randomSchedule);
      }
    };

    const improveAGoodSchedule = () => {
        const averageScore = schedules.reduce((a, b) => a + b.score, 0) / schedules.length;
        const goodSchedules = schedules.filter(s => s.score > averageScore);
        if (goodSchedules.length > 0) {
            const randomSchedule = goodSchedules[Math.floor(Math.random() * goodSchedules.length)];
            improveSchedule(randomSchedule);
        }
    }
  


    // Evolve schedules
    const evolveSchedules = () => {
      if (worker && schedules.length > 2 && !running) {
        let sortedSchedules = [...schedules].sort(
            (a, b) => b.score - a.score
        );
        let bestQuarter = sortedSchedules.slice(0, Math.floor(sortedSchedules.length / 4));
        let toSelect = Math.min(3 + Math.random() * 5, bestQuarter.length);
        let selection = new Set();
        while (selection.size < toSelect) {
            selection.add(bestQuarter[Math.floor(Math.random() * bestQuarter.length)]);
        }
        let population = Array.from(selection);
        
        worker.postMessage({
          type: "evolve",
          payload: {
            population,
            prefs: data.studentPreferences,
            activities: data.activities,
            rounds: 5,
          },
        });        
        workerMessage = "Evolving schedules...";
        running = true;
      }
    };
  
    // Cleanup the worker on component unmount
    onMount(() => {
      initializeWorker();
      return () => {
        if (worker) {
          worker.terminate();
        }
      };
    });    
    let mostRecentSchedule : ScheduleInfo | undefined = undefined;
    $: mostRecentSchedule = schedules.length && schedules[schedules.length-1];
    let bestSchedule : ScheduleInfo | undefined = undefined;
    $: bestSchedule = schedules.length && schedules.reduce((a, b) => a.score > b.score ? a : b);
    
  </script>
  {#if data}
  <div>
    <Button on:click={()=>{
        GoogleAppsScript.writeBuildData(schedules);    
    }}>Save Build Data</Button>
    <Button on:click={()=>{
        GoogleAppsScript.readBuildData().then((data)=>{
            schedules = data;
        });
    }}>Load Build Data</Button>
    <div class="progress">
      <p>Most recent worker message:</p>
      <p>{workerMessage}</p>
      {#if running}
      <Button on:click={stopWorker} disabled={!running}>Stop</Button>
      {/if}
    </div>
    {#if schedules.length}
    <h3>Best Schedule Yet</h3>
    {#if bestSchedule}
        <ScheduleSummary schedule={bestSchedule}></ScheduleSummary>        
    {/if}    
    {#if mostRecentSchedule}
        <h3>Most Recent Schedule</h3>
        <ScheduleSummary schedule={mostRecentSchedule}></ScheduleSummary>
    {/if}
      <hr />
      <Button disabled={running} on:click={improveBestSchedule}>Improve Best Schedule</Button>
      <hr />
      <Button disabled={running} on:click={improveAGoodSchedule}>Improve a Good Schedule</Button>
      <Button disabled={running} on:click={improveRandomSchedule}>Improve a Random Schedule</Button>
      <Button disabled={running || schedules.length < 4} on:click={evolveSchedules} >
        Evolve Some Schedules
      </Button>
    {:else}
      <p>No schedules generated yet.</p>
    {/if}
  
    <hr />
    <Button disabled={running} on:click={generateSchedules}>Generate Schedules</Button>
  </div>
  {/if}
  <style>
    .progress {
      margin-bottom: 1rem;
    }
  </style>