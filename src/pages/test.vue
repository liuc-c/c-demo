<script setup lang="ts">
import { onMounted } from 'vue'
import type { DecodedPayload } from 'clarity-decode/types/data'
import type { DomEvent } from 'clarity-decode/types/layout'
import decoded from '~/api/clarity-1dyfdui-1-decoded.json'
import decoded2 from '~/api/clarity-1nt9n0x-1-decoded.json'
import decoded3 from '~/api/clarity-1ujmig4-1-decoded.json'
import decoded4 from '~/api/clarity-req4l5-1-decoded.json'
import decoded5 from '~/api/clarity-11ut0ax-1-decoded.json'
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
  iframe.style.left = ((container.clientWidth - (width * scale)) / 2) + px
}

function isMobileDevice(userAgent: string | undefined): boolean {
  if (!userAgent) {
    return false
  }
  return /android|webos|iphone|ipad|ipod|blackberry|windows phone|opera mini|iemobile|mobile|silk|fennec|bada|tizen|symbian|nokia|palmsource|meego|sailfish|kindle|playbook|bb10|rim/i.test(userAgent)
}

onMounted(async () => {
  const visualize = new Visualizer()
  let iframe = document.getElementById('clarity') as HTMLIFrameElement
  if (iframe && iframe.parentElement) {
    iframe.parentElement.removeChild(iframe)
  }
  iframe = document.createElement('iframe')
  iframe.id = 'clarity'
  iframe.title = 'Microsoft Clarity'
  iframe.setAttribute('scrolling', 'no')
  const targetDom = document.querySelector('.iframe-box') as HTMLElement
  targetDom.appendChild(iframe)
  iframe.style.display = 'block'

  const dJson = decoded as DecodedPayload[]
  const dJson2 = decoded2 as DecodedPayload[]
  const dJson3 = decoded3 as DecodedPayload[]
  const dJson4 = decoded4 as DecodedPayload[]
  const dJson5 = decoded5 as DecodedPayload[]
  const envelope = dJson[0].envelope
  const merged = visualize.merge([...dJson, ...dJson2, ...dJson3, ...dJson4, ...dJson5])
  // const merged = visualize.merge(dJson)
  const clickEvents = merged.events.filter((event: any) => event.event === 16 || event.event === 9)
  const dom = merged.dom as DomEvent | null
  const activity = getActivityData(clickEvents, dom)
  const mobile = isMobileDevice(dJson[0].dimension?.[0].data[0][0])
  visualize.setup(iframe.contentWindow as Window, { version: envelope.version, onresize: resize, mobile })
  const resizeDom = merged.events.filter((event: any) => event.event === 11)
  await visualize.dom(dom)
  await visualize.render(resizeDom)
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
  height: calc(100vh  - 5rem);
  width: calc(100vw - 2rem);
  border: 0;
}
</style>
