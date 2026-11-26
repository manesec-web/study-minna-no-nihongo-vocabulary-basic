<script setup>
import { computed, inject } from 'vue'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)

function choose(index) {
  store.send('quiz.choose', { index })
}
</script>

<template>
  <div class="board">
    <p class="prompt">
      <span class="furigana-prompt">{{ state.prompt }}</span>
      <span class="prompt-text">{{ state.promptZh }}</span>
    </p>
    <div class="choice-grid">
      <button
        v-for="(option, at) in state.options"
        :key="at"
        class="choice"
        type="button"
        @click="choose(at)"
      >
        {{ option }}
      </button>
    </div>
  </div>
</template>
