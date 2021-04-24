<template>
  <div class="serie" :class="{ '-error': !!error, '-disabled': !visible }">
    <div class="serie__name" @click="edit">{{ name }}</div>

    <template v-if="!error">
      <div class="serie__controls">
        <button class="btn -small" @click="toggleVisibility" v-tippy :title="visible ? 'Hide' : 'Show'">
          <i :class="{ 'icon-visible': !visible, 'icon-hidden': visible }"></i>
        </button>
        <!--<button class="btn -small" @click="bringOnTop" v-tippy title="bring on top"><i class="icon-up"></i></button>-->
        <button class="btn -small" @click="edit" v-tippy title="Edit"><i class="icon-edit"></i></button>
        <button class="btn -small" @click="remove" v-tippy title="Disable"><i class="icon-cross"></i></button>
      </div>
      <div class="serie__legend" v-text="legend"></div>
    </template>
    <template v-else>
      <i class="icon-warning ml4 mr8"></i>
      {{ error }}
    </template>
  </div>
</template>

<script>
import SerieDialog from './SerieDialog.vue'
import dialogService from '../../services/dialogService'
import { defaultChartSeries } from './defaultSeries'

export default {
  props: ['paneId', 'serieId', 'legend'],
  computed: {
    serie: function() {
      return this.$store.state[this.paneId].series[this.serieId]
    },
    name: function() {
      if (this.serie.name && this.serie.name.length) {
        return this.serie.name
      } else if (defaultChartSeries[this.serieId]) {
        return defaultChartSeries[this.serieId].name
      } else {
        return this.serieId
      }
    },
    visible: function() {
      return !this.serie.options || typeof this.serie.options.visible === 'undefined' ? true : this.serie.options.visible
    },
    error: function() {
      return this.$store.state[this.paneId].activeSeriesErrors[this.serieId]
    }
  },
  methods: {
    edit() {
      dialogService.open(SerieDialog, { paneId: this.paneId, serieId: this.serieId }, 'serie')
    },
    toggleVisibility() {
      if (!this.serie.options) {
        this.$store.commit(this.paneId + '/CUSTOMIZE_SERIE', this.serieId)
      }

      this.$nextTick(() => {
        this.$store.dispatch(this.paneId + '/toggleSerieVisibility', this.serieId)
      })
    },
    remove() {
      this.$store.dispatch(this.paneId + '/toggleSerie', this.serieId)
    }
  }
}
</script>

<style lang="scss">
.serie {
  display: flex;
  width: 0;
  white-space: nowrap;
  height: 14px;

  i {
    line-height: 1.35;
  }

  &.-error {
    color: $red;
  }

  &.-disabled {
    opacity: 0.5;
  }

  &__name {
    position: relative;
    cursor: pointer;
  }

  &__legend {
    color: lighten($blue, 20%);
    margin-left: 0.4em;
    font-family: 'Barlow Semi Condensed';
    pointer-events: none;
    line-height: 1.6;
    letter-spacing: 0px;
    order: 2;
    transition: visibility;
    transition-delay: 1s;
    font-size: 11px;

    text-shadow: 1px 1px black;
  }

  &__controls {
    padding-left: 1rem;
    margin-left: -0.5rem;
    display: none;
    align-items: center;
    pointer-events: none;
    order: 1;

    &:hover {
      display: inline-flex;
    }

    > .btn {
      background-color: rgba($dark, 0.8);
      color: white;
      border-radius: 0;

      &:hover {
        background-color: lighten($dark, 2%);
      }

      &:first-child {
        border-top-left-radius: 3px;
        border-bottom-left-radius: 3px;
      }

      &:last-child {
        border-top-right-radius: 3px;
        border-bottom-right-radius: 3px;
      }
    }
  }

  &:hover {
    .serie__controls {
      display: inline-flex;
      pointer-events: all;
    }
  }
}

#app.-light {
  .serie__legend {
    color: $green;
    text-shadow: none;
  }
  .serie__controls > .btn {
    background-color: rgba($green, 0.8);

    &:hover {
      background-color: lighten($green, 2%);
    }
  }
}
</style>
