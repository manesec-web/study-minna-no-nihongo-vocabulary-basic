<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { attachDirectionInput } from '../../study/quiz/direction-input.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const boardEl = ref(null)

const SIZE = 8

function currentWord() {
  return state.value.queue[state.value.position]
}

function dir(value) {
  store.send('quiz.act', { type: 'dir', value })
}

let timer = null
let detachInput = () => {}
onMounted(() => {
  timer = setInterval(() => {
    if (state.value.phase === 'play') store.send('quiz.act', { type: 'tick' })
  }, 420)
  detachInput = attachDirectionInput(boardEl.value, (value) => dir(value))
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  timer = null
  detachInput()
})
</script>

<template>
  <div class="board">
    <p class="prompt">
      <span class="prompt-text">{{ currentWord().zh }}</span>
    </p>
    <div ref="boardEl" class="snake-grid">
      <div
        v-for="(cell, at) in state.grid"
        :key="at"
        class="snake-cell"
        :class="{
          'snake-cell--head': state.snake[0] === at,
          'snake-cell--body': state.snake.includes(at) && state.snake[0] !== at,
          'snake-cell--food': at === state.foodAt,
        }"
      >
        {{ cell ? cell.char : '' }}
      </div>
    </div>
    <div class="snake-pad">
      <span></span>
      <button class="button ghost" type="button" @click="dir('up')">↑</button>
      <span></span>
      <button class="button ghost" type="button" @click="dir('left')">←</button>
      <span></span>
      <button class="button ghost" type="button" @click="dir('right')">→</button>
      <span></span>
      <button class="button ghost" type="button" @click="dir('down')">↓</button>
      <span></span>
    </div>
  </div>
</template>
