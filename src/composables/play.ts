import { onMounted, onUnmounted, ref } from 'vue'
import type { Data } from 'clarity-decode'
import { decode } from 'clarity-decode'
import type { Envelope } from 'clarity-js/types/data'
import type { ClickData, PointerData } from 'clarity-js/types/interaction'
import type { ClickEvent, PointerEvent } from 'clarity-decode/types/interaction'
import { Visualizer } from '~/utils/visualize'
import { useFormattedTime } from '~/utils/dataFormat'
import { getDetailsBySidApi, getListApi } from '~/api/clarity'
import type { ListItem } from '~/type'

// const { data } = useBroadcastChannel({ name: 'test_clarity' })

// const { status, data, send } = useWebSocket('ws://192.168.1.10:3000', {
//   autoReconnect: true,
// })
//
// watch(data, () => {
//   dataChange(data.value)
// })

const visualize = new Visualizer()
let sessionId = '' // 会话ID
let preEvents: Data.DecodedEvent[] = [] // 前置事件数组，用于拖动进度条时，恢复之前的事件
let events: Data.DecodedEvent[] = [] // 事件数组，用于播放事件
const dJson: Data.DecodedPayload[] = [] // 解码后的数据数组
const isPaused = ref(false) // 是否暂停
const currentTime = ref(0) // 当前进度条时间
const currentTimeUI = useFormattedTime(currentTime) // 当前时间的格式化，用于显示
const totalTime = ref(0) // 总时间
const totalTimeUI = useFormattedTime(totalTime) // 总时间的格式化，用于显示
const isSkipEmptyEvent = ref(true) // 是否跳过空事件
const list = ref<ListItem[]>([])
const currSid = ref('')
const currDoms = ref([]) // 当前的dom数组
const clickList: ClickData[] = [] // 点击事件数组
const pointerList: PointerData[] = [] // 指针事件数组
const pageNum = ref(0)
// 深拷贝
function copy(input: any): any {
  return JSON.parse(JSON.stringify(input))
}

