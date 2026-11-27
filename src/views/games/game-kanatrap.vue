<script setup>
import { computed, inject } from 'vue'

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
    <p class="quiz-mode-hint">第 {{ state.index + 1 }} / {{ state.total }} 題：選出正確讀音</p>
    <p class="prompt">
      <span class="furigana-prompt">{{ state.prompt }}</span>
    </p>
    <div class="choice-grid">
      <button
        v-for="(option, at) in state.options"
        :key="at"
        class="choice"
        :class="{ 'choice--hint': effect?.kind === 'choice' && effect.index === at }"
        type="button"
        @click="choose(at)"
      >
        {{ option }}
      </button>
    </div>
  </div>
</template>
