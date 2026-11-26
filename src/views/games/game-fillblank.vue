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
      <span class="prompt-text">{{ state.prompt }}</span>
    </p>
    <p class="fillblank-word">
      <template v-for="(ch, at) in state.chars" :key="at">
        <span v-if="at === state.blankAt" class="card-back">＿</span>
        <span v-else>{{ ch }}</span>
      </template>
    </p>
    <div class="fillblank-options">
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
