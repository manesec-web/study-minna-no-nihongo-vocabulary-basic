<script setup>
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import { MODE_LABELS } from '../study/quiz/modes.js'
import { playDrawCard } from '../study/quiz/draw-animation.js'
import { GAME_COMPONENTS } from './games/index.js'

const store = inject('store')
const session = store.session

const run = computed(() => session.quiz?.run ?? null)
const round = computed(() => run.value?.round ?? null)
const phase = computed(() => run.value?.phase ?? 'idle')
const state = computed(() => round.value?.state ?? null)
const gameComponent = computed(() => (round.value ? GAME_COMPONENTS[round.value.mode] ?? null : null))

const score = computed(() => run.value?.score ?? 0)
const livesText = computed(() => (run.value?.lives === null ? '∞' : String(run.value.lives)))
const modeLabel = computed(() => (round.value ? MODE_LABELS[round.value.mode] ?? round.value.mode : ''))
const lastHistory = computed(() => {
  const history = run.value?.history ?? []
  return history[history.length - 1] ?? null
})

function back() {
  store.send('nav.go', { screen: 'home' })
}

// The 3×3 draw reveal is presentational. `draw` runs the full animation and
// only dispatches `quiz.tap` from the onComplete callback.
const boardEl = ref(null)
const drawBusy = ref(false)
let drawCancelled = false

function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function modeLabelFor(mode) {
  return MODE_LABELS[mode] ?? mode
}

async function draw(index, event) {
  if (drawBusy.value) return
  const cardEl = event?.currentTarget
  if (!cardEl || !boardEl.value) return
  const mode = run.value?.draw?.cards?.[index]
  if (!mode) return

  drawBusy.value = true
  drawCancelled = false
  try {
    await playDrawCard({
      board: boardEl.value,
      card: cardEl,
      container: document.body,
      modeLabel: modeLabelFor(mode),
      reducedMotion: reducedMotion(),
      shouldCancel: () => drawCancelled,
      onComplete: () => store.send('quiz.tap', { index }),
    })
  } finally {
    drawBusy.value = false
  }
}

function confirm() {
  store.send('quiz.confirm')
}

function nextRound() {
  store.send('quiz.nextRound')
}

// The countdown is owned here as presentation: the view runs a timeout for the
// active clock and calls quiz.timeout.
let clockTimer = null
function clearClockTimer() {
  if (clockTimer) {
    clearTimeout(clockTimer)
    clockTimer = null
  }
}

watch(
  () => [run.value?.phase, round.value?.clock?.key, round.value?.clock?.active, round.value?.clock?.seconds],
  () => {
    clearClockTimer()
    const clock = round.value?.clock
    if (run.value?.phase === 'round' && clock?.active && clock.seconds > 0) {
      clockTimer = setTimeout(() => store.send('quiz.timeout'), clock.seconds * 1000)
    }
  },
  { immediate: true },
)

// A correct answer in the question modes pauses briefly, then advances.
let advanceTimer = null
function clearAdvanceTimer() {
  if (advanceTimer) {
    clearTimeout(advanceTimer)
    advanceTimer = null
  }
}

watch(
  () => [round.value?.mode, round.value?.state?.phase],
  () => {
    clearAdvanceTimer()
    const current = round.value?.state?.phase
    if (current === 'correct') {
      const delay = round.value?.mode === 'spell' ? 800 : 1000
      advanceTimer = setTimeout(() => store.send('quiz.next'), delay)
    }
  },
)

// Pairs mismatches and connect matches lock the board; the view waits and then
// dispatches quiz.resolve.
let resolveTimer = null
function clearResolveTimer() {
  if (resolveTimer) {
    clearTimeout(resolveTimer)
    resolveTimer = null
  }
}

watch(
  () => [round.value?.mode, round.value?.state?.locked, round.value?.state?.path],
  () => {
    clearResolveTimer()
    const current = round.value?.state
    if (!current) return
    if (round.value?.mode === 'pairs' && current.locked) {
      resolveTimer = setTimeout(() => store.send('quiz.resolve'), 1000)
    } else if (round.value?.mode === 'connect' && current.locked && current.path) {
      resolveTimer = setTimeout(() => store.send('quiz.resolve'), 720)
    }
  },
  { immediate: true },
)

// 記憶順序 auto-advances past the 3-card show phase after ~3s.
let memoryShowTimer = null
function clearMemoryShowTimer() {
  if (memoryShowTimer) {
    clearTimeout(memoryShowTimer)
    memoryShowTimer = null
  }
}

