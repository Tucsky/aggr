import { directive } from 'vue-tippy'
import autofocusDirective from './autofocusDirective'
import { commitDirective, dispatchDirective } from './commitDirective'
import draggableMarketDirective from './draggableMarketDirective'

export default {
  autofocus: autofocusDirective,
  commit: commitDirective,
  dispatch: dispatchDirective,
  'draggable-market': draggableMarketDirective,
  tippy: directive
}
