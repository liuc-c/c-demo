<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { type Data, decode } from 'clarity-decode'
import type { Envelope } from 'clarity-js/types/data'
import type { DomData } from 'clarity-decode/types/layout'
import type { MergedPayload } from 'clarity-visualize'
import { Visualizer } from 'clarity-visualize'
import payloads from '~/data/payloads.json'
import clickInfoData from '~/data/clickInfo.json'
import { scrollToY, setupIframe } from '~/utils/heatmap'
import { isMobileDevice, throttle } from '~/utils/util'
import IframeLayout from '~/components/iframeLayout.vue'
import { Event } from '~/emnus'
import type { AreaMapItem, ClickInfo } from '~/type'

const clickInfo = clickInfoData as ClickInfo
let domWidth: number, domHeight: number, iframeW: number, iframeH: number, currScale: number
let iframeCurrTop = 0
const visualize = new Visualizer()
let domDataList = [] as DomData[]
let domDataMap = new Map<number, DomData>()
const pageViews = 7281
const totalClicks = 8586
const isEditMode = ref(false)
const areaMapListUI = ref<AreaMapItem[]>([])

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
}

function getIframeDom(): Document {
  const iframe = document.getElementById('clarity') as HTMLIFrameElement
  return iframe.contentDocument as Document
}

/**
 * Inject area map shadow root
 */
function injectAreaMapShadowRoot() {
  const iframe = document.getElementById('clarity') as HTMLIFrameElement
  const htmlElement = iframe.contentDocument!.documentElement as HTMLElement
  const div = document.createElement('div')
  div.id = 'clarity-area-map'
  Object.assign(div.style, {
    'pointerEvents': 'none',
    'display': 'block',
    'position': 'absolute',
    'top': '0px',
    'left': '0px',
    'width': '100%',
    'overflow': 'hidden',
    'z-index': '2147483647',
    'height': `${domHeight}px`,
  })
  const editDiv = document.createElement('div')
  editDiv.id = 'clarity-edit-hover'
  Object.assign(editDiv.style, {
    'pointerEvents': 'none',
    'display': 'none',
    'position': 'absolute',
    'height': '0',
    'width': '0',
    'top': '0',
    'left': '0',
    'z-index': '2147483647',
    'box-shadow': 'rgb(0, 120, 212) 0px 0px 0px 1px, rgb(0, 120, 212) 0px 0px 0px 1px inset, white 0px 0px 0px 2px inset',
    'background-color': 'rgba(128, 128, 128, 0.4)',
    'background-image': 'repeating-linear-gradient(135deg, transparent, transparent 35px, rgba(255, 255, 255, 0.5) 35px, rgba(255, 255, 255, 0.5) 70px)',

  })
  div.appendChild(editDiv)
  htmlElement.append(div)
}

function reset(envelope: Envelope, userAgent: string | undefined): void {
  console.clear()
  const iframe = setupIframe()
  const heatEle = document.querySelector('.heatmap-elements') as HTMLElement
  heatEle.style.zIndex = '0'
  const targetDom = document.querySelector('.heatmap-wrapper') as HTMLElement
  targetDom.appendChild(iframe)

  const mobile = isMobileDevice(userAgent)
  visualize.setup(iframe.contentWindow as Window, { version: envelope.version, onresize: resize, mobile })
}

function sort(a: Data.DecodedEvent, b: Data.DecodedEvent): number {
  return a.time - b.time
}

// Disable pointer events for elements outside the body
function disableOutsideBodyPointerEvents(iframeDom: Document) {
  const interactionCanvas = iframeDom.getElementById('clarity-interaction-canvas') as HTMLCanvasElement
  interactionCanvas.style.pointerEvents = 'none'
  interactionCanvas.style.display = 'none'
}

function disableIframeEvents(iframeDom: Document) {
  // 屏蔽a标签的点击事件
  const aTags = iframeDom.getElementsByTagName('a')
  for (let i = 0; i < aTags.length; i++) {
    aTags[i].addEventListener('click', (e) => {
      e.preventDefault()
    })
  }
  // 所有鼠标手势设置为默认
  const allElements = iframeDom.getElementsByTagName('*')
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i] as HTMLElement
    el.style.cursor = 'default'
    el.style.userSelect = 'none'
  }
}

// Set edit hover position when hovering over the heatmap
function setEditHoverPosition(iframeDom: Document, x: number, y: number, width: number, height: number) {
  const editHover = iframeDom.getElementById('clarity-edit-hover') as HTMLElement
  editHover.style.display = 'block'
  editHover.style.width = `${width}px`
  editHover.style.height = `${height}px`
  editHover.style.left = `${x}px`
  editHover.style.top = `${y}px`
}

function getClicksByHash(hash: string | undefined | null, hashBeta: string | undefined | null): number {
  if (typeof hash !== 'string' && typeof hashBeta !== 'string') {
    return 0
  }
  return (hashBeta && clickInfo?.[hashBeta]?.totalclicks) || (hash && clickInfo?.[hash]?.totalclicks) || 0
}

