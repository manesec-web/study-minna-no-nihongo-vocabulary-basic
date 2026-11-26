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

function tap(index) {
  store.send('quiz.tap', { index })
}
</script>

<template>
  <div class="board pairs-grid">
    <button
      v-for="(card, at) in state.cards"
      :key="at"
      class="pair-card"
      :class="{
        'pair-card--open': card.open || card.matched,
        'pair-card--matched': card.matched,
        'pair-card--flash': card.flash,
      }"
      type="button"
      :disabled="card.matched || card.open || state.locked"
      @click="tap(at)"
    >
      <span class="pair-card-inner">
        <span class="pair-card-face pair-card-front">?</span>
        <span class="pair-card-face pair-card-back">{{ faceText(card) }}</span>
      </span>
    </button>
  </div>
</template>
