<script setup>
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { faceOf } from '../../study/quiz/faces.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const phase = computed(() => state.value?.phase)
const effect = computed(() => props.round.hintEffect)

// How many of the three slots have been dealt during the `reveal` phase. The
// pile tap is the one user gesture; everything after it is timed in the view
// (timeouts) and dispatched back into the engine (`quiz.next` / `quiz.confirm`).
const dealtCount = ref(0)
const placedCount = computed(
  () => state.value?.slots?.filter((slot) => slot.placed >= 0).length ?? 0,
)

let timers = []

function faceText(slot) {
  const word = props.round.faces?.[slot?.word]
  return word && slot ? faceOf(word, slot.face) : ''
}

function correctText(slot) {
  const word = props.round.faces?.[slot?.word]
  return word && slot ? faceOf(word, 'zh') : ''
}

function placedText(slot) {
  if (!slot || slot.placed < 0) return ''
  return state.value?.choices?.[slot.placed]?.text ?? ''
}

function wordVisible(at) {
  const p = phase.value
  if (p === 'countdown') return true
  if (p === 'deal') return dealtCount.value > at
  return false
}

function tapPile() {
  store.send('quiz.tap', { index: 0 })
}

function choose(index) {
  store.send('quiz.choose', { index })
}

function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
}

watch(
  phase,
  (p) => {
    clearTimers()
    dealtCount.value = 0
    if (p === 'deal') {
      // Deal card 1 immediately, then 2 and 3 with a stagger, then hand back to
      // the engine for the 2s countdown.
      dealtCount.value = 1
      timers.push(setTimeout(() => (dealtCount.value = 2), 460))
      timers.push(setTimeout(() => (dealtCount.value = 3), 920))
      timers.push(setTimeout(() => store.send('quiz.next'), 1280))
    } else if (p === 'countdown') {
      // Rule-significant 2s: keep the three words readable, then show the
      // choices (which starts the quiz clock).
      timers.push(setTimeout(() => store.send('quiz.next'), 2000))
    } else if (p === 'check') {
      // Hold the flip long enough to read, then advance or retry the group.
      const allCorrect = state.value?.slots?.every((slot) => slot.correct)
      timers.push(setTimeout(() => store.send('quiz.confirm'), allCorrect ? 1300 : 2000))
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => clearTimers())
</script>

<template>
  <div class="board">
    <p class="memory-status">
      <template v-if="phase === 'stack'">點一下牌堆，翻開三張單詞</template>
      <template v-else-if="phase === 'deal'">記住翻開的單詞</template>
      <template v-else-if="phase === 'countdown'">記住這三個單詞</template>
      <template v-else-if="phase === 'ask'">依序選出三個中文（{{ placedCount }}/3）</template>
      <template v-else-if="phase === 'check'">檢查答案</template>
    </p>

    <div class="memory-slots">
      <div
        v-for="(slot, at) in state.slots"
        :key="at"
        class="memory-slot"
        :class="{
          'memory-slot--deal': phase === 'deal' && dealtCount > at,
          'memory-slot--empty': phase === 'ask' && slot.placed < 0,
          'memory-slot--filled': phase === 'ask' && slot.placed >= 0,
          'memory-slot--checked': phase === 'check',
          'memory-slot--correct': phase === 'check' && slot.correct,
          'memory-slot--wrong': phase === 'check' && !slot.correct,
        }"
      >
        <span class="memory-slot-inner">
          <span class="memory-slot-face memory-slot-front">
            <template v-if="wordVisible(at)">{{ faceText(slot) }}</template>
            <template v-else-if="phase === 'ask' && slot.placed >= 0">{{ placedText(slot) }}</template>
          </span>
          <span class="memory-slot-face memory-slot-back">
            <template v-if="phase === 'check'">
              <span class="memory-slot-verdict">{{ slot.correct ? '✓' : '✗' }}</span>
              <span v-if="!slot.correct" class="memory-slot-answer">{{ correctText(slot) }}</span>
            </template>
          </span>
        </span>
      </div>
    </div>

    <button
      v-if="phase === 'stack'"
      class="memory-pile"
      type="button"
      aria-label="翻開三張單詞"
      @click="tapPile"
    >
      <span class="memory-pile-stack" aria-hidden="true">
        <span v-for="n in 3" :key="n" class="memory-pile-card"></span>
      </span>
      <span class="memory-pile-hint">點一下翻開</span>
    </button>

    <div
      v-else-if="phase === 'countdown'"
      class="memory-countdown"
      role="timer"
      aria-label="記憶倒數"
    >
      <div class="memory-countdown-fill"></div>
    </div>

    <div v-else-if="phase === 'ask'" class="choice-grid memory-options">
      <button
        v-for="(choice, at) in state.choices"
        :key="at"
        class="choice"
        :class="{ 'memory-option--used': choice.used, 'choice--hint': effect?.kind === 'choice' && effect.index === at }"
        type="button"
        :disabled="choice.used"
        @click="choose(at)"
      >
        {{ choice.text }}
      </button>
    </div>
  </div>
</template>
