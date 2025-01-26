<script lang="ts">
  
  import { GoogleAppsScript } from "./gasApi";

  import { Button, Checkbox, FormItem } from "contain-css-svelte";

  let inSetupMode = false;
  let npeers = 4;
  let nactivities = 4;
  let state: "idle" | "running" | "done" = "idle";
  let error = "";
  const doPrefs = async () => {
    state = "running";
    try {
      await GoogleAppsScript.setupPreferencesSheet(nactivities, npeers);
    } catch (e) {
      error = e;
    }
    state = "done";
  };

  const doActivities = async () => {
    state = "running";
    try {
      await GoogleAppsScript.setupActivitiesSheet();
    } catch (e) {
      error = e;
    }
    state = "done";
  };

  const addMockData = async () => {
    state = "running";
    try {
      await GoogleAppsScript.addMockData(nactivities, npeers,400,30);
    } catch (e) {
      error = e;
    }
    state = "done";
  };
</script>

<Checkbox bind:checked={inSetupMode}>Setup Sheets</Checkbox>
{#if inSetupMode}
  
    <h2>Setup Sheet</h2>
    <FormItem>
      <span slot="label"># Peers</span>
      <input type="number" min="1" max="10" bind:value={npeers} />
    </FormItem>
    <FormItem>
      <span slot="label"># Activities</span>
      <input type="number" min="1" max="10" bind:value={nactivities} />
    </FormItem>
    <FormItem>
      <Button disabled={state == "running"} primary on:click={addMockData}
        >Populate with Mock Data</Button
      >
    </FormItem>
    <FormItem>
      <Button disabled={state == "running"} primary on:click={doActivities}
        >Setup Activities Sheet!</Button
      >
    </FormItem>
    <FormItem>
      <Button disabled={state == "running"} primary on:click={doPrefs}
        >Setup Preferences Sheet!</Button
      >
    </FormItem>


    {#if state == "running"}
      <p>One sec...</p>
    {:else if error}
      <p>Oops!</p>
      {JSON.stringify(error)}
    {:else if state == "done"}
      <p>Done!</p>
    {/if}
  
{/if}

<style>
</style>
