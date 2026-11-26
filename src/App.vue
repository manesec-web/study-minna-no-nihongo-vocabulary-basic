<script setup>
import { computed, inject } from 'vue'
import LoadingView from './views/LoadingView.vue'
import HomeView from './views/HomeView.vue'
import PickerView from './views/PickerView.vue'
import ReaderView from './views/ReaderView.vue'
import TocView from './views/TocView.vue'
import GlyphView from './views/GlyphView.vue'
import SettingsView from './views/SettingsView.vue'
import CardView from './views/CardView.vue'
import QuizView from './views/QuizView.vue'
import QuizPlayView from './views/QuizPlayView.vue'
import PageScrollBar from './components/PageScrollBar.vue'

const store = inject('store')

const views = {
  loading: LoadingView,
  home: HomeView,
  picker: PickerView,
  reader: ReaderView,
  toc: TocView,
  glyph: GlyphView,
  card: CardView,
  settings: SettingsView,
  quiz: QuizView,
  'quiz-play': QuizPlayView,
}

const current = computed(() => views[store.session.screen] ?? null)
</script>

<template>
  <div class="app-shell">
    <main class="column">
      <transition name="screen" mode="out-in">
        <component :is="current" v-if="current" :key="store.session.screen" />
        <section v-else class="placeholder">
          <p>{{ store.session.screen }}</p>
        </section>
      </transition>
    </main>
    <PageScrollBar />
  </div>
</template>

<style scoped>
.placeholder {
  padding: 24px 0;
  color: var(--ink-soft);
}
</style>
