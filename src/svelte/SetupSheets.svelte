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
  const doUniversalPrefs = async () => {
    state = "running";
    try {
      await GoogleAppsScript.getUniversalPrefsSheet();
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
      await GoogleAppsScript.addMockData(nactivities, npeers, 400, 30);
    } catch (e) {
      error = e;
    }
    state = "done";
  };
</script>

<Checkbox bind:checked={inSetupMode}>Setup Sheets</Checkbox>
{#if inSetupMode}
  <h2>Setup Sheet</h2>
  <div style="display:flex; flex-direction: row; align-items: center">
    <FormItem>
      <span slot="label"># Peers</span>
      <input type="number" min="1" max="10" bind:value={npeers} />
    </FormItem>
    <FormItem>
      <span slot="label"># Activities</span>
      <input type="number" min="1" max="10" bind:value={nactivities} />
    </FormItem>
  </div>
  <FormItem>
    <Button disabled={state == "running"} primary on:click={doActivities}>
      Setup Activities Sheet!
    </Button>
  </FormItem>
  <p>For the list of activities & their max roster sizes (capacity).</p>
  <FormItem>
    <Button disabled={state == "running"} primary on:click={doPrefs}
      >Setup Preferences Sheet!</Button
    >
  </FormItem>
  <p>For the list of students & their peer & activity preferences.</p>
  <FormItem>
    <Button disabled={state == "running"} primary on:click={doUniversalPrefs}
      >Set Up Universal Prefs Sheet</Button
    >
    <p>
      For default values for all students who don't specify an activity -- let's
      you say that certain activities should be preferred or not preferred for
      students who don't sign up for them.
    </p>
  </FormItem>
  <FormItem>
    <Button disabled={state == "running"} on:click={addMockData}
      >Populate with Mock Data
    </Button>
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
