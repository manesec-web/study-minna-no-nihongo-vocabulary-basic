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
    <p class="quiz-mode-hint">6 張卡片中有 1 張的讀音被改了一個假名，點出它。</p>
    <div class="oddone-grid">
      <button
        v-for="(card, at) in state.cards"
        :key="at"
        class="oddone-group"
        :class="{ 'oddone-group--hint': effect?.kind === 'index' && effect.index === at }"
        type="button"
        @click="tap(at)"
      >
        <strong>{{ card.kanji }}</strong>
        <span>{{ card.kana }}</span>
        <span>{{ card.zh }}</span>
      </button>
    </div>
  </div>
</template>
