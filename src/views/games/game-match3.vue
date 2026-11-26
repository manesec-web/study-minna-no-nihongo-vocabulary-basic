<script setup>
import { computed, inject } from 'vue'
import { faceOf } from '../../study/quiz/faces.js'
import { cellFontClass } from '../../study/quiz/cell-font.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)

function faceText(cell) {
  const word = props.round.faces?.[cell?.word]
  return word && cell ? faceOf(word, cell.face) : ''
}

function tap(index) {
  store.send('quiz.tap', { index })
}

function endRound() {
  store.send('quiz.end')
}
</script>

<template>
  <div class="board">
    <p class="quiz-mode-hint">點相鄰的 3 張或以上同一單詞即可消除（日文、中文、假名都算同一詞）</p>
    <div class="match3-grid">
      <button
        v-for="(cell, at) in state.cells"
        :key="at"
        class="match3-cell"
        :class="{ 'match3-cell--selected': cell.selected, [cellFontClass(faceText(cell))]: true }"
        type="button"
        :disabled="cell.cleared"
        :data-word="cell.word"
        @click="tap(at)"
      >
        <span v-if="!cell.cleared">{{ faceText(cell) }}</span>
      </button>
    </div>
    <button class="button ghost quiz-end" type="button" @click="endRound">結束本模式</button>
  </div>
</template>
