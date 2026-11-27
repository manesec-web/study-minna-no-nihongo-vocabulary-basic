<script setup>
import { computed, inject } from 'vue'
import { CROSSWORD_KANA } from '../../study/quiz/games/game-crossword.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const effect = computed(() => props.round.hintEffect)

const keys = Array.from(CROSSWORD_KANA)

function hintedCell(row, col) {
  const e = effect.value
  return e?.kind === 'cells' && Array.isArray(e.cells) &&
    e.cells.some((cell) => cell.row === row && cell.col === col)
}

function tap(row, col) {
  store.send('quiz.act', { type: 'tap', value: { row, col } })
}

function input(ch) {
  store.send('quiz.act', { type: 'input', value: ch })
}

function backspace() {
  store.send('quiz.act', { type: 'backspace' })
}

function check() {
  store.send('quiz.act', { type: 'check' })
}

function hintText() {
  const sel = state.value.selected
  if (!sel || !state.value.layout) return '點擊格子查看中文提示'
  const cell = state.value.layout.cells[sel.row][sel.col]
  if (!cell || !cell.words.length) return '點擊格子查看中文提示'
  return cell.words.map((w) => state.value.layout.words[w].zh).join(' / ')
}
</script>

<template>
  <div class="board" v-if="state.layout">
    <p class="crossword-hint">{{ hintText() }}</p>
    <div
      class="crossword-grid"
      :style="{ gridTemplateColumns: `repeat(${state.layout.cells[0].length}, 1fr)` }"
    >
      <template v-for="(row, r) in state.layout.cells" :key="r">
        <button
          v-for="(cell, c) in row"
          :key="c"
          class="crossword-cell"
          :class="{
            'crossword-cell--empty': !cell.char,
            'crossword-cell--selected': state.selected && state.selected.row === r && state.selected.col === c,
            'crossword-cell--correct': cell.correct,
            'crossword-cell--hint': hintedCell(r, c),
          }"
          type="button"
          :disabled="!cell.char"
          @click="tap(r, c)"
        >
          {{ cell.filled ?? '' }}
        </button>
      </template>
    </div>
    <div class="wordle-toolbar">
      <button class="button ghost" type="button" @click="backspace">退格</button>
      <button class="button primary" type="button" @click="check">檢查完成</button>
    </div>
    <div class="wordle-pad">
      <button
        v-for="ch in keys"
        :key="ch"
        class="wordle-key"
        type="button"
        @click="input(ch)"
      >
        {{ ch }}
      </button>
    </div>
  </div>
</template>
