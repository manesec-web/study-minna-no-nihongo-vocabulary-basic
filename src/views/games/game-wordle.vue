<script setup>
import { computed, inject, onBeforeUnmount, onMounted } from 'vue'
import { attachKeyboard } from '../../study/quiz/keyboard.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const effect = computed(() => props.round.hintEffect)

const keys = computed(() => state.value.pad ?? [])

function input(ch) {
  store.send('quiz.act', { type: 'input', value: ch })
}

function backspace() {
  store.send('quiz.act', { type: 'backspace' })
}

function submit() {
  store.send('quiz.act', { type: 'submit' })
}

let detach = () => {}
onMounted(() => {
  detach = attachKeyboard({
    onChar: (ch) => {
      if (keys.value.includes(ch)) input(ch)
    },
    onBackspace: backspace,
    onSubmit: submit,
  })
})
onBeforeUnmount(() => detach())
</script>

<template>
  <div class="board">
    <p class="quiz-mode-hint">猜 {{ state.length }} 個假名，最多 {{ state.maxGuesses }} 次。</p>
    <p v-if="effect?.kind === 'letter'" class="quiz-hint-text">提示：第一個假名是「{{ effect.letter }}」</p>
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
    </div>
    <div class="wordle-pad">
      <button
        v-for="ch in keys"
        :key="ch"
        class="wordle-key"
        :class="{ 'wordle-key--hint': effect?.kind === 'letter' && effect.letter === ch }"
        type="button"
        @click="input(ch)"
      >
        {{ ch }}
      </button>
    </div>
  </div>
</template>
