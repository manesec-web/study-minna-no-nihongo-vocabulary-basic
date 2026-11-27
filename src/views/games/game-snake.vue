<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { attachDirectionInput } from '../../study/quiz/direction-input.js'
import { COLS, ROWS } from '../../study/quiz/games/game-snake.js'
import { createRespawnTimers } from '../../study/quiz/respawn-timer.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const effect = computed(() => props.round.hintEffect)
const boardEl = ref(null)

// Presentation timing only: the tick cadence and the 1s wait before a wrong
// kana is re-placed. Both rules live in game-snake.js; this file only times
// the dispatches.
const TICK_MS = 400

function currentWord() {
  return state.value.queue[state.value.position]
}

// The kana eaten so far of the current word, then one underline per kana left.
const progress = computed(() => {
  const chars = Array.from(currentWord().kana)
  return chars.map((ch, at) => (at < state.value.targetIndex ? ch : '＿')).join('')
})

function dir(value) {
  store.send('quiz.act', { type: 'dir', value })
}

let timer = null
let detachInput = () => {}
let respawns = null
onMounted(() => {
  timer = setInterval(() => {
    if (state.value.phase !== 'play') return
    const result = store.send('quiz.act', { type: 'tick' })
    if (result?.ok && result.result?.event?.respawn) respawns.schedule()
  }, TICK_MS)
  detachInput = attachDirectionInput(boardEl.value, (value) => dir(value))
  respawns = createRespawnTimers({ send: (id, params) => store.send(id, params) })
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  timer = null
  detachInput()
  if (respawns) respawns.cancel()
  respawns = null
})
</script>

<template>
  <div class="board">
    <p class="prompt">
      <span class="prompt-text">{{ currentWord().zh }}</span>
    </p>
    <p class="quiz-mode-hint">依順序吃出讀音：{{ progress }}</p>
    <div
      ref="boardEl"
      class="snake-grid"
      :style="{ '--snake-cols': COLS, '--snake-rows': ROWS }"
    >
      <div
        v-for="(cell, at) in state.grid"
        :key="at"
        class="snake-cell"
        :class="{
          'snake-cell--empty': !cell,
          'snake-cell--kana': cell,
          'snake-cell--head': state.snake[0] === at,
          'snake-cell--body': state.snake.includes(at) && state.snake[0] !== at,
          'snake-cell--food': at === state.foodAt,
          'snake-cell--hint': effect?.kind === 'index' && effect.index === at,
        }"
      >
        {{ cell ? cell.char : '' }}
      </div>
    </div>
    <div class="snake-pad">
      <span></span>
      <button class="button ghost" type="button" aria-label="上" @click="dir('up')">↑</button>
      <span></span>
      <button class="button ghost" type="button" aria-label="左" @click="dir('left')">←</button>
      <span></span>
      <button class="button ghost" type="button" aria-label="右" @click="dir('right')">→</button>
      <span></span>
      <button class="button ghost" type="button" aria-label="下" @click="dir('down')">↓</button>
      <span></span>
    </div>
  </div>
</template>
