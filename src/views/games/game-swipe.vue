<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { faceLabel } from '../../study/quiz/faces.js'
import { attachSwipe } from '../../study/quiz/swipe-gesture.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)

const cardEl = ref(null)

function judge(value) {
  if (state.value.phase !== 'ask' || state.value.resolved) return
  store.send('quiz.act', { type: 'judge', value })
}

let detach = () => {}
onMounted(() => {
  detach = attachSwipe(cardEl.value, {
    onLeft: () => judge(false),
    onRight: () => judge(true),
  })
})
onBeforeUnmount(() => detach())
</script>

<template>
  <div class="board">
    <div ref="cardEl" class="swipe-card">
      <span class="prompt-face">{{ faceLabel(state.question.promptFace) }}</span>
      <span class="prompt-text">{{ state.question.japanese }}</span>
      <span class="prompt-text">{{ state.question.chinese }}</span>
    </div>
    <div class="swipe-actions">
      <button class="button ghost" type="button" @click="judge(false)">錯誤配對</button>
      <button class="button primary" type="button" @click="judge(true)">正確配對</button>
    </div>
  </div>
</template>
