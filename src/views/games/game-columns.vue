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
  <div class="board columns">
    <div class="column-list">
      <button
        v-for="(card, at) in state.left"
        :key="`left-${at}`"
        class="column-card"
        :class="{ 'column-card--selected': state.leftSelected === at, 'column-card--matched': card.matched, 'column-card--flash': card.flash }"
        type="button"
        :disabled="card.matched"
        @click="tap(at)"
      >
        {{ faceText(card) }}
      </button>
    </div>
    <div class="column-list">
      <button
        v-for="(card, at) in state.right"
        :key="`right-${at}`"
        class="column-card"
        :class="{ 'column-card--matched': card.matched, 'column-card--flash': card.flash }"
        type="button"
        :disabled="card.matched"
        @click="tap(state.left.length + at)"
      >
        {{ faceText(card) }}
      </button>
    </div>
  </div>
</template>
