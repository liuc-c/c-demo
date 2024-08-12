<script setup lang="ts">
import { onMounted } from 'vue'
import { decode } from 'clarity-decode'
import { a } from '~/utils/test'

const dJson = []

onMounted(() => {
  a.forEach((item) => {
    dJson.push(decode(JSON.stringify(item)))
  })
  console.log(dJson)
})

function savea(): void {
  console.log('ss')
  const json = JSON.stringify(dJson, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.setAttribute('download', `clarity.json`)
  a.href = url
  a.click()
}
</script>

<template>
  <button @click="savea()">
    Save
  </button>
</template>

<style scoped>

</style>
