<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { DecodedPayload } from 'clarity-decode/types/data'
import type { DomEvent } from 'clarity-decode/types/layout'
import decoded from '~/data/clarity-vyhvv2-1-decoded.json'
import decoded2 from '~/data/clarity-d5thf4-1-decoded.json'
import decoded3 from '~/data/clarity-1apior5-1-decoded.json'
import { Visualizer } from '~/utils/visualize'
import { Event } from '~/emnus'
import type { ScrollMapInfo } from '~/type'
import { renderScrollMap, setupIframe } from '~/utils/heatmap'
import { isMobileDevice, throttle } from '~/utils/util'

const visualize = new Visualizer()
let domWidth: number, domHeight: number, iframeW: number, iframeH: number, currScale: number, screenHeight: number
let iframeCurrTop = 0
let iframeCurrHeight = 0
const scrollInfoList = ref<ScrollMapInfo[]>([])
const totalUserNumUI = ref<number>(0)
let currMousePercUsers = { y: 0, percUser: 0 }
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
// 获取总用户数
function getTotalUserNum(data: DecodedPayload[][]): number {
  const userIds = new Set<string>()
  data.forEach((item: DecodedPayload[]) => {
    const userId = item[0].envelope.userId
    userIds.add(userId)
  })
  totalUserNumUI.value = userIds.size
  return userIds.size
}

// 获取所有scrollY的数量
function getScrollYNum(data: DecodedPayload[][]): number {
  return data.reduce((scrollYNum, item) => {
    const merged = visualize.merge(item)
    return scrollYNum + merged.events.filter((event: any) => event.event === Event.Scroll).length
  }, 0)
}

function processScrollY(scrollEvents: any[], userId: string) {
  const scrollYsMap = new Map<number, {
    userSet: Set<string>
    cumulativeSum: number
  }>()
  scrollEvents.forEach((event) => {
    const startY = event.data.y
    const endY = startY + screenHeight
    for (let y = startY; y < endY; y++) {
      const precY = Math.round(y / domHeight * 100)
      if (scrollYsMap.has(precY)) {
        const scrollY = scrollYsMap.get(precY)
        scrollY!.cumulativeSum += 1
        scrollY!.userSet.add(userId)
      }
      else {
        scrollYsMap.set(precY, {
          userSet: new Set([userId]),
          cumulativeSum: 1,
        })
      }
    }
  })
  return scrollYsMap
}

function mergeMapsArray(mapsArray: Map<number, { userSet: Set<string>, cumulativeSum: number }>[]): Map<number, { userSet: Set<string>, cumulativeSum: number }> {
  const mergedMap = new Map<number, { userSet: Set<string>, cumulativeSum: number }>()

  mapsArray.forEach((map) => {
    map.forEach((value, key) => {
      if (mergedMap.has(key)) {
        const existingValue = mergedMap.get(key)!
        value.userSet.forEach(user => existingValue.userSet.add(user))
        existingValue.cumulativeSum += value.cumulativeSum
      }
      else {
        mergedMap.set(key, {
          userSet: new Set(value.userSet),
          cumulativeSum: value.cumulativeSum,
        })
      }
    })
  })

  return mergedMap
}

