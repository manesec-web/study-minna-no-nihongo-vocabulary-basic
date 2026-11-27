<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { faceLabel } from '../../study/quiz/faces.js'
import { attachSwipe } from '../../study/quiz/swipe-gesture.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const effect = computed(() => props.round.hintEffect)

const cardEl = ref(null)

function judge(value) {
  if (state.value.phase !== 'ask' || state.value.resolved) return
  store.send('quiz.act', { type: 'judge', value })
}

let detach = () => {}
onMounted(() => {
  detach = attachSwipe(cardEl.value, {
    onLeft: () => judge(false),
    onRight: () => judge(true),
  })
})
onBeforeUnmount(() => detach())
</script>

<template>
  <div class="board">
    <p class="quiz-mode-hint">日文和中文的配對正確嗎？⭕ 正確　❌ 錯誤</p>
    <div
      ref="cardEl"
      class="swipe-card"
      :class="{
        'swipe-card--wrong': state.phase === 'wrong',
        'swipe-card--correct': state.phase === 'correct',
      }"
    >
      <span class="prompt-face">{{ faceLabel(state.question.promptFace) }}</span>
      <span class="prompt-text">{{ state.question.japanese }}</span>
      <span class="prompt-text">{{ state.question.chinese }}</span>
    </div>
    <div class="swipe-actions">
      <button
        class="button ghost swipe-action"
        :class="{
          'swipe-action--hint': effect?.kind === 'judge' && effect.correct === false,
          'swipe-action--wrong': state.phase === 'wrong' && state.chosen === false,
        }"
        type="button"
        aria-label="錯誤配對"
        :data-correct="!state.question.isMatch"
        @click="judge(false)"
      >❌</button>
      <button
        class="button ghost swipe-action"
        :class="{
          'swipe-action--hint': effect?.kind === 'judge' && effect.correct === true,
          'swipe-action--wrong': state.phase === 'wrong' && state.chosen === true,
          'swipe-action--correct': state.phase === 'correct',
        }"
        type="button"
        aria-label="正確配對"
        :data-correct="state.question.isMatch"
        @click="judge(true)"
      >⭕</button>
    </div>
  </div>
</template>
