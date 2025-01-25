<script lang="ts">	
	import { compareSchedules, type Similarity } from './../scheduler/hillclimbing/compareSchedules';
  
  import ScheduleSummary from './ScheduleSummary.svelte';

    import { Button, Select, Row, TabBar, TabItem } from 'contain-css-svelte';
    import type { StudentPreferences, Activity, ScheduleInfo } from './../types.ts';
    import { GoogleAppsScript } from "./gasApi";
    import { onMount } from "svelte";
    import { algNames } from '../scheduler/hillclimbing/generator';
  import { WorkerPool } from './lib/workerPool';
    let generatorAlgs : string[] | undefined;
    export let data: {
      studentPreferences: StudentPreferences[],
      activities: Activity[],
    };
    

    let worker: Worker | null = null;
    let workerMessage: string = "No message received yet.";
    let schedules: ScheduleInfo[] = [];
    let scheduleIdSet : Set<string> = new Set();
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
      const blob = new Blob([workerScript], { type: "application/javascript" });
      const blobUrl = URL.createObjectURL(blob);
  
      // Initialize the worker
      worker = new WorkerPool(blobUrl, 4);
      //worker = new Worker(blobUrl);
  
      // Listen for messages from the worker
      worker.onmessage = (event) => {
        const message = event.data;
        console.log('Svelte got worker message: ',message);
        // Handle different message types from the worker
        switch (message.type) {
          case "generated":
            if (addSchedule(message.schedule)) {
              workerMessage = "Generated a new schedule.";
            } else {
              workerMessage = "Generated a duplicate schedule.";
            }
            break;
  
          case "improved":
            if (addSchedule(message.schedule)) {
              workerMessage = "Improved a schedule.";
            } else {
              workerMessage = "Improved a duplicate schedule.";
            }
            break;
  
          case "evolved":
            if (addSchedule(message.schedule)) {
              workerMessage = "Evolved a schedule.";
            } else {
              workerMessage = "Evolved a duplicate schedule.";
            }                        
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
            algs: generatorAlgs,
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
    const improveMostRecentSchedule = () => {
      if (worker && schedules.length > 0 && !running) {
        const mostRecentSchedule = schedules[schedules.length-1];
        improveSchedule(mostRecentSchedule);
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
        // Include best schedule in population...
        let selection = [sortedSchedules[0]];
        // Now compute similarity of each schedule to the best schedule
        let similarityScores = bestQuarter.map((s) => compareSchedules(s.schedule,sortedSchedules[0].schedule));
        // Now sort by similarity
        let sortedSimilarityScores = similarityScores.map((s,i) => ({score: s.assignmentSimilarity + s.cohortSimilarity, index: i, schedule : bestQuarter[i]})).sort((a,b) => b.score - a.score);
        sortedSimilarityScores.slice(0,toSelect).forEach((s) => selection.push(s.schedule));
        
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
    
    function camelCaseToEnglish(camelCase: string) {
        return camelCase.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); });
    }
    let recentDiff : Similarity = {
      assignmentSimilarity: 0,
      cohortSimilarity : 0
    };
    $: recentDiff = mostRecentSchedule && bestSchedule && compareSchedules(mostRecentSchedule?.schedule,bestSchedule?.schedule);
    let tab : 'save' | 'load' | 'build' = 'load';
  </script>
  {#if data}
  <div>
    <TabBar>
      <TabItem active={tab=='load'} on:click={()=>tab="load"}>Load</TabItem>
      <TabItem active={tab=='save'} on:click={()=>tab="save"}>Save</TabItem>
      <TabItem active={tab=='build'} on:click={()=>tab="build"}>Build</TabItem>      
    </TabBar>
    {#if tab == 'load'}
      <Button on:click={()=>{
        GoogleAppsScript.readBuildData().then((data)=>{
            schedules = data;
        });
    }}>Load Build Data</Button>
    {:else if tab == 'save'}
      <Button on:click={()=>{
        GoogleAppsScript.writeBuildData(schedules);    
      }}>Save Build Data</Button>
    {:else if tab == 'build'}
    <div class="progress">      
      <p>MSG: {workerMessage}</p>
      {#if running}
      <Button on:click={stopWorker} disabled={!running}>Stop</Button>
      {/if}
    </div>
    <Select bind:value={generatorAlgs}>
      <option value={undefined}>All</option>
      {#each algNames as algName}
          <option value={[algName]}>{camelCaseToEnglish(algName)}</option>
      {/each}
    </Select>
    <Button primary disabled={0&&running} on:click={generateSchedules}>Generate Schedules</Button>
    {#if schedules.length}
      <Button disabled={0&&running} on:click={improveBestSchedule}>Improve Best Schedule</Button>
        <hr />
        <Button disabled={0&&running} on:click={improveAGoodSchedule}>Improve a Good Schedule</Button>
        <Button disabled={0&&running} on:click={improveRandomSchedule}>Improve a Random Schedule</Button>
        <Button disabled={0&&running || schedules.length < 4} on:click={evolveSchedules} >
          Evolve Some Schedules
        </Button>
      <hr/>    
      <b>{schedules.length} Total Schedules</b>
      
      {#if bestSchedule}
        <h3>Best Schedule Yet</h3>
        <ScheduleSummary schedule={bestSchedule}></ScheduleSummary>        
      {/if}    
      {#if mostRecentSchedule}
        <h3>Most Recent Schedule</h3>
        <ScheduleSummary schedule={mostRecentSchedule} comparison={recentDiff}></ScheduleSummary>
        <Button disabled={0&&running} on:click={()=>{improveMostRecentSchedule()}}>Improve this Schedule</Button>        
      {/if}            
      {:else}
        <p>No schedules generated yet.</p>
      {/if}                  
    {/if}
  </div>
  {/if}

  <style>
    .progress {
      margin-bottom: 1rem;
    }
  </style>