// 获取每个y累计次数，以及用户数，一个y用户重复时只算一次
function getScrollMapInfo(data: DecodedPayload[][], totalUserNum: number): ScrollMapInfo[] {
  const scrollYsMapArr: Map<number, { userSet: Set<string>, cumulativeSum: number }>[] = []
  data.forEach((item) => {
    const merged = visualize.merge(item)
    const userId = item[0].envelope.userId
    const scrollYs = processScrollY(merged.events.filter((event: any) => event.event === Event.Scroll), userId)
    scrollYsMapArr.push(scrollYs)
  })

  const scrollYsMap = mergeMapsArray(scrollYsMapArr)
  let scrollMapInfo: ScrollMapInfo[] = []
  scrollYsMap.forEach((value, key) => {
    scrollMapInfo.push({
      scrollReachY: key,
      percUsers: Number.parseFloat((value.userSet.size / totalUserNum * 100).toFixed(2)),
      cumulativeSum: value.cumulativeSum,
    })
  })
  let minPerUser = 0
  let minCumulativeSum = 0
  scrollMapInfo = scrollMapInfo.sort((a, b) => a.scrollReachY - b.scrollReachY)
  for (let i = scrollMapInfo.length - 1; i >= 0; i--) {
    if (scrollMapInfo[i].percUsers < minPerUser && minPerUser !== 0) {
      scrollMapInfo[i].percUsers = Number.parseFloat(minPerUser.toFixed(2))
    }
    else {
      minPerUser = scrollMapInfo[i].percUsers
    }
    if (scrollMapInfo[i].cumulativeSum < minCumulativeSum && minCumulativeSum !== 0) {
      scrollMapInfo[i].cumulativeSum = minCumulativeSum
    }
    else {
      minCumulativeSum = scrollMapInfo[i].cumulativeSum
    }
  }
  scrollInfoList.value = scrollMapInfo
  return scrollMapInfo
}

