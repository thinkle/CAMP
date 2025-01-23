<script lang="ts">
	import { evolveSchedules, improveSchedules } from '../scheduler/hillclimbing/evolveSchedules.js';
	import { generateSchedulesFromHeuristics } from '../scheduler/hillclimbing/generator.js';  
	import { improveSchedule, scoreSchedule, validateSchedule } from '../scheduler/index.js';
  import DataPreview from './DataPreview.svelte';

	import type { StudentPreferences, Activity, Schedule, ScheduleInfo } from '../types.js';
  import SetupSheets from './SetupSheets.svelte';

  import { Block, Icon } from "google-apps-script-svelte-components";  
  import { GoogleAppsScript } from "./gasApi.js";
  import { onMount, tick } from "svelte";
  import { Button } from "contain-css-svelte";
  import { assignByActivity, assignByPeer } from '../scheduler/index.js';
  import { createScheduleInfo } from '../scheduler/hillclimbing/scheduleInfo.js';

  export let data : {studentPreferences: StudentPreferences[], activities: Activity[]};
  
  const readData = async () => {
    data = await GoogleAppsScript.readData();
  }

  let schedule : Schedule = [];
  let schedules : ScheduleInfo[] = [];
  let error;
  let score;
  let invalid;
  let alg : string;
  let gen : number;
  let id : string;

  function updateWinner () {
    for (let s of schedules) {
        if (s.score > score || !score && !s.invalid) {
            schedule = s.schedule;
            score = s.score;
            alg = s.alg;
            gen = s.generation;
            invalid = s.invalid;
            id = s.id;
        }
    }
  }

  function doGenerate () {
    let startNum = schedules.length;
    schedules = generateSchedulesFromHeuristics(10, data.studentPreferences, data.activities, schedules)
    console.log('Generated',schedules.slice(startNum),'new schedules');
    updateWinner();
  }

  function doEvolve () {
    let startNum = schedules.length;
    schedules = evolveSchedules(schedules, data.studentPreferences, data.activities, 20);
    console.log('Generated',schedules.slice(startNum),'new schedules');
    updateWinner();
  }


  function doAssignByActivity () {
    error = undefined;
    console.log('Got prefs',data.studentPreferences)
    try {
        schedule = assignByActivity(data.studentPreferences, data.activities);
        alg = 'activity'
    } catch (err) {
        error = err;
        score = 0;
    }
  }
  function doAssignByPeer () {
    error = undefined;
    console.log('Got prefs',data.studentPreferences)
    try {
        schedule = assignByPeer(data.studentPreferences, data.activities);
        alg = 'peer';
    } catch (err) {
        error = err;
        score = 0;
    }
  }

  function doImprove () {
    try {
      schedules = improveSchedules(schedules, data.studentPreferences, data.activities);      
      /* let newSchedule = improveSchedule(schedule, data.studentPreferences, data.activities);
      if (newSchedule) {
        console.log('Generated new one!',newSchedule,'from',schedule,score);
        if (newSchedule.id == id) {
          console.log('Already have this one');
        } else {   
          let scheduleInfo = createScheduleInfo(
            newSchedule,
            data.studentPreferences,
            data.activities,
            alg + 'i',
            gen + 1                                    
          );
          console.log('New schedule:',scheduleInfo)
          schedules.push(scheduleInfo);
          updateWinner();
        }
      } */
    } catch (err) {
      error = err;     
    }
    updateWinner();
    
  }
  
  $: score = data && scoreSchedule(schedule, data.studentPreferences);
  $: invalid = data && schedule && validateSchedule(schedule, data.activities);
  $: console.log('Schedule pool is:',schedules);
  $: console.log('Best Schedule:',schedule.slice(), score);

  async function loadBuildData () {
    schedules = await GoogleAppsScript.readBuildData();
    updateWinner();
  }

  async function saveBuildData () {
    await GoogleAppsScript.writeBuildData(schedules);
  }

  let autoMessage = "";
  let autoBuilding = false;

  async function autoBuild () {   
    autoBuilding = true; 
    while (autoBuilding) {
      let currentBestScore = score;
      autoMessage = "Generating...";
      await tick();
      doGenerate();
      autoMessage = "Evolving...";
      await tick();
      doEvolve();
      autoMessage = 'Improving...';
      await tick();
      doImprove();
      if (score > currentBestScore) {
        autoMessage = `Improved on our prior best, ${currentBestScore} => ${score}! Saving...`;
        await tick();
        await GoogleAppsScript.writeBuildData(schedules);      
        currentBestScore = score;
      }      
    }
  }

  $: console.log('Auto build message update...',autoMessage);

</script>

<div class="tester">
    <Button on:click={loadBuildData}>Load Build Data from Previous Builds...</Button>
    <Button on:click={saveBuildData}>Save Build Data...</Button>
    <hr>
    <Button on:click={doGenerate}>Generate Some!</Button>
    <Button on:click={doEvolve}>Evolve Some!</Button>
    <Button on:click={doAssignByActivity}>Assign by Activity</Button>
    <Button on:click={doAssignByPeer}>Assign by Peer</Button>
    <Button on:click={doImprove}>Improve schedule!</Button>
    
    <hr>
    <Button on:click={autoBuild} disabled={autoBuilding}>Continuously Build...</Button>
    {#if autoBuilding}
        <Button on:click={() => autoBuilding = false}>Stop Building</Button>
        <div class="progress">
          Working on Improving your schedule...
          <p>{autoMessage}</p>
          <p>Current best score: {score}</p>          
        </div>
    {/if}
    
    
    {#if error}
        <h2>Error</h2><div class="error">{error}</div>
    {/if}
    Score {score}
    {#if invalid}
    <h2>Invalid Schedule!
        {invalid}
    </h2>
    {/if}
    Generated by {alg}    
</div>

<style>
</style>

