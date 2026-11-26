// Builds the frozen study item list for the current mode. Each item is
// `{ lesson, index }`: the lesson number and the position in that lesson's
// `vols`, so the session never holds word bodies.
export function buildItems(library, lessonNumbers) {
  const items = []
  for (const lesson of lessonNumbers) {
    const vols = library?.getVols ? library.getVols(lesson) : []
    for (let index = 0; index < vols.length; index += 1) {
      items.push({ lesson, index })
    }
  }
  return items
}
