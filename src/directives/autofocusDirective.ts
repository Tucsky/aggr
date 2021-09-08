export default {
  bind(el) {
    // When the component of the element gets activated
    setTimeout(() => {
      el.focus()
    })
  }
}
