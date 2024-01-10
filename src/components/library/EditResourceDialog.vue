<template>
  <form @submit.prevent="submit">
    <transition name="dialog" :duration="500" @after-leave="onHide">
      <Dialog
        v-if="dialogOpened"
        class="edit-resource-dialog"
        @clickOutside="hide"
      >
        <template v-slot:header>
          <div class="d-flex">
            <div class="dialog__title">Edit {{ item.name }}</div>

            <small>
              <code
                class="-filled -center ml4"
                :title="`ID: ${item.id}`"
                v-tippy
              >
                {{ displayId }}
              </code>
            </small>
          </div>
        </template>
        <div class="d-flex -gap16 mb16">
          <div class="form-group">
            <label for="label">Name</label>
            <input
              id="label"
              type="text"
              class="form-control w-100"
              v-model="name"
              required
            />
          </div>
          <div class="form-group">
            <label for="label">&nbsp;</label>
            <label class="checkbox-control">
              <input type="checkbox" class="form-control" v-model="updateId" />
              <div class="mr8" title="Get a new ID" v-tippy></div>
              <i
                class="icon-info"
                title="IDs are unique in the library !"
                v-tippy
              ></i>
            </label>
          </div>
        </div>
        <p v-if="updateId && item.id !== newId">
          <i class="icon-info"></i> ID change
          <code class="-filled">{{ item.id }}</code> →
          <code class="-filled">{{ newId }}</code>
        </p>
        <div class="form-group">
          <label for="label">Description</label>
          <textarea class="form-control w-100" v-model="description"></textarea>
        </div>

        <template v-slot:footer>
          <Btn type="button" class="btn -text" @click="hide">Cancel</Btn>
          <Btn type="submit" class="btn -green ml8 -large">
            <i class="icon-check mr8"></i> Save
          </Btn>
        </template>
      </Dialog>
    </transition>
  </form>
</template>

<script>
import Btn from '@/components/framework/Btn.vue'
import DialogMixin from '@/mixins/dialogMixin'
import { slugify, uniqueName } from '@/utils/helpers'

export default {
  name: 'EditResourceDialog',
  components: {
    Btn
  },
  props: {
    item: {
      type: Object,
      required: true
    },
    ids: {
      type: Array,
      required: true
    }
  },
  mixins: [DialogMixin],
  data() {
    return {
      dialogOpened: false,
      name: this.item.name || '',
      description: this.item.description || '',
      updateId: false
    }
  },
  computed: {
    displayId() {
      const id = this.item.id

      if (!id) {
        return 'no id'
      }

      if (id.length <= 16) {
        return id
      } else {
        return id.slice(0, 6) + '..' + id.substr(-6)
      }
    },
    newId() {
      return uniqueName(slugify(this.name), this.idsExceptCurrent)
    },
    idsExceptCurrent() {
      return this.ids.filter(id => id !== this.item.id)
    }
  },
  mounted() {
    this.show()
  },
  methods: {
    show() {
      this.dialogOpened = true
    },
    hide() {
      this.dialogOpened = false
    },
    onHide() {
      this.close()
    },
    submit() {
      this.output = {
        ...this.item,
        name: this.name,
        displayName: this.name,
        description: this.description
      }

      if (this.updateId) {
        this.output.id = this.newId
      }

      this.hide()
    }
  }
}
</script>
