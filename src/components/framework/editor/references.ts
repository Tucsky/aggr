import { SERIE_TYPES } from '@/components/chart/buildUtils'
import serieUtils from '@/components/chart/serieUtils'
import { createComponent, mountComponent } from '@/utils/helpers'

export const TOKENS = Object.keys(serieUtils).concat(Object.keys(SERIE_TYPES), [
  'renderer',
  'bar',
  'options',
  'option',
  'source',
  'time',
  'indicatorId'
])

export async function loadMd(token) {
  let raw

  try {
    raw = (
      await import(`@/components/framework/editor/references/${token}.md?raw`)
    ).default
  } catch (error) {
    //
  }

  if (!raw) {
    return null
  }

  return raw
}

export async function showReference(token, content, position) {
  const referenceComponent = createComponent(
    (await import('@/components/framework/editor/EditorReference.vue')).default,
    {
      token,
      coordinates: {
        top: position.y,
        left: position.x,
        width: 2,
        height: 2
      },
      content
    }
  )

  mountComponent(referenceComponent)
}
