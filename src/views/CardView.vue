<script setup>
import { computed, inject, onBeforeUnmount, ref } from 'vue'
import { ArrowLeft, ChevronLeft, ChevronRight, Settings as SettingsIcon } from 'lucide-vue-next'
import RubyWord from '../components/RubyWord.vue'
import CompletePanel from '../components/CompletePanel.vue'
import { cardEntries } from '../study/window-views.js'
import { dragAxis, dragDirection, dragShift, paintRowOffset } from '../ui/drag.js'
import { prefersReducedMotion, slideRow } from '../ui/motion.js'
import { CARD_WINDOW, PAGING_GAP } from '../ui/window.js'
import { usePagingWindow } from '../ui/paging-window.js'

const store = inject('store')
const session = store.session
const library = store.deps.library

// Paging is a finger-tracking drag; the card turns on a tap (no drag at all).
const rowEl = ref(null)
let dragX = 0
const held = ref(false)
const sliding = ref(false)

const SETTLE_FALLBACK_MS = 600
let settleTimer = null
let rowAnimation = null

const turning = computed(() => held.value || sliding.value)

let pointer = null

const item = computed(() => session.items[session.index] ?? null)
const cardSettings = computed(() => session.settings.card)
const pagingSlotRow = usePagingWindow(session, CARD_WINDOW)
const slots = computed(() =>
  cardEntries(session.items, pagingSlotRow.value, library, cardSettings.value),
)

const onLastCard = computed(() => session.index >= session.items.length - 1)
const onFirstCard = computed(() => session.index === 0)

function rowWidth() {
  return rowEl.value?.clientWidth ?? 0
}

function endSlide() {
  clearTimeout(settleTimer)
  settleTimer = null
  if (rowAnimation) {
    rowAnimation.cancel()
    rowAnimation = null
  }
  sliding.value = false
}

function startSlide(fromPx) {
  endSlide()
  sliding.value = true
  rowAnimation = slideRow(rowEl.value, fromPx, () => {
    rowAnimation = null
    sliding.value = false
    clearTimeout(settleTimer)
    settleTimer = null
  })
  settleTimer = setTimeout(endSlide, SETTLE_FALLBACK_MS)
}

function settleBack() {
  const from = dragX
  dragX = 0
  paintRowOffset(rowEl.value, 0)
  if (prefersReducedMotion() || from === 0) return
  startSlide(from)
}

let queuedMove = null
let queuedFrame = false

function moveCard(direction, releasedX = 0) {
  if (!direction || held.value) return

  if (prefersReducedMotion()) {
    endSlide()
    dragX = 0
    paintRowOffset(rowEl.value, 0)
    if (direction === 'next' && onLastCard.value) store.send('study.finish')
    else if (direction === 'next') store.send('card.next')
    else store.send('card.prev')
    return
  }

  if (sliding.value || queuedFrame) {
    endSlide()
    queuedMove = direction
    if (!queuedFrame) {
      queuedFrame = true
      requestAnimationFrame(() => {
        queuedFrame = false
        const next = queuedMove
        queuedMove = null
        if (next) moveCard(next)
      })
    }
    return
  }

  dragX = 0
  paintRowOffset(rowEl.value, 0)
  if (direction === 'next' && onLastCard.value) {
    store.send('study.finish')
    return
  }
  store.send(direction === 'next' ? 'card.next' : 'card.prev')
  const pitch = rowWidth() + PAGING_GAP
  startSlide(direction === 'next' ? pitch + releasedX : releasedX - pitch)
}

onBeforeUnmount(() => {
  queuedMove = null
  queuedFrame = false
  endSlide()
})

function onDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (held.value || sliding.value) return
  pointer = {
    x: event.clientX,
    y: event.clientY,
    axis: null,
    lastDx: 0,
    width: rowWidth(),
  }
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function onMove(event) {
  if (!pointer) return
  const dx = event.clientX - pointer.x
  const dy = event.clientY - pointer.y
  if (!pointer.axis) {
    const axis = dragAxis(dx, dy)
    if (!axis) return
    pointer.axis = axis
    if (axis === 'x') held.value = true
  }
  if (pointer.axis !== 'x') return
  pointer.lastDx = dx
  if (!prefersReducedMotion()) {
    dragX = dragShift(dx, {
      canPrev: !onFirstCard.value,
      canNext: true,
      width: pointer.width,
    })
    paintRowOffset(rowEl.value, dragX)
  }
}

function onUp() {
  if (!pointer) return
  const { axis, lastDx } = pointer
  pointer = null
  held.value = false
  if (axis === null) {
    store.send('card.flip')
    return
  }
  if (axis !== 'x') return
  const direction = dragDirection(lastDx, {
    canPrev: !onFirstCard.value,
    canNext: true,
  })
  if (direction) {
    moveCard(direction, dragX)
    return
  }
  settleBack()
}

function nextOrFinish() {
  moveCard('next')
}

function prevCard() {
  if (session.index === 0) return
  moveCard('prev')
}

function back() {
  store.send('nav.go', { screen: 'picker' })
}

function openSettings() {
  store.send('nav.go', { screen: 'settings' })
}
</script>

