class NotificationService {
  private dismissedContext: { [contextId: string]: number } = {}

  constructor() {
    this.dismissedContext = JSON.parse(
      localStorage.getItem('dismissedContext') || '{}'
    )
  }

  hasDismissed(contextId) {
    return (
      this.dismissedContext[contextId] <= 0 ||
      Date.now() < this.dismissedContext[contextId]
    )
  }

  dismiss(contextId, duration = -1) {
    this.dismissedContext[contextId] = duration > 0 ? Date.now() + duration : -1
    this.save()
  }

  save() {
    localStorage.setItem(
      'dismissedContext',
      JSON.stringify(this.dismissedContext)
    )
  }
}

export default new NotificationService()
