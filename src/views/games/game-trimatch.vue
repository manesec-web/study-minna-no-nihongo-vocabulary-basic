<script setup>
import { computed, inject } from 'vue'
import { faceLabel, faceOf } from '../../study/quiz/faces.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)

function faceText(card) {
  const face = props.round.faces.find((f) => f.ref === card.ref)
  return face ? faceOf(face, card.face) : ''
}

function tap(index) {
  store.send('quiz.tap', { index })
}

function choose(index) {
  store.send('quiz.choose', { index })
}

function toggle() {
  store.send('quiz.act', { type: 'toggle' })
}
</script>

<template>
  <div class="board">
    <button class="button ghost" type="button" @click="toggle">切換玩法</button>
    <template v-if="state.variant === 'triple'">
      <p class="quiz-mode-hint">點三張同一個單詞的牌（漢字、假名、中文）來消除。</p>
      <div class="trimatch-grid">
        <button
          v-for="(card, at) in state.cards"
          :key="at"
          class="trimatch-card"
          :class="{ 'trimatch-card--selected': card.selected, 'trimatch-card--cleared': card.cleared }"
          type="button"
          :disabled="card.cleared"
          @click="tap(at)"
        >
          {{ faceText(card) }}
        </button>
      </div>
    </template>
    <template v-else>
      <p class="prompt">
        <span class="prompt-face">{{ faceLabel(state.promptFace) }}</span>
        <span class="prompt-text">{{ state.prompt }}</span>
        <span class="prompt-face">中文：{{ state.promptZh }}</span>
      </p>
      <div class="choice-grid">
        <button
          v-for="(option, at) in state.options"
          :key="at"
          class="choice"
          type="button"
          @click="choose(at)"
        >
          {{ option }}
        </button>
      </div>
    </template>
  </div>
</template>