<template>
  <section class="cards">
    <header class="bar bar--sticky">
      <button class="icon-button" type="button" aria-label="返回" @click="back"><ArrowLeft :size="22" aria-hidden="true" /></button>
      <h1 class="bar-title">練習（{{ session.index + 1 }}/{{ session.items.length }}）</h1>
      <button class="icon-button" type="button" aria-label="設定" @click="openSettings"><SettingsIcon :size="22" aria-hidden="true" /></button>
    </header>

    <div
      v-if="item && !session.finished"
      class="card-stage"
      :class="{ 'card-stage--moving': held || sliding }"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @pointerleave="onUp"
    >
      <div
        ref="rowEl"
        class="card-window"
        :class="{ 'card-window--paging': held || sliding }"
        style="transform: translateX(0px)"
      >
        <div
          v-for="entry in slots"
          :key="entry.key"
          class="card-slot"
          :class="{ 'card-slot--current': entry.current }"
          :aria-hidden="entry.current ? undefined : 'true'"
          :data-at="entry.at"
          :style="{ transform: `translateX(calc(${entry.offset}% + ${entry.gap}px))` }"
        >
          <div
            v-if="entry.face"
            class="card"
            :class="{
              'card--current': entry.current,
              'card--flipped': session.flipped && entry.current,
              'card--no-turn': turning,
            }"
          >
            <div class="card-inner">
              <div
                class="card-side card-face"
                :aria-hidden="entry.current && session.flipped ? 'true' : undefined"
              >
                <div class="word">
                  <RubyWord
                    :text="entry.face.word"
                    :reading="entry.face.reading"
                    :show-reading="entry.face.ruby"
                  />
                </div>
                <p class="prompt">{{ entry.face.prompt }}</p>
              </div>

              <div
                class="card-side card-back"
                :aria-hidden="entry.current && session.flipped ? undefined : 'true'"
              >
                <div class="word">
                  <RubyWord
                    :text="entry.back.word"
                    :reading="entry.back.reading"
                    :show-reading="entry.back.ruby"
                  />
                </div>
                <p class="gloss">{{ entry.back.chinese }}</p>
                <div class="pills">
                  <span v-for="label in entry.back.speech" :key="label" class="pill">{{ label }}</span>
                  <span class="pill">第{{ entry.back.lesson }}課</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CompletePanel v-if="session.finished" />

    <footer v-if="!session.finished" class="card-controls">
      <button
        class="button ghost control"
        type="button"
        :disabled="session.index === 0"
        @click="prevCard"
      >
        <ChevronLeft :size="18" aria-hidden="true" />
        <span>上一張</span>
      </button>
      <button class="button ghost control" type="button" @click="nextOrFinish">
        <span>{{ onLastCard ? '完成' : '下一張' }}</span>
        <ChevronRight v-if="!onLastCard" :size="18" aria-hidden="true" />
      </button>
    </footer>
  </section>
</template>

<style scoped>
.cards {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.card-stage {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0 6px;
  touch-action: pan-y;
  user-select: none;
  margin-left: calc(-1 * var(--page-gutter));
  margin-right: calc(-1 * var(--page-gutter));
}

.card-window {
  position: relative;
  width: calc(100% - 2 * var(--page-gutter));
  min-height: 340px;
  will-change: transform;
}

.card-slot {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.card-slot:not(.card-slot--current) {
  visibility: hidden;
}

.card-slot:not(.card-slot--current) .card {
  animation: none !important;
  transition: none !important;
}

.card-window--paging .card-slot:not(.card-slot--current) {
  visibility: visible;
}

.card-stage--moving {
  overflow-x: clip;
}

.card {
  position: relative;
  width: 100%;
  min-height: 340px;
  perspective: 1600px;
  will-change: transform;
  cursor: pointer;
}

.card-inner {
  position: relative;
  width: 100%;
  min-height: 340px;
  transform-style: preserve-3d;
  transition: transform 240ms var(--ease-turn);
}

.card--flipped .card-inner {
  transform: rotateY(180deg);
}

.card-side {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 20px;
  border-radius: 24px;
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-card);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.card-back {
  transform: rotateY(180deg);
}

.card-face,
.card-back {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
}

.card--no-turn .card-inner {
  transition: none;
}

.word {
  font-size: 2.5rem;
  font-weight: 600;
  text-align: center;
}

/* .ruby-word is inline-flex with wrap; justify-content centers each wrapped line. */
.word :deep(.ruby-word) {
  justify-content: center;
}

.gloss {
  margin: 0;
  font-size: 1.05rem;
  color: var(--ink-soft);
}

.pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.pill {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  font-size: 0.78rem;
  color: var(--ink-soft);
  letter-spacing: 0.06em;
}

.prompt {
  margin: 6px 0 0;
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  color: var(--ink-soft);
}

.card-controls {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  gap: 12px;
  margin-top: 12px;
  padding: 28px 0 max(10px, env(safe-area-inset-bottom));
  background: linear-gradient(
    to top,
    var(--column) 0,
    var(--column) calc(100% - 28px),
    transparent 100%
  );
}

.card-controls .control {
  min-height: 50px;
}

.control {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

@media (prefers-reduced-motion: reduce) {
  .card-inner {
    transition: none;
  }
  .card-window {
    will-change: auto;
  }
}
</style>
