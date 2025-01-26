<script lang="ts">
import {
    Tooltip
} from 'contain-css-svelte';
import {
    type Similarity
} from '../scheduler/hillclimbing/compareSchedules';
export let similarity: Similarity = {
    assignmentSimilarity: 0,
    cohortSimilarity: 0
};
</script>
<Tooltip>
    <div class="similarity">
        <div class="assignment" style:--value="{similarity.assignmentSimilarity * 100}%">
        </div>
        <div class="cohort" style:--value="{similarity.cohortSimilarity * 100}%">
        </div>
    </div>
    <div slot="tooltip">
        <div>Assignment Similarity: {Math.round(similarity.assignmentSimilarity * 100)}%</div>
        <div>Cohort Similarity: {Math.round(similarity.cohortSimilarity * 100)}%</div>
        </Tooltip>

<style>
.similarity {
    width: 2em;
    height: 2em;
    background-color: var(--white);
    display: flex;
    align-items: flex-end;
    font-size: x-small;
}

.assignment {
    background-color: var(--primary-bg);
    color: var(--primary-fg);
}

.cohort {
    background-color: var(--secondary-bg);
    color: var(--secondary-fg);
}

.similarity div {
    width: 1em;
    height: var(--value);
    justify-content: center;

}
</style>
