<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowLeft, ChevronLeft, ChevronRight, List, Settings as SettingsIcon } from 'lucide-vue-next'
import RubyWord from '../components/RubyWord.vue'
import { readerEntries } from '../study/window-views.js'
import { swipeEnabled } from '../ui/swipe.js'
import { dragAxis, dragDirection, dragShift, paintRowOffset } from '../ui/drag.js'
import { prefersReducedMotion, slideRow } from '../ui/motion.js'
import { PAGING_GAP, READER_WINDOW } from '../ui/window.js'
import { usePagingWindow } from '../ui/paging-window.js'

const store = inject('store')
const session = store.session
const library = store.deps.library
let pointer = null

// Paging is a finger-tracking drag: while the finger is down, the paging row
// translates with it 1:1 so the word is under the hand. On release past the
// threshold the row finishes the page as one decelerating move; the command
// swaps the word under that move. A shorter drag settles back to rest.
const rowEl = ref(null)
let dragX = 0
const held = ref(false)
const sliding = ref(false)

const SETTLE_FALLBACK_MS = 600
let settleTimer = null
let rowAnimation = null

const item = computed(() => session.items[session.index] ?? null)
const canPrev = computed(() => session.index > 0)
const canNext = computed(() => session.index < session.items.length - 1)
const paging = computed(() => held.value || sliding.value)

const pagingSlotRow = usePagingWindow(session, READER_WINDOW)
const slots = computed(() =>
  readerEntries(session.items, pagingSlotRow.value, library, session.settings.words, session.runSeed),
)

// A new word opens at the top of the page.
watch(
  () => session.index,
  () => window.scrollTo({ top: 0, behavior: 'auto' }),
)

onMounted(() => window.scrollTo({ top: 0, behavior: 'auto' }))

function canGo(direction) {
  return direction === 'next' ? canNext.value : canPrev.value
}

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

function sendMove(direction) {
  window.scrollTo({ top: 0, behavior: 'auto' })
  store.send(direction === 'next' ? 'word.next' : 'word.prev')
}

// One path for gestures and for the footer controls.
function go(direction, releasedX = 0) {
  if (!direction || !canGo(direction) || paging.value) return
  dragX = 0
  paintRowOffset(rowEl.value, 0)
  if (prefersReducedMotion()) {
    sendMove(direction)
    return
  }
  sendMove(direction)
  const pitch = rowWidth() + PAGING_GAP
  const from = direction === 'next' ? pitch + releasedX : releasedX - pitch
  startSlide(from)
}

function settleBack() {
  const from = dragX
  dragX = 0
  paintRowOffset(rowEl.value, 0)
  if (prefersReducedMotion() || from === 0) return
  startSlide(from)
}

onBeforeUnmount(() => {
  endSlide()
})

function onDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (paging.value) return
  const pair = event.target?.closest?.('.kanji-pair')
  pointer = {
    x: event.clientX,
    y: event.clientY,
    axis: null,
    lastDx: 0,
    width: rowWidth(),
    pairIndex: pair ? Number(pair.dataset.detailIndex) : null,
  }
  // Above 550px text selection matters more than swiping; only the footer
  // buttons page there and nothing is captured.
  if (swipeEnabled(window.innerWidth)) {
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
}

function onMove(event) {
  if (!pointer) return
  const dx = event.clientX - pointer.x
  const dy = event.clientY - pointer.y
  if (!pointer.axis) {
    const axis = dragAxis(dx, dy)
    if (!axis) return
    pointer.axis = axis
    if (axis === 'x' && swipeEnabled(window.innerWidth)) held.value = true
  }
  if (!swipeEnabled(window.innerWidth)) return
  if (pointer.axis !== 'x') return
  pointer.lastDx = dx
  if (!prefersReducedMotion()) {
    dragX = dragShift(dx, {
      canPrev: canPrev.value,
      canNext: canNext.value,
      width: pointer.width,
    })
    paintRowOffset(rowEl.value, dragX)
  }
}

function onUp(event) {
  if (!pointer) return
  const { axis, lastDx, pairIndex } = pointer
  pointer = null
  held.value = false
  if (axis === null) {
    // A tap on a 字形對照 pair opens its detail page; any other tap does nothing.
    if (pairIndex !== null) openPair(pairIndex)
    return
  }
  if (!swipeEnabled(window.innerWidth)) return
  if (axis !== 'x') return
  const direction = dragDirection(lastDx, {
    canPrev: canPrev.value,
    canNext: canNext.value,
  })
  if (direction) {
    go(direction, dragX)
    return
  }
  settleBack()
}

function onLeave() {
  pointer = null
  held.value = false
}

