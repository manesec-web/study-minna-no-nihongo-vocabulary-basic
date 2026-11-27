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
    <p class="prompt">
      <span class="prompt-text">{{ state.prompt }}</span>
    </p>
    <div class="placed-row">
      <button
        v-for="(ch, at) in state.target"
        :key="`placed-${at}`"
        class="placed-slot"
        type="button"
        :aria-label="state.placed[at] ? `取回 ${state.placed[at].ch}` : `空位 ${at + 1}`"
        @click="tap(state.tiles.length + at)"
      >
        {{ state.placed[at]?.ch ?? '' }}
      </button>
    </div>
    <div class="tile-row">
      <button
        v-for="(tile, at) in state.tiles"
        :key="`tile-${tile.id}`"
        class="tile"
        :class="{ 'tile--hint': effect?.kind === 'tile' && effect.index === at }"
        type="button"
        :disabled="tile.used"
        @click="tap(at)"
      >
        {{ tile.ch }}
      </button>
    </div>
  </div>
</template>
