<script lang="ts">
import SimilarityIndicator from './SimilarityIndicator.svelte';

import {
    compareSchedules,
    type Similarity
} from '../scheduler/hillclimbing/compareSchedules';

import {
    Button,
    Bar,
    Select,
    TabBar,
    TabItem,
    Progress,
    FormItem,
    MiniButton,
    Table,
    Checkbox
} from 'contain-css-svelte';

import type {
    StudentPreferences,
    Activity,
    ScheduleInfo,
    WorkerMessage
} from './../types.ts';

export let data: {
    studentPreferences: StudentPreferences[],
    activities: Activity[],
};
export let bestSchedule: ScheduleInfo;
export let schedules: ScheduleInfo[] = [];
export let scheduleView: ScheduleInfo[] = [bestSchedule, ...schedules.slice(0, 4)];
export let onEvolve: (scheduleSet) => void;
export let onImprove: (schedule) => void;
export let onWrite: (schedule) => void;

let sortMode: 'best' | 'distant' | 'random' | 'random-top' = 'best';
let sortedSchedules = [...schedules];

function shuffle(array) {
    let currentIndex = array.length,
        randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }

    return array;
}

function sortByScore(a, b) {
    return b.score - a.score;
}

$: {
    if (sortMode == 'random-top') {
        sortedSchedules = shuffle([...schedules].sort(sortByScore).slice(0, Math.floor(schedules.length / 4)));
    } else if (sortMode == 'random') {
        sortedSchedules = shuffle([...schedules]);
    } else if (sortMode == 'best') {
        sortedSchedules = [...schedules].sort(sortByScore);
    }
};

let cache = new Map();

function cachingCompare(a: ScheduleInfo, b: ScheduleInfo) {
    if (a === b) return 1;
    let key = a.id + '-' + b.id;
    if (a.id < b.id) {
        key = b.id + '-' + a.id;
    }
    if (cache.has(key)) {
        return cache.get(key);
    } else {
        let similarity = compareSchedules(a.schedule, b.schedule);
        cache.set(key, similarity);
        return similarity;
    }
}

function calculateDifferenceGrid(ss: ScheduleInfo[]): Similarity[][] {
    let grid: Similarity[][] = [];
    for (let i = 0; i < ss.length; i++) {
        grid[i] = [];
        for (let j = 0; j <= i; j++) {
            if (i === j) {
                grid[i][j] = {
                    assignmentSimilarity: 1,
                    cohortSimilarity: 1
                }; // identical schedules
            } else {
                let similarity = cachingCompare(ss[i], ss[j]);
                grid[i][j] = similarity;
                grid[j][i] = similarity; // reuse the comparison result
            }
        }
    }
    return grid;
}

let n = 5;
let page = 0;
let pages = 1;
let differenceGrid: Similarity[][] = [
    []
];
$: pages = Math.floor(sortedSchedules.length / n);
$: scheduleView = sortedSchedules.slice(page * n, (page + 1) * n);
$: differenceGrid = calculateDifferenceGrid(scheduleView);
let bestLabel = '⭐'
let labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
let checked = [];
let lastChecked = null;

function toggleSchedule(id) {
    if (checked.indexOf(id) > -1) {
        console.log('uncheck', id.substring(0, 5))
        checked = checked.filter(i => i !== id);
        lastChecked = checked[checked.length - 1];
    } else {
        console.log('check', id.substring(0, 5))
        checked = [...checked, id];
        lastChecked = id;
    }
}
</script>

{#if checked.length > 0}
<Bar>
    {checked.length} Selected
    <Button on:click={() => (checked = [])}>Clear Selection</Button>
    <Button on:click={()=>onEvolve(schedules.filter(({id})=>checked.includes(id)))}>Evolve Group</Button>
</Bar>
{#if lastChecked}
<Bar>
    <span>
        {#if scheduleView.findIndex(s => s.id === lastChecked) > -1}
        <span>
            {labels[scheduleView.findIndex(s => s.id === lastChecked)]}
        </span>
        {:else}
        <span>Last</span>
        {/if}
        ({schedules.find(({id}) => id === lastChecked).score})
    </span>
    <Button
        on:click={() => onImprove(schedules.find(({id}) => id === lastChecked))}
        >Improve</Button>
    <Button
        on:click={() => onWrite(schedules.find(({id}) => id === lastChecked))}
        >Write to Sheet</Button>
</Bar>
{/if}
{/if}
<Bar --select-width="120px">
    <Select bind:value={sortMode}>
        <option value="best">Best Schedules</option>
        <option value="random">Random</option>
        <option value="random-top">Random Top Quartile</option>
    </Select>
    <div style="display:flex;align-items:center">
        <MiniButton on:click={() => (page = 0)}>&lt;&lt;</MiniButton>
        <MiniButton on:click={() => (page = Math.max(0, page - 1))}>&lt;</MiniButton
            >
            <MiniButton on:click={() => (page = Math.min(page + 1, pages))}
                >&gt;</MiniButton
                >
                <MiniButton on:click={() => (page = pages)}>&gt;&gt;</MiniButton>
                </div>
                </Bar>
                <Table>
                    <tr>
                        <th />
                        <th>{bestLabel}</th>
                        {#each labels.slice(0, n) as label}
                        <th>{label}</th>
                        {/each}
                    </tr>
                    {#each scheduleView as schedule, i}
                    <tr>
                        <th>
                            <Checkbox checked={checked.indexOf(schedule.id)>-1} on:click={()=>toggleSchedule(schedule.id)}>
                                {labels[i]}. {schedule.score}
                            </Checkbox>
                            <br/>{schedule.alg}

                        </th>
                        <td>
                            {#if schedule == bestSchedule}
                            {bestLabel}
                            {:else}
                            <SimilarityIndicator similarity={cachingCompare(schedule,bestSchedule)} />
                            {/if}
                        </td>
                        {#each scheduleView as other, j}
                        <td>
                            {#if i === j}
                            -
                            {:else}
                            <SimilarityIndicator similarity={differenceGrid[i][j]} />
                            {/if}
                        </td>
                        {/each}
                    </tr>
                    {/each}
                </Table>

<style>
.progress {
    margin-bottom: 1rem;
}
</style>
