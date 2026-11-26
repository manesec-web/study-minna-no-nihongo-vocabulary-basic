<script setup>
import { computed, inject } from 'vue'
import { faceOf } from '../../study/quiz/faces.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)

function faceText(tile) {
  const word = props.round.faces.find((f) => f.ref === tile.word)
  return word ? faceOf(word, tile.face) : ''
}

function tap(index) {
  store.send('quiz.tap', { index })
}
</script>

<template>
  <div class="board">
    <p class="quiz-mode-hint">點未被擋住的牌放入托盤，三張同詞即消除；托盤最多 7 張。</p>
    <div class="mahjong-board">
      <button
        v-for="(tile, at) in state.tiles"
        :key="at"
        class="mahjong-tile"
        :class="{
          'mahjong-tile--blocked': !tile.free && !tile.cleared,
          'mahjong-tile--cleared': tile.cleared,
          'mahjong-tile--tray': tile.inTray,
        }"
        :style="{ gridColumn: `${tile.pos + 1}`, gridRow: `${tile.layer + 1}` }"
        type="button"
        :disabled="tile.cleared || tile.inTray || !tile.free"
        @click="tap(at)"
      >
        {{ faceText(tile) }}
      </button>
    </div>
    <div class="mahjong-tray">
      <span
        v-for="(index, i) in state.tray"
        :key="i"
        class="mahjong-tray-slot"
      >
        {{ faceText(state.tiles[index]) }}
      </span>
      <span
        v-for="i in Math.max(0, 7 - state.tray.length)"
        :key="`empty-${i}`"
        class="mahjong-tray-slot mahjong-tray-slot--empty"
      ></span>
    </div>
  </div>
</template>
