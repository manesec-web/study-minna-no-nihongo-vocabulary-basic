<script setup>
import { computed, inject, onBeforeUnmount, onMounted } from 'vue'
import { faceOf } from '../../study/quiz/faces.js'
import { createVisibilityInterval } from '../../study/quiz/visibility-interval.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)

function meteorText() {
  const word = props.round.faces?.[state.value.meteor?.word]
  return word && state.value.meteor ? faceOf(word, state.value.meteor.face) : ''
}

function shoot(index) {
  store.send('quiz.act', { type: 'shoot', index })
}

let timer = null
function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

onMounted(() => {
  const interval = reducedMotion() ? 1400 : 700
  timer = createVisibilityInterval({
    interval,
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
    <div class="falling-lane">
      <div
        v-if="state.meteor"
        class="falling-meteor"
        :style="{ top: `${state.meteor.y}%` }"
      >
        {{ meteorText() }}
      </div>
    </div>
    <div class="falling-cannons">
      <button
        v-for="(cannon, at) in state.cannons"
        :key="at"
        class="falling-cannon"
        type="button"
        @click="shoot(at)"
      >
        {{ cannon.zh }}
      </button>
    </div>
  </div>
</template>