function getColorByCTR(ctr: number): string {
  if (ctr >= 0 && ctr < 5) {
    return `0,${Math.round(ctr * 51)},255` // Blue
  }
  else if (ctr >= 5 && ctr < 10) {
    return `0,255,${255 - Math.round((ctr - 5) * 51)}` // Cyan
  }
  else if (ctr >= 10 && ctr < 15) {
    return `${Math.round((ctr - 10) * 51)},255,0` // Lime
  }
  else {
    return `255,${Math.max(255 - Math.round((ctr - 15) * 51))},0` // Orange
  }
}

function generateAreaElement(iframeDom: Document, options: { hash: string, clicks: number, target: number, ctr: number }) {
  const { hash, clicks, target, ctr } = options
  const areaMapDom = iframeDom.getElementById('clarity-area-map') as HTMLElement
  const domId = `h_${hash}_${target}`
  const existingElement = areaMapDom.querySelector(`#${domId}`)
  if (existingElement) {
    return
  }
  const realDom = iframeDom.querySelector(`[data-clarity-id="${target}"]`) as HTMLElement
  const position = ['sticky', 'fixed'].includes(getComputedStyle(realDom).position) ? 'fixed' : 'absolute'
  const rect = realDom.getBoundingClientRect()
  // Create the main div element
  const mainDiv = document.createElement('div')
  mainDiv.id = domId
  mainDiv.setAttribute('data-total-click', clicks.toString())
  mainDiv.setAttribute('data-clarity-area-map-div', '1')
  const color = getColorByCTR(ctr)
  // Create the style element
  const style = document.createElement('style')
  style.innerHTML = `
    #${domId} {
      height: ${rect.height}px;
      width: ${rect.width}px;
      top: ${rect.y + iframeCurrTop / currScale}px;
      left: ${rect.x}px;
      box-sizing: border-box;
      background-color: rgba(${color}, 0.5);
      box-shadow: white 0px 0px 0px 2px inset;
      display: flex;
      align-items: center;
      justify-content: center;
      position: ${position};
    }
    #${domId}:hover {
      background-color: rgba(${color}, 0.75);
      box-shadow: rgb(0, 120, 212) 0px 0px 0px 1px, rgb(0, 120, 212) 0px 0px 0px 1px inset, white 0px 0px 0px 2px inset;
    }
  `

  // Create the inner div element
  const innerDiv = document.createElement('div')
  innerDiv.setAttribute('data-clarity-area-map-div', '1')
  innerDiv.style.cssText = `
    color: white;
    font-weight: bold;
    -webkit-text-stroke: 1px black;
    font-family: "Segoe UI", "Segoe UI Web (West European)", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif;
    font-size: 52px;
  `
  innerDiv.textContent = `${ctr}%`

  // Append the style and inner div to the main div
  mainDiv.appendChild(style)
  mainDiv.appendChild(innerDiv)
  areaMapDom.appendChild(mainDiv)
}

/**
 * query all parent nodes id of the dom
 * @param dom
 */
function getDomParent(dom: DomData): number[] {
  const parents = [] as number[]
  if (!dom.parent) {
    return parents
  }
  let parent = domDataMap.get(dom.parent)
  while (parent) {
    parents.push(parent.id)
    parent = domDataMap.get(parent.parent)
  }
  return parents
}

function removeAreaElement(hash: string, target: number) {
  const iframeDom = getIframeDom()
  const domId = `h_${hash}_${target}`
  const realDom = iframeDom.getElementById(domId) as HTMLElement
  realDom.remove()
}

function removeClashDom(dom: DomData, domParents: number[]) {
  const currDomId = dom.id
  areaMapListUI.value = areaMapListUI.value.filter((item) => {
    if (item.domData.id === currDomId) {
      return true
    }
    if (item.domData.parent === currDomId) {
      removeAreaElement(item.hash, item.domData.id)
      return false
    }
    if (domParents.includes(item.domData.id)) {
      removeAreaElement(item.hash, item.domData.id)
      return false
    }
    const parents = item.parents
    if (parents.includes(currDomId)) {
      removeAreaElement(item.hash, item.domData.id)
      return false
    }
    return true
  })
}

function getCTRByDom(dom: DomData) {
  if (areaMapListUI.value.find(item => item.domData.id === dom.id)) {
    return
  }
  const iframeDom = getIframeDom()
  const realDom = iframeDom.querySelector(`[data-clarity-id="${dom.id}"]`)
  let domCLicks = 0
  if (!realDom) {
    return
  }
  domCLicks += getClicksByHash(dom.hashAlpha, dom.hashBeta)
  // 获取所有子元素
  const children = realDom.querySelectorAll('*')
  children.forEach((child: Element) => {
    const hashAlpha = child.getAttribute('data-clarity-hashalpha')
    const hashBeta = child.getAttribute('data-clarity-hashbeta')
    domCLicks += getClicksByHash(hashAlpha, hashBeta)
  })
  const hash = dom.hashBeta || dom.hashAlpha || ''
  const domParents = getDomParent(dom)
  removeClashDom(dom, domParents)
  areaMapListUI.value.push({
    domData: dom,
    clicks: domCLicks,
    ctr: Number.parseFloat((domCLicks / totalClicks * 100).toFixed(2)),
    hash,
    content: realDom.textContent || '',
    parents: domParents,
  })
  generateAreaElement(iframeDom, {
    hash,
    clicks: domCLicks,
    target: dom.id,
    ctr: Number.parseFloat((domCLicks / totalClicks * 100).toFixed(2)),
  })
}

