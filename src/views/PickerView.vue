<script setup>
import { computed, inject } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import {
  EMPTY_LESSON_HINT,
  canStart,
  selectAllLabel,
  startHint,
} from '../dict/lessons.js'

const store = inject('store')
const session = store.session

const mode = computed(() => session.mode)
const settings = computed(() => session.settings[session.mode])
const isCard = computed(() => session.mode === 'card')

const lessonCount = computed(() => session.lessons.length)
const selectAllText = computed(() => selectAllLabel(session.lessons, settings.value.lessons))
const startEnabled = computed(() => canStart(lessonCount.value, settings.value.lessons))
const startHintText = computed(() => startHint(lessonCount.value, settings.value.lessons))

const DIRECTION_CHOICES = [
  { id: 'jp-zh', label: '看日文，答中文' },
  { id: 'zh-jp', label: '看中文，答日文' },
]

function toggleLesson(entry) {
  store.send('lessons.toggle', { lesson: entry.lesson })
}

function selectDirection(direction) {
  store.send('settings.patch', { patch: { card: { direction } } })
}

function start() {
  store.send('study.start')
}

function back() {
  store.send('nav.go', { screen: 'home' })
}
</script>

<template>
  <section class="picker">
    <header class="bar bar--sticky">
      <button class="icon-button" type="button" aria-label="返回" @click="back">
        <ArrowLeft :size="22" aria-hidden="true" />
      </button>
      <h1 class="bar-title">詞彙</h1>
      <span class="bar-spacer"></span>
    </header>

    <div class="section-head">
      <span class="section-label">課次</span>
      <button class="text-button" type="button" @click="store.send('lessons.selectAll')">
        {{ selectAllText }}
      </button>
    </div>

    <div class="chip-grid">
      <span v-for="entry in session.lessons" :key="entry.lesson" class="chip-wrap">
        <button
          class="chip chip--lesson"
          :class="{
            'chip--on': settings.lessons.includes(entry.lesson),
            'chip--empty': !entry.hasEntries,
          }"
          :disabled="!entry.hasEntries"
          type="button"
          :aria-pressed="settings.lessons.includes(entry.lesson)"
          :aria-describedby="entry.hasEntries ? undefined : `hint-lesson-${entry.lesson}`"
          @click="toggleLesson(entry)"
        >
          第{{ entry.lesson }}課
        </button>
        <span
          v-if="!entry.hasEntries"
          :id="`hint-lesson-${entry.lesson}`"
          class="chip-tip"
          aria-hidden="true"
        >
          {{ EMPTY_LESSON_HINT }}
        </span>
      </span>
    </div>

    <div v-if="isCard" class="direction">
      <span class="section-label">方向</span>
      <div class="direction-chips">
        <button
          v-for="choice in DIRECTION_CHOICES"
          :key="choice.id"
          class="chip chip--direction"
          :class="{ 'chip--on': settings.direction === choice.id }"
          type="button"
          :aria-pressed="settings.direction === choice.id"
          @click="selectDirection(choice.id)"
        >
          {{ choice.label }}
        </button>
      </div>
    </div>

    <footer class="picker-footer">
      <button
        class="button primary picker-start"
        :class="{ 'picker-start--invalid': !startEnabled }"
        type="button"
        :disabled="!startEnabled"
        @click="start"
      >
        {{ startHintText || '開始' }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.picker {
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

.chip-wrap {
  position: relative;
  display: block;
}

.chip--lesson {
  width: 100%;
}

.chip-tip {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  z-index: 3;
  transform: translateX(-50%);
  padding: 4px 8px;
  border-radius: 8px;
  background: var(--tooltip);
  color: var(--tooltip-ink);
  font-size: 0.72rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.14s ease;
}

.chip-wrap:hover .chip-tip,
.chip-wrap:focus-within .chip-tip {
  opacity: 1;
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

.chip--empty:disabled {
  color: var(--muted);
  background: transparent;
  border-color: var(--line);
  opacity: 0.45;
  cursor: default;
  pointer-events: none;
}

.direction {
  margin-top: 26px;
}

.direction-chips {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}

.chip--direction {
  width: 100%;
}

.picker-start {
  width: 100%;
  min-height: 50px;
  font-size: 17px;
  font-weight: 600;
}

.picker-start.picker-start--invalid:disabled {
  color: var(--error);
  background: transparent;
  border-color: var(--error);
  box-shadow: none;
  opacity: 1;
  cursor: default;
}

.picker-footer {
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