function save(): void {
  const suffix = 'decoded'
  const id = `${sessionId}-${pageNum.value}`
  const json = JSON.stringify(dJson, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.setAttribute('download', `clarity-${id}-${suffix}.json`)
  a.href = url
  a.click()
}

function pause(): void {
  isPaused.value = true
}

function resume(): void {
  isPaused.value = false
}

// 收集点击数据和指针数据
function collectInteractionData(event: Data.DecodedPayload): void {
  if (event.click) {
    event.click.forEach((clickEvent: ClickEvent) => {
      clickList.push(clickEvent.data)
    })
  }
  if (event.pointer) {
    event.pointer.forEach((pointerEvent: PointerEvent) => {
      pointerList.push(pointerEvent.data)
    })
  }
  // console.log(clickList)
  // console.log(pointerList)
}

function dataChange(message: any, isReset = false) {
  if (message) {
    const decoded = decode(message)
    collectInteractionData(decoded)
    if (isReset || decoded.envelope.sequence === 1 || visualize.state === null) {
      reset(decoded.envelope, decoded.dimension?.[0].data[0][0])
    }
    dJson.push(copy(decoded))
    const merged = visualize.merge([decoded]) as any
    events = events.concat(merged.events).sort(sort)
    totalTime.value = merged.events[merged.events.length - 1].time
    if (merged.dom) {
      visualize.dom(merged.dom)
    }
  }
}

function replay(): void {
  const decoded = dJson[0]
  reset(decoded.envelope, decoded.dimension?.[0].data[0][0])
  const merged = visualize.merge(dJson)
  events = events.concat(merged.events).sort(sort)
  if (merged.dom) {
    visualize.dom(merged.dom)
  }
  resume()
}

function changeCurrTime() {
  if (currentTime.value <= 0) {
    currentTime.value = 0
    replay()
  }
  else {
    const merged = visualize.merge(dJson)
    const sortEvents = merged.events.sort(sort)
    preEvents = sortEvents.filter((event: any) => event.time < currentTime.value)
    events = sortEvents.filter((event: any) => event.time >= currentTime.value)
    if (merged.dom) {
      visualize.dom(merged.dom)
    }
  }
  resume()
}

function draggingRange(event: Event) {
  pause()
  currentTime.value = Number.parseInt((event.target as HTMLInputElement).value)
}

// 根据events数组中的数据，渲染页面，每次渲染16ms，即60FPS，渲染完毕后，调用requestAnimationFrame，继续渲染下一帧，最终events数组中的数据会被清空
function playEvents(): void {
  if (isSkipEmptyEvent.value) {
    if (events.length > 0 && !isPaused.value) {
      if (preEvents.length > 0) {
        visualize.render(preEvents)
        preEvents = []
      }
      else {
        let event = events[0] as any
        const end = event.time + 16 // 60FPS => 16ms / frame
        currentTime.value = Math.min(end, totalTime.value)

        let index = 0
        while (event && event.time < end) {
          event = event[++index]
        }
        visualize.render(events.splice(0, index))
      }
    }
  }
  else {
    if (!isPaused.value && currentTime.value < totalTime.value) {
      currentTime.value = Math.min(currentTime.value + 16, totalTime.value)
    }
    if (preEvents.length > 0) {
      visualize.render(preEvents)
      preEvents = []
    }
    else {
      if (events.length > 0 && !isPaused.value) {
        let event = events[0] as any
        let index = 0
        while (event && event.time <= currentTime.value) {
          event = event[++index]
        }
        visualize.render(events.splice(0, index))
      }
    }
  }
  requestAnimationFrame(playEvents)
}

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

function reset(envelope: Envelope, userAgent: string | undefined): void {
  console.clear()
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
  if (sessionId !== envelope.sessionId) {
    sessionId = envelope.sessionId
  }
  pageNum.value = envelope.pageNum
  events = []
  currentTime.value = 0

  iframe.style.display = 'block'
  const mobile = isMobileDevice(userAgent)
  visualize.setup(iframe.contentWindow as Window, { version: envelope.version, onresize: resize, mobile })
}

function sort(a: Data.DecodedEvent, b: Data.DecodedEvent): number {
  return a.time - b.time
}

function isMobileDevice(userAgent: string | undefined): boolean {
  if (!userAgent) {
    return false
  }
  return /android|webos|iphone|ipad|ipod|blackberry|windows phone|opera mini|iemobile|mobile|silk|fennec|bada|tizen|symbian|nokia|palmsource|meego|sailfish|kindle|playbook|bb10|rim/i.test(userAgent)
}

let intervalId: any = null
let currI = 0
async function getDetail(i = 0) {
  if (currSid.value === '') {
    return
  }
  const { data } = await getDetailsBySidApi(currSid.value, i)

  const res = data.value?.data
  const encodeList = res?.list
  currI = res?.i || 0
  if (encodeList) {
    encodeList.forEach((item: string) => {
      dataChange(item)
    })
  }
  if (!res.s && intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

async function clickListItem(sid: string) {
  if (currSid.value === sid) {
    return
  }
  currI = 0
  currSid.value = sid
  currentTime.value = 0
  totalTime.value = 0
  await getDetail()
  if (intervalId !== null) {
    clearInterval(intervalId)
  }
  intervalId = setInterval(() => {
    getDetail(currI)
  }, 1000)
}

async function getList() {
  const { data } = await getListApi()
  list.value = data.value.data.list
}

export function usePlay() {
  onMounted(async () => {
    await getList()
  })
  onUnmounted(() => {
    if (intervalId !== null) {
      clearInterval(intervalId)
    }
  })
  requestAnimationFrame(playEvents)

  return {
    save,
    pageNum,
    currSid,
    getList,
    clickListItem,
    list,
    isPaused,
    currentTime,
    currentTimeUI,
    totalTime,
    totalTimeUI,
    isSkipEmptyEvent,
    currDoms,
    draggingRange,
    pause,
    replay,
    changeCurrTime,
  }
}
