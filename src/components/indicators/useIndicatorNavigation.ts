import { reactive } from 'vue'
import store from '@/store'
import { IndicatorNavigationState } from '@/store/panesSettings/chart'

let sharedNavigation: IndicatorNavigationState | null = null

export function useIndicatorNavigation() {
  if (!sharedNavigation) {
    sharedNavigation = reactive<IndicatorNavigationState>({
      optionsQuery: '',
      editorOptions: {},
      columnWidth: 240,
      tab: 'options',
      resizing: false
    })

    const restoreNavigation = () => {
      const navigationState = store.state.settings.indicatorDialogNavigation
      if (navigationState) {
        try {
          const json = JSON.parse(navigationState)
          for (const key in json) {
            sharedNavigation[key] = json[key]
          }
        } catch (error) {
          console.error('Failed to parse navigation state', error)
        }
      }
    }

    restoreNavigation()
  }

  const saveNavigation = () => {
    store.commit('settings/SET_INDICATOR_DIALOG_NAVIGATION', sharedNavigation)
  }

  return {
    navigation: sharedNavigation,
    saveNavigation
  }
}
