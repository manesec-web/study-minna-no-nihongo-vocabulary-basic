// Delayed re-placement of a wrong kana in 單字貪食蛇. The engine only queues
// the eaten kana on `state.respawn` and flags the tick event (`respawn: true`);
// this helper waits RESPAWN_DELAY_MS and then dispatches the `respawn` action
// through the store, one late dispatch per flagged tick. The view owns an
// instance and cancels pending re-placements when the board unmounts; a
// dispatch that lands after the round ended is a harmless no-op in the engine
// and the quiz.act command is disabled by then anyway.
export const RESPAWN_DELAY_MS = 1000

export function createRespawnTimers(options = {}) {
  const { send = () => {}, delay = RESPAWN_DELAY_MS, setTimer = setTimeout, clearTimer = clearTimeout } = options
  const pending = new Set()

  function schedule() {
    const id = setTimer(() => {
      pending.delete(id)
      send('quiz.act', { type: 'respawn' })
    }, delay)
    pending.add(id)
    return id
  }

  function cancel() {
    for (const id of pending) clearTimer(id)
    pending.clear()
  }

  return { schedule, cancel, pending: () => pending.size }
}
