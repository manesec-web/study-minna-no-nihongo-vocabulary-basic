<script setup>
import { computed, inject } from 'vue'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const effect = computed(() => props.round.hintEffect)

const keys = computed(() => state.value.pad ?? [])

function guess(ch) {
  store.send('quiz.act', { type: 'input', value: ch })
}
</script>

<template>
  <div class="board">
    <p class="prompt">
      <span class="prompt-text">{{ state.clue }}</span>
    </p>
    <p class="fillblank-word">
      <template v-for="(ch, at) in state.target" :key="at">
        <span>{{ state.guessed.includes(ch) ? ch : '＿' }}</span>
      </template>
    </p>
    <p class="reaction-progress">錯誤 {{ state.wrong }}/{{ state.maxWrong }}</p>
    <p v-if="effect?.kind === 'letter'" class="quiz-hint-text">提示：其中一個假名是「{{ effect.letter }}」</p>
    <div class="wordle-pad">
      <button
        v-for="ch in keys"
        :key="ch"
        class="wordle-key"
        :class="{ 'tile--used': state.guessed.includes(ch), 'wordle-key--hint': effect?.kind === 'letter' && effect.letter === ch, 'wordle-key--wrong': state.wrongAt === ch }"
        type="button"
        :disabled="state.guessed.includes(ch)"
        @click="guess(ch)"
      >
        {{ ch }}
      </button>
    </div>
  </div>
</template>
