<script lang="ts">
  import WorkerManager from './WorkerManager.svelte';

  import ScheduleBuilder from './ScheduleBuilder.svelte';

  import DataPreview from './DataPreview.svelte';

	import type { StudentPreferences, Activity } from './../types.ts';
  import SetupSheets from './SetupSheets.svelte';

  import { Block, Icon } from "google-apps-script-svelte-components";  
  import { GoogleAppsScript } from "./gasApi";
  import { onMount } from "svelte";
  import { Button } from "contain-css-svelte";
  import "contain-css-svelte/vars/defaults.css"
  import "contain-css-svelte/vars/themes/light.css"
  import "contain-css-svelte/vars/themes/typography-airy.css"    
  
  let data : {
    studentPreferences: StudentPreferences[],
    activities: Activity[],
  };

  
  const readData = async () => {
    data = await GoogleAppsScript.readData();
    console.log('Read data',data);    
  }

</script>

<main>
  <h1>CAMP</h1>
  <Block>
    <h2>The Companion & Activity Matching Planner</h2>            
  </Block>  
  <Block>
    <SetupSheets></SetupSheets>
  </Block>
  <Block>
    <Button on:click={readData} >Load Preferences</Button>    
  </Block>
  <Block>
    <WorkerManager {data}></WorkerManager>
  </Block>
  <Block>
    <ScheduleBuilder {data}></ScheduleBuilder>    
  </Block>

  <!-- <SchedulePreview {data} {schedule}></SchedulePreview> -->
  <DataPreview {data}></DataPreview>
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
</main>

<style>
</style>
