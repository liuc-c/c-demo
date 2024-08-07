<script setup lang="ts">
// const merged = visualize.merge(decoded)
// const clickEvents = merged.events.filter((event: any) => event.event === 16 || event.event === 9)
// const dom = merged.dom as DomEvent | null
// console.log(getActivityData(decodeJson as DecodedPayload[]))
import { onMounted } from 'vue'
import type { DecodedPayload } from 'clarity-decode/types/data'
import type { DomEvent } from 'clarity-decode/types/layout'
import decoded from '~/api/clarity-req4l5-1-decoded.json'
import { Visualizer } from '~/utils/visualize'
import { getActivityData } from '~/utils/heatmap'

function resize(width: number, height: number): void {
  const margin = 10
  const px = 'px'
  const iframe = document.getElementById('clarity') as HTMLIFrameElement
  const container = document.querySelector('.iframe-box') as HTMLElement
  const offsetTop = iframe.offsetTop
  const availableWidth = container.clientWidth - (2 * margin)
  const availableHeight = container.clientHeight - offsetTop - (2 * margin)
  const scale = Math.min(Math.min(availableWidth / width, 1), Math.min(availableHeight / height, 1))
  iframe.style.position = 'absolute'
  iframe.style.width = width + px
  iframe.style.height = height + px
  iframe.style.transformOrigin = '0 0 0'
  iframe.style.transform = `scale(${scale})`
  iframe.style.border = '1px solid #cccccc'
  iframe.style.overflow = 'hidden'
  iframe.style.left = ((container.clientWidth - (width * scale)) / 2 + 200) + px
}

onMounted(() => {
  const visualize = new Visualizer()
  const iframe = document.getElementById('clarity') as HTMLIFrameElement
  const dJson = decoded as DecodedPayload[]
  const envelope = dJson[0].envelope
  const merged = visualize.merge(dJson)
  const clickEvents = merged.events.filter((event: any) => event.event === 16 || event.event === 9)
  const dom = merged.dom as DomEvent | null
  const activity = getActivityData(clickEvents, dom)
  visualize.setup(iframe.contentWindow as Window, { version: envelope.version, onresize: resize })
  visualize.html(dJson, iframe.contentWindow as Window)
  visualize.clickmap(activity)
})
</script>

<template>
  <div class="iframe-box">
    <iframe id="clarity" title="Clarity Inspector" scrolling="no" />
  </div>
</template>

<style scoped>
.iframe-box {
  height: 90vh;
  width: 90vw;
  overflow: hidden;
  border: 0;
}
</style>
