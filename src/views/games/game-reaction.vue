<script setup>
import { computed, inject } from 'vue'
import { faceLabel, faceOf } from '../../study/quiz/faces.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const effect = computed(() => props.round.hintEffect)

function faceText(card) {
  const word = props.round.faces?.[card?.word]
  return word && card ? faceOf(word, card.face) : ''
}

function tap(index) {
  store.send('quiz.tap', { index })
}
</script>

<template>
  <div class="board">
    <p class="prompt" :data-face="state.target.face">
      <span class="prompt-face">{{ faceLabel(state.target.face) }}</span>
      <span class="prompt-text">{{ faceOf(props.round.faces[state.target.word], state.target.face) }}</span>
    </p>
    <p class="reaction-progress">已命中 {{ state.hit }}/{{ state.total }}</p>
    <div class="reaction-grid">
      <button
        v-for="(card, at) in state.cards"
        :key="at"
        class="reaction-card"
        :class="{ 'reaction-card--flash': state.flash === at, 'reaction-card--hint': effect?.kind === 'index' && effect.index === at }"
        type="button"
        :data-word="card.word"
        :data-face="card.face"
        :data-correct="card.word === state.target.word"
        @click="tap(at)"
      >
        {{ faceText(card) }}
      </button>
    </div>
  </div>
</template>
