<script lang="ts" setup>
import { toggleDark } from '~/composables/index.js'
</script>

<template>
  <nav mt-6 inline-flex gap-2 text-xl>
    <button icon-btn @click="toggleDark">
      <div i-carbon-sun dark:i-carbon-moon />
    </button>

    <a
      href="https://github.com/liuc-c/vitesse-lite" i-carbon-logo-github
      icon-btn
      rel="noreferrer"
      target="_blank"
      title="GitHub"
    />
  </nav>
</template>
