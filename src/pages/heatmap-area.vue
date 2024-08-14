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

// Disable pointer events for elements outside the body of the iframe
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
    return `0,${Math.round(ctr * 255 / 5)},255` // Blue
  }
  else if (ctr >= 5 && ctr < 15) {
    return `0,255,${255 - Math.round((ctr - 5) * 255 / 10)}` // Cyan
  }
  else if (ctr >= 15 && ctr < 30) {
    return `${Math.round((ctr - 10) * 255 / 15)},255,0` // Lime
  }
  else {
    return `255,${Math.max(255 - Math.round((ctr - 15) * 255 / 70))},0` // Orange
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
  mainDiv.setAttribute('data-ctr', `${ctr}%`)
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
    pointer-events: none;
    color: white;
    font-weight: bold;
    -webkit-text-stroke: 1px black;
    font-family: "Segoe UI", "Segoe UI Web (West European)", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif;
    font-size: 52px;
  `
  innerDiv.textContent = `${ctr}%`

  mainDiv.addEventListener('click', (e) => {
    const currTarget = e.target as HTMLElement
    hideTips()
    setTipsPositionByDom(currTarget, 'click')
  })
  mainDiv.addEventListener('mouseenter', (e) => {
    const currTarget = e.target as HTMLElement
    setTipsPositionByDom(currTarget, 'mouseenter')
  })

  mainDiv.addEventListener('mouseleave', () => {
    hideTips()
  })

  // Append the style and inner div to the main div
  mainDiv.appendChild(style)
  mainDiv.appendChild(innerDiv)
  areaMapDom.appendChild(mainDiv)
}
function hideTips(type = 'mouseenter') {
  const tipsId = type === 'click' ? 'clarity-hover-tip-info-click' : 'clarity-hover-tip-info'
  const tips = document.getElementById(tipsId) as HTMLElement
  tips.style.display = 'none'
}

function setTipsPositionByDom(targetDom: HTMLElement, type: string) {
  const tipsId = type === 'click' ? 'clarity-hover-tip-info-click' : 'clarity-hover-tip-info'
  const targetRects = targetDom.getBoundingClientRect()
  const iframe = document.getElementById('clarity') as HTMLIFrameElement
  const iframeRect = iframe.getBoundingClientRect()
  const tips = document.getElementById(tipsId) as HTMLElement
  tips.style.display = 'block'
  const tipsRects = tips.getBoundingClientRect()
  const totalClicks = targetDom.getAttribute('data-total-click') || ''
  const ctr = targetDom.getAttribute('data-ctr') || ''
  tips.textContent = `点击次数：${totalClicks}，CTR：${ctr}`
  const windowWidth = window.innerWidth
  const iframeRightEdge = windowWidth - iframeRect.left - iframeRect.width

  const targetRightEdge = targetRects.left + targetRects.width
  const scaledTargetRightEdge = targetRightEdge * currScale + iframeRect.left
  const maxLeft = windowWidth - tipsRects.width - iframeRightEdge
  const left = Math.max(Math.min(scaledTargetRightEdge - tipsRects.width, maxLeft), 0)

  const scaledTargetTop = targetRects.top * currScale + iframeRect.top
  const top = Math.max(scaledTargetTop - tipsRects.height, 0)

  tips.style.top = `${top}px`
  tips.style.left = `${left}px`
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
    const itemParents = item.parents
    if (itemParents.includes(currDomId)) {
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
  const editAreaMap = iframeDom.getElementById('clarity-area-map') as HTMLElement
  editAreaMap.style.pointerEvents = 'none'
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
  const editAreaMap = iframeDom.getElementById('clarity-area-map') as HTMLElement
  editAreaMap.style.pointerEvents = 'auto'
}

function setupEventListeners() {
  const heatmapVisual = document.querySelector('.heatmaps-heatmap-visual') as HTMLElement
  const iframeDom = getIframeDom()
  disableOutsideBodyPointerEvents(iframeDom)
  disableIframeEvents(iframeDom)

  // scroll event
  const throttleRender = throttle(() => {
    hideTips('click')
    scrollToY(visualize, heatmapVisual.scrollTop / currScale)
    iframeCurrTop = heatmapVisual.scrollTop
  }, 100)
  heatmapVisual.addEventListener('scroll', () => {
    throttleRender()
  })
  // resize event
  const throttleResize = throttle(() => {
    closeEditModal()
    hideTips('click')
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
  const domTree = convertToTree(Array.from(domMap.values()))
  const bodyTree = findBodyNodeUnderHtml(domTree) as DomDataTree
  const lastLevelNodes = bfsCollectDomNodes(bodyTree)
  lastLevelNodes.forEach((item) => {
    getCTRByDom(item)
  })
  return Array.from(domMap.values())
}

function bfsCollectDomNodes(root: DomDataTree): DomDataTree[] {
  const queue: DomDataTree[] = [root]
  let currentLevelNodes: DomDataTree[] = []
  let nextLevelNodes: DomDataTree[] = []
  const iframe = getIframeDom()
  while (queue.length > 0) {
    const node = queue.shift()!
    const domElement = getDomById(node.id, iframe)
    if (!domElement) {
      continue
    }
    const rect = domElement.getBoundingClientRect()
    if (rect.width <= 200 || rect.height === 0) {
      continue
    }
    currentLevelNodes.push(node)
    if (currentLevelNodes.length >= 6 && queue.length === 0) {
      return currentLevelNodes
    }
    nextLevelNodes.push(...node.children)
    if (queue.length === 0) {
      queue.push(...nextLevelNodes)
      nextLevelNodes = []
      currentLevelNodes = []
    }
  }
  return currentLevelNodes
}

function getDomById(id: number, iframe: Document): HTMLElement {
  return iframe.querySelector(`[data-clarity-id="${id}"]`) as HTMLElement
}

interface DomDataTree extends DomData {
  children: DomDataTree[]
}

function findBodyNodeUnderHtml(domDataTree: DomDataTree[]): DomDataTree | null {
  const queue: DomDataTree[] = [...domDataTree]
  let htmlNode: DomDataTree | null = null

  while (queue.length > 0) {
    const node = queue.shift()!
    if (node.tag.toUpperCase() === 'HTML') {
      htmlNode = node
      break
    }
    queue.push(...node.children)
  }

  if (htmlNode) {
    for (const child of htmlNode.children) {
      if (child.tag.toUpperCase() === 'BODY') {
        return child
      }
    }
  }

  return null
}

function convertToTree(domDataArray: DomData[]): DomDataTree[] {
  const map = new Map<number, DomDataTree>()
  const roots: DomDataTree[] = []

  domDataArray.forEach((node) => {
    map.set(node.id, { ...node, children: [] })
  })

  domDataArray.forEach((node) => {
    const parentNode = map.get(node.parent)
    if (parentNode) {
      parentNode.children.push(map.get(node.id)!)
    }
    else {
      roots.push(map.get(node.id)!)
    }

    const previousNode = map.get(node.previous)
    if (previousNode) {
      const parentChildren = parentNode ? parentNode.children : roots
      const index = parentChildren.indexOf(map.get(node.id)!)
      if (index > 0) {
        parentChildren.splice(index, 1)
        parentChildren.splice(parentChildren.indexOf(previousNode) + 1, 0, map.get(node.id)!)
      }
    }
  })
  return roots
}

function createHoverDiv() {
  if (document.getElementById('clarity-hover-tip-info')) {
    return
  }
  const tipsHover = document.createElement('div')
  tipsHover.id = 'clarity-hover-tip-info'
  Object.assign(tipsHover.style, {
    'display': 'none',
    'width': '200px',
    'max-height': '200px',
    'position': 'fixed',
    'top': '0px',
    'right': '0px',
    'backgroundColor': 'lime',
    'zIndex': '100',
  })
  document.body.append(tipsHover)
  if (document.getElementById('clarity-hover-tip-info-click')) {
    return
  }
  const clickTipsHover = document.createElement('div')
  clickTipsHover.id = 'clarity-hover-tip-info-click'
  Object.assign(clickTipsHover.style, {
    'display': 'none',
    'width': '200px',
    'max-height': '200px',
    'position': 'fixed',
    'top': '0px',
    'right': '0px',
    'backgroundColor': 'lime',
    'zIndex': '100',
  })
  document.body.append(clickTipsHover)
}

onMounted(async () => {
  createHoverDiv()
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
    Event.DoubleClick,
    Event.MouseMove,
    Event.MouseUp,
    Event.MouseDown,
    Event.TouchMove,
    Event.TouchEnd,
    Event.TouchStart,
    Event.Scroll,
  ]
  await visualize.render(merged.events.filter((item: any) => !noRender.includes(item.event) && item.time < 1000).sort(sort))
  injectAreaMapShadowRoot()
  setupEventListeners()
  await new Promise(resolve => setTimeout(resolve, 2000))
  domDataList = getDomDataList(merged)
})
</script>

<template>
  <IframeLayout>
    <template #left>
      <ul w-200px>
        <template v-for="item in areaMapListUI" :key="item.hash">
          <li overflow-hidden>
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
