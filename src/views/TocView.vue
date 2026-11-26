<script setup>
import { computed, inject, nextTick, onMounted, ref } from 'vue'
import { ArrowLeft, Search, X } from 'lucide-vue-next'
import { filterTocGroups } from '../study/toc.js'

const store = inject('store')
const session = store.session
const library = store.deps.library

const searchOpen = ref(false)

const groups = computed(() =>
  filterTocGroups(
    session.items,
    library,
    session.index,
    searchOpen.value ? session.tocQuery : '',
  ),
)

function back() {
  store.send('nav.go', { screen: 'reader' })
}

function jump(index) {
  store.send('word.goto', { index })
}

function toggleSearch() {
  searchOpen.value = !searchOpen.value
}

function clearSearch() {
  session.tocQuery = ''
}

// A long run opens with the current word already in view.
onMounted(async () => {
  window.scrollTo({ top: 0, behavior: 'auto' })
  await nextTick()
  const current = document.querySelector('.toc-row[aria-current="true"]')
  if (!current) return
  if (document.documentElement.scrollHeight <= window.innerHeight) return
  current.scrollIntoView({ block: 'center', behavior: 'auto' })
})
</script>

<template>
  <section class="toc">
    <header class="bar bar--sticky">
      <button class="icon-button" type="button" aria-label="返回" @click="back"><ArrowLeft :size="22" aria-hidden="true" /></button>
      <h1 class="bar-title">單詞目錄</h1>
      <button class="icon-button" type="button" aria-label="搜尋" :aria-pressed="searchOpen" @click="toggleSearch"><Search :size="22" aria-hidden="true" /></button>
    </header>

    <div v-if="searchOpen" class="toc-search">
      <div class="toc-search-box">
        <input
          v-model="session.tocQuery"
          class="toc-search-input"
          type="text"
          placeholder="搜尋單詞、讀音或課號"
          aria-label="搜尋單詞"
        />
        <button class="toc-search-clear" type="button" aria-label="清空" @click="clearSearch"><X :size="18" aria-hidden="true" /></button>
      </div>
    </div>

    <p v-if="groups.length === 0" class="toc-empty">沒有符合的單詞</p>

    <div v-for="group in groups" :key="group.lesson" class="toc-group">
      <h2 class="toc-lesson">第{{ group.lesson }}課</h2>
      <button
        v-for="row in group.rows"
        :key="row.index"
        class="toc-row"
        :class="{ 'toc-row--current': row.current }"
        type="button"
        :aria-current="row.current ? 'true' : undefined"
        @click="jump(row.index)"
      >
        <span class="toc-word">
          <span
            v-for="(part, partIndex) in row.parts"
            :key="partIndex"
            :class="{ 'toc-hit': part.highlight }"
          >{{ part.text }}</span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.toc {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding-bottom: 10px;
}

.toc-search {
  position: sticky;
  top: 48px;
  z-index: 2;
  background: var(--column);
  padding: 2px 0 10px;
}

.toc-search-box {
  position: relative;
}

.toc-search-input {
  width: 100%;
  height: 44px;
  padding: 0 44px 0 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  font: inherit;
  font-size: 1rem;
  color: var(--ink);
}

.toc-search-input::placeholder {
  color: var(--ink-soft);
}

.toc-search-input:focus {
  outline: none;
  border-color: var(--accent);
}

.toc-search-clear {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  border-radius: 8px;
  cursor: pointer;
}

.toc-search-clear:hover {
  background: var(--tint);
  color: var(--ink);
}

.toc-empty {
  margin: 24px 0;
  text-align: center;
  font-size: 0.95rem;
  color: var(--ink-soft);
}

.toc-group {
  margin-top: 4px;
}

.toc-lesson {
  margin: 10px 0 8px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--ink-soft);
}

.toc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  height: 44px;
  padding: 0 14px;
  margin: 0 0 8px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  font: inherit;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition: transform 140ms ease, background 140ms ease;
}

.toc-row:hover {
  background: var(--tint);
}

.toc-row:active {
  transform: scale(0.97);
}

.toc-row--current {
  background: var(--accent-tint);
  border-color: var(--accent);
}

.toc-row--current .toc-word {
  color: var(--accent);
  font-weight: 600;
}

.toc-word {
  font-size: 1.05rem;
}

.toc-hit {
  color: var(--error);
}
</style>
