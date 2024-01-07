<template>
  <div
    class="community-indicators-incentive"
    :class="[isDismissed && 'community-indicators-incentive--dismissed']"
  >
    <div class="community-indicators-incentive__wrapper">
      <div class="community-indicators-incentive__head">
        <h3 class="community-indicators-incentive__title">
          Introducing Aggr Library
        </h3>
        <Btn
          v-if="!isDismissed"
          class="community-indicators-incentive__close -small -text"
          @click="dismiss"
        >
          <i class="icon-cross" />
        </Btn>
      </div>
      <p class="community-indicators-incentive__subtitle">
        Indicators that are uploaded to
        <a :href="repoUrl" target="_blank">aggr-lib</a>
        will automatically appear in this list.
      </p>
      <Btn
        class="community-indicators-incentive__cta -theme"
        :href="repoUrl"
        target="_blank"
      >
        <i class="icon-github mr8"></i> Start contributing
      </Btn>
    </div>
  </div>
</template>

<script>
import Btn from '@/components/framework/Btn.vue'
import notificationService from '@/services/notificationService'

export default {
  name: 'CommunityIndicatorsIncentive',
  components: {
    Btn
  },
  data: () => ({
    isDismissed: notificationService.hasDismissed(
      'community-indicators-incentive'
    ),
    repoUrl: import.meta.env.VITE_APP_LIB_REPO_URL
  }),
  methods: {
    dismiss() {
      notificationService.dismiss('community-indicators-incentive')
      this.isDismissed = true
    }
  }
}
</script>
<style lang="scss" scoped>
.community-indicators-incentive {
  border: 1px solid var(--theme-background-50);
  border-radius: 0.5rem;
  position: relative;

  &--dismissed {
    order: 1;
  }

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--theme-background-base);
    background-image: url(./publish-1.png);
    background-size: cover;
    background-position: 0 10%;
    opacity: 0.5;
    background-blend-mode: overlay;
  }

  &__wrapper {
    position: relative;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__head {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    align-items: flex-start;
  }

  &__title {
    margin: 0;
    color: var(--theme-color-base);
  }

  &__close {
    margin: -0.5rem -0.5rem 0 0;
  }

  &__subtitle {
    margin: 0;
  }

  &__cta {
    align-self: flex-end;
  }
}
</style>
