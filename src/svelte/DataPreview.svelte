<script lang="ts">
	import type { StudentPreferences, Activity } from './../types.ts';
  import SetupSheets from './SetupSheets.svelte';

  
  import { GoogleAppsScript } from "./gasApi";
  import { onMount } from "svelte";
  import { Button } from "contain-css-svelte";
  
  export let data : {
    studentPreferences: StudentPreferences[],
    activities: Activity[],
  };
  const readData = async () => {
    data = await GoogleAppsScript.readData();
  }
  $: console.log('Data Preview: ',data);
</script>
{#if data}
<div>
    We read some data, like...
    <h2>Student Prefs (first 10)</h2>
    {#each data.studentPreferences.slice(0,10) as sp}
        <li>
            {sp.identifier} prefers:
            <ul>
                {#each sp.activity as ap}
                <li>{ap.activity} ({ap.weight})</li>
                {/each}                
            </ul>
            <ul>
                {#each sp.peer as pp} 
                <li>{pp.peer} ({pp.weight})</li>
                {/each}
            </ul>
        </li>
    {/each}
</div>
<div>
    <h2>Activity Summary</h2>
    <ul>
    {#each data.activities as act} 
    {@const requests = data.studentPreferences.filter(sp => sp.activity.some(ap => ap.activity == act.activity))}
    <li>
        {act.activity} capacity {act.capacity}
        has requests: {requests.length}.
    </li>
    {/each}
    </ul>
</div>
{/if}
<style>
</style>

