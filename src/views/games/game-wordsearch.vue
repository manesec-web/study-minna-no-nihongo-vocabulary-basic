<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { arrowCell, lineCells, SIZE } from '../../study/quiz/games/game-wordsearch.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)

const dragStart = ref(null)
const dragCells = ref([])
const cursor = ref(0)

function tap(index) {
  store.send('quiz.tap', { index })
}

function indexFromPoint(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY)
  const cell = el?.closest?.('.wordsearch-cell')
  return cell ? Number(cell.dataset.index) : null
}

function onDocMove(event) {
  if (dragStart.value == null) return
  const index = indexFromPoint(event.clientX, event.clientY)
  if (index != null) {
    dragCells.value = lineCells(dragStart.value, index) ?? [dragStart.value]
  }
}

function onDocUp(event) {
  const index = indexFromPoint(event.clientX, event.clientY)
  if (dragStart.value != null && index != null) tap(index)
  dragStart.value = null
  dragCells.value = []
  document.removeEventListener('pointermove', onDocMove)
  document.removeEventListener('pointerup', onDocUp)
  document.removeEventListener('pointercancel', onDocUp)
}

function pointerDown(event, index) {
  event.preventDefault()
  dragStart.value = index
  dragCells.value = [index]
  tap(index)
  document.addEventListener('pointermove', onDocMove)
  document.addEventListener('pointerup', onDocUp)
  document.addEventListener('pointercancel', onDocUp)
}

function onKeydown(event) {
  if (event.key.startsWith('Arrow')) {
    event.preventDefault()
    cursor.value = arrowCell(cursor.value, event.key)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    tap(cursor.value)
  }
}

function isPreview(at) {
  return dragCells.value.includes(at)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('pointermove', onDocMove)
  document.removeEventListener('pointerup', onDocUp)
  document.removeEventListener('pointercancel', onDocUp)
})
</script>

<template>
  <div class="board" v-if="state.layout">
    <p class="quiz-mode-hint">在 7×7 盤上找出中文線索對應的假名（可直可橫）。可拖曳劃線、點起點再點終點，或方向鍵＋Enter。</p>
    <div class="wordsearch-clues">
      <span
        v-for="(word, at) in state.layout.words"
        :key="at"
        class="wordsearch-clue"
        :class="{ 'wordsearch-clue--found': state.found.includes(at) }"
        :data-kana="word.kana"
      >
        {{ word.zh }}
      </span>
    </div>
    <div class="wordsearch-grid">
      <button
        v-for="(ch, at) in state.layout.grid"
        :key="at"
        class="wordsearch-cell"
        :class="{
          'wordsearch-cell--start': state.selStart === at,
          'wordsearch-cell--preview': isPreview(at),
        }"
        type="button"
        :data-index="at"
        @pointerdown="pointerDown($event, at)"
      >
        {{ ch }}
      </button>
    </div>
  </div>
</template>
