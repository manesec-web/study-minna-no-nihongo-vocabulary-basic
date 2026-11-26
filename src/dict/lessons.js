// Lesson list helpers shared by the picker command and the picker view.
//
// A lesson summary entry is `{ lesson, hasEntries, count }`. Lessons without
// entries can never be selected, so the 全選 control ignores them.

export const EMPTY_LESSON_HINT = '該課沒有單詞'
export const NO_LESSONS_HINT = '單詞列表尚未放入'
export const NO_SELECTION_HINT = '請至少選擇一門課程才可以開始'
export const SELECT_ALL_LABEL = '全選'
export const CLEAR_ALL_LABEL = '取消全選'

export function entryLessons(entries) {
  return entries
    .filter((entry) => entry.hasEntries)
    .map((entry) => entry.lesson)
    .sort((a, b) => a - b)
}

export function allEntryLessonsSelected(entries, selected) {
  const all = entryLessons(entries)
  return all.length > 0 && all.every((lesson) => selected.includes(lesson))
}

// The picker's lesson-wide control reads 全選 until every lesson with entries
// is selected; then it offers 取消全選, which is what lessons.selectAll does next.
export function selectAllLabel(entries, selected) {
  return allEntryLessonsSelected(entries, selected) ? CLEAR_ALL_LABEL : SELECT_ALL_LABEL
}

// Start-button copy: the disabled action names the missing requirement. The
// whole manifest being empty comes before a missing lesson selection.
export function startHint(lessonCount, selected) {
  if (lessonCount === 0) return NO_LESSONS_HINT
  if (selected.length === 0) return NO_SELECTION_HINT
  return null
}

export function canStart(lessonCount, selected) {
  return lessonCount > 0 && selected.length > 0
}
