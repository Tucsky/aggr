import dialogService from '@/services/dialogService'
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
