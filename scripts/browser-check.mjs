// Browser walk-through against the built site (vite preview).
// Usage: node scripts/browser-check.mjs
// Env: PORT (default 5199), CHROMIUM_PATH, SHOT_DIR, --screenshots
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const PORT = Number(process.env.PORT || 5199)

// GitHub Pages serves this repository as a project site, so the site and its
// assets live under this subpath. `vite preview` honours the same base, so the
// walk-through must start there and not at the server root.
const SITE_BASE = '/study-minna-no-nihongo-vocabulary-basic/'
const BASE = `http://localhost:${PORT}${SITE_BASE}`
const EXE =
  process.env.CHROMIUM_PATH ||
  '/home/mane/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome'
const SHOT_DIR = process.env.SHOT_DIR || path.join('/tmp', 'words-shots')
const WANT_SHOTS = process.argv.includes('--screenshots')

const failures = []
const notes = []

function check(name, ok, detail = '') {
  if (ok) notes.push(`ok   ${name}`)
  else failures.push(`FAIL ${name} ${detail}`)
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Read a rendered word with any <rt> ruby annotation removed, so the visible
// headword text (not the reading) is what the checks compare.
async function wordText(page, selector = '.reader-page--current .word') {
  return page.locator(selector).evaluate((el) => {
    const clone = el.cloneNode(true)
    clone.querySelectorAll('rt').forEach((rt) => rt.remove())
    return clone.textContent.trim()
  })
}

async function waitForServer(timeout = 30000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE)
      if (response.ok) return
    } catch {
      /* not up yet */
    }
    await wait(300)
  }
  throw new Error(`preview server did not start on ${BASE}`)
}

// Spawn the local Vite binary directly (not `npx`): `npx` wraps the process in
// npm, so killing the wrapper would leave the real server holding the port.
const viteBin = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'node_modules', 'vite', 'bin', 'vite.js')
const server = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
})
let serverLog = ''
server.stdout.on('data', (chunk) => (serverLog += chunk))
server.stderr.on('data', (chunk) => (serverLog += chunk))

