<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { faceOf } from '../../study/quiz/faces.js'
import { cellFontClass } from '../../study/quiz/cell-font.js'
import { connectPathPoints } from '../../study/quiz/connect-path.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const effect = computed(() => props.round.hintEffect)

const boardEl = ref(null)
const pathPoints = ref('')
const pathFading = ref(false)
const pathTick = ref(0)

function faceText(cell) {
  const word = props.round.faces?.[cell?.word]
  return word && cell ? faceOf(word, cell.face) : ''
}

function tap(index) {
  store.send('quiz.tap', { index })
}

function updatePathPoints() {
  const path = state.value?.path
  pathPoints.value = path ? connectPathPoints(boardEl.value, path) : ''
}

let observer = null
function handleResize() {
  pathTick.value += 1
}

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && boardEl.value) {
    observer = new ResizeObserver(handleResize)
    observer.observe(boardEl.value)
  } else if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize)
  }
})

watch(
  () => [state.value?.path, pathTick.value],
  () => updatePathPoints(),
  { immediate: true },
)

watch(
  () => [state.value?.locked, state.value?.path],
  () => {
    pathFading.value = false
    const current = state.value
    if (!current || !current.locked || !current.path) return
    setTimeout(() => {
      pathFading.value = true
    }, 420)
  },
)

onBeforeUnmount(() => {
  observer?.disconnect()
  if (typeof window !== 'undefined') window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="board">
    <div ref="boardEl" class="connect-board">
      <div class="connect-grid">
        <button
          v-for="(cell, at) in state.cells"
          :key="at"
          class="connect-cell"
          :class="{
            'connect-cell--selected': cell.selected,
            'connect-cell--flash': cell.flash,
            'connect-cell--hint': effect?.kind === 'pair' && (effect.a === at || effect.b === at),
            [cellFontClass(faceText(cell))]: true,
          }"
          type="button"
          :disabled="cell.cleared"
          :data-word="cell.word"
          @click="tap(at)"
        >
          <span v-if="!cell.cleared">{{ faceText(cell) }}</span>
        </button>
      </div>
      <svg
        v-if="state.path"
        class="connect-path"
        :class="{ 'connect-path--fade': pathFading }"
        aria-hidden="true"
      >
        <polyline :points="pathPoints" />
      </svg>
    </div>
  </div>
</template>
