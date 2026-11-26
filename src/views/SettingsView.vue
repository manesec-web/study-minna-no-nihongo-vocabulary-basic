<script setup>
import { computed, inject } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'

const store = inject('store')
const session = store.session

const mode = computed(() => session.mode)
const settings = computed(() => session.settings[session.mode])
const backScreen = computed(() => ({ words: 'reader', card: 'card' })[session.mode] ?? 'home')
const startReadingDisabled = computed(() => mode.value === 'card' && settings.value.showHiraganaOnly)

function back() {
  store.send('nav.go', { screen: backScreen.value })
}

function toggle(field) {
  if (field === 'showStartReading' && startReadingDisabled.value) return
  store.send('settings.patch', { patch: { [session.mode]: { [field]: !settings.value[field] } } })
}
</script>

<template>
  <section class="settings">
    <header class="bar bar--sticky">
      <button class="icon-button" type="button" aria-label="返回" @click="back"><ArrowLeft :size="22" aria-hidden="true" /></button>
      <h1 class="bar-title">設定</h1>
      <span class="bar-spacer"></span>
    </header>

    <template v-if="mode === 'words'">
      <div class="row">
        <span class="row-label">顯示平假名注音</span>
        <button
          class="switch"
          :class="{ 'switch--on': settings.showReading }"
          type="button"
          role="switch"
          :aria-checked="settings.showReading"
          @click="toggle('showReading')"
        >
          <span class="switch-knob"></span>
        </button>
      </div>

      <span class="hrule" aria-hidden="true"></span>

      <div class="row">
        <span class="row-label">顯示例句</span>
        <button
          class="switch"
          :class="{ 'switch--on': settings.showExamples }"
          type="button"
          role="switch"
          :aria-checked="settings.showExamples"
          @click="toggle('showExamples')"
        >
          <span class="switch-knob"></span>
        </button>
      </div>
    </template>

    <template v-if="mode === 'card'">
      <div class="row" :class="{ 'row--disabled': startReadingDisabled }">
        <span class="row-label">一開始顯示讀音</span>
        <button
          class="switch"
          :class="{ 'switch--on': settings.showStartReading }"
          type="button"
          role="switch"
          :aria-checked="settings.showStartReading"
          :disabled="startReadingDisabled"
          :aria-disabled="startReadingDisabled ? 'true' : undefined"
          @click="toggle('showStartReading')"
        >
          <span class="switch-knob"></span>
        </button>
      </div>

      <span class="hrule" aria-hidden="true"></span>

      <div class="row">
        <span class="row-label">只顯示平假名</span>
        <button
          class="switch"
          :class="{ 'switch--on': settings.showHiraganaOnly }"
          type="button"
          role="switch"
          :aria-checked="settings.showHiraganaOnly"
          @click="toggle('showHiraganaOnly')"
        >
          <span class="switch-knob"></span>
        </button>
      </div>

      <span class="hrule" aria-hidden="true"></span>

      <div class="row">
        <span class="row-label">顯示平假名注音</span>
        <button
          class="switch"
          :class="{ 'switch--on': settings.showReading }"
          type="button"
          role="switch"
          :aria-checked="settings.showReading"
          @click="toggle('showReading')"
        >
          <span class="switch-knob"></span>
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.settings {
  min-height: 100%;
  padding-bottom: max(10px, env(safe-area-inset-bottom));
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 52px;
}

.row-label {
  font-size: 0.95rem;
}

.row--disabled .row-label {
  color: var(--muted);
}

.switch {
  position: relative;
  width: 52px;
  height: 32px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--tint-strong);
  cursor: pointer;
  transition: background 180ms ease;
  padding: 0;
}

.switch--on {
  background: var(--accent);
  border-color: var(--accent);
}

.switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.switch-knob {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--knob);
  transition: transform 180ms ease;
  box-shadow: var(--shadow-knob);
}

.switch--on .switch-knob {
  transform: translateX(20px);
}
</style>
