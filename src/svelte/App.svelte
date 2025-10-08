<script lang="ts">
  import WorkerManager from "./WorkerManager.svelte";

  import DataPreview from "./DataPreview.svelte";

  import type { PreferenceData, PreferenceMode } from "./../types.ts";
  import SetupSheets from "./SetupSheets.svelte";
  import { buildLabel } from "../buildInfo";

  import { GoogleAppsScript } from "./gasApi";
  import {
    Bar,
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

  let data: PreferenceData | null = null;
  let preferenceMode: PreferenceMode | null = null;

  const readData = async () => {
    loadingFromSheets = true;
    data = await GoogleAppsScript.readData(keepEmpty);
    preferenceMode = data.preferenceMode;
    loadingFromSheets = false;
  };
  let loadingFromSheets = false;
  let sheetsReady = false;
  let keepEmpty = false;
  onMount(async () => {
    sheetsReady = await GoogleAppsScript.areDataSheetsSetup();
  });
  import img from "../../public/camp-logo-96-transparent.png";
</script>

<Container
  --container-max-width="283px"
  height="calc(100vh - 8px)"
  --font-size="14px"
  --gap="2px"
  --padding="4px 2px"
  --border-radius="0"
>
  <img alt="CAMP" src={img} class="logo" />
  <h2>The Companion & Activity Matching Planner</h2>

  <Accordion highlanderMode={true}>
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
      {#if data}
        <p class="gray">
          Scheduling mode:
          {preferenceMode === "peer-only"
            ? "Peer-only (ignore activity preferences)"
            : "Activities + Peers"}
        </p>
      {/if}
      <DataPreview {data}></DataPreview>
    </details>
    <details>
      <summary>Build Schedule</summary>
      <WorkerManager {data}></WorkerManager>
    </details>
  </Accordion>

  <!-- <SchedulePreview {data} {schedule}></SchedulePreview> -->

  <div class="footer">
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
    <span class="gray build">Build {buildLabel}</span>
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
    vertical-align: middle;
    font-size: 48px;
  }
  .footer {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    align-items: center;
  }
  .build {
    font-size: 0.7rem;
  }
  .logo {
    margin: auto;
    width: 96px;
    display: block;
  }
</style>
