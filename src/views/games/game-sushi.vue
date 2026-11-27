<script setup>
import { computed, inject, onBeforeUnmount, onMounted } from 'vue'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const effect = computed(() => props.round.hintEffect)

function plate() {
  const word = props.round.faces?.find((f) => f.ref === state.value.queue[state.value.position]?.ref)
  return word
}

function plateKanji() {
  return plate()?.kanji ?? ''
}

function plateZh() {
  return plate()?.zh ?? ''
}

function press(ch) {
  store.send('quiz.act', { type: 'input', value: ch })
}

function backspace() {
  store.send('quiz.act', { type: 'backspace' })
}

function submit() {
  store.send('quiz.act', { type: 'submit' })
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
  const interval = reducedMotion() ? 1400 : 900
  timer = setInterval(() => {
    if (state.value.phase === 'play') store.send('quiz.act', { type: 'tick' })
  }, interval)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  timer = null
})
</script>

<template>
  <div class="board">
    <div class="sushi-lane">
      <div class="sushi-plate" :style="{ left: `${(1 - state.x / 20) * 100}%` }">
        <strong>{{ plateKanji() }}</strong>
        <span>{{ plateZh() }}</span>
      </div>
    </div>
    <p v-if="effect?.kind === 'reading'" class="quiz-hint-text">提示：讀音是「{{ effect.reading }}」</p>
    <div class="sushi-typed">{{ state.typed }}</div>
    <div class="sushi-pad">
      <button
        v-for="(ch, at) in state.pad"
        :key="at"
        class="sushi-key"
        type="button"
        @click="press(ch)"
      >
        {{ ch }}
      </button>
    </div>
    <div class="wordle-toolbar">
      <button class="button ghost" type="button" @click="backspace">退格</button>
      <button class="button primary" type="button" @click="submit">送出</button>
    </div>
    <p class="reaction-progress">已吃完 {{ state.hit }}/{{ state.queue.length }}</p>
  </div>
</template>