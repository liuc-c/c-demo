<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { DecodedPayload } from 'clarity-decode/types/data'
import type { DomEvent } from 'clarity-decode/types/layout'
import decoded from '~/data/clarity-1dyfdui-1-decoded.json'
import decoded2 from '~/data/clarity-1nt9n0x-1-decoded.json'
import decoded4 from '~/data/clarity-req4l5-1-decoded.json'
import decoded5 from '~/data/clarity-11ut0ax-1-decoded.json'
import { Visualizer } from '~/utils/visualize'
import { getActivityData, renderClickMap, setupIframe } from '~/utils/heatmap'
import { isMobileDevice, throttle } from '~/utils/util'
import type { CustomActivity, CustomElementData } from '~/type'
import { Event } from '~/emnus'

let domWidth: number, domHeight: number, iframeW: number, iframeH: number, currScale: number
const activity = ref<CustomActivity>([])
const visualize = new Visualizer()
let iframeCurrTop = 0
let iframeCurrHeight = 0
const isShowRectangle = ref(true)

function resize(width: number, height: number): void {
  iframeW = width
  iframeH = height
  const margin = 10
  const px = 'px'
  const iframe = document.getElementById('clarity') as HTMLIFrameElement
  const container = document.querySelector('.heatmaps-heatmap-visual') as HTMLElement
  const availableWidth = container.clientWidth - (2 * margin)
  const availableHeight = container.clientHeight - (2 * margin)
  currScale = Math.min(Math.min(availableWidth / width, 1), Math.min(availableHeight / height, 1))
  if (domWidth && domHeight) {
    const unscaledHeatmapArea = document.querySelector('.unscaled-heatmap-area') as HTMLElement
    unscaledHeatmapArea.style.height = domHeight * currScale + px
    const heatmapWrapper = document.querySelector('.heatmap-wrapper') as HTMLElement
    heatmapWrapper.style.width = domWidth + px
    heatmapWrapper.style.height = domHeight + px
    heatmapWrapper.style.transform = `scale(${currScale})`
    heatmapWrapper.style.transformOrigin = 'center center'
    const heatmapElements = document.querySelector('.heatmap-elements') as HTMLElement
    heatmapElements.style.width = domWidth + px
    heatmapElements.style.height = domHeight + px
  }
  iframe.style.position = 'relative'
  iframe.style.width = width + px
  iframe.style.height = container.clientHeight / currScale + px
  iframeCurrHeight = container.clientHeight / currScale
}

function setupEventListeners() {
  const heatmapVisual = document.querySelector('.heatmaps-heatmap-visual') as HTMLElement
  const throttleRender = throttle(() => {
    renderClickMap(visualize, activity.value, heatmapVisual.scrollTop / currScale)
    iframeCurrTop = heatmapVisual.scrollTop
  }, 100)
  heatmapVisual.addEventListener('scroll', () => {
    throttleRender()
  })
  const throttleResize = throttle(() => {
    resize(iframeW, iframeH)
  }, 100)
  window.addEventListener('resize', () => {
    if (!iframeW || !iframeH) {
      return
    }
    throttleResize()
  })
}

