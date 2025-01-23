<script lang="ts">
    import type { StudentPreferences, Activity } from './../types.ts';
    import { GoogleAppsScript } from "./gasApi";
    import { onMount } from "svelte";
  
    export let data: {
      studentPreferences: StudentPreferences[],
      activities: Activity[],
    };
  
    let worker: Worker | null = null;
    let workerMessage: string = "No message received yet.";
  
    // Fetch the worker script and initialize the worker
    const initializeWorker = async () => {
      const workerScript = await GoogleAppsScript.getWorkerScript();
  
      // Create a Blob URL for the worker script
      const blob = new Blob([workerScript], { type: "application/javascript" });
      const blobUrl = URL.createObjectURL(blob);
  
      // Initialize the worker
      worker = new Worker(blobUrl);
  
      // Listen for messages from the worker
      worker.onmessage = (event) => {
        workerMessage = event.data;
      };
  
      // Post a message to the worker
      worker.postMessage("Hello from the main thread!");
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
  </script>
  
  <div>
    <h1>Worker Test</h1>
    <p>Worker Message: {JSON.stringify(workerMessage)}</p>
  </div>
  
  <style>
    h1 {
      font-family: Arial, sans-serif;
    }
  </style>