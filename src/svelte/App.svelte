<script lang="ts">
  import WorkerManager from "./WorkerManager.svelte";

  import ScheduleBuilder from "./ScheduleBuilder.svelte";

  import DataPreview from "./DataPreview.svelte";

  import type { StudentPreferences, Activity } from "./../types.ts";
  import SetupSheets from "./SetupSheets.svelte";

  import { GoogleAppsScript } from "./gasApi";
  import {
    Button,
    Container,
    Accordion,
    Progress,
    TextLayout,
    Checkbox,
  } from "contain-css-svelte";
  import "contain-css-svelte/vars/defaults.css";
  import "contain-css-svelte/vars/themes/light.css";
  import "contain-css-svelte/vars/themes/typography-airy.css";
  import { onMount } from "svelte";

  let data: {
    studentPreferences: StudentPreferences[];
    activities: Activity[];
  };

  const readData = async () => {
    loadingFromSheets = true;
    data = await GoogleAppsScript.readData(keepEmpty);
    let ogLength = data.studentPreferences.length;
    data.studentPreferences = data.studentPreferences.filter(
      (sp) => sp.activity.length > 0
    );
    console.log(
      "Filtered out",
      ogLength - data.studentPreferences.length,
      "students with no activities"
    );
    loadingFromSheets = false;
  };
  let loadingFromSheets = false;
  let sheetsReady = false;
  let keepEmpty = false;
  onMount(async () => {
    sheetsReady = await GoogleAppsScript.areDataSheetsSetup();
  });
</script>

<Container
  --container-max-width="283px"
  height="calc(100vh - 8px)"
  --font-size="14px"
  --gap="2px"
  --padding="4px 2px"
  --border-radius="0"
>
  <h1>CAMP</h1>
  <h2>The Companion & Activity Matching Planner</h2>

  <Accordion>
    <details open={!sheetsReady}>
      <summary>Set-Up Sheets</summary>
      <SetupSheets></SetupSheets>
    </details>
    <details open={sheetsReady}>
      <summary>Load from Sheets</summary>
      <Checkbox checked={keepEmpty}>Include students w/ no preferences</Checkbox
      >
      <Button disabled={loadingFromSheets} on:click={readData} primary
        >Load Preferences</Button
      >
      {#if loadingFromSheets}
        <Progress state="inprogress">Loading data from Google Sheets</Progress>
      {/if}
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
  h2 {
    font-size: 0.8rem !important;
    text-align: center !important;
    font-variant: small-caps !important;
  }
  h1 {
    text-align: center !important;
  }
</style>