onMounted(async () => {
  const iframe = setupIframe()
  const targetDom = document.querySelector('.heatmap-wrapper') as HTMLElement
  targetDom.appendChild(iframe)

  const dJson = decoded as DecodedPayload[]
  const dJson2 = decoded2 as DecodedPayload[]
  const dJson4 = decoded4 as DecodedPayload[]
  const dJson5 = decoded5 as DecodedPayload[]

  const envelope = dJson[0].envelope
  const merged = visualize.merge([...dJson, ...dJson2, ...dJson4, ...dJson5])
  const clickEvents = merged.events.filter((event: any) => event.event === Event.Click)
  const dom = merged.dom as DomEvent | null
  activity.value = getActivityData(clickEvents, dom)
  const mobile = isMobileDevice(dJson[0].dimension?.[0].data[0][0])
  visualize.setup(iframe.contentWindow as Window, { version: envelope.version, onresize: resize, mobile })
  const domWH = merged.events.find((event: any) => event.event === Event.Document) as any
  if (domWH?.data) {
    domWidth = domWH.data.width
    domHeight = domWH.data.height
  }
  const resizeDom = merged.events.filter((event: any) => event.event === Event.Resize)
  await visualize.dom(dom)
  await visualize.render(resizeDom)
  await renderClickMap(visualize, activity.value, 0)

  setupEventListeners()
})
let timer: any = null
function toSelector(item: CustomElementData): void {
  const heatmapVisual = document.querySelector('.heatmaps-heatmap-visual') as HTMLElement
  const selectorY = item.rectangle.y
  if (selectorY < iframeCurrTop || selectorY > iframeCurrTop + iframeCurrHeight) {
    heatmapVisual.scrollTop = selectorY * currScale - 10
  }
  if (timer) {
    clearTimeout(timer)
  }
  document.getElementsByClassName('red-border')[0]?.classList.remove('red-border')
  const div = document.getElementsByClassName(item.hash || 'undefined')[0] as HTMLElement
  if (div) {
    div.classList.add('red-border')
    if (isShowRectangle.value) {
      timer = setTimeout(() => {
        div.classList.remove('red-border')
      }, 4000)
    }
  }
}
function targetShowRectangle() {
  if (isShowRectangle.value) {
    document.querySelectorAll('.heatmap-elements div').forEach((item: any) => item.style.display = 'none')
  }
  else {
    document.querySelectorAll('.heatmap-elements div').forEach((item: any) => item.style.display = 'block')
  }
  isShowRectangle.value = !isShowRectangle.value
}
const canvasOpacity = ref(1)
function changeOpacity() {
  const iframe = document.getElementById('clarity') as HTMLIFrameElement
  const canvas = iframe.contentDocument?.getElementById('clarity-heatmap-canvas') as HTMLCanvasElement
  if (canvas) {
    canvas.style.opacity = canvasOpacity.value.toString()
  }
}
</script>

<template>
  <div class="content">
    <div class="heatmap-sidebar-wrapper-compare-parent">
      <ul>
        <li v-for="(item, index) in activity" :key="item.hash" cursor-pointer class="hover:color-teal" @click="toSelector(item)">
          {{ `${index + 1}、${item.content} (${item.totalclicks}次)` }}
        </li>
      </ul>
    </div>
    <div class="heatmap-container">
      <div class="heatmaps-heatmap-content">
        <div class="heatmaps-heatmap-visual">
          <div class="unscaled-heatmap-area">
            <div class="heatmap-wrapper">
              <div class="heatmap-elements" />
              <iframe id="clarity" title="Clarity Inspector" scrolling="no" />
            </div>
          </div>
        </div>
      </div>
      <div class="heatmaps-heatmap-footer">
        <button :class="isShowRectangle ? 'i-carbon-view-off' : 'i-carbon-view' " @click="targetShowRectangle()" />
        <input v-model="canvasOpacity" ml-2 type="range" step="0.1" max="1" min="0" @input="changeOpacity()">
      </div>
    </div>
  </div>
</template>

<style scoped>
.content{
  display: flex;
  overflow-y: hidden;
  height: 90vh;
  position: relative;
}
.heatmap-sidebar-wrapper-compare-parent{
  display: flex;
  white-space: nowrap;
  text-align: left;
}
.heatmap-container{
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  overflow: auto;
}
.heatmaps-heatmap-content{
  display: flex;
  overflow: hidden;
  flex: 1;
  margin: 0 16px 0 12px;
  border-radius: 8px 8px 0 0;
  border:  1px solid #CCC;

}
.heatmaps-heatmap-footer{
  margin: 0 16px 12px 12px;
  display: flex;
  height: 50px;
  align-items: center;
  /*box-shadow: 0 5px 14px 0 rgba(131, 126, 255, 0.30);*/
  padding: 14px 16px;
  border-radius: 8px;
  position: relative;
}
.heatmaps-heatmap-visual{
  overflow: hidden auto;
  display: flex;
  position: relative;
  justify-content: center;
  flex: 1;
}
.unscaled-heatmap-area{
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.heatmap-elements{
  position: absolute;
  z-index: 2;
}
#clarity{
  position: relative;
  border: 1px solid #CCC;
  z-index: 1;
}
</style>
