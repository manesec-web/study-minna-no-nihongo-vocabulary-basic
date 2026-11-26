<script setup>
import { computed, inject, onBeforeUnmount, onMounted } from 'vue'
import { WORDLE_KANA } from '../../study/quiz/games/game-wordle.js'
import { attachKeyboard } from '../../study/quiz/keyboard.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)

const keys = Array.from(WORDLE_KANA)

function input(ch) {
  store.send('quiz.act', { type: 'input', value: ch })
}

function backspace() {
  store.send('quiz.act', { type: 'backspace' })
}

function submit() {
  store.send('quiz.act', { type: 'submit' })
}

function toggle() {
  store.send('quiz.act', { type: 'toggle' })
}

let detach = () => {}
onMounted(() => {
  detach = attachKeyboard({
    onChar: (ch) => {
      if (Array.from(WORDLE_KANA).includes(ch)) input(ch)
    },
    onBackspace: backspace,
    onSubmit: submit,
  })
})
onBeforeUnmount(() => detach())
</script>

<template>
  <div class="board">
    <p class="quiz-mode-hint">
      猜 {{ state.length }} 個假名。
      <template v-if="!state.hard">提示：{{ state.hint }}</template>
      <template v-else>高手模式：第 3 次送出後才顯示中文提示。</template>
    </p>
    <div class="wordle-rows">
      <div v-for="(guess, g) in state.guesses" :key="g" class="wordle-row">
        <span
          v-for="(ch, i) in Array.from(guess.text)"
          :key="i"
          class="wordle-cell"
          :class="`wordle-cell--${guess.colors[i]}`"
        >{{ ch }}</span>
      </div>
      <div class="wordle-row">
        <span
          v-for="i in state.length"
          :key="`cur-${i}`"
          class="wordle-cell"
        >{{ Array.from(state.input)[i - 1] ?? '' }}</span>
      </div>
    </div>
    <div class="wordle-toolbar">
      <button class="button ghost" type="button" @click="backspace">退格</button>
      <button class="button primary" type="button" @click="submit">送出</button>
      <button class="button ghost" type="button" @click="toggle">高手模式</button>
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
