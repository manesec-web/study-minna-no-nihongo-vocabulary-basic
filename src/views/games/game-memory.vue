<script setup>
import { computed, inject } from 'vue'
import { faceOf } from '../../study/quiz/faces.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)

function faceText(card) {
  const word = props.round.faces?.[card?.word]
  return word && card ? faceOf(word, card.face) : ''
}

function choose(index) {
  store.send('quiz.choose', { index })
}

function next() {
  store.send('quiz.next')
}
</script>

<template>
  <div class="board">
    <p class="memory-status">
      <template v-if="state.phase === 'show'">記住這 {{ state.cards.length }} 張卡片</template>
      <template v-else-if="state.phase === 'ask'">點選對應的中文（{{ state.solvedCount }}/{{ state.target }}）</template>
      <template v-else-if="state.phase === 'reveal'">再試一次</template>
    </p>
    <div class="memory-grid">
      <button
        v-for="(card, at) in state.cards"
        :key="at"
        class="memory-card"
        :class="{ 'memory-card--hidden': state.phase !== 'show' }"
        type="button"
      >
        <span v-if="state.phase === 'show'">{{ faceText(card) }}</span>
        <span v-else class="card-back">?</span>
      </button>
    </div>
    <button
      v-if="state.phase === 'show'"
      class="button primary quiz-begin"
      type="button"
      @click="next"
    >
      記住了
    </button>
    <div v-else-if="state.phase === 'ask' || state.phase === 'reveal'" class="choice-grid memory-options">
      <button
        v-for="(choice, at) in state.choices"
        :key="at"
        class="choice"
        :class="{ 'memory-option--solved': choice.solved }"
        type="button"
        :disabled="choice.solved || state.phase === 'reveal'"
        @click="choose(at)"
      >
        {{ choice.text }}
      </button>
    </div>
  </div>
</template>
