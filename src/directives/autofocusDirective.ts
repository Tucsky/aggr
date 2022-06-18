export default {
  bind(el) {
    // When the component of the element gets activated
    setTimeout(() => {
      el.focus()

      if (el.tagName === 'INPUT') {
        el.setSelectionRange(0, el.value.length)
      }
    })
  }
}
