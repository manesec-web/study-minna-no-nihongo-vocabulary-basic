<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowLeft, Play } from 'lucide-vue-next'
import { mountGlyphStroke } from '../study/glyph-strokes.js'

const store = inject('store')
const session = store.session

const glyph = computed(() => session.glyph)
const hasTraditional = computed(() => Boolean(glyph.value?.hasTraditional))

const leftHost = ref(null)
const rightHost = ref(null)
const leftState = ref('loading')
const rightState = ref('loading')

let leftControl = null
let rightControl = null
let alive = true

async function loadSide(host, character, state) {
  if (!host) {
    state.value = 'missing'
    return null
  }
  const control = await mountGlyphStroke(host, character)
  if (!alive) return null
  state.value = control ? 'ready' : 'missing'
  return control
}

async function loadStrokes() {
  leftControl = null
  rightControl = null
  leftState.value = 'loading'
  rightState.value = 'loading'
  const current = glyph.value
  if (!current) {
    leftState.value = 'missing'
    rightState.value = 'missing'
    return
  }
  if (current.hasTraditional) {
    leftControl = await loadSide(leftHost.value, current.zh, leftState)
  } else {
    leftState.value = 'missing'
  }
  rightControl = await loadSide(rightHost.value, current.jp, rightState)
}

onMounted(() => {
  window.scrollTo({ top: 0, behavior: 'auto' })
  loadStrokes()
})

onBeforeUnmount(() => {
  alive = false
})

// `glyph.play` bumps the counter; the view replays whichever side loaded.
watch(
  () => session.glyphPlayCount,
  (count) => {
    if (!count) return
    leftControl?.play()
    rightControl?.play()
  },
)

function back() {
  store.send('nav.go', { screen: 'reader' })
}

function play() {
  store.send('glyph.play')
}
</script>

<template>
  <section class="glyph">
    <header class="bar bar--sticky">
      <button class="icon-button" type="button" aria-label="返回" @click="back">
        <ArrowLeft :size="22" aria-hidden="true" />
      </button>
      <h1 class="bar-title">字形對照</h1>
      <span class="bar-spacer"></span>
    </header>

    <div v-if="glyph" class="glyph-body">
      <table class="glyph-table">
        <thead>
          <tr>
            <th scope="col">簡</th>
            <th scope="col">繁</th>
            <th scope="col">日</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="glyph-cell glyph-cell--han" lang="zh-Hans">{{ glyph.simplified || '—' }}</td>
            <td class="glyph-cell glyph-cell--zh" lang="zh-Hant">{{ glyph.zh || '—' }}</td>
            <td class="glyph-cell glyph-cell--jp" lang="ja">{{ glyph.jp }}</td>
          </tr>
        </tbody>
      </table>

      <p v-if="glyph.note" class="glyph-note">{{ glyph.note }}</p>

      <button class="button primary glyph-play" type="button" @click="play">
        <Play :size="18" aria-hidden="true" />
        <span>播放筆順</span>
      </button>

      <div class="glyph-strokes">
        <div class="glyph-stroke-panel">
          <span class="glyph-stroke-label">繁</span>
          <div
            v-if="hasTraditional"
            ref="leftHost"
            class="glyph-stroke"
          ></div>
          <p v-else class="glyph-stroke-empty" aria-hidden="true">—</p>
          <p v-if="hasTraditional && leftState === 'missing'" class="glyph-stroke-missing">無筆順資料</p>
        </div>

        <div class="glyph-stroke-panel">
          <span class="glyph-stroke-label">日</span>
          <div ref="rightHost" class="glyph-stroke"></div>
          <p v-if="rightState === 'missing'" class="glyph-stroke-missing">無筆順資料</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.glyph {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding-bottom: max(10px, env(safe-area-inset-bottom));
}

.glyph-body {
  padding: 4px 0 8px;
}

.glyph-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 4px;
}

.glyph-table th {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--muted);
  padding: 0 0 8px;
}

.glyph-table td {
  text-align: center;
  vertical-align: middle;
}

.glyph-cell {
  font-size: 1.7rem;
  font-weight: 500;
  line-height: 1.15;
  color: var(--ink);
  padding: 12px 4px;
  min-height: 64px;
}

.glyph-cell--han {
  font-family: 'Hiragino Sans', 'Noto Sans TC', 'Noto Sans JP', sans-serif;
}

.glyph-cell--zh {
  font-family: 'Noto Sans TC', 'Hiragino Sans', sans-serif;
}

.glyph-cell--jp {
  font-family: 'Hiragino Sans', 'Noto Sans JP', 'Noto Sans TC', sans-serif;
}

.glyph-note {
  margin: 8px 0 0;
  text-align: center;
  font-size: 0.84rem;
  line-height: 1.6;
  color: var(--note);
}

.glyph-play {
  width: 100%;
  min-height: 44px;
  margin-top: 20px;
  margin-bottom: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.glyph-strokes {
  display: flex;
  gap: 12px;
  margin-top: 30px;
}

.glyph-stroke-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
}

.glyph-stroke-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--muted);
}

.glyph-stroke {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.glyph-stroke svg {
  width: 120px;
  height: 120px;
  display: block;
}

.glyph-stroke-empty {
  margin: 0;
  height: 120px;
  display: flex;
  align-items: center;
  font-size: 1.6rem;
  color: var(--muted);
}

.glyph-stroke-missing {
  margin: 0;
  font-size: 0.78rem;
  color: var(--muted);
}
</style>
