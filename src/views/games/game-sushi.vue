<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)

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

const boardEl = ref(null)
const composing = ref(false)

function input(event) {
  store.send('quiz.act', { type: 'input', value: event.target.value })
}

function submit() {
  if (composing.value) return
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
    <input
      class="sushi-input"
      type="text"
      :value="state.typed"
      placeholder="輸入平假名（可直接用日文 IME）"
      @input="input"
      @compositionstart="composing = true"
      @compositionend="composing = false"
      @keydown.enter="submit"
    />
    <button class="button primary" type="button" :disabled="composing" @click="submit">送出</button>
    <p class="reaction-progress">已吃完 {{ state.hit }}/{{ state.queue.length }}</p>
  </div>
</template>
