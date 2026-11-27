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
        class="choice"
        :class="{ 'choice--hint': effect?.kind === 'choice' && effect.index === at }"
        type="button"
        @click="choose(at)"
      >
        {{ choice.text }}
      </button>
    </div>
  </div>
</template>