function getDomInfoByHash(hash: string, hashBeta: string) {
  const dom = domDataList.find((item: DomData) => item.hashAlpha === hash || item.hashBeta === hashBeta)
  if (!dom) {
    return
  }
  getCTRByDom(dom)
}

function changeEditMode() {
  if (isEditMode.value) {
    closeEditModal()
  }
  else {
    openEditModal()
  }
}

let editModeClickListener: any
let editModeMouseMoveListener: any

function openEditModal() {
  isEditMode.value = true
  const iframeDom = getIframeDom()
  editModeClickListener = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    const hash = target.getAttribute('data-clarity-hashalpha') || ''
    const hashBeta = target.getAttribute('data-clarity-hashbeta') || ''
    getDomInfoByHash(hash, hashBeta)
  }
  iframeDom.body.addEventListener('click', editModeClickListener)

  const throttleMouseMove = throttle((e: MouseEvent) => {
    const target = e.target as HTMLElement
    const rect = target.getBoundingClientRect()
    const x = rect.x
    const y = rect.y + iframeCurrTop / currScale
    const width = rect.width
    const height = rect.height
    setEditHoverPosition(iframeDom, x, y, width, height)
  }, 100)
  editModeMouseMoveListener = (e: MouseEvent) => {
    throttleMouseMove(e)
  }
  iframeDom.body.addEventListener('mousemove', editModeMouseMoveListener)
}

function closeEditModal() {
  isEditMode.value = false
  const iframeDom = getIframeDom()
  iframeDom.body.removeEventListener('click', editModeClickListener)
  iframeDom.body.removeEventListener('mousemove', editModeMouseMoveListener)
  const editHover = iframeDom.getElementById('clarity-edit-hover') as HTMLElement
  editHover.style.display = 'none'
}

function setupEventListeners() {
  const heatmapVisual = document.querySelector('.heatmaps-heatmap-visual') as HTMLElement
  const iframeDom = getIframeDom()
  disableOutsideBodyPointerEvents(iframeDom)
  disableIframeEvents(iframeDom)

  // scroll event
  const throttleRender = throttle(() => {
    scrollToY(visualize, heatmapVisual.scrollTop / currScale)
    iframeCurrTop = heatmapVisual.scrollTop
  }, 100)
  heatmapVisual.addEventListener('scroll', () => {
    throttleRender()
  })
  // resize event
  const throttleResize = throttle(() => {
    closeEditModal()
    resize(iframeW, iframeH)
  }, 100)
  window.addEventListener('resize', () => {
    if (!iframeW || !iframeH) {
      return
    }
    throttleResize()
  })
}

function getDomDataList(merged: MergedPayload): DomData[] {
  const domData = [
    Event.Discover,
    Event.Mutation,
    Event.Snapshot,
  ]
  const domEventList = merged.events.filter((item: any) => domData.includes(item.event))
  domEventList.push(merged.dom)
  domEventList.sort(sort)
  const domMap = new Map<number, DomData>()
  domEventList.forEach((event: any) => {
    event.data.forEach((data: any) => {
      domMap.set(data.id, data)
    })
  })
  domDataMap = domMap
  // console.log(convertToTree(Array.from(domMap.values())))
  return Array.from(domMap.values())
}

onMounted(async () => {
  const dJsons = []
  for (const payload of payloads) {
    const decoded = decode(payload)
    if (decoded.envelope.sequence === 1 || visualize.state === null) {
      reset(decoded.envelope, decoded.dimension?.[0].data[0][0])
    }
    dJsons.push(decode(payload))
  }
  const merged = visualize.merge(dJsons) as MergedPayload
  const baseLine = merged.events.findLast((event: any) => event.event === Event.Baseline) as any
  if (baseLine?.data) {
    domWidth = baseLine.data.docWidth
    domHeight = baseLine.data.docHeight
  }
  await visualize.dom(merged.dom)
  const noRender = [
    Event.Click,
    Event.MouseMove,
    Event.MouseUp,
    Event.MouseDown,
    Event.TouchMove,
    Event.Scroll,
  ]
  domDataList = getDomDataList(merged)
  await visualize.render(merged.events.filter((item: any) => !noRender.includes(item.event)).sort(sort))
  injectAreaMapShadowRoot()
  setupEventListeners()
})
</script>

<template>
  <IframeLayout>
    <template #left>
      <ul>
        <template v-for="item in areaMapListUI" :key="item.hash">
          <li w-200px overflow-hidden>
            {{ item.content || item.domData.selectorBeta }}
          </li>
        </template>
      </ul>
    </template>
    <template #footer>
      <button btn @click="changeEditMode">
        {{ isEditMode ? "退出编辑" : "编辑模式" }}
      </button>
    </template>
  </IframeLayout>
</template>

<style scoped>

</style>
