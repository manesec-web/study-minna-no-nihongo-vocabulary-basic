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
    <div class="hp-row">
      <div class="hp-track">
        <div class="hp-fill" :style="{ width: `${(state.hp / state.maxHp) * 100}%` }"></div>
      </div>
      <span class="hp-text">{{ state.hp }}/{{ state.maxHp }}</span>
    </div>
    <span v-if="state.modifier === 'short'" class="modifier">短時</span>
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
        :data-correct="choice.correct"
        @click="choose(at)"
      >
        {{ choice.text }}
      </button>
    </div>
  </div>
</template>