watch(
  () => [round.value?.mode, round.value?.state?.phase],
  () => {
    clearMemoryShowTimer()
    if (round.value?.mode === 'memory' && round.value?.state?.phase === 'show') {
      memoryShowTimer = setTimeout(() => store.send('quiz.next'), 3000)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  drawCancelled = true
  clearClockTimer()
  clearAdvanceTimer()
  clearResolveTimer()
  clearMemoryShowTimer()
})
</script>

<template>
  <section class="quiz-play">
    <header class="bar bar--sticky quiz-hudbar">
      <button class="icon-button" type="button" aria-label="返回" @click="back">
        <ArrowLeft :size="22" aria-hidden="true" />
      </button>
      <h1 class="bar-title">測驗</h1>
      <div class="quiz-hud">
        <span class="hud-item">生命 {{ livesText }}</span>
        <span class="hud-item">{{ score }} 分</span>
      </div>
    </header>

    <div
      v-if="round && round.clock.active && round.clock.seconds > 0"
      class="quiz-clock"
      :key="round.clock.key"
      :style="{ '--quiz-clock-seconds': round.clock.seconds + 's' }"
      role="progressbar"
      aria-label="倒數計時"
    >
      <div class="quiz-clock-fill"></div>
    </div>

    <div v-if="phase === 'draw' && run.draw" class="quiz-draw">
      <p class="quiz-draw-hint">點擊一張卡片，抽出本回合模式</p>
      <div ref="boardEl" class="draw-board" :class="{ 'draw-board--busy': drawBusy }">
        <button
          v-for="(card, at) in run.draw.cards"
          :key="at"
          class="draw-card"
          type="button"
          :aria-label="`抽取模式卡片 ${at + 1}`"
          @click="draw(at, $event)"
        >
          <span class="draw-card-inner">
            <span class="draw-card-face draw-card-back" aria-hidden="true"></span>
            <span class="draw-card-face draw-card-front">
              <span class="draw-card-name">{{ modeLabelFor(card) }}</span>
            </span>
          </span>
        </button>
      </div>
    </div>

    <div v-else-if="phase === 'round' && round" class="quiz-round">
      <div class="quiz-round-head">
        <span class="quiz-mode-label">{{ modeLabel }}</span>
        <span v-if="round.streak > 0" class="quiz-streak">連擊 {{ round.streak }}</span>
      </div>

      <component :is="gameComponent" v-if="gameComponent" :round="round" />

      <div v-if="state.phase === 'reveal'" class="quiz-reveal">
        <p class="quiz-reveal-text">正確答案：{{ round.reveal?.text }}</p>
        <button class="button primary" type="button" @click="confirm">確定</button>
      </div>
    </div>

    <div v-else-if="phase === 'done' && lastHistory" class="quiz-done">
      <p class="quiz-done-emoji">{{ lastHistory.cleared ? '🎉' : '😅' }}</p>
      <p class="quiz-done-title">
        {{ lastHistory.cleared ? '本回合完成' : '本回合結束' }}
      </p>
      <p class="quiz-done-score">本回合得分 {{ lastHistory.score }}</p>
      <button class="button primary" type="button" @click="nextRound">下一回合</button>
    </div>

    <div v-else-if="phase === 'over'" class="quiz-over">
      <p class="quiz-over-emoji">{{ run.reason === 'cleared' ? '🎉' : '💔' }}</p>
      <h2 class="quiz-over-title">
        {{ run.reason === 'cleared' ? '恭喜，完成所有回合！' : '測驗結束' }}
      </h2>
      <p class="quiz-over-score">最終得分 {{ score }}</p>
      <button class="button primary" type="button" @click="back">返回主頁</button>
    </div>
  </section>
</template>

<style scoped>
.quiz-play {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.quiz-hudbar .bar-title {
  text-align: left;
}

.quiz-hud {
  display: flex;
  gap: 8px;
  align-items: center;
}

.hud-item {
  font-size: 0.8rem;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.quiz-clock {
  height: 8px;
  margin-top: 8px;
  border-radius: 999px;
  background: var(--track);
  overflow: hidden;
}

.quiz-clock-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--progress-from), var(--progress-to));
  animation: quiz-clock-drain var(--quiz-clock-seconds) linear forwards;
}

@keyframes quiz-clock-drain {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.quiz-draw,
.quiz-round,
.quiz-done,
.quiz-over {
  flex: 1;
  padding: 20px 0 24px;
}

.quiz-draw-hint {
  margin: 0 0 14px;
  text-align: center;
  color: var(--ink-soft);
  font-size: 0.9rem;
}

.quiz-round-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.quiz-mode-label {
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--accent);
}

.quiz-streak {
  font-size: 0.8rem;
  color: var(--ink-soft);
}

.quiz-reveal {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.quiz-reveal-text {
  margin: 0;
  font-size: 1rem;
}

.quiz-done,
.quiz-over {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.quiz-done-emoji,
.quiz-over-emoji {
  margin: 0;
  font-size: 3.4rem;
  line-height: 1;
}

.quiz-done-title,
.quiz-over-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.quiz-done-score,
.quiz-over-score {
  margin: 0;
  color: var(--ink-soft);
}

.quiz-done .button,
.quiz-over .button {
  min-width: 180px;
  min-height: 50px;
}
</style>
