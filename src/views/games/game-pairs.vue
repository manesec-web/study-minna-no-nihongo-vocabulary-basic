<script setup>
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { faceOf } from '../../study/quiz/faces.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const effect = computed(() => props.round.hintEffect)

const dealStage = ref('up') // 'up' → 'down' → 'play'

function faceText(card) {
  const word = props.round.faces?.[card?.word]
  return word && card ? faceOf(word, card.face) : ''
}

// The opening peek is rule-significant: the 3s bar must finish before play.
// The flip-down wave is decorative, so taps stay ignored until it completes.
function tap(index) {
  if (state.value?.locked || dealStage.value !== 'play') return
  store.send('quiz.tap', { index })
}

// Stagger the deal/reveal: a left-to-right, top-to-bottom wave up, then a
// reverse wave as the whole table flips back face-down.
function flipDelay(at) {
  const n = state.value?.cards?.length ?? 0
  if (dealStage.value === 'up') return `${at * 18}ms`
  if (dealStage.value === 'down') return `${(n - 1 - at) * 18}ms`
  return '0ms'
}

let downTimer = null
watch(
  () => state.value?.peek,
  (peek) => {
    if (downTimer) {
      clearTimeout(downTimer)
      downTimer = null
    }
    if (peek) {
      dealStage.value = 'up'
    } else {
      dealStage.value = 'down'
      downTimer = setTimeout(() => {
        dealStage.value = 'play'
      }, 760)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (downTimer) clearTimeout(downTimer)
})
</script>

<template>
  <div class="board">
    <div v-if="state.peek" class="pairs-peek" role="timer" aria-label="翻牌預覽倒數">
      <div class="pairs-peek-fill"></div>
    </div>
    <div class="pairs-grid">
      <button
        v-for="(card, at) in state.cards"
        :key="at"
        class="pair-card"
        :class="{
          'pair-card--open': card.open || card.matched,
          'pair-card--matched': card.matched,
          'pair-card--flash': card.flash,
          'pair-card--hint': effect?.kind === 'pair' && (effect.a === at || effect.b === at),
          'pair-card--deal-up': state.peek && dealStage === 'up',
          'pair-card--deal-down': !state.peek && dealStage === 'down',
        }"
        :style="{ '--flip-delay': flipDelay(at) }"
        type="button"
        :disabled="card.matched || card.open || state.locked || dealStage !== 'play'"
        @click="tap(at)"
      >
        <span class="pair-card-inner">
          <span class="pair-card-face pair-card-front">?</span>
          <span class="pair-card-face pair-card-back">{{ faceText(card) }}</span>
        </span>
      </button>
    </div>
  </div>
</template>
