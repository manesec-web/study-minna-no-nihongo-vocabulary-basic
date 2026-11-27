<script setup>
import { computed, inject } from 'vue'
import { faceOf } from '../../study/quiz/faces.js'
import { cellFontClass } from '../../study/quiz/cell-font.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const effect = computed(() => props.round.hintEffect)

function faceText(cell) {
  const word = props.round.faces?.[cell?.word]
  return word && cell ? faceOf(word, cell.face) : ''
}

function tap(index) {
  if (state.value?.locked) return
  store.send('quiz.tap', { index })
}
</script>

<template>
  <div class="board">
    <p class="quiz-mode-hint">
      點相鄰的 3 張或以上同一單詞即可消除（日文、中文、假名都算同一詞）；消除 10 組完成本回合
    </p>
    <div class="match3-grid">
      <button
        v-for="(cell, at) in state.cells"
        :key="cell.key"
        class="match3-cell"
        :class="{
          'match3-cell--selected': cell.selected,
          'match3-cell--hint': effect?.kind === 'cells' && effect.cells.includes(at),
          'match3-cell--clearing': state.phase === 'clear' && state.pending.includes(at),
          'match3-cell--drop': cell.fresh,
          [cellFontClass(faceText(cell))]: true,
        }"
        :style="{ '--drop-delay': (at % 5) * 45 + 'ms' }"
        type="button"
        :disabled="cell.cleared"
        :data-word="cell.word"
        @click="tap(at)"
      >
        <span v-if="!cell.cleared">{{ faceText(cell) }}</span>
      </button>
    </div>
  </div>
</template>