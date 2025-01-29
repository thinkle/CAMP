<script lang="ts">
  import { Button, Bar, Progress, MiniButton } from "contain-css-svelte";

  import type { WorkerMessage } from "./../types.ts";

  export let workerIds: string[] = [];
  export let workerMessages: Record<string, WorkerMessage> = {};
  export let stopWorker: (id: string) => void;
  let hidden = new Set();
</script>

<div class="progress">
  {#each workerIds as id}
    {@const message = workerMessages[id]}
    {#if !hidden.has(id) || !message.complete}
      <Bar>
        <Progress
          state={message.complete ? "complete" : "inprogress"}
          indeterminate={!message.total}
          --progress-font-size="12px"
          --progress-height="4em"
          max={message.total}
          value={message.count}
          key={id}
        >
          {#if message.message}{message.message}
          {/if}
          {#if message.schedule}
            <b>{message.schedule.score}</b>
            ({message.schedule.alg})
            <span style="font-size:x-small"
              >{message.schedule.id.slice(0, 3)}...{message.schedule.id.slice(
                -3
              )}</span
            >
          {/if}
        </Progress>
        {#if !message.complete}
          <Button on:click={() => stopWorker(id)}>Stop</Button>
          {#if hidden.has(id)}
            <MiniButton on:click={() => hidden.delete(id)}>&plus;</MiniButton>
          {/if}
        {:else}
          <MiniButton on:click={() => hidden.add(id)}>&times;</MiniButton>
        {/if}
      </Bar>
    {/if}
  {/each}
</div>

<style>
  .progress {
    margin-bottom: 1rem;
  }
</style>
