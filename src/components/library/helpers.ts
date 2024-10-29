import dialogService from '@/services/dialogService'
import { ExportedIndicator } from '@/services/importService'
import notificationService from '@/services/notificationService'

export async function openPublishDialog(item) {
  const showOnboarding = !notificationService.hasDismissed('publish-onboarding')

  if (
    showOnboarding &&
    !(await dialogService.openAsPromise(
      (await import('@/components/library/PublishOnboarding.vue')).default
    ))
  ) {
    return
  }

  return dialogService.openAsPromise(
    (await import('@/components/library/PublishResourceDialog.vue')).default,
    {
      item
    }
  )
}

function cleanOptions(options = {}) {
  const whitelist = [
    'priceScaleId',
    'strokeWidth',
    'scaleMargins',
    'priceFormat',
    'crosshairMarkerVisible',
    'lastValueVisible',
    'priceLineVisible',
    'baseLineVisible',
    'type',
    'minMove',
    'precision',
    'priceLineStyle',
    'color',
    'lineWidth',
    'lineStyle',
    'lineType',
    'priceLineColor',
    'borderVisible',
    'upColor',
    'downColor',
    'borderUpColor',
    'borderDownColor',
    'wickUpColor',
    'wickDownColor',
    'topFillColor1',
    'topFillColor2',
    'topLineColor',
    'bottomFillColor1',
    'bottomFillColor2',
    'bottomLineColor',
    'lineWidth',
    'color',
    'topColor',
    'bottomColor',
    'lineColor',
    'lineStyle',
    'lineWidth',
    'positiveColor',
    'negativeColor',
    'positiveLineColor',
    'higherLineStyle',
    'higherLineWidth',
    'negativeLineColor',
    'lowerLineStyle',
    'lowerLineWidth',
    'color',
    'thinBars',
    'upColor',
    'downColor',
    'openVisible'
  ]

  return Object.keys(options)
    .filter(key => whitelist.includes(key))
    .reduce((filteredOptions, key) => {
      filteredOptions[key] = options[key]
      return filteredOptions
    }, {})
}
export async function uploadResource(item) {
  if (!item.preview) {
    dialogService.confirm({
      cancel: false,
      message: `Indicator's preview is mandatory for publishing. Just save it once it's added on a chart to generate the thumbnail !`
    })
    return
  }

  let author = localStorage.getItem('author')

  if (!author) {
    author = await dialogService.prompt({
      action: 'Name yourself',
      label: 'Username'
    })

    if (!author) {
      return
    }

    localStorage.setItem('author', author)
  }

  const jsonData = {
    ...item,
    options: cleanOptions(item.options),
    preview: undefined,
    author
  }

  const formData = new FormData()

  try {
    const jsonBlob = new Blob([JSON.stringify(jsonData)], {
      type: 'application/json'
    })
    formData.append('jsonFile', jsonBlob, 'indicator.json')
    formData.append('pngFile', item.preview, 'indicator.png')
  } catch (error) {
    throw new Error('Failed to create payload')
  }

  const response = await fetch(
    `${import.meta.env.VITE_APP_LIB_URL}publish/indicators`,
    {
      method: 'POST',
      body: formData
    }
  )

  if (!response.ok) {
    throw new Error('Failed to publish')
  }

  try {
    const { url } = await response.json()

    return url
  } catch (error) {
    throw new Error('Failed to parse server response')
  }
}

export async function fetchIndicator(
  jsonPath: string,
  imagePath: string,
  sha?: string
): Promise<ExportedIndicator> {
  let indicator: ExportedIndicator
  let preview: Blob
  if (sha) {
    indicator = await (
      await fetch(
        `${import.meta.env.VITE_APP_LIB_URL}version/${sha}/${jsonPath}`
      )
    ).json()

    preview = await (
      await fetch(
        `${import.meta.env.VITE_APP_LIB_URL}version/${sha}/${imagePath}`
      )
    ).blob()
  } else {
    indicator = await (
      await fetch(`${import.meta.env.VITE_APP_LIB_URL}${jsonPath}`)
    ).json()
    preview = await (
      await fetch(`${import.meta.env.VITE_APP_LIB_URL}${imagePath}`)
    ).blob()
  }

  if (!indicator.data) {
    throw new Error('invalid payload')
  }

  indicator.data.preview = preview

  return indicator
}
