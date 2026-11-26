// Card completion copy. The card run has no score: one emoji chosen once when
// the panel mounts, the congratulation line, and 返回主頁.
export const COMPLETE_TITLE = '恭喜，你已經做完了練習。'

export const PRACTICE_EMOJI = ['🙇‍♂️', '🙇', '🙇‍♀️']

function randomAt(length, rand) {
  const value = Math.min(0.999999, Math.max(0, Number(rand()) || 0))
  return Math.floor(value * length)
}

export function practiceEmoji(rand = Math.random) {
  return PRACTICE_EMOJI[randomAt(PRACTICE_EMOJI.length, rand)]
}
