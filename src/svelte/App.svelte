<script lang="ts">
  import WorkerManager from './WorkerManager.svelte';

  import ScheduleBuilder from './ScheduleBuilder.svelte';

  import DataPreview from './DataPreview.svelte';

	import type { StudentPreferences, Activity } from './../types.ts';
  import SetupSheets from './SetupSheets.svelte';

  import { GoogleAppsScript } from "./gasApi";
  import { Button, Container, Accordion } from "contain-css-svelte";
  import "contain-css-svelte/vars/defaults.css"
  import "contain-css-svelte/vars/themes/light.css"
  import "contain-css-svelte/vars/themes/typography-airy.css"    
  
  let data : {
    studentPreferences: StudentPreferences[],
    activities: Activity[],
  };

  

  const readData = async () => {
    data = await GoogleAppsScript.readData();
    let ogLength = data.studentPreferences.length;
    data.studentPreferences = data.studentPreferences.filter(sp => sp.activity.length > 0);
    console.log('Filtered out',ogLength - data.studentPreferences.length,'students with no activities');
  }
  

</script>

<Container --container-max-width="320px" height="100vw" --font-size="14px" --gap="2px" --padding="4px 2px" --border-radius="0">
  <h1>CAMP</h1>
  
    <h2>The Companion & Activity Matching Planner</h2>            
    <Accordion>
      <details>
        <summary>Set-Up</summary>
        <SetupSheets></SetupSheets>
        <Button on:click={readData} >Load Preferences</Button>
        <DataPreview {data}></DataPreview>    
      </details>
      <details>
        <summary>Build Schedule</summary>
        <WorkerManager {data}></WorkerManager>
      </details>
    </Accordion>
      
    
      
  
    
  
  <!-- <SchedulePreview {data} {schedule}></SchedulePreview> -->
  
  <div>
    <span class="gray">
      Created with
      <a
        target="_blank"
        href="https://github.com/thinkle/Google-Apps-Script-Svelte-Starter"
      >
        Google Apps Script + Svelte Starter Kit
      </a>
      by
      <a target="_blank" href="https://www.tomhinkle.net"> Tom Hinkle </a>
    </span>
  </div>
</Container>

<style>
</style>
