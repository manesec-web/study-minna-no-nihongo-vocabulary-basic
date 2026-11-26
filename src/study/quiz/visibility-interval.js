// Visibility-aware interval for timer-driven games (隕石防禦 / 打地鼠 / 貪食蛇).
// It pauses when the document is hidden or the page is being unloaded, and
// restarts on visibilitychange so background ticks never drain lives or accept
// stale input. Injectable for unit tests.
export function createVisibilityInterval(options = {}) {
  const {
    callback = () => {},
    interval = 700,
    documentObj = typeof document !== 'undefined' ? document : null,
    windowObj = typeof window !== 'undefined' ? window : null,
  } = options

  let timer = null
  let running = false

  function start() {
    stop()
    if (!documentObj || documentObj.hidden === false || documentObj.hidden == null) {
      running = true
      timer = setInterval(callback, interval)
    }
  }

  function stop() {
    if (timer) clearInterval(timer)
    timer = null
    running = false
  }

  const onVisibility = () => {
    if (documentObj && documentObj.hidden) stop()
    else if (!running) start()
  }
  const onPageHide = () => stop()

  if (documentObj) documentObj.addEventListener('visibilitychange', onVisibility)
  if (windowObj) windowObj.addEventListener('pagehide', onPageHide)
  start()

  return {
    stop() {
      if (documentObj) documentObj.removeEventListener('visibilitychange', onVisibility)
      if (windowObj) windowObj.removeEventListener('pagehide', onPageHide)
      stop()
    },
  }
}