function back() {
  store.send('nav.go', { screen: 'picker' })
}

function openSettings() {
  store.send('nav.go', { screen: 'settings' })
}

function openToc() {
  store.send('nav.go', { screen: 'toc' })
}

function openPair(detailIndex) {
  store.send('glyph.open', { detailIndex })
}
</script>

<template>
  <section class="reader">
    <header class="bar bar--sticky">
      <button class="icon-button" type="button" aria-label="返回" @click="back"><ArrowLeft :size="22" aria-hidden="true" /></button>
      <h1 class="bar-title">單詞</h1>
      <button class="icon-button" type="button" aria-label="單詞目錄" @click="openToc"><List :size="22" aria-hidden="true" /></button>
      <button class="icon-button" type="button" aria-label="設定" @click="openSettings"><SettingsIcon :size="22" aria-hidden="true" /></button>
    </header>

    <div
      v-if="item"
      class="reader-body"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @pointerleave="onLeave"
    >
      <div
        ref="rowEl"
        class="reader-window"
        :class="{ 'reader-window--paging': paging }"
        style="transform: translateX(0px)"
      >
        <article
          v-for="entry in slots"
          :key="entry.key"
          class="reader-page"
          :class="{ 'reader-page--current': entry.current }"
          :aria-hidden="entry.current ? undefined : 'true'"
          :data-at="entry.at"
          :style="{ transform: `translateX(calc(${entry.offset}% + ${entry.gap}px))` }"
        >
          <template v-if="entry.entry">
            <div class="word-block">
              <div class="word">
                <RubyWord
                  :text="entry.entry.displayWord"
                  :reading="entry.entry.japanese"
                  :show-reading="entry.entry.showReading"
                />
              </div>
              <p class="gloss">{{ entry.entry.chinese }}</p>
              <div class="pills">
                <span class="pill">第{{ entry.entry.lesson }}課</span>
                <span v-for="label in entry.entry.speech" :key="label" class="pill">{{ label }}</span>
                <span v-for="label in entry.entry.tags" :key="label" class="pill">{{ label }}</span>
              </div>
            </div>

            <div v-if="entry.entry.note" class="block">
              <p class="note-line">{{ entry.entry.note }}</p>
            </div>

            <div v-if="entry.entry.sentences.length" class="block">
              <h3 class="block-title">例句：</h3>
              <div v-for="(sentence, at) in entry.entry.sentences" :key="at" class="sentence">
                <p class="sentence-ja" lang="ja">
                  <span
                    v-for="(part, partIndex) in sentence.parts"
                    :key="partIndex"
                    :class="{ 'sentence-hit': part.highlight }"
                  >{{ part.text }}</span>
                </p>
                <p class="sentence-zh">{{ sentence.chinese }}</p>
              </div>
            </div>

            <div v-if="entry.entry.kanjiNote" class="block kanji-block">
              <h3 class="block-title">字形對照</h3>
              <p class="kanji-summary">{{ entry.entry.kanjiNote.summary }}</p>
              <ul class="kanji-list">
                <li
                  v-for="(detail, at) in entry.entry.kanjiNote.details"
                  :key="at"
                  class="kanji-list-item"
                >
                  <button
                    class="kanji-pair"
                    type="button"
                    :data-detail-index="at"
                    :aria-label="detail.zh ? `查看${detail.zh}（繁）與${detail.jp}（日）的字形對照` : `查看${detail.jp}（日）的字形對照`"
                    @click="openPair(at)"
                  >
                    <span class="kanji-compare">
                      <span v-if="detail.zh" class="kanji-side">
                        <span class="kanji-label">繁</span>
                        <span class="kanji-glyph kanji-glyph--zh" lang="zh-Hant">{{ detail.zh }}</span>
                      </span>
                      <span v-if="detail.zh" class="kanji-arrow" aria-hidden="true">→</span>
                      <span class="kanji-side">
                        <span class="kanji-label">日</span>
                        <span class="kanji-glyph kanji-glyph--jp" lang="ja">{{ detail.jp }}</span>
                      </span>
                    </span>
                  </button>
                  <p v-if="detail.note" class="kanji-pair-note">{{ detail.note }}</p>
                </li>
              </ul>
            </div>
          </template>
        </article>
      </div>
    </div>

    <footer class="reader-controls">
      <button
        class="button ghost controls-button"
        type="button"
        :disabled="!canPrev || paging"
        @click="go('prev')"
      >
        <ChevronLeft :size="18" aria-hidden="true" />
        <span>上一個</span>
      </button>
      <button
        class="button ghost controls-button"
        type="button"
        :disabled="!canNext || paging"
        @click="go('next')"
      >
        <span>下一個</span>
        <ChevronRight :size="18" aria-hidden="true" />
      </button>
    </footer>
  </section>
