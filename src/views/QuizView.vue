<script setup>
import { computed, inject } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import { EMPTY_LESSON_HINT, selectAllLabel } from '../dict/lessons.js'
import {
  COUNT_LABELS,
  COUNT_OPTIONS,
  LIVES_LABELS,
  LIVES_OPTIONS,
  MODE_LABELS,
  SETUP_MODES,
  TIME_LABELS,
  TIME_OPTIONS,
} from '../study/quiz/modes.js'
import { evaluateEligibility } from '../study/quiz/eligibility.js'

const store = inject('store')
const session = store.session
const quiz = computed(() => session.quiz)
const eligibility = computed(() => evaluateEligibility(store.deps.library, quiz.value.lessons))

const selectAllText = computed(() => selectAllLabel(session.lessons, quiz.value.lessons))
const startLabel = computed(() => {
  if (session.lessons.length === 0) return '單詞列表尚未放入'
  if (quiz.value.lessons.length === 0) return '請至少選擇一門課程才可以開始'
  return '開始'
})
const canStart = computed(() => session.lessons.length > 0 && quiz.value.lessons.length > 0)

function toggleLesson(entry) {
  store.send('quiz.toggleLesson', { lesson: entry.lesson })
}

function setCount(count) {
  store.send('quiz.setCount', { count })
}

function toggleMode(mode) {
  if (mode === 'random') store.send('quiz.toggleRandom')
  else store.send('quiz.toggleMode', { mode })
}

function setLives(lives) {
  store.send('quiz.setLives', { lives })
}

function setTime(time) {
  store.send('quiz.setTime', { time })
}

function start() {
  store.send('quiz.start')
}

function back() {
  store.send('nav.go', { screen: 'home' })
}
</script>

<template>
  <section class="quiz-setup">
    <header class="bar bar--sticky">
      <button class="icon-button" type="button" aria-label="返回" @click="back">
        <ArrowLeft :size="22" aria-hidden="true" />
      </button>
      <h1 class="bar-title">測驗</h1>
      <span class="bar-spacer"></span>
    </header>

    <div class="section-head">
      <span class="section-label">課次</span>
      <button class="text-button" type="button" @click="store.send('quiz.selectAll')">
        {{ selectAllText }}
      </button>
    </div>
    <div class="chip-grid">
      <span v-for="entry in session.lessons" :key="entry.lesson" class="chip-wrap">
        <button
          class="chip chip--lesson"
          :class="{
            'chip--on': quiz.lessons.includes(entry.lesson),
            'chip--empty': !entry.hasEntries,
          }"
          :disabled="!entry.hasEntries"
          type="button"
          :aria-pressed="quiz.lessons.includes(entry.lesson)"
          @click="toggleLesson(entry)"
        >
          第{{ entry.lesson }}課
        </button>
      </span>
    </div>

    <div class="section-head">
      <span class="section-label">單詞數量</span>
    </div>
    <div class="chip-grid chip-grid--auto">
      <button
        v-for="count in COUNT_OPTIONS"
        :key="count"
        class="chip"
        :class="{ 'chip--on': quiz.count === count }"
        type="button"
        :aria-pressed="quiz.count === count"
        @click="setCount(count)"
      >
        {{ COUNT_LABELS[count] }}
      </button>
    </div>

    <div class="section-head">
      <span class="section-label">模式</span>
    </div>
    <div class="chip-grid chip-grid--mode">
      <button
        v-for="mode in SETUP_MODES"
        :key="mode"
        class="chip chip--mode"
        :class="{
          'chip--on': mode === 'random' ? quiz.random : quiz.modes.includes(mode),
        }"
        type="button"
        :disabled="mode !== 'random' && (quiz.random || !eligibility[mode]?.ok)"
        :title="mode !== 'random' && eligibility[mode] && !eligibility[mode].ok ? eligibility[mode].reason : undefined"
        :aria-pressed="mode === 'random' ? quiz.random : quiz.modes.includes(mode)"
        @click="toggleMode(mode)"
      >
        {{ MODE_LABELS[mode] }}
      </button>
    </div>

    <div class="section-head">
      <span class="section-label">生命</span>
    </div>
    <div class="chip-grid chip-grid--auto">
      <button
        v-for="lives in LIVES_OPTIONS"
        :key="lives"
        class="chip"
        :class="{ 'chip--on': quiz.lives === lives }"
        type="button"
        :aria-pressed="quiz.lives === lives"
        @click="setLives(lives)"
      >
        {{ LIVES_LABELS[lives] }}
      </button>
    </div>

    <div class="section-head">
      <span class="section-label">時間</span>
    </div>
    <div class="chip-grid chip-grid--auto">
      <button
        v-for="time in TIME_OPTIONS"
        :key="time"
        class="chip"
        :class="{ 'chip--on': quiz.time === time }"
        type="button"
        :aria-pressed="quiz.time === time"
        @click="setTime(time)"
      >
        {{ TIME_LABELS[time] }}
      </button>
    </div>

    <footer class="quiz-footer">
      <button
        class="button primary quiz-start"
        :class="{ 'quiz-start--invalid': !canStart }"
        type="button"
        :disabled="!canStart"
        @click="start"
      >
        {{ startLabel }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.quiz-setup {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 8px 0 0;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 20px 0 10px;
}

.section-label {
  font-size: 0.8rem;
  letter-spacing: 0.18em;
  color: var(--muted);
}

.text-button {
  border: 0;
  background: transparent;
  color: var(--accent);
  font-size: 0.85rem;
  font-weight: 600;
  min-height: 32px;
  padding: 0 8px;
  cursor: pointer;
}

.chip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: 8px;
}

.chip-grid--auto {
  grid-template-columns: repeat(5, 1fr);
}

.chip-grid--mode {
  grid-template-columns: repeat(2, 1fr);
}

.chip-wrap {
  position: relative;
  display: block;
}

.chip--lesson {
  width: 100%;
}

.chip {
  min-height: 36px;
  padding: 0 6px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: 0.85rem;
  line-height: 1.25;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.chip:hover:not(:disabled) {
  border-color: var(--accent);
}

.chip--on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--accent-ink);
  font-weight: 600;
}

.chip--empty:disabled,
.chip--mode:disabled {
  color: var(--muted);
  background: transparent;
  border-color: var(--line);
  opacity: 0.45;
  cursor: default;
  pointer-events: none;
}

.quiz-start {
  width: 100%;
  min-height: 50px;
  font-size: 17px;
  font-weight: 600;
}

.quiz-start.quiz-start--invalid:disabled {
  color: var(--error);
  background: transparent;
  border-color: var(--error);
  box-shadow: none;
  opacity: 1;
  cursor: default;
}

.quiz-footer {
  position: sticky;
  bottom: 0;
  margin-top: auto;
  padding: 28px 0 max(20px, env(safe-area-inset-bottom));
  background: linear-gradient(
    to top,
    var(--column) 0,
    var(--column) calc(100% - 28px),
    transparent 100%
  );
}
</style>
