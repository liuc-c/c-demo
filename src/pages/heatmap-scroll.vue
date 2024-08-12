<script setup lang="ts">
import { onMounted } from 'vue'
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

function resize(width: number, height: number): void {
  iframeW = width
  iframeH = height
  const margin = 10
  const px = 'px'
  const iframe = document.getElementById('clarity') as HTMLIFrameElement
  const container = document.querySelector('.heatmaps-heatmap-visual') as HTMLElement
  const offsetTop = iframe.offsetTop
  const availableWidth = container.clientWidth - (2 * margin)
  const availableHeight = container.clientHeight - offsetTop - (2 * margin)
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
      scrollMapInfo[i].percUsers = minPerUser
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
  const baseLine = merged.events.find((event: any) => event.event === Event.Baseline) as any
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
  const scrollYNum = getScrollYNum(decodeList)
  const scrollMapInfo = getScrollMapInfo(decodeList, totalUserNum)
  console.log(scrollMapInfo)
  await renderScrollMap(visualize, scrollMapInfo, 0)
  const canvas = iframe!.contentDocument!.getElementById('clarity-heatmap-canvas') as HTMLCanvasElement
  canvas.style.opacity = '0.5'
  setupEventListeners(scrollMapInfo)
  // ! 平均折叠数，获取baseline中dom的高度，然后除以所有高度
  // ! 平均受访数，获取所有用户数，然后除以所有高度
})
</script>

<template>
  <div class="content">
    <div class="heatmap-sidebar-wrapper-compare-parent">
      <ul>
        <li>一些信息一些信息一些信息</li>
        <li>一些信息一些信息一些信息</li>
        <li>一些信息一些信息一些信息</li>
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
        1
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
