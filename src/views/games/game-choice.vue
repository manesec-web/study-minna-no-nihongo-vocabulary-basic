<script setup>
import { computed, inject } from 'vue'
import { faceLabel } from '../../study/quiz/faces.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const effect = computed(() => props.round.hintEffect)

function choose(index) {
  store.send('quiz.choose', { index })
}
</script>

<template>
  <div class="board">
    <p class="prompt">
      <span class="prompt-face">{{ faceLabel(state.question.promptFace) }}</span>
      <span class="prompt-text">{{ state.question.prompt }}</span>
    </p>
    <div class="choice-grid">
      <button
        v-for="(choice, at) in state.question.choices"
        :key="at"
        class="choice choice--with-mark"
        :class="{
          'choice--hint': effect?.kind === 'choice' && effect.index === at,
          'choice--picked-correct': state.phase === 'correct' && state.chosenIndex === at,
          'choice--picked-wrong': state.phase === 'wrong' && state.chosenIndex === at,
        }"
        type="button"
        :disabled="state.phase !== 'ask'"
        @click="choose(at)"
      >
        <span class="choice-text">{{ choice.text }}</span>
        <span v-if="state.phase === 'correct' && state.chosenIndex === at" class="choice-mark" aria-hidden="true">✓</span>
        <span v-else-if="state.phase === 'wrong' && state.chosenIndex === at" class="choice-mark choice-mark--wrong" aria-hidden="true">✗</span>
      </button>
    </div>
  </div>
</template>
