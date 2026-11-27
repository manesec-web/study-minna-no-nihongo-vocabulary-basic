<script setup>
import { computed, inject } from 'vue'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const effect = computed(() => props.round.hintEffect)

function tap(index) {
  store.send('quiz.tap', { index })
}
</script>

<template>
  <div class="board">
    <p class="quiz-mode-hint">4 組配對中有 1 組配錯，點出那一組。</p>
    <div class="oddone-grid">
      <button
        v-for="(group, at) in state.groups"
        :key="at"
        class="oddone-group"
        :class="{ 'oddone-group--hint': effect?.kind === 'index' && effect.index === at }"
        type="button"
        @click="tap(at)"
      >
        <strong>{{ group.japanese }}</strong>
        <span>{{ group.chinese }}</span>
      </button>
    </div>
  </div>
</template>
