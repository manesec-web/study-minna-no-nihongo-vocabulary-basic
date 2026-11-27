<script setup>
import { computed, inject, onBeforeUnmount, onMounted } from 'vue'
import { faceOf } from '../../study/quiz/faces.js'
import { createVisibilityInterval } from '../../study/quiz/visibility-interval.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const effect = computed(() => props.round.hintEffect)

function holeText(hole) {
  if (!hole.visible) return ''
  const word = props.round.faces?.[hole.word]
  return word ? faceOf(word, hole.face) : ''
}

function targetText() {
  const word = props.round.faces?.[state.value.targetWord]
  return word ? faceOf(word, state.value.face) : ''
}

function tap(index) {
  store.send('quiz.tap', { index })
}

let timer = null
onMounted(() => {
  timer = createVisibilityInterval({
    interval: 1000,
    callback: () => {
      if (state.value.phase === 'play') store.send('quiz.act', { type: 'tick' })
    },
  })
})
onBeforeUnmount(() => {
  if (timer) timer.stop()
  timer = null
})
</script>

<template>
  <div class="board">
    <p class="whack-target">{{ targetText() }}</p>
    <p class="reaction-progress">剩餘 {{ state.remaining }} 秒</p>
    <div class="whack-grid">
      <button
        v-for="(hole, at) in state.holes"
        :key="at"
        class="whack-hole"
        :class="{ 'whack-hole--visible': hole.visible, 'whack-hole--hint': effect?.kind === 'index' && effect.index === at }"
        type="button"
        @click="tap(at)"
      >
        {{ holeText(hole) }}
      </button>
    </div>
  </div>
</template>
