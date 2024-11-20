export default {
  beforeMount(el: HTMLElement) {
    // When the element is added to the DOM
    setTimeout(() => {
      el.focus();

      if (el.tagName === 'INPUT') {
        const inputEl = el as HTMLInputElement;
        inputEl.setSelectionRange(0, inputEl.value.length);
      }
    });
  },
};
