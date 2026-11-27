<script setup>
import { computed, inject } from 'vue'
import { faceOf } from '../../study/quiz/faces.js'
import { boardRatio, tileRect } from '../../study/quiz/games/game-mahjong.js'

const store = inject('store')
const props = defineProps({ round: { type: Object, required: true } })
const state = computed(() => props.round.state)
const board = computed(() => state.value?.board)
const effect = computed(() => props.round.hintEffect)
// The pile box's height as a percentage of its width (padding-top), so the
// box never depends on aspect-ratio support.
const ratio = computed(() => (board.value ? boardRatio(state.value) : 100))

const TRAY_MAX = 7
// The tray row and caption take about this share of the frame's inner width.
// With the board ratio it sizes the frame so the whole box fits a short
// window (never narrower than 320px); browsers without dvh keep full width.
const TRAY_SHARE = 0.15
const frameMax = computed(
  () =>
    `max(320px, min(100%, calc((100dvh - 17.5rem) / ${(ratio.value / 100 + TRAY_SHARE).toFixed(3)} + 28px)))`,
)

function faceText(tile) {
  const word = props.round.faces.find((f) => f.ref === tile.word)
  return word ? faceOf(word, tile.face) : ''
}

// Only the tiles still on the pile are rendered; a tile in the tray or a
// cleared triple leaves it, so the tiles it covered are uncovered below. Each
// tile is placed by percentage of the pile box (game-mahjong.js owns the
// geometry), so the pile scales with the frame.
const boardTiles = computed(() =>
  (state.value?.tiles ?? [])
    .map((tile, index) => ({ tile, index, rect: tileRect(state.value, tile) }))
    .filter((entry) => !entry.tile.cleared && !entry.tile.inTray),
)

// Seven fixed slots, filled from the left in tray order; the rest stay empty.
const traySlots = computed(() => {
  const tray = state.value?.tray ?? []
  return Array.from({ length: TRAY_MAX }, (_v, at) => {
    const index = tray[at]
    return index == null ? null : { index, text: faceText(state.value.tiles[index]) }
  })
})

function trayCount() {
  return state.value?.tray.length ?? 0
}

function pct(value) {
  return `${value}%`
}

function tap(index) {
  store.send('quiz.tap', { index })
}
</script>

<template>
  <div class="board">
    <p class="quiz-mode-hint">點未被擋住的牌放入托盤，三張同詞即消除；托盤最多 7 張。</p>
    <div class="mahjong-frame" :style="{ maxWidth: frameMax }">
      <div class="mahjong-board" :style="{ paddingTop: pct(ratio) }">
        <button
          v-for="entry in boardTiles"
          :key="entry.index"
          class="mahjong-tile"
          :class="[
            `mahjong-tile--layer-${entry.tile.layer}`,
            {
              'mahjong-tile--blocked': !entry.tile.free,
              'mahjong-tile--hint': effect?.kind === 'index' && effect.index === entry.index,
            },
          ]"
          :style="{
            left: pct(entry.rect.left),
            top: pct(entry.rect.top),
            width: pct(entry.rect.width),
            height: pct(entry.rect.height),
            zIndex: entry.tile.layer,
          }"
          type="button"
          :disabled="!entry.tile.free"
          @click="tap(entry.index)"
        >
          <span class="mahjong-tile-text">{{ faceText(entry.tile) }}</span>
        </button>
      </div>
      <p class="mahjong-tray-label">托盤 {{ trayCount() }} / {{ TRAY_MAX }}</p>
      <div class="mahjong-tray" role="group" :aria-label="`托盤 ${trayCount()} / ${TRAY_MAX}`">
        <span
          v-for="(slot, at) in traySlots"
          :key="at"
          class="mahjong-tray-slot"
          :class="{ 'mahjong-tray-slot--empty': !slot }"
        >
          <span class="mahjong-tray-face">
            <span v-if="slot" class="mahjong-tile-text">{{ slot.text }}</span>
          </span>
        </span>
      </div>
    </div>
  </div>
</template>
