<script lang="ts">
  import { Button, Select, FormItem } from "contain-css-svelte";

  import type { PreferenceData } from "./../types.ts";
  import { algNames } from "../scheduler/hillclimbing/generator";

  let generatorAlgs: string[] | undefined;

  export let data: PreferenceData | null = null;

  export let worker: Worker | null = null;
  export let initializeWorker: () => Promise<void>;
  export let setMessage: (message: string) => void;
  export let rounds: number;

  // Generate schedules
  const generateSchedules = async () => {
    if (!worker) {
      await initializeWorker();
    }
    if (!data) return;
    worker.postMessage({
      type: "generate",
      payload: {
        prefs: data.studentPreferences,
        activities: data.activities,
        rounds: rounds,
        algs: generatorAlgs,
        scoringOptions: data.scoringOptions,
      },
    });
    setMessage("Generating schedules...");
  };

  function camelCaseToEnglish(camelCase: string) {
    return camelCase.replace(/([A-Z])/g, " $1").replace(/^./, function (str) {
      return str.toUpperCase();
    });
  }
</script>

<details open on:click|stopPropagation>
  <summary>Generate</summary>
  <FormItem>
    <span slot="label">Algorithms to Use</span>
    <Select bind:value={generatorAlgs}>
      <option value={undefined}>All</option>
      {#each algNames as algName}
        <option value={[algName]}>{camelCaseToEnglish(algName)}</option>
      {/each}
    </Select>
  </FormItem>
  <Button primary on:click={generateSchedules}>Generate Schedules</Button>
</details>