function setupEventListeners(scrollMapInfo: ScrollMapInfo[]) {
  const heatmapVisual = document.querySelector('.heatmaps-heatmap-visual') as HTMLElement
  const throttleRender = throttle(() => {
    renderScrollMap(visualize, scrollMapInfo, heatmapVisual.scrollTop / currScale)
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

async function initializeVisualizer(dJson: DecodedPayload[], iframe: HTMLIFrameElement) {
  const merged = visualize.merge(dJson)
  const dom = merged.dom as DomEvent | null
  const mobile = isMobileDevice(dJson[0].dimension?.[0].data[0][0])
  const envelope = dJson[0].envelope
  visualize.setup(iframe.contentWindow as Window, { version: envelope.version, onresize: resize, mobile })
  const baseLine = merged.events.findLast((event: any) => event.event === Event.Baseline) as any
  if (baseLine?.data) {
    domWidth = baseLine.data.docWidth
    domHeight = baseLine.data.docHeight
    screenHeight = baseLine.data.screenHeight
  }
  const resizeDom = merged.events.filter((event: any) => event.event === Event.Resize)
  await visualize.dom(dom)
  await visualize.render(resizeDom)
}

onMounted(async () => {
  const iframe = setupIframe() as HTMLIFrameElement
  const targetDom = document.querySelector('.heatmap-wrapper') as HTMLElement
  targetDom.appendChild(iframe)
  const dJson = decoded3 as DecodedPayload[]

  await initializeVisualizer(dJson, iframe)

  const decodeList = [decoded, decoded2, decoded3] as DecodedPayload[][]
  const totalUserNum = getTotalUserNum(decodeList)
  // const scrollYNum = getScrollYNum(decodeList)
  getScrollMapInfo(decodeList, totalUserNum)

  await renderScrollMap(visualize, scrollInfoList.value, 0)
  const canvas = iframe!.contentDocument!.getElementById('clarity-heatmap-canvas') as HTMLCanvasElement
  canvas.style.opacity = '0.5'
  setupEventListeners(scrollInfoList.value)
  // ! 平均折叠数，获取baseline中dom的高度，然后除以所有高度
  // ! 平均受访数，获取所有用户数，然后除以所有高度
})

function scrollTo(reachY: number) {
  const heatmapVisual = document.querySelector('.heatmaps-heatmap-visual') as HTMLElement
  heatmapVisual.scrollTop = reachY / 100 * domHeight * currScale
  iframeCurrTop = heatmapVisual.scrollTop
}

function createMarkerPercent(scale: number) {
  const dom = document.querySelector('.heatmaps-scroll-marker') as HTMLElement
  if (dom) {
    return
  }
  // Create the parent div
  const scrollMarkerDiv = document.createElement('div')
  scrollMarkerDiv.className = 'heatmaps-scroll-marker'
  scrollMarkerDiv.style.transform = `scale(${1 / scale})`
  // Create the child div
  const scrollMarkerInfoDiv = document.createElement('div')
  scrollMarkerInfoDiv.className = 'heatmaps-scroll-marker-info bg-white dark:bg-gray'
  // Create the first span
  const percentSpan = document.createElement('span')
  percentSpan.className = 'heatmaps-scroll-marker-percent'
  percentSpan.textContent = `${currMousePercUsers.percUser}%`
  // Create the second span
  const textSpan = document.createElement('span')
  textSpan.textContent = '到达此点的用户数'
  // Append the spans to the child div
  scrollMarkerInfoDiv.appendChild(percentSpan)
  scrollMarkerInfoDiv.appendChild(textSpan)
  // Append the child div to the parent div
  scrollMarkerDiv.appendChild(scrollMarkerInfoDiv);
  // Append the parent div to the desired container in the DOM
  (document.querySelector('.heatmap-elements') as HTMLDivElement).appendChild(scrollMarkerDiv)
}

function moveMarkerPercent(top: number, scale: number, percUser: number) {
  const scrollMarkerDiv = document.querySelector('.heatmaps-scroll-marker') as HTMLElement
  Object.assign(scrollMarkerDiv.style, {
    top: `${top}px`,
    transform: `scale(${1 / scale})`,
  })
  const scrollMarkerPercentSpan = scrollMarkerDiv.querySelector('.heatmaps-scroll-marker-percent') as HTMLElement
  scrollMarkerPercentSpan.textContent = `${percUser}%`
}

function removeMarkerPercent() {
  const scrollMarkerDiv = document.querySelector('.heatmaps-scroll-marker') as HTMLElement
  scrollMarkerDiv.remove()
}

function mouseEnter() {
  createMarkerPercent(currScale)
}

function mouseMove(e: MouseEvent) {
  const className = e.target?.className
  if (className !== 'heatmap-elements') {
    return
  }
  const scrollY = Math.round(e.offsetY / domHeight * 100)
  if (scrollY === currMousePercUsers.y) {
    moveMarkerPercent(e.offsetY, currScale, currMousePercUsers.percUser)
    return
  }
  const scrollInfo = scrollInfoList.value.find(item => item.scrollReachY === scrollY)
  if (!scrollInfo) {
    return
  }
  currMousePercUsers = {
    y: scrollY,
    percUser: Number.parseFloat(scrollInfo.percUsers.toFixed(2)),
  }
  moveMarkerPercent(e.offsetY, currScale, currMousePercUsers.percUser)
}

function mouseLeave() {
  removeMarkerPercent()
}
</script>

<template>
  <div class="content">
    <div class="heatmap-sidebar-wrapper-compare-parent mr-2">
      <ul>
        <template v-for="item in scrollInfoList" :key="item.scrollReachY">
          <li v-if="item.scrollReachY % 5 === 0" grid="~ cols-2" @click="scrollTo(item.scrollReachY)">
            <span class="cursor-pointer select-none c-blue hover:c-green">{{ `${item.scrollReachY}%` }}</span>
            <span>{{ `${Math.round(item.percUsers / 100 * totalUserNumUI)}(${item.percUsers}%)` }}</span>
          </li>
        </template>
      </ul>
    </div>
    <div class="heatmap-container">
      <div class="heatmaps-heatmap-content">
        <div class="heatmaps-heatmap-visual">
          <div class="unscaled-heatmap-area">
            <div class="heatmap-wrapper">
              <div class="heatmap-elements" @mouseenter="mouseEnter" @mousemove="mouseMove" @mouseleave="mouseLeave" />
              <iframe id="clarity" title="Clarity Inspector" scrolling="no" />
            </div>
          </div>
        </div>
      </div>
      <div class="heatmaps-heatmap-footer">
        1
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
