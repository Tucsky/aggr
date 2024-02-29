<template>
  <table class="table indicator-table__table">
    <thead>
      <tr>
        <th v-if="showEnabled" class="table-min"></th>
        <th
          class="table-sortable table-min"
          @click="toggleSort('name')"
          :class="[sortProperty === 'name' && 'table-sort--active']"
        >
          <span>Name</span>
          <i
            v-if="sortProperty === 'name'"
            class="table-sortable__direction icon-up"
            :class="[sortDirection < 0 && 'table-sortable__direction--desc']"
          ></i>
        </th>
        <th class="table-sortable w-100" @click="toggleSort('description')">
          <span>Description</span>
          <i
            v-if="sortProperty === 'description'"
            class="table-sortable__direction icon-up"
            :class="[sortDirection < 0 && 'table-sortable__direction--desc']"
          ></i>
        </th>
        <th
          v-if="showAuthor"
          class="-dialog-min-m table-sortable text-right"
          @click="toggleSort('author')"
        >
          <span>Author</span>
          <i
            v-if="sortProperty === 'author'"
            class="table-sortable__direction icon-up"
            :class="[sortDirection < 0 && 'table-sortable__direction--desc']"
          ></i>
        </th>
        <th
          class="-dialog-min-m table-sortable text-right"
          @click="toggleSort('updatedAt')"
        >
          <span>Date</span>
          <i
            v-if="sortProperty === 'updatedAt'"
            class="table-sortable__direction icon-up"
            :class="[sortDirection < 0 && 'table-sortable__direction--desc']"
          ></i>
        </th>
        <th class="table-min" v-if="showDropdown"></th>
      </tr>
    </thead>
    <tbody
      v-if="filteredIndicators.length"
      @mousemove="movePreview"
      @mouseleave="clearPreview"
    >
      <tr
        v-for="indicator of filteredIndicators"
        :key="indicator.id"
        @click="$emit('selected', indicator)"
        @mouseenter="showPreview(indicator)"
        class="-action"
      >
        <td
          v-if="showEnabled"
          class="table-action table-min"
          @click.stop="$emit('enabled', indicator)"
        >
          <i
            class="-lower"
            :class="indicator.enabled ? 'icon-star-filled' : 'icon-star'"
            title="Enable by default<br>on new charts"
            v-tippy="{ placement: 'top' }"
          ></i>
        </td>
        <td
          class="table-input text-color-base table-ellipsis"
          style="max-width: 200px"
        >
          {{
            (indicator.displayName || indicator.name).replace(/\{[\w_]+\}/g, '')
          }}
        </td>
        <td class="table-input table-ellipsis">
          <span class="text-muted">{{ indicator.description }}</span>
        </td>
        <td v-if="showAuthor" class="table-input table-ellipsis">
          <span class="text-muted">{{ indicator.author }}</span>
        </td>
        <td class="-dialog-min-m table-input table-min text-right">
          <span>{{ ago(indicator.updatedAt) }}</span>
        </td>
        <td
          v-if="showDropdown"
          class="table-action -hover table-min"
          @click.stop="$emit('dropdown', [$event, indicator])"
        >
          <button class="btn -text -small">
            <i class="icon-more"></i>
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { ago } from '@/utils/helpers'
import PreviewMixin from '@/mixins/previewMixin'

export default {
  name: 'IndicatorTable',
  mixins: [PreviewMixin],
  props: {
    indicators: {
      type: Array,
      required: true
    },
    query: {
      type: String,
      default: ''
    },
    showDropdown: {
      type: Boolean,
      default: false
    },
    showAuthor: {
      type: Boolean,
      default: false
    },
    showEnabled: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      ago,
      sortDirection: -1,
      sortProperty: 'updatedAt'
    }
  },
  computed: {
    queryFilter() {
      return new RegExp(this.query.replace(/\W/, '.*'), 'i')
    },
    sortFunction() {
      if (this.sortProperty === 'description') {
        if (this.sortDirection > 0) {
          return (a, b) =>
            (a.description || '').localeCompare(b.description || '')
        }
        return (a, b) =>
          (b.description || '').localeCompare(a.description || '')
      } else if (this.sortProperty === 'name') {
        if (this.sortDirection > 0) {
          return (a, b) => (a.name || '').localeCompare(b.name || '')
        }
        return (a, b) => (b.name || '').localeCompare(a.name || '')
      } else if (this.sortProperty === 'createdAt') {
        if (this.sortDirection > 0) {
          return (a, b) => a.createdAt - b.createdAt
        }
        return (a, b) => b.createdAt - a.createdAt
      } else if (this.sortProperty === 'updatedAt') {
        if (this.sortDirection > 0) {
          return (a, b) => a.updatedAt - b.updatedAt
        }
        return (a, b) => b.updatedAt - a.updatedAt
      } else if (this.sortProperty === 'author') {
        if (this.sortDirection > 0) {
          return (a, b) => a.author - b.author
        }
        return (a, b) => b.author - a.author
      }

      return (a, b) => a.id.localeCompare(b.id)
    },
    filteredIndicators() {
      const sortFunction = this.sortFunction
      return this.indicators
        .filter(
          a =>
            this.queryFilter.test(a.description) ||
            this.queryFilter.test(a.name)
        )
        .sort(sortFunction)
    }
  },
  methods: {
    toggleSort(name) {
      if (name === this.sortProperty) {
        this.sortDirection = this.sortDirection * -1
      }

      this.sortProperty = name
    }
  }
}
</script>
<style lang="scss" scoped>
.icon-star-filled {
  color: var(--theme-buy-200);
}
</style>