let browser = null
try {
  await waitForServer()
  browser = await chromium.launch({ executablePath: EXE, headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`))

  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForSelector('.loading', { timeout: 10000 })

  const servedBase = await page.evaluate(() => document.baseURI)
  check('the site is served under the Pages subpath', servedBase.endsWith(SITE_BASE), servedBase)

  const headMeta = await page.evaluate(async () => {
    const linkOf = (selector) => {
      const link = document.querySelector(selector)
      if (!link) return null
      return { href: link.href, sizes: link.getAttribute('sizes') || '', type: link.getAttribute('type') || '' }
    }
    const probe = async (href) => {
      if (!href) return { status: 0, type: '', bytes: 0, ok: false }
      const response = await fetch(href)
      const blob = await response.blob()
      return {
        status: response.status,
        type: response.headers.get('content-type') || '',
        bytes: blob.size,
        ok: response.ok,
      }
    }
    const icons = {
      ico: linkOf('link[rel="icon"][href$=".ico"]'),
      png32: linkOf('link[rel="icon"][type="image/png"][sizes="32x32"]'),
      png192: linkOf('link[rel="icon"][type="image/png"][sizes="192x192"]'),
      touch: linkOf('link[rel="apple-touch-icon"]'),
    }
    return {
      title: document.title,
      icons,
      ico: await probe(icons.ico && icons.ico.href),
      png32: await probe(icons.png32 && icons.png32.href),
      png192: await probe(icons.png192 && icons.png192.href),
      touch: await probe(icons.touch && icons.touch.href),
    }
  })
  check('the document title is 大家の單詞', headMeta.title === '大家の單詞', headMeta.title)
  check(
    'the head declares a favicon and a touch icon',
    Boolean(headMeta.icons.ico && headMeta.icons.png192 && headMeta.icons.touch),
    JSON.stringify(headMeta.icons),
  )
  check(
    'every icon URL lives under the Pages subpath',
    [headMeta.icons.ico, headMeta.icons.png32, headMeta.icons.png192, headMeta.icons.touch]
      .every((icon) => icon && icon.href.includes(SITE_BASE)),
    [headMeta.icons.ico, headMeta.icons.touch].map((icon) => icon && icon.href).join(' '),
  )
  check(
    'the favicon is served as an image',
    headMeta.ico.ok && headMeta.ico.bytes > 0 && /image/.test(headMeta.ico.type),
    `${headMeta.ico.status} ${headMeta.ico.type} ${headMeta.ico.bytes}B`,
  )
  check(
    'the 32px and 192px favicons are served as images',
    headMeta.png32.ok && headMeta.png192.ok && headMeta.png32.bytes > 0 && headMeta.png192.bytes > 0,
    `${headMeta.png32.status}/${headMeta.png192.status}`,
  )
  check(
    'the iOS touch icon is served as an image',
    headMeta.touch.ok && headMeta.touch.bytes > 0 && /image/.test(headMeta.touch.type),
    `${headMeta.touch.status} ${headMeta.touch.type} ${headMeta.touch.bytes}B`,
  )

  const logo = page.locator('.loading-logo')
  check('loading shows the site logo', (await logo.count()) === 1)
  const logoSrc = (await logo.getAttribute('src')) || ''
  check(
    'logo is served under the Pages base, not a docs path',
    logoSrc.includes(SITE_BASE) && !logoSrc.includes('/docs/'),
    logoSrc,
  )
  check('loading shows the circular spinner', (await page.locator('.loader').count()) === 1)
  check('loading has no Loading ... line', (await page.locator('.loading-text').count()) === 0)
  check('loading has no linear progress bar', (await page.locator('.progress-track').count()) === 0)
  check(
    'loading shows the build credit alone',
    (await page.locator('.loading .footer-link').textContent()).trim() === 'Build with ❤ by Mane',
  )
  check('loading has no bug line', (await page.locator('.loading .footer-feedback').count()) === 0)
  check('loading has no theme switch', (await page.locator('.loading .theme-toggle').count()) === 0)

  await page.waitForSelector('.home-actions', { timeout: 30000 })
  check('reaches home after boot', true)

  const headTitle = (await page.locator('.site-title').textContent()).trim()
  check('the large head reads 大家の日本語', headTitle === '大家の日本語', headTitle)

  const headSubtitle = (await page.locator('.site-subtitle').textContent()).trim()
  check('the accent line reads 單詞練習', headSubtitle === '單詞練習', headSubtitle)

  const headLede = (await page.locator('.site-lede').textContent()).trim()
  check('the lede reads 涵蓋初級 1 – 50 課的單詞', headLede === '涵蓋初級 1 – 50 課的單詞', headLede)

  const buttons = await page.locator('.home-actions button').allTextContents()
  const labels = buttons.map((text) => text.trim())
  check(
    'home has exactly three primary buttons',
    labels.length === 3,
    JSON.stringify(labels),
  )
  check(
    'the buttons read 單詞 / 練習 / 測驗 in order',
    labels[0] === '單詞' && labels[1] === '練習' && labels[2] === '測驗',
    JSON.stringify(labels),
  )

  const bodyText = (await page.locator('body').textContent()) || ''
  for (const forbidden of ['學習', '翻卡練習', '字典']) {
    check(`the string ${forbidden} is absent`, !bodyText.includes(forbidden), forbidden)
  }

  // Theme switch on home: it sits on the 單詞練習 subtitle line, not the title.
  check('home shows the theme switch', (await page.locator('.theme-toggle').count()) === 1)
  const toggleBox = await page.evaluate(() => {
    const button = document.querySelector('.theme-toggle')
    const column = document.querySelector('.column')
    const subtitle = document.querySelector('.site-subtitle')
    if (!button || !column || !subtitle) return null
    const b = button.getBoundingClientRect()
    const c = column.getBoundingClientRect()
    const s = subtitle.getBoundingClientRect()
    return {
      rightGap: Math.round(c.right - b.right),
      centerDelta: Math.round(b.top + b.height / 2 - (s.top + s.height / 2)),
      gapAfterWord: Math.round(b.left - s.right),
      label: button.getAttribute('aria-label'),
      pressed: button.getAttribute('aria-pressed'),
    }
  })
  check(
    'the theme toggle hugs the 習 of 單詞練習 on that line',
    Boolean(toggleBox) && Math.abs(toggleBox.centerDelta) <= 4 &&
      toggleBox.gapAfterWord >= 4 && toggleBox.gapAfterWord <= 20,
    JSON.stringify(toggleBox),
  )
  check(
    'the subtitle stays centred while the button sits beside it',
    await page.evaluate(() => {
      const column = document.querySelector('.column')
      const subtitle = document.querySelector('.site-subtitle')
      const c = column.getBoundingClientRect()
      const s = subtitle.getBoundingClientRect()
      return Math.abs(s.left + s.width / 2 - (c.left + c.right) / 2) <= 1
    }),
  )
  const toggleLabelBefore = await page.locator('.theme-toggle').getAttribute('aria-label')
  const pressedBefore = await page.locator('.theme-toggle').getAttribute('aria-pressed')
  const htmlThemeBefore = await page.evaluate(() => document.documentElement.dataset.theme || null)
  await page.locator('.theme-toggle').click()
  const htmlThemeAfter = await page.evaluate(() => document.documentElement.dataset.theme)
  const storedTheme = await page.evaluate(() => localStorage.getItem('study-minna-no-nihongo-vocabulary-basic-theme'))
  const toggleLabelAfter = await page.locator('.theme-toggle').getAttribute('aria-label')
  const pressedAfter = await page.locator('.theme-toggle').getAttribute('aria-pressed')
  check(
    'the theme switch flips the theme',
    htmlThemeBefore !== htmlThemeAfter && htmlThemeAfter === 'dark',
    `${htmlThemeBefore} -> ${htmlThemeAfter}`,
  )
  check('the toggle stores study-minna-no-nihongo-vocabulary-basic-theme', storedTheme === 'dark', String(storedTheme))
  check(
    'the toggle label names the theme it will switch to',
    toggleLabelAfter === '切換為淺色模式' && pressedAfter === 'true',
    `${toggleLabelBefore} -> ${toggleLabelAfter} / ${pressedAfter}`,
  )

  // About sheet (home footer).
  await page.locator('.home .footer-link').click()
  check('the footer opens the About sheet', (await page.locator('.sheet').count()) === 1)
  const repoHref = await page.locator('.sheet-repo').getAttribute('href')
  check(
    'the About sheet links to this repo',
    repoHref === 'https://github.com/manesec-web/study-minna-no-nihongo-vocabulary-basic',
    String(repoHref),
  )
  const issueHref = await page.locator('.sheet-issue').getAttribute('href')
  check(
    'the issue link points at the issue list',
    issueHref === 'https://github.com/manesec-web/study-minna-no-nihongo-vocabulary-basic/issues/',
    String(issueHref),
  )
  const mailHref = await page.locator('.sheet-mail').getAttribute('href')
  check('the mail link is a mailto to Mane', mailHref === 'mailto:mane@manesec.com', String(mailHref))
  await page.locator('.sheet .button').click()
  check('the About sheet closes', (await page.locator('.sheet').count()) === 0)

  // Quiz setup screen.
  await page.locator('.home-actions button', { hasText: '測驗' }).click()
  await page.waitForSelector('.quiz-setup', { timeout: 5000 })
  check('測驗 opens the quiz setup screen', (await page.locator('.quiz-setup').count()) === 1)
  check('the quiz title is 測驗', (await page.locator('.quiz-setup .bar-title').textContent()).trim() === '測驗')
  check('quiz setup shows 50 lesson chips', (await page.locator('.quiz-setup .chip-grid .chip--lesson').count()) === 50)
  check('quiz setup has no input', (await page.locator('.quiz-setup input').count()) === 0)
  check('quiz setup has no key', (await page.locator('.quiz-setup .quiz-key').count()) === 0)
  const quizSections = await page.locator('.quiz-setup .section-label').allTextContents()
  check(
    'quiz setup lists 課次/單詞數量/模式/生命/時間',
    ['課次', '單詞數量', '模式', '生命', '時間'].every((label) => quizSections.includes(label)),
    quizSections.join('|'),
  )
  const quizModeChips = await page.locator('.quiz-setup .chip--mode').allTextContents()
  check(
    'quiz setup lists 隨機模式 plus the 24 concrete modes',
    quizModeChips.length === 25,
    quizModeChips.join('|'),
  )
  check(
    'quiz setup omits the retired 假名重組, 卡片塔 and 音拍猜謎 modes',
    !quizModeChips.some((label) => label.includes('假名重組') || label.includes('卡片塔') || label.includes('音拍猜謎')),
    quizModeChips.join('|'),
  )
  const quizStartBefore = await page.locator('.quiz-start').textContent()
  check(
    'quiz 開始 stays disabled until a lesson is selected',
    (await page.locator('.quiz-start').isDisabled()) &&
      quizStartBefore.trim() === '請至少選擇一門課程才可以開始',
    quizStartBefore.trim(),
  )
  await page.locator('.quiz-setup .chip-grid .chip--lesson', { hasText: '第1課' }).click()
  check('selecting a lesson enables quiz 開始', await page.locator('.quiz-start').isEnabled())
  await page.locator('.quiz-start').click()
  await page.waitForSelector('.quiz-play', { timeout: 5000 })
  check('quiz 開始 opens the play screen', (await page.locator('.quiz-play').count()) === 1)
  check('the play screen runs the first concrete mode', (await page.locator('.quiz-round').count()) === 1)
  check('the choice board renders', (await page.locator('.quiz-play .choice-grid').count()) === 1)
  check('the play screen has no input', (await page.locator('.quiz-play input').count()) === 0)

  // The 10s 提示 button: it must appear only after the actionable clock has run.
  check('the hint button is hidden before 10s', (await page.locator('.quiz-hint-button').count()) === 0)
  await page.waitForSelector('.quiz-hint-button', { timeout: 12000 })
  const hintLabel = (await page.locator('.quiz-hint-button').textContent()).trim()
  check('the hint button appears after 10s and reads 提示', hintLabel === '提示', hintLabel)
  await page.locator('.quiz-hint-button').click()
  await wait(120)
  check('pressing 提示 highlights the correct choice', (await page.locator('.quiz-play .choice--hint').count()) === 1)

  await page.locator('.quiz-play .icon-button').click()
  await page.waitForSelector('.home-actions', { timeout: 5000 })
  check('quiz play back returns home', (await page.locator('.home-actions').count()) === 1)

  // 隨機模式 draw: a 3×3 board of nine face-down cards, one tap reveals a mode.
  await page.locator('.home-actions button', { hasText: '測驗' }).click()
  await page.waitForSelector('.quiz-setup', { timeout: 5000 })
  const drawLesson = page.locator('.quiz-setup .chip-grid .chip--lesson', { hasText: '第1課' })
  if ((await drawLesson.getAttribute('aria-pressed')) !== 'true') await drawLesson.click()
  await page.locator('.quiz-setup .chip--mode', { hasText: '隨機模式' }).click()
  await page.locator('.quiz-start').click()
  await page.waitForSelector('.quiz-draw', { timeout: 5000 })
  check('隨機模式 opens the draw board', (await page.locator('.quiz-draw').count()) === 1)
  check('the draw board has nine cards', (await page.locator('.draw-card').count()) === 9)
  const drawColumns = await page
    .locator('.draw-board')
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
  check('the draw board is three columns wide', drawColumns === 3, `columns=${drawColumns}`)
  await page.locator('.draw-card').first().click()
  await page.waitForSelector('.quiz-round', { timeout: 9000 })
  check('tapping a draw card enters the drawn mode', (await page.locator('.quiz-round').count()) === 1)
  const drawnMode = (await page.locator('.quiz-mode-label').textContent()).trim()
  check(
    'the drawn mode is a concrete mode, not the 隨機模式 lobby label',
    drawnMode.length > 0 && drawnMode !== '隨機模式',
    drawnMode,
  )
  await page.locator('.quiz-play .icon-button').click()
  await page.waitForSelector('.home-actions', { timeout: 5000 })
  check('quiz play back returns home after the draw', (await page.locator('.home-actions').count()) === 1)

  // ---- Follow-up quiz mode regressions: pairs / match3 / connect / boss / reaction ----

  async function setTheme(value) {
    await page.evaluate((v) => {
      localStorage.setItem('study-minna-no-nihongo-vocabulary-basic-theme', v)
      document.documentElement.dataset.theme = v
    }, value)
  }

  async function seedQuizAndStart(mode, lessons = [16]) {
    await page.evaluate(([m, ls]) => {
      localStorage.setItem(
        'study-minna-no-nihongo-vocabulary-basic-quiz',
        JSON.stringify({ lessons: ls, count: 'all', modes: [m], random: false, lives: 10, time: 'infinite' }),
      )
    }, [mode, lessons])
    await page.reload({ waitUntil: 'load' })
    await page.waitForSelector('.home-actions', { timeout: 30000 })
    await page.locator('.home-actions button', { hasText: '測驗' }).click()
    await page.waitForSelector('.quiz-setup', { timeout: 5000 })
    await page.locator('.quiz-start').click()
    await page.waitForSelector('.quiz-round', { timeout: 5000 })
  }

  async function quizBackHome() {
    await page.locator('.quiz-play .icon-button').click()
    await page.waitForSelector('.home-actions', { timeout: 5000 })
  }

  // 翻卡配對: a fixed 4×5 board and a 3s peek bar that must finish before play.
  await seedQuizAndStart('pairs', [16])
  const pairsPeek = await page.evaluate(() => ({
    dealUp: document.querySelectorAll('.pair-card--deal-up').length,
    bar: document.querySelectorAll('.pairs-peek').length,
    cols: (() => {
      const grid = document.querySelector('.pairs-grid')
      return grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0
    })(),
  }))
  check('pairs deal reveals every card face-up during the opening peek', pairsPeek.dealUp === 20, JSON.stringify(pairsPeek))
  check('pairs shows a peek progress bar', pairsPeek.bar === 1, JSON.stringify(pairsPeek))
  check('pairs grid is 4 columns', pairsPeek.cols === 4, JSON.stringify(pairsPeek))
  await wait(1000)
  const pairsMidPeek = await page.evaluate(() => {
    const card = document.querySelector('.pair-card')
    return {
      open: document.querySelectorAll('.pair-card--open').length,
      disabled: card ? card.disabled : null,
      bar: document.querySelectorAll('.pairs-peek').length,
    }
  })
  check('pairs stays face-up and locked mid-peek', pairsMidPeek.open === 0 && pairsMidPeek.disabled === true && pairsMidPeek.bar === 1, JSON.stringify(pairsMidPeek))
  await wait(3200)
  const pairsClosed = await page.evaluate(() => {
    const card = document.querySelector('.pair-card:not(.pair-card--open)')
    if (!card) return null
    const front = card.querySelector('.pair-card-front')
    const back = card.querySelector('.pair-card-back')
    const inner = card.querySelector('.pair-card-inner')
    const backStyle = getComputedStyle(back)
    return {
      frontText: front?.textContent?.trim(),
      backText: back?.textContent?.trim(),
      backTransform: backStyle.transform,
      backface: backStyle.backfaceVisibility || backStyle.webkitBackfaceVisibility,
      innerTransform: getComputedStyle(inner).transform,
      bar: document.querySelectorAll('.pairs-peek').length,
    }
  })
  check('pairs start face-down with ? visible', pairsClosed && pairsClosed.frontText === '?', JSON.stringify(pairsClosed))
  check(
    'pairs text face is visually hidden when closed',
    pairsClosed && pairsClosed.backface === 'hidden' && pairsClosed.backTransform !== 'none',
    JSON.stringify(pairsClosed),
  )
  check('pairs peek bar is gone once play begins', pairsClosed && pairsClosed.bar === 0, JSON.stringify(pairsClosed))
  check('no 正確/錯誤 feedback text is rendered', (await page.locator('.quiz-feedback').count()) === 0)
  await page.locator('.pair-card').first().click()
  await wait(300)
  check('a tap opens the pair card', (await page.locator('.pair-card--open').count()) === 1)
  await page.setViewportSize({ width: 1024, height: 800 })
  await wait(250)
  const pairsDesktopCols = await page.evaluate(() => {
    const grid = document.querySelector('.pairs-grid')
    return grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0
  })
  check('pairs grid stays 4 columns on desktop', pairsDesktopCols === 4, `cols=${pairsDesktopCols}`)
  await page.setViewportSize({ width: 390, height: 844 })
  await wait(200)
  await quizBackHome()

  // 消除下落: wait for the opening drop-in to settle, then read data-word ids,
  // find a real connected 3+ group, click it.
  await seedQuizAndStart('match3', [16])
  await wait(700)
  const match3Group = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('.match3-cell'))
    const words = els.map((el) => Number(el.dataset.word))
    const cleared = els.map((el) => el.disabled)
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    for (let start = 0; start < 25; start += 1) {
      if (cleared[start]) continue
      const word = words[start]
      const seen = new Set([start])
      const stack = [start]
      const order = []
      while (stack.length) {
        const cur = stack.pop()
        order.push(cur)
        const row = Math.floor(cur / 5)
        const col = cur % 5
        for (const [dr, dc] of dirs) {
          const nr = row + dr
          const nc = col + dc
          if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) continue
          const nb = nr * 5 + nc
          if (cleared[nb] || words[nb] !== word || seen.has(nb)) continue
          seen.add(nb)
          stack.push(nb)
        }
      }
      if (order.length >= 3) return order
    }
    return null
  })
  check('match3 renders a clickable 3+ same-word group', Array.isArray(match3Group) && match3Group.length >= 3, JSON.stringify(match3Group))
  const match3LivesBefore = (await page.locator('.hud-item').first().textContent()).trim()
  const match3ScoreBefore = (await page.locator('.hud-item').nth(1).textContent()).trim()
  if (Array.isArray(match3Group)) {
    for (const index of match3Group) {
      await page.locator('.match3-cell').nth(index).click()
      await wait(40)
    }
    await wait(350)
  }
  const match3LivesAfter = (await page.locator('.hud-item').first().textContent()).trim()
  const match3ScoreAfter = (await page.locator('.hud-item').nth(1).textContent()).trim()
  check('match3 legal path costs no life', match3LivesAfter === match3LivesBefore, `${match3LivesBefore} -> ${match3LivesAfter}`)
  check('match3 legal path clears and scores', match3ScoreAfter !== match3ScoreBefore, `${match3ScoreBefore} -> ${match3ScoreAfter}`)
  await quizBackHome()

  // 路徑連接: visible surfaces, cleared cells empty, board fits, path draws + clears.
  await setTheme('light')
  await seedQuizAndStart('connect', [16])
  const connectOpen = await page.evaluate(() => {
    const board = document.querySelector('.connect-board')
    const cells = Array.from(document.querySelectorAll('.connect-cell'))
    const uncleared = cells.filter((el) => !el.disabled)
    const style = getComputedStyle(uncleared[0])
    const rect = board.getBoundingClientRect()
    return {
      total: cells.length,
      uncleared: uncleared.length,
      bg: style.backgroundColor,
      border: style.borderTopColor,
      boardRight: rect.right,
      viewport: window.innerWidth,
      noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
    }
  })
  check(
    'connect board fits without horizontal page overflow',
    connectOpen.noOverflow && connectOpen.boardRight <= connectOpen.viewport,
    JSON.stringify(connectOpen),
  )
  check(
    'connect uncleared cells have a visible surface and border',
    connectOpen.total === 40 && connectOpen.uncleared === 40 && connectOpen.bg !== 'rgba(0, 0, 0, 0)' && connectOpen.border !== 'rgba(0, 0, 0, 0)',
    JSON.stringify(connectOpen),
  )

  const connectPair = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('.connect-cell'))
    const words = els.map((el) => Number(el.dataset.word))
    const cols = 5
    const rows = 8
    for (let i = 0; i < els.length; i += 1) {
      const row = Math.floor(i / cols)
      const col = i % cols
      const neighbours = []
      if (row > 0) neighbours.push(i - cols)
      if (row < rows - 1) neighbours.push(i + cols)
      if (col > 0) neighbours.push(i - 1)
      if (col < cols - 1) neighbours.push(i + 1)
      for (const j of neighbours) if (words[i] === words[j]) return [i, j]
    }
    return null
  })
  check('connect has an adjacent same-word pair', Array.isArray(connectPair) && connectPair.length === 2, JSON.stringify(connectPair))
  if (Array.isArray(connectPair)) {
    await page.locator('.connect-cell').nth(connectPair[0]).click()
    await page.locator('.connect-cell').nth(connectPair[1]).click()
    await wait(120)
    check('connect draws the path before clearing', (await page.locator('.connect-path').count()) === 1)
    const alignment = await page.evaluate((firstIndex) => {
      const board = document.querySelector('.connect-board')
      const poly = document.querySelector('.connect-path polyline')
      const cells = Array.from(document.querySelectorAll('.connect-cell'))
      const cell = cells[firstIndex]
      if (!poly || !cell || !board) return null
      const boardRect = board.getBoundingClientRect()
      const cellRect = cell.getBoundingClientRect()
      const firstPoint = (poly.getAttribute('points') || '').trim().split(/\s+/)[0].split(',')
      return {
        px: Number(firstPoint[0]) + boardRect.left,
        py: Number(firstPoint[1]) + boardRect.top,
        cx: cellRect.left + cellRect.width / 2,
        cy: cellRect.top + cellRect.height / 2,
      }
    }, connectPair[0])
    check(
      'connect path point aligns with its first cell centre',
      alignment && Math.abs(alignment.px - alignment.cx) < 6 && Math.abs(alignment.py - alignment.cy) < 6,
      JSON.stringify(alignment),
    )
    await wait(900)
    const clearedCount = await page.evaluate(() => Array.from(document.querySelectorAll('.connect-cell')).filter((el) => el.disabled).length)
    check('connect clears exactly the two connected cells', clearedCount === 2, `cleared=${clearedCount}`)
    const clearedStyle = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('.connect-cell')).find((e) => e.disabled)
      if (!el) return null
      const style = getComputedStyle(el)
      return { bg: style.backgroundColor, border: style.borderTopColor }
    })
    check('connect cleared cells are empty (transparent)', clearedStyle && clearedStyle.bg === 'rgba(0, 0, 0, 0)' && clearedStyle.border === 'rgba(0, 0, 0, 0)', JSON.stringify(clearedStyle))
  }
  // Desktop resize: the same board must still fit and not overflow.
  await page.setViewportSize({ width: 1024, height: 800 })
  await wait(250)
  const connectDesktop = await page.evaluate(() => {
    const board = document.querySelector('.connect-board')
    const rect = board.getBoundingClientRect()
    return { boardRight: rect.right, viewport: window.innerWidth, noOverflow: document.documentElement.scrollWidth <= window.innerWidth }
  })
  check('connect board still fits at desktop width', connectDesktop.noOverflow && connectDesktop.boardRight <= connectDesktop.viewport, JSON.stringify(connectDesktop))
  await page.setViewportSize({ width: 390, height: 844 })
  await wait(200)
  await quizBackHome()

  // Dark theme surface re-check for 路徑連接 uncleared cells.
  await setTheme('dark')
  await seedQuizAndStart('connect', [16])
  const connectDark = await page.evaluate(() => {
    const uncleared = Array.from(document.querySelectorAll('.connect-cell')).find((el) => !el.disabled)
    if (!uncleared) return null
    const style = getComputedStyle(uncleared)
    return { bg: style.backgroundColor, border: style.borderTopColor }
  })
  check('connect uncleared cells stay visible in dark theme', connectDark && connectDark.bg !== 'rgba(0, 0, 0, 0)' && connectDark.border !== 'rgba(0, 0, 0, 0)', JSON.stringify(connectDark))
  await quizBackHome()
  await setTheme('light')

  // Boss 戰: wrong answer must not widen the HP bar; correct must narrow it.
  // The picked choice is marked with an icon only (no 正確/錯誤 text) in a slot
  // that never moves the label, and the shell moves on by itself — ~3s after a
  // wrong answer, ~0.5s after a correct one. There is no 確定 step.
  const textLeftOf = (selector) =>
    page.evaluate((sel) => {
      const text = document.querySelector(sel)
      return text ? text.getBoundingClientRect().left : null
    }, selector)
  const pickedState = () =>
    page.evaluate(() => {
      const picked = document.querySelector('.choice--picked-wrong, .choice--picked-correct')
      const mark = picked?.querySelector('.choice-mark') ?? null
      const text = picked?.querySelector('.choice-text') ?? null
      return {
        mark: mark ? mark.textContent.trim() : null,
        markHidden: mark ? mark.getAttribute('aria-hidden') : null,
        textLeft: text ? text.getBoundingClientRect().left : null,
        reveal: document.querySelectorAll('.quiz-reveal').length,
        markText: mark ? mark.textContent : null,
      }
    })
  await seedQuizAndStart('boss', [16])
  const bossWidthBefore = await page.evaluate(() => document.querySelector('.hp-fill')?.getBoundingClientRect().width ?? null)
  const bossWrongLabelBefore = await textLeftOf('.choice[data-correct="false"] .choice-text')
  const bossWrongAt = Date.now()
  await page.locator('.choice[data-correct="false"]').first().click()
  await wait(300)
  const bossWidthAfterWrong = await page.evaluate(() => document.querySelector('.hp-fill')?.getBoundingClientRect().width ?? null)
  check('boss wrong answer does not widen the HP bar', bossWidthBefore !== null && bossWidthAfterWrong !== null && bossWidthAfterWrong <= bossWidthBefore + 1, `${bossWidthBefore} -> ${bossWidthAfterWrong}`)
  const bossWrong = await pickedState()
  check(
    'boss wrong mark is the ✗ icon alone, hidden from assistive tech, with no 確定 step',
    bossWrong.mark === '✗' && bossWrong.markHidden === 'true' && bossWrong.reveal === 0 && !/正確|錯誤/.test(bossWrong.markText ?? ''),
    JSON.stringify(bossWrong),
  )
  check(
    'boss wrong mark does not move the choice label',
    bossWrongLabelBefore !== null && bossWrong.textLeft !== null && Math.abs(bossWrong.textLeft - bossWrongLabelBefore) < 0.5,
    `${bossWrongLabelBefore} -> ${bossWrong.textLeft}`,
  )
  await page.waitForFunction(
    () => !document.querySelector('.choice--picked-wrong') && Boolean(document.querySelector('.choice[data-correct="true"]')),
    null,
    { timeout: 6000 },
  )
  const bossWrongHoldMs = Date.now() - bossWrongAt
  check('boss moves to the next question by itself ~3s after a wrong answer', bossWrongHoldMs >= 2000 && bossWrongHoldMs <= 5000, `${bossWrongHoldMs}ms`)

  const bossCorrectLabelBefore = await textLeftOf('.choice[data-correct="true"] .choice-text')
  const bossCorrectAt = Date.now()
  await page.locator('.choice[data-correct="true"]').first().click()
  await wait(150)
  const bossWidthAfterCorrect = await page.evaluate(() => document.querySelector('.hp-fill')?.getBoundingClientRect().width ?? null)
  check('boss correct answer narrows the HP bar', bossWidthBefore !== null && bossWidthAfterCorrect !== null && bossWidthAfterCorrect < bossWidthBefore, `${bossWidthBefore} -> ${bossWidthAfterCorrect}`)
  const bossCorrect = await pickedState()
  check(
    'boss correct mark is the ✓ icon alone and does not move the label',
    bossCorrect.mark === '✓' && bossCorrect.markHidden === 'true' && !/正確|錯誤/.test(bossCorrect.markText ?? '') && bossCorrect.reveal === 0 &&
      bossCorrectLabelBefore !== null && bossCorrect.textLeft !== null && Math.abs(bossCorrect.textLeft - bossCorrectLabelBefore) < 0.5,
    JSON.stringify({ bossCorrectLabelBefore, ...bossCorrect }),
  )
  await page.waitForFunction(() => !document.querySelector('.choice--picked-correct') && document.querySelector('.choice[data-correct="true"]'), null, { timeout: 4000 })
  const bossCorrectHoldMs = Date.now() - bossCorrectAt
  check('boss moves on by itself ~0.5s after a correct answer', bossCorrectHoldMs >= 300 && bossCorrectHoldMs <= 2000, `${bossCorrectHoldMs}ms`)
  await quizBackHome()

  // 快速反應: prompt/answer languages differ; wrong frame and stale text do not survive.
  await seedQuizAndStart('reaction', [16])
  const reactionMeta = await page.evaluate(() => {
    const prompt = document.querySelector('.board .prompt[data-face]')
    const cards = Array.from(document.querySelectorAll('.reaction-card'))
    return {
      promptFace: prompt?.dataset.face,
      answerFace: cards[0]?.dataset.face,
      total: cards.length,
      uniqueTexts: new Set(cards.map((c) => c.textContent.trim())).size,
      correctCount: cards.filter((c) => c.dataset.correct === 'true').length,
    }
  })
  check('reaction prompt and options use different languages', reactionMeta.promptFace && reactionMeta.answerFace && reactionMeta.promptFace !== reactionMeta.answerFace, JSON.stringify(reactionMeta))
  check('reaction has exactly one unique correct option', reactionMeta.correctCount === 1 && reactionMeta.uniqueTexts === reactionMeta.total, JSON.stringify(reactionMeta))

  const reactionPromptText = (await page.locator('.board .prompt[data-face] .prompt-text').textContent()).trim()
  check('reaction big prompt has no leading colon separator', !/^[:：]\s*/.test(reactionPromptText), reactionPromptText)

  const reactionPromptBefore = (await page.locator('.board .prompt[data-face] .prompt-text').textContent()).trim()
  await page.locator('.reaction-card[data-correct="false"]').first().click()
  await wait(150)
  const reactionPromptAfterWrong = (await page.locator('.board .prompt[data-face] .prompt-text').textContent()).trim()
  check('reaction wrong tap keeps the same target', reactionPromptAfterWrong === reactionPromptBefore, `${reactionPromptBefore} -> ${reactionPromptAfterWrong}`)
  check('reaction wrong tap flashes one card', (await page.locator('.reaction-card--flash').count()) === 1)
  await page.locator('.reaction-card[data-correct="true"]').first().click()
  await wait(300)
  check('reaction advance clears the flash frame', (await page.locator('.reaction-card--flash').count()) === 0)
  check('reaction advance leaves no 正確/錯誤 text', (await page.locator('.quiz-feedback').count()) === 0)

  // Sample a couple more questions: the big prompt never gains a leading colon
  // and the word text is left intact.
  for (let i = 0; i < 2; i += 1) {
    const prompt = (await page.locator('.board .prompt[data-face] .prompt-text').textContent()).trim()
    check(`reaction prompt sample ${i + 1} has no leading colon`, !/^[:：]\s*/.test(prompt), prompt)
    const correct = page.locator('.reaction-card[data-correct="true"]').first()
    if ((await correct.count()) > 0) {
      await correct.click()
      await wait(250)
    }
  }
  await quizBackHome()

  // 記憶順序: a bottom pile, tap to deal three slots, 2s countdown, then six
  // Chinese options placed into the slots one by one.
  await seedQuizAndStart('memory', [16])
  const memoryStack = await page.evaluate(() => ({
    slots: document.querySelectorAll('.memory-slot').length,
    pile: document.querySelectorAll('.memory-pile').length,
    pileCards: document.querySelectorAll('.memory-pile-card').length,
  }))
  check('memory opens with three slots and a bottom pile', memoryStack.slots === 3 && memoryStack.pile === 1 && memoryStack.pileCards === 3, JSON.stringify(memoryStack))
  check('memory has no 記住了 button', (await page.locator('.quiz-begin').count()) === 0)
  await page.locator('.memory-pile').click()
  await wait(1600)
  const memoryReveal = await page.evaluate(() => ({
    countdown: document.querySelectorAll('.memory-countdown').length,
    readable: Array.from(document.querySelectorAll('.memory-slot-front')).filter((el) => el.textContent.trim().length > 0).length,
  }))
  check('memory reveals three readable words then shows the 2s countdown', memoryReveal.countdown === 1 && memoryReveal.readable === 3, JSON.stringify(memoryReveal))
  await wait(2200)
  check('memory shows six Chinese options after the countdown', (await page.locator('.memory-options .choice').count()) === 6)
  for (let i = 0; i < 3; i += 1) {
    const choice = page.locator('.memory-options .choice:not([disabled])').first()
    if ((await choice.count()) > 0) {
      await choice.click()
      await wait(120)
    }
  }
  await wait(300)
  check('memory places three answers and flips to check', (await page.locator('.memory-slot--checked').count()) === 3)
  await quizBackHome()

  // New modes render their board and accept a core interaction without a page error.
  const newModeBoards = [
    ['swipe', '.swipe-card'],
    ['oddone', '.oddone-group'],
    ['fillblank', '.fillblank-options .choice'],
    ['wordle', '.wordle-pad .wordle-key'],
    ['crossword', '.crossword-grid'],
    ['falling', '.falling-cannons .falling-cannon'],
    ['whack', '.whack-grid .whack-hole'],
    ['nokanji', '.choice-grid .choice'],
    ['mahjong', '.mahjong-tile'],
    ['kanatrap', '.choice-grid .choice'],
    ['sushi', '.sushi-pad .sushi-key'],
    ['spottypo', '.oddone-group'],
    ['wordsearch', '.wordsearch-cell'],
    ['snake', '.snake-pad .button'],
    ['hangman', '.wordle-pad .wordle-key'],
  ]
  for (const [mode, selector] of newModeBoards) {
    await seedQuizAndStart(mode, Array.from({ length: 50 }, (_v, i) => i + 1))
    const count = await page.locator(selector).count()
    check(`${mode} renders its board`, count > 0, `${mode}: ${count}`)
    const first = page.locator(`${selector}:not([disabled])`).first()
    if ((await first.count()) > 0) {
      await first.click()
      await wait(180)
    }
    await quizBackHome()
  }

  // ---- Regression: the four quiz fixes (去漢字盲測 second question, 單字麻將 pile, 濁音排雷 10 per round, 單字貪食蛇 fine grid) ----

  const allLessons = Array.from({ length: 50 }, (_v, i) => i + 1)
  const livesText = async () => (await page.locator('.hud-item').first().textContent()).trim()
  const roundDone = async () => (await page.locator('.quiz-done').count()) === 1

  // 去漢字盲測: the board used to go blank after the first answer (the second
  // question was stored as undefined). Answer twice and the board must still
  // render a prompt and choices each time.
  await seedQuizAndStart('nokanji', [1, 2, 3])
  for (let question = 1; question <= 2; question += 1) {
    const before = (await page.locator('.quiz-round .prompt-text').textContent()).trim()
    await page.locator('.quiz-round .choice').first().click()
    await wait(150)
    if ((await page.locator('.quiz-reveal').count()) === 1) await page.locator('.quiz-reveal .button').click()
    // A correct answer holds ~1s before quiz.next; a reveal advances on 確定.
    await page.waitForFunction(
      (prev) => document.querySelector('.quiz-round .prompt-text')?.textContent.trim() !== prev,
      before,
      { timeout: 3000 },
    )
    await wait(120)
    const after = (await page.locator('.quiz-round .prompt-text').textContent()).trim()
    check(
      `nokanji renders question ${question + 1} after answering`,
      (await page.locator('.quiz-round .choice-grid .choice').count()) >= 2 && after.length > 0 && after !== before,
      `${before} -> ${after}`,
    )
  }
  await quizBackHome()

  // 單字麻將: a dense multi-layer pile with larger tiles, a seven-slot tray,
  // and a real play-through of the provable order (top layer first, then each
  // layer by rows from the left) that must clear the board without a life.
  await seedQuizAndStart('mahjong', allLessons)
  const mahjongOpen = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('.mahjong-tile'))
    const board = document.querySelector('.mahjong-board').getBoundingClientRect()
    const first = tiles[0].getBoundingClientRect()
    const layers = new Set(tiles.map((el) => el.style.zIndex))
    const lefts = new Set(tiles.map((el) => el.style.left))
    return {
      tiles: tiles.length,
      layers: layers.size,
      lefts: lefts.size,
      tileW: Math.round(first.width),
      tileH: Math.round(first.height),
      boardW: Math.round(board.width),
      boardH: Math.round(board.height),
      free: tiles.filter((el) => !el.disabled).length,
      tray: document.querySelectorAll('.mahjong-tray-slot').length,
    frameInner: (() => {
      const f = document.querySelector('.mahjong-frame')
      if (!f) return 0
      const s = getComputedStyle(f)
      return Math.round(f.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight))
    })(),
      noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
    }
  })
  check(
    'mahjong deals a dense multi-layer pile (≥ 24 tiles, ≥ 3 layers, ≥ 4 columns)',
    mahjongOpen.tiles >= 24 && mahjongOpen.layers >= 3 && mahjongOpen.lefts >= 4,
    JSON.stringify(mahjongOpen),
  )
  check(
    // The frame adds a 2px border + 8px padding around the pile, so the board
    // is measured against the frame's inner width rather than the old bare
    // play area; the tile must still beat the old 48×68 face.
    'mahjong tiles are larger than the old 48×68 and fill the frame width',
    mahjongOpen.tileW >= 52 &&
      mahjongOpen.tileH >= 68 &&
      mahjongOpen.boardW >= 336 &&
      mahjongOpen.boardW >= mahjongOpen.frameInner - 4 &&
      mahjongOpen.noOverflow,
    JSON.stringify(mahjongOpen),
  )
  check('mahjong tray has seven slots', mahjongOpen.tray === 7, JSON.stringify(mahjongOpen))
  check('mahjong opens with free tiles to tap', mahjongOpen.free >= 2, JSON.stringify(mahjongOpen))
  const mahjongLivesBefore = await livesText()
  await page.locator('.mahjong-tile:not([disabled])').first().click()
  await wait(200)
  check(
    'mahjong moves a tapped free tile into the tray',
    (await page.locator('.mahjong-tray-slot:not(.mahjong-tray-slot--empty)').count()) === 1,
  )
  let mahjongTaps = 1
  for (; mahjongTaps < 80 && !(await roundDone()); mahjongTaps += 1) {
    const next = await page.evaluate(() => {
      const tiles = Array.from(document.querySelectorAll('.mahjong-tile:not([disabled])'))
      if (tiles.length === 0) return -1
      const key = (el) => ({ z: Number(el.style.zIndex), top: parseFloat(el.style.top), left: parseFloat(el.style.left) })
      tiles.sort((a, b) => {
        const ka = key(a)
        const kb = key(b)
        return kb.z - ka.z || ka.top - kb.top || ka.left - kb.left
      })
      return tiles.indexOf(tiles[0])
    })
    if (next < 0) break
    await page.locator('.mahjong-tile:not([disabled])').nth(next).click()
    await wait(80)
  }
  await wait(300)
  const mahjongDoneTitle = (await page.locator('.quiz-done-title').textContent()).trim()
  check(
    'mahjong plays through to 清空 along the layer-by-layer order without losing a life',
    (await roundDone()) && mahjongDoneTitle === '本回合完成' && (await livesText()) === mahjongLivesBefore,
    `${mahjongTaps} taps, ${mahjongDoneTitle}, ${mahjongLivesBefore} -> ${await livesText()}`,
  )
  await quizBackHome()

  // 單字麻將 frame: at a narrow phone-ish width (like the annotated
  // screenshot, ~520px) the pile and the 7-slot tray must both live inside
  // one visible `.mahjong-frame`, with no tile, slot, or tile text
  // overflowing it while tiles are both on the pile and in the tray.
  await page.setViewportSize({ width: 520, height: 760 })
  await seedQuizAndStart('mahjong', allLessons)
  await page.locator('.mahjong-tile:not([disabled])').first().click()
  await wait(150)
  await page.locator('.mahjong-tile:not([disabled])').first().click()
  await wait(150)
  const mahjongFrame = await page.evaluate(() => {
    const frame = document.querySelector('.mahjong-frame')
    if (!frame) return { frame: false }
    const fr = frame.getBoundingClientRect()
    const inside = (el) => {
      const r = el.getBoundingClientRect()
      return (
        r.width === 0 ||
        (r.left >= fr.left - 1 && r.right <= fr.right + 1 && r.top >= fr.top - 1 && r.bottom <= fr.bottom + 1)
      )
    }
    const tiles = Array.from(frame.querySelectorAll('.mahjong-tile'))
    const slots = Array.from(frame.querySelectorAll('.mahjong-tray-slot'))
    const texts = Array.from(frame.querySelectorAll('.mahjong-tile-text')).filter((el) => el.textContent.trim())
    // Visual rule: a blocked tile keeps a solid body (no whole-tile opacity)
    // dimmed by the frost veil pseudo-element; a free tile is a solid card.
    const blocked = frame.querySelector('.mahjong-tile--blocked')
    const free = tiles.find((el) => !el.disabled)
    const opaque = (color) => color.startsWith('rgba') ? Number(color.split(',')[3]) === 1 : true
    return {
      frame: true,
      trayTiles: frame.querySelectorAll('.mahjong-tray-slot:not(.mahjong-tray-slot--empty)').length,
      pileTiles: tiles.length,
      border: getComputedStyle(frame).borderTopWidth,
      frameTiles: tiles.filter(inside).length,
      frameSlots: slots.filter(inside).length,
      texts: texts.length,
      frameTexts: texts.filter(inside).length,
      blockedSolid: blocked ? getComputedStyle(blocked).opacity === '1' : true,
      blockedVeil: blocked ? getComputedStyle(blocked, '::before').backgroundColor !== 'rgba(0, 0, 0, 0)' : true,
      freeSolid: free ? opaque(getComputedStyle(free).backgroundColor) : true,
      noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
    }
  })
  check(
    'mahjong pile + 7-slot tray live inside one visible frame at ~520px width',
    mahjongFrame.frame &&
      mahjongFrame.border !== '0px' &&
      mahjongFrame.pileTiles > 0 &&
      mahjongFrame.trayTiles >= 2 &&
      mahjongFrame.frameTiles === mahjongFrame.pileTiles &&
      mahjongFrame.frameSlots === 7 &&
      mahjongFrame.frameTexts === mahjongFrame.texts &&
      mahjongFrame.blockedSolid &&
      mahjongFrame.blockedVeil &&
      mahjongFrame.freeSolid &&
      mahjongFrame.noOverflow,
    JSON.stringify(mahjongFrame),
  )
  await quizBackHome()
  await page.setViewportSize({ width: 390, height: 844 })

  // 極速是非: two icon-only buttons (❌ / ⭕). A wrong judgement turns the
  // card and the pressed button red, and the next question comes by itself
  // after ~3s; a correct one moves on after ~0.5s. There is no 確定 step.
  await setTheme('light')
  await seedQuizAndStart('swipe', allLessons)
  const swipeButtons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.swipe-actions .button')).map((el) => ({
      text: el.textContent.trim(),
      label: el.getAttribute('aria-label'),
    })),
  )
  check(
    'swipe judges with icon-only ❌ / ⭕ buttons named for assistive tech',
    swipeButtons.length === 2 &&
      swipeButtons[0].text === '❌' &&
      swipeButtons[0].label === '錯誤配對' &&
      swipeButtons[1].text === '⭕' &&
      swipeButtons[1].label === '正確配對',
    JSON.stringify(swipeButtons),
  )
  const swipeWord = () => page.evaluate(() => Array.from(document.querySelectorAll('.swipe-card .prompt-text')).map((el) => el.textContent.trim()).join('|'))
  const swipeBefore = await swipeWord()
  const swipeLivesBefore = await livesText()
  const swipeWrongAt = Date.now()
  await page.locator('.swipe-actions .button[data-correct="false"]').click()
  await wait(200)
  const swipeWrong = await page.evaluate(() => {
    const card = document.querySelector('.swipe-card')
    const cardStyle = getComputedStyle(card)
    const button = document.querySelector('.swipe-action--wrong')
    const probe = document.createElement('span')
    probe.style.color = 'var(--error)'
    document.body.appendChild(probe)
    const error = getComputedStyle(probe).color
    probe.remove()
    return {
      cardClass: card.classList.contains('swipe-card--wrong'),
      cardBorder: cardStyle.borderTopColor,
      cardColor: cardStyle.color,
      error,
      wrongButton: Boolean(button),
      buttonBorder: button ? getComputedStyle(button).borderTopColor : null,
      reveal: document.querySelectorAll('.quiz-reveal').length,
    }
  })
  check(
    'swipe wrong judgement turns the card red (border and text) and the pressed button red',
    swipeWrong.cardClass && swipeWrong.wrongButton && swipeWrong.cardBorder === swipeWrong.error && swipeWrong.cardColor === swipeWrong.error && swipeWrong.buttonBorder === swipeWrong.error,
    JSON.stringify(swipeWrong),
  )
  await wait(900)
  check(
    'swipe wrong judgement costs one life and shows no 確定 step',
    (await livesText()) !== swipeLivesBefore && (await page.locator('.quiz-reveal').count()) === 0 && (await swipeWord()) === swipeBefore,
    `${swipeLivesBefore} -> ${await livesText()}`,
  )
  await page.waitForFunction(
    (prev) => {
      const now = Array.from(document.querySelectorAll('.swipe-card .prompt-text')).map((el) => el.textContent.trim()).join('|')
      return now !== prev && !document.querySelector('.swipe-card--wrong')
    },
    swipeBefore,
    { timeout: 6000 },
  )
  const swipeWrongHoldMs = Date.now() - swipeWrongAt
  check('swipe changes to the next question ~3s after a wrong judgement', swipeWrongHoldMs >= 2000 && swipeWrongHoldMs <= 5000, `${swipeWrongHoldMs}ms`)

  const swipeCorrectBefore = await swipeWord()
  const swipeLivesAtCorrect = await livesText()
  const swipeCorrectAt = Date.now()
  await page.locator('.swipe-actions .button[data-correct="true"]').click()
  await wait(120)
  const swipeCorrectClass = await page.evaluate(() => document.querySelector('.swipe-card').classList.contains('swipe-card--correct'))
  check(
    'swipe correct judgement is marked and costs no life',
    swipeCorrectClass && (await livesText()) === swipeLivesAtCorrect,
    `${swipeLivesAtCorrect} -> ${await livesText()}`,
  )
  await page.waitForFunction(
    (prev) => {
      const now = Array.from(document.querySelectorAll('.swipe-card .prompt-text')).map((el) => el.textContent.trim()).join('|')
      return now !== prev && !document.querySelector('.swipe-card--correct')
    },
    swipeCorrectBefore,
    { timeout: 4000 },
  )
  const swipeCorrectHoldMs = Date.now() - swipeCorrectAt
  check('swipe changes to the next question ~0.5s after a correct judgement', swipeCorrectHoldMs >= 250 && swipeCorrectHoldMs <= 2000, `${swipeCorrectHoldMs}ms`)
  await quizBackHome()

  // 找出內鬼: a one-per-row list (one grid column, four distinct rows).
  await seedQuizAndStart('oddone', allLessons)
  const oddoneList = await page.evaluate(() => {
    const grid = document.querySelector('.oddone-grid')
    const groups = Array.from(document.querySelectorAll('.oddone-group'))
    const tops = groups.map((el) => Math.round(el.getBoundingClientRect().top))
    return {
      list: grid.classList.contains('oddone-grid--list'),
      cols: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      groups: groups.length,
      rows: new Set(tops).size,
      noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
    }
  })
  check(
    '找出內鬼 is a one-per-row list: 1 column, 4 rows, no overflow',
    oddoneList.list && oddoneList.cols === 1 && oddoneList.groups === 4 && oddoneList.rows === 4 && oddoneList.noOverflow,
    JSON.stringify(oddoneList),
  )
  await quizBackHome()

  // 猜假名 / 五十音劊子手: a 6×6 pad — 36 unique keys in 6 columns.
  for (const mode of ['wordle', 'hangman']) {
    await seedQuizAndStart(mode, allLessons)
    const pad = await page.evaluate(() => {
      const pad = document.querySelector('.wordle-pad')
      const keys = Array.from(document.querySelectorAll('.wordle-pad .wordle-key')).map((el) => el.textContent.trim())
      const first = document.querySelector('.wordle-pad .wordle-key').getBoundingClientRect()
      return {
        keys: keys.length,
        unique: new Set(keys).size,
        cols: getComputedStyle(pad).gridTemplateColumns.split(' ').length,
        keyW: Math.round(first.width),
        noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
      }
    })
    check(`${mode} pad is 6×6: 36 unique keys, 6 columns, wide keys, no overflow`, pad.keys === 36 && pad.unique === 36 && pad.cols === 6 && pad.keyW >= 44 && pad.noOverflow, JSON.stringify(pad))
    await quizBackHome()
  }

  // 濁音排雷: one round is 10 questions; the 10s hint clock restarts per
  // question (the button goes away when the next question starts and only
  // comes back after a fresh 10s).
  await seedQuizAndStart('kanatrap', [1, 2, 3])
  const kanatrapFirst = (await page.locator('.quiz-mode-hint').textContent()).trim()
  check('kanatrap opens on 第 1 / 10 題', kanatrapFirst.startsWith('第 1 / 10 題'), kanatrapFirst)
  await page.waitForSelector('.quiz-hint-button', { timeout: 12000 })
  let kanatrapAnswers = 0
  let kanatrapHintReset = false
  let kanatrapHighlighted = false
  while (kanatrapAnswers < 12 && !(await roundDone())) {
    if ((await page.locator('.quiz-reveal').count()) === 1) {
      await page.locator('.quiz-reveal .button').click()
      await wait(120)
      continue
    }
    if ((await page.locator('.quiz-round .choice').count()) === 0) break
    await page.locator('.quiz-round .choice').first().click()
    kanatrapAnswers += 1
    await wait(150)
    if ((await page.locator('.quiz-reveal').count()) === 1) {
      await page.locator('.quiz-reveal .button').click()
      await wait(120)
    } else {
      // The shell holds ~1s on a correct answer, then dispatches quiz.next.
      await page.waitForFunction(
        (n) => document.querySelector('.quiz-mode-hint')?.textContent.trim().startsWith(`第 ${n} /`) || document.querySelector('.quiz-done'),
        kanatrapAnswers + 1,
        { timeout: 3000 },
      )
    }
    await wait(100)
    if (kanatrapAnswers === 1) {
      kanatrapHintReset = (await page.locator('.quiz-hint-button').count()) === 0
      await page.waitForSelector('.quiz-hint-button', { timeout: 12000 })
      await page.locator('.quiz-hint-button').click()
      await wait(150)
      kanatrapHighlighted = (await page.locator('.quiz-round .choice--hint').count()) === 1
    }
  }
  const kanatrapDoneTitle = (await page.locator('.quiz-done-title').textContent()).trim()
  check('kanatrap ends after exactly 10 answers', kanatrapAnswers === 10 && (await roundDone()), `${kanatrapAnswers} answers`)
  check('kanatrap counts a completed 10-question round as cleared', kanatrapDoneTitle === '本回合完成', kanatrapDoneTitle)
  check('kanatrap hint button restarts on the second question', kanatrapHintReset && kanatrapHighlighted)
  await quizBackHome()

  // 單字貪食蛇: a fine grid of many small, mostly empty cells; one food cell;
  // direction keys reach the queue without an error.
  await seedQuizAndStart('snake', [1, 2, 3])
  const snakeOpen = await page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll('.snake-cell'))
    const grid = document.querySelector('.snake-grid').getBoundingClientRect()
    const first = cells[0].getBoundingClientRect()
    return {
      cells: cells.length,
      empty: cells.filter((el) => el.classList.contains('snake-cell--empty')).length,
      food: document.querySelectorAll('.snake-cell--food').length,
      head: document.querySelectorAll('.snake-cell--head').length,
      cellW: Math.round(first.width),
      gridW: Math.round(grid.width),
      gridH: Math.round(grid.height),
      pad: document.querySelectorAll('.snake-pad .button').length,
      noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
    }
  })
  check(
    'snake lays a fine grid of many small, mostly empty cells',
    snakeOpen.cells >= 200 && snakeOpen.empty / snakeOpen.cells >= 0.6 && snakeOpen.cellW <= 30,
    JSON.stringify(snakeOpen),
  )
  check('snake shows one head and one highlighted food cell', snakeOpen.head === 1 && snakeOpen.food === 1, JSON.stringify(snakeOpen))
  check('snake keeps its d-pad and fits the width', snakeOpen.pad === 4 && snakeOpen.noOverflow, JSON.stringify(snakeOpen))
  const headBefore = await page.evaluate(() => Array.from(document.querySelectorAll('.snake-cell')).findIndex((el) => el.classList.contains('snake-cell--head')))
  await page.keyboard.press('ArrowDown')
  await wait(1200)
  const headAfter = await page.evaluate(() => Array.from(document.querySelectorAll('.snake-cell')).findIndex((el) => el.classList.contains('snake-cell--head')))
  check('snake moves on a direction key', headAfter !== headBefore, `${headBefore} -> ${headAfter}`)

  // A wrong kana is eaten (the snake shrinks, no life lost) and comes back
  // after ~1s in an empty cell, through the view's delayed quiz.act respawn.
  const snakeCells = () => page.evaluate(() => Array.from(document.querySelectorAll('.snake-cell')).map((el) => el.className))
  let snakeRespawn = null
  for (let attempt = 0; attempt < 8 && !snakeRespawn; attempt += 1) {
    const classes = await snakeCells()
    const head = classes.findIndex((c) => c.includes('snake-cell--head'))
    const row = Math.floor(head / 13)
    let target = -1
    for (let r = row + 1; r < 17; r += 1) {
      const at = r * 13 + (head % 13)
      if (classes[at].includes('snake-cell--kana') && !classes[at].includes('snake-cell--food')) {
        target = at
        break
      }
    }
    if (target < 0) {
      await page.keyboard.press('ArrowRight')
      await wait(450)
      continue
    }
    const before = await page.evaluate(() => ({
      body: document.querySelectorAll('.snake-cell--body').length,
      kana: document.querySelectorAll('.snake-cell--kana').length,
      lives: document.querySelector('.hud-item').textContent.trim(),
    }))
    await page.keyboard.press('ArrowDown')
    await wait((Math.floor(target / 13) - row) * 400 + 60)
    const after = await page.evaluate(
      (at) => ({
        head: Array.from(document.querySelectorAll('.snake-cell')).findIndex((el) => el.classList.contains('snake-cell--head')),
        ate: !document.querySelectorAll('.snake-cell')[at].classList.contains('snake-cell--kana'),
        body: document.querySelectorAll('.snake-cell--body').length,
        kana: document.querySelectorAll('.snake-cell--kana').length,
        lives: document.querySelector('.hud-item').textContent.trim(),
      }),
      target,
    )
    if (!(after.head === target && after.ate)) continue
    await wait(1200)
    const later = await page.evaluate(() => document.querySelectorAll('.snake-cell--kana').length)
    snakeRespawn = { before, after, later }
  }
  check(
    'snake eats a wrong kana: shrinks, no life lost, kana returns after 1s',
    Boolean(snakeRespawn) &&
      snakeRespawn.after.body === snakeRespawn.before.body - 1 &&
      snakeRespawn.after.kana === snakeRespawn.before.kana - 1 &&
      snakeRespawn.after.lives === snakeRespawn.before.lives &&
      snakeRespawn.later === snakeRespawn.after.kana + 1,
    JSON.stringify(snakeRespawn),
  )
  await quizBackHome()

  // The 10s 提示 button still works in the other three fixed modes.
  for (const [mode, lessons, selector] of [
    ['nokanji', [1, 2, 3], '.quiz-round .choice--hint'],
    ['mahjong', allLessons, '.mahjong-tile--hint'],
    ['snake', [1, 2, 3], '.snake-cell--hint'],
  ]) {
    await seedQuizAndStart(mode, lessons)
    await page.waitForSelector('.quiz-hint-button', { timeout: 12000 })
    await page.locator('.quiz-hint-button').click()
    await wait(150)
    check(`${mode} 提示 highlights one target`, (await page.locator(selector).count()) === 1)
    await quizBackHome()
  }

  // T4 picker: 單詞.
  await page.locator('.home-actions button', { hasText: '單詞' }).click()
  await page.waitForSelector('.chip-grid', { timeout: 5000 })
  check('單詞 opens the picker', (await page.locator('.bar-title').textContent()).trim() === '詞彙')
  check('picker shows 50 lesson chips', (await page.locator('.chip-grid .chip').count()) === 50)
  const chipLabels = await page.locator('.chip-grid .chip').allTextContents()
  check(
    'chips are labelled 第1課 through 第50課',
    chipLabels[0].trim() === '第1課' && chipLabels[49].trim() === '第50課',
    `${chipLabels[0]}|${chipLabels[49]}`,
  )
  check('every shipped lesson is selectable', (await page.locator('.chip-grid .chip:disabled').count()) === 0)
  check('words mode has no direction block', (await page.locator('.direction').count()) === 0)
  const startBefore = await page.locator('.picker-start').textContent()
  check(
    '開始 stays disabled with the lesson message until a lesson is selected',
    (await page.locator('.picker-start').isDisabled()) && startBefore.trim() === '請至少選擇一門課程才可以開始',
    startBefore.trim(),
  )
  await page.locator('.chip-grid .chip', { hasText: '第1課' }).click()
  check('selecting a lesson enables 開始', await page.locator('.picker-start').isEnabled())
  check('a valid selection reads 開始', (await page.locator('.picker-start').textContent()).trim() === '開始')
  await page.locator('.section-head .text-button').click()
  check(
    '全選 selects every non-empty lesson',
    (await page.locator('.section-head .text-button').textContent()).trim() === '取消全選' &&
      (await page.locator('.chip-grid .chip--on').count()) === 50,
  )
  await page.locator('.section-head .text-button').click()
  check('全選 clears when all were selected', (await page.locator('.chip-grid .chip--on').count()) === 0)

  // T4 picker: 練習 (card).
  await page.locator('.picker .icon-button').click()
  await page.waitForSelector('.home-actions', { timeout: 5000 })
  await page.locator('.home-actions button', { hasText: '練習' }).click()
  await page.waitForSelector('.chip-grid', { timeout: 5000 })
  check('練習 opens the picker', (await page.locator('.bar-title').textContent()).trim() === '詞彙')
  check('card mode shows the direction block', (await page.locator('.direction').count()) === 1)
  check('card mode shows two direction chips', (await page.locator('.direction .chip--direction').count()) === 2)
  const jpZhPressed = await page
    .locator('.direction .chip--direction', { hasText: '看日文，答中文' })
    .getAttribute('aria-pressed')
  check('card defaults to jp-zh', jpZhPressed === 'true', String(jpZhPressed))
  await page.locator('.direction .chip--direction', { hasText: '看中文，答日文' }).click()
  const storedCard = await page.evaluate(() => JSON.parse(localStorage.getItem('study-minna-no-nihongo-vocabulary-basic-settings') || '{}'))
  check(
    'the chosen direction is remembered for card',
    storedCard?.card?.direction === 'zh-jp',
    JSON.stringify(storedCard),
  )

  // T5 word reader.
  await page.locator('.picker .icon-button').click()
  await page.waitForSelector('.home-actions', { timeout: 5000 })
  await page.locator('.home-actions button', { hasText: '單詞' }).click()
  await page.waitForSelector('.chip-grid', { timeout: 5000 })
  await page.locator('.section-head .text-button').click()
  await page.locator('.picker-start').click()
  await page.waitForSelector('.reader', { timeout: 5000 })
  check('reader opens with the title 單詞', (await page.locator('.reader .bar-title').textContent()).trim() === '單詞')
  check('reader shows a display word', (await page.locator('.reader-page--current .word').count()) === 1)
  check('reader shows a gloss', (await page.locator('.reader-page--current .gloss').count()) === 1)
  check('reader shows lesson/speech/tag pills', (await page.locator('.reader-page--current .pills .pill').count()) >= 2)
  check('reader has no image slot', (await page.locator('.reader img').count()) === 0)
  const readerText = await page.locator('.reader').textContent()
  check('reader has no 變形原理 control', !readerText.includes('變形原理'))

  const currentPage = page.locator('.reader-page--current')
  const sentenceCount = await currentPage.locator('.sentence').count()
  check(
    'reader shows at most 5 example sentences',
    sentenceCount > 0 && sentenceCount <= 5,
    `count=${sentenceCount}`,
  )
  const blockTitles = await currentPage.locator('.block-title').allTextContents()
  const exampleAt = blockTitles.findIndex((title) => title.includes('例句'))
  const kanjiAt = blockTitles.findIndex((title) => title.includes('字形對照'))
  check(
    '字形對照 comes after 例句',
    exampleAt !== -1 && kanjiAt !== -1 && kanjiAt > exampleAt,
    blockTitles.join(' | '),
  )
  const tagRule = await currentPage.locator('.word-block + .block').evaluate((el) => getComputedStyle(el).borderTopWidth)
  check('no hairline under the tag row', tagRule === '0px', tagRule)
  check('字形對照 shows comparison pairs', (await currentPage.locator('.kanji-pair').count()) > 0)
  check('字形對照 pair has a Japanese glyph', (await currentPage.locator('.kanji-glyph--jp').count()) > 0)
  const firstPairLabels = await currentPage.locator('.kanji-pair').first().locator('.kanji-label').allTextContents()
  check(
    '字形對照 reads 繁 then 日',
    firstPairLabels[0] === '繁' && firstPairLabels[1] === '日',
    firstPairLabels.join(','),
  )

  // 字形對照 detail page (clickable comparison pairs).
  check('comparison pairs are clickable buttons', (await currentPage.locator('button.kanji-pair').count()) > 0)
  await currentPage.locator('button.kanji-pair').first().click()
  await page.waitForSelector('.glyph', { timeout: 5000 })
  check('a comparison pair opens the glyph page', (await page.locator('.glyph').count()) === 1)
  check(
    'the glyph page title is 字形對照',
    (await page.locator('.glyph .bar-title').textContent()).trim() === '字形對照',
  )
  const glyphHeaders = await page.locator('.glyph thead th').allTextContents()
  check(
    'the glyph table columns are exactly 簡 繁 日',
    glyphHeaders.map((text) => text.trim()).join('') === '簡繁日',
    glyphHeaders.join(','),
  )
  const glyphCells = await page.locator('.glyph tbody td').allTextContents()
  check(
    'the glyph table shows 簡/繁/日 for the clicked pair',
    glyphCells.map((text) => text.trim()).join('') === '会會会',
    glyphCells.join(' | '),
  )
  check('the glyph page has a play button', (await page.locator('.glyph-play').count()) === 1)
  await page.locator('.glyph-play').click()
  await wait(200)
  check(
    'pressing play leaves the glyph page alive',
    (await page.locator('.glyph').count()) === 1,
  )
  await page.locator('.glyph .icon-button[aria-label="返回"]').click()
  await page.waitForSelector('.reader', { timeout: 5000 })
  check('glyph back returns to the reader', (await page.locator('.reader').count()) === 1)

  const firstWord = await wordText(page)
  await page.locator('.reader-controls .controls-button', { hasText: '下一個' }).click()
  await wait(300)
  const nextWord = await wordText(page)
  check('footer 下一個 moves to the next word', firstWord !== nextWord, `${firstWord} -> ${nextWord}`)
  await page.locator('.reader-controls .controls-button', { hasText: '上一個' }).click()
  await wait(300)
  const backWord = await wordText(page)
  check('footer 上一個 moves back', backWord === firstWord, `${backWord}`)

  // Word settings + persistence.
  await page.locator('.reader .icon-button[aria-label="設定"]').click()
  await page.waitForSelector('.settings', { timeout: 5000 })
  check('settings opens from the reader', (await page.locator('.settings .bar-title').textContent()).trim() === '設定')
  check('word settings shows two switches', (await page.locator('.settings .switch').count()) === 2)
  await page.locator('.settings .row').filter({ hasText: '顯示例句' }).locator('.switch').click()
  const storedWords = await page.evaluate(() => JSON.parse(localStorage.getItem('study-minna-no-nihongo-vocabulary-basic-settings') || '{}'))
  check('顯示例句 persists to study-minna-no-nihongo-vocabulary-basic-settings', storedWords?.words?.showExamples === false, JSON.stringify(storedWords))
  await page.locator('.settings .icon-button').click()
  await page.waitForSelector('.reader', { timeout: 5000 })
  check('例句 block hidden when 顯示例句 is off', (await page.locator('.reader .block-title', { hasText: '例句' }).count()) === 0)

  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('.home-actions', { timeout: 30000 })
  await page.locator('.home-actions button', { hasText: '單詞' }).click()
  await page.waitForSelector('.chip-grid', { timeout: 5000 })
  await page.locator('.picker-start').click()
  await page.waitForSelector('.reader', { timeout: 5000 })
  check('例句 stays hidden after reload', (await page.locator('.reader .block-title', { hasText: '例句' }).count()) === 0)

  // Directory search with a romaji query.
  await page.locator('.reader .icon-button[aria-label="單詞目錄"]').click()
  await page.waitForSelector('.toc', { timeout: 5000 })
  check('目錄 opens from the reader', (await page.locator('.toc .bar-title').textContent()).trim() === '單詞目錄')
  await page.locator('.toc .icon-button[aria-label="搜尋"]').click()
  await page.locator('.toc-search-input').fill('watashi')
  await wait(120)
  const tocRows = await page.locator('.toc-row').count()
  check('romaji query filters the directory', tocRows > 0, `rows=${tocRows}`)
  await page.locator('.toc-row').first().click()
  await page.waitForSelector('.reader', { timeout: 5000 })
  check('pressing a directory row returns to the reader', (await page.locator('.reader').count()) === 1)

  // T6 cards.
  await page.locator('.reader .icon-button[aria-label="返回"]').click()
  await page.waitForSelector('.chip-grid', { timeout: 5000 })
  await page.locator('.picker .icon-button[aria-label="返回"]').click()
  await page.waitForSelector('.home-actions', { timeout: 5000 })
  await page.locator('.home-actions button', { hasText: '練習' }).click()
  await page.waitForSelector('.chip-grid', { timeout: 5000 })
  await page.locator('.direction .chip--direction', { hasText: '看日文，答中文' }).click()
  await page.locator('.chip-grid .chip', { hasText: '第25課' }).click()
  await page.locator('.picker-start').click()
  await page.waitForSelector('.cards', { timeout: 5000 })
  check('cards opens with the title 練習（n/total）', /練習（1\/\d+）/.test((await page.locator('.cards .bar-title').textContent()).trim()))
  const facePrompt = (await page.locator('.card--current .card-face .prompt').textContent()).trim()
  check('jp-zh face asks 中文是什麼？', facePrompt === '中文是什麼？', facePrompt)

  await page.locator('.cards .icon-button[aria-label="設定"]').click()
  await page.waitForSelector('.settings', { timeout: 5000 })
  check('settings opens from cards', (await page.locator('.settings .bar-title').textContent()).trim() === '設定')
  const cardSettingLabels = await page.locator('.settings .row-label').allTextContents()
  check(
    'card settings include 只顯示平假名',
    cardSettingLabels.some((label) => label.trim() === '只顯示平假名'),
    cardSettingLabels.join(' | '),
  )
  check('card settings shows three switches', (await page.locator('.settings .switch').count()) === 3)
  const startSwitch = page.locator('.settings .row').filter({ hasText: '一開始顯示讀音' }).locator('.switch')
  check('一開始顯示讀音 starts enabled', !(await startSwitch.isDisabled()))
  await page.locator('.settings .row').filter({ hasText: '只顯示平假名' }).locator('.switch').click()
  const storedCardSettings = await page.evaluate(() => JSON.parse(localStorage.getItem('study-minna-no-nihongo-vocabulary-basic-settings') || '{}'))
  check(
    '只顯示平假名 persists to study-minna-no-nihongo-vocabulary-basic-settings',
    storedCardSettings?.card?.showHiraganaOnly === true,
    JSON.stringify(storedCardSettings),
  )
  check(
    '一開始顯示讀音 keeps its stored value',
    storedCardSettings?.card?.showStartReading === true,
    JSON.stringify(storedCardSettings),
  )
  check('一開始顯示讀音 is disabled when 只顯示平假名 is on', await startSwitch.isDisabled())
  await page.locator('.settings .icon-button').click()
  await page.waitForSelector('.cards', { timeout: 5000 })
  const kanaFace = (await page.locator('.card--current .card-face .word').textContent()).trim()
  check('hiragana-only face is non-empty', kanaFace.length > 0, kanaFace)
  check(
    'hiragana-only face has no katakana letters',
    !/[ァ-ヶ]/.test(kanaFace),
    kanaFace,
  )
  check(
    'hiragana-only face has no ruby',
    (await page.locator('.card--current .card-face ruby, .card--current .card-face rt').count()) === 0,
  )

  const cardFlipped = () =>
    page.locator('.card--current').evaluate((el) => (el.getAttribute('class') || '').includes('card--flipped'))
  await page.locator('.card--current').click()
  await wait(300)
  check('a tap flips the card', await cardFlipped())
  check('the back shows the gloss', (await page.locator('.card--current .card-back .gloss').textContent()).trim() !== '')
  await page.locator('.card--current').click()
  await wait(300)
  check('a second tap flips back to the face', !(await cardFlipped()))

  await page.locator('.card-controls .control', { hasText: '下一張' }).click()
  await wait(300)
  check('下一張 advances', /練習（2\/\d+）/.test((await page.locator('.cards .bar-title').textContent()).trim()))
  check('the new card opens face-up', !(await cardFlipped()))
  await page.locator('.card-controls .control', { hasText: '上一張' }).click()
  await wait(300)
  check('上一張 returns to the first card', /練習（1\/\d+）/.test((await page.locator('.cards .bar-title').textContent()).trim()))
  check('the first card 上一張 is disabled', await page.locator('.card-controls .control', { hasText: '上一張' }).isDisabled())

  for (let i = 0; i < 10; i += 1) {
    await page.locator('.card-controls .control').last().click()
    await wait(120)
  }
  const lastLabel = (await page.locator('.card-controls .control').last().textContent()).trim()
  check('the last card reads 完成', lastLabel.includes('完成'), lastLabel)
  await page.locator('.card-controls .control', { hasText: '完成' }).click()
  await wait(300)
  check('完成 opens the completion panel', (await page.locator('.complete').count()) === 1)
  check('completion shows the congratulation', (await page.locator('.complete-title').textContent()).trim() === '恭喜，你已經做完了練習。')
  check('completion shows one emoji', (await page.locator('.complete-emoji').textContent()).trim() !== '')
  check('completion has no score', (await page.locator('.complete .score').count()) === 0)
  check('completion has no 錯誤的單詞 list', (await page.locator('.complete .misses').count()) === 0)
  await page.locator('.complete .complete-home').click()
  await page.waitForSelector('.home-actions', { timeout: 5000 })
  check('completion 返回主頁 returns home', (await page.locator('.home-actions').count()) === 1)

  if (WANT_SHOTS) {
    fs.mkdirSync(SHOT_DIR, { recursive: true })
    await page.screenshot({ path: path.join(SHOT_DIR, 'home.png') })
  }
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
}

console.log(notes.join('\n'))
if (failures.length > 0) {
  console.error('\n' + failures.join('\n'))
  if (serverLog) console.error('\n--- server log ---\n' + serverLog)
  process.exitCode = 1
} else {
  console.log('\nAll browser checks passed.')
}