</template>

<style scoped>
.reader {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.reader-body {
  flex: 1;
  overflow: hidden;
  touch-action: pan-y;
  padding: 4px 0 8px;
  margin-left: calc(-1 * var(--page-gutter));
  margin-right: calc(-1 * var(--page-gutter));
}

.reader-window {
  position: relative;
  width: calc(100% - 2 * var(--page-gutter));
  margin: 0 auto;
  min-height: 100%;
  will-change: transform;
}

@media (max-width: 550px) {
  .reader-body {
    user-select: none;
    -webkit-user-select: none;
  }
}

.reader-page {
  will-change: transform;
}

.reader-page:not(.reader-page--current) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  pointer-events: none;
  visibility: hidden;
}

.reader-page--current {
  position: relative;
  pointer-events: auto;
  visibility: visible;
}

.reader-window--paging .reader-page:not(.reader-page--current) {
  visibility: visible;
  pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
  .reader-window {
    will-change: auto;
  }
}

/* The one word block, top to bottom. Later blocks are separated by a hairline.
   There is no rule under the tag row. */
.word-block {
  padding: 16px 0 8px;
}

.block {
  padding: 16px 0 8px;
  border-top: 1px solid var(--line);
}

.word-block + .block {
  border-top: none;
  padding-top: 8px;
}

.word {
  display: block;
  width: fit-content;
  max-width: 100%;
  margin: 2px auto 0;
  padding: 4px 12px;
  font-size: 2rem;
  font-weight: 600;
  text-align: center;
}

.gloss {
  margin: 8px 0 10px;
  font-size: 1rem;
  color: var(--ink-soft);
  text-align: center;
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

.block-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-soft);
  letter-spacing: 0.14em;
  margin: 0 0 8px;
}

.note-line {
  margin: 6px 0 0;
  font-size: 0.92rem;
  line-height: 1.65;
  color: var(--note);
}

.kanji-block .block-title {
  text-align: start;
}

.kanji-summary,
.kanji-pair-note {
  text-align: center;
}

.kanji-summary {
  margin: 0 auto 14px;
  font-size: 0.84rem;
  line-height: 1.6;
  color: var(--muted);
}

.kanji-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 0;
}

.kanji-list-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  margin: 0;
  padding: 0;
  gap: 6px;
}

/* Typography-pair control: 繁→日 only. Padding matches the conjugation
   site's .sentence-ja (2px 8px). Width hugs the glyphs so hover --tint
   does not paint a full-width bar. The note sits outside this button. */
.kanji-pair {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  width: fit-content;
  max-width: 100%;
  margin: 0 auto;
  padding: 2px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  box-shadow: none;
  font: inherit;
  color: inherit;
  text-align: center;
  cursor: pointer;
  transition: transform 140ms ease, background 140ms ease;
}

/* Hover tint only for a fine pointer, so a touch does not leave a stuck wash. */
@media (hover: hover) and (pointer: fine) {
  .kanji-pair:hover {
    background: var(--tint);
  }
}

.kanji-pair:active {
  transform: scale(0.97);
}

.kanji-pair:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .kanji-pair {
    transition: none;
  }

  .kanji-pair:active {
    transform: none;
  }
}

.kanji-compare {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 14px;
}

.kanji-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 2.2em;
}

.kanji-label {
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  line-height: 1;
  color: var(--muted);
}

.kanji-glyph {
  font-size: 1.7rem;
  font-weight: 500;
  line-height: 1.15;
  color: var(--ink);
}

.kanji-glyph--jp {
  font-family: 'Hiragino Sans', 'Noto Sans JP', 'Noto Sans TC', sans-serif;
}

.kanji-glyph--zh {
  font-family: 'Noto Sans TC', 'Hiragino Sans', sans-serif;
}

.kanji-arrow {
  align-self: flex-end;
  padding-bottom: 0.2em;
  font-size: 1rem;
  color: var(--muted);
}

.kanji-pair-note {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--note);
}

.sentence {
  margin-bottom: 10px;
}

.sentence-ja {
  margin: 0;
  padding-left: 8px;
  font-size: 0.98rem;
  line-height: 1.65;
  text-align: left;
}

.sentence-hit {
  color: var(--highlight);
  font-weight: 600;
}

.sentence-zh {
  margin: 2px 0 0;
  padding-left: 8px;
  font-size: 0.84rem;
  color: var(--ink-soft);
}

.reader-controls {
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

.reader-controls .controls-button {
  min-height: 50px;
}

.controls-button {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
</style>
