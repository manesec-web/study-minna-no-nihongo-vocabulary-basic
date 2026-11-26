<script setup>
import { inject } from 'vue'
import { COMPLETE_TITLE, practiceEmoji } from '../study/results.js'

const store = inject('store')

// The run is over when this panel mounts, so the emoji is drawn once here —
// a computed would re-roll it on every re-render.
const emoji = practiceEmoji()

function home() {
  store.send('nav.go', { screen: 'home' })
}
</script>

<template>
  <section class="complete" role="status">
    <p class="complete-emoji" aria-hidden="true">{{ emoji }}</p>
    <p class="complete-title">{{ COMPLETE_TITLE }}</p>
    <button class="button primary complete-home" type="button" @click="home">
      返回主頁
    </button>
  </section>
</template>

<style scoped>
.complete {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin: 24px 0;
  padding: 24px 18px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--surface);
  box-shadow: var(--shadow-card);
  text-align: center;
}

.complete-emoji {
  margin: 0;
  font-size: 4rem;
  line-height: 1.1;
}

.complete-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.complete-home {
  width: 100%;
  height: 60px;
  min-height: 60px;
  margin-top: 6px;
  font-weight: 600;
}
</style>
