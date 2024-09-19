<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { codeToHtml, getHighlighter } from 'shiki/bundle/web'
import { decode } from '../../../clarity/packages/clarity-decode/build/clarity.decode.module'
import { Visualizer } from '../../../clarity/packages/clarity-visualize/build/clarity.visualize.module'
import { Event } from '~/emnus'

const input = ref('')
const output = ref('')
const leftPanelWidth = ref('50%')
const dividerRef = ref<HTMLElement | null>(null)
const visualizer = new Visualizer()
let highlighter: any

const decodeOutput = ref<any[]>([])

async function getHightLight(data: any) {
  const jsonString = JSON.stringify(data, null, 2)
  return await codeToHtml(jsonString, {
    lang: 'json',
    theme: 'github-dark',
  })
}

const currentEvent = ref<Event[]>([])

async function getEventData() {
  const copyData = JSON.parse(JSON.stringify(decodeOutput.value))
  const merged = visualizer.merge(copyData)
  const uniqueEvents = [...new Set(merged.events.map((event: { event: Event }) => event.event))]
  currentEvent.value = uniqueEvents
}

async function decodeInput() {
  try {
    const parsedInput = JSON.parse(input.value)
    let result: any[]

    if (Array.isArray(parsedInput)) {
      result = parsedInput.map((item) => {
        if (typeof item === 'string') {
          return decode(item)
        }
        return item
      })
    }
    else if (typeof parsedInput === 'object') {
      result = [decode(input.value)]
    }
    else {
      result = [parsedInput]
    }
    decodeOutput.value = result
    const jsonString = JSON.stringify(result, null, 2)
    if (highlighter) {
      output.value = await codeToHtml(jsonString, {
        lang: 'json',
        theme: 'github-dark',
      })
    }
    else {
      output.value = jsonString
    }
    getEventData()
  }
  catch (error: any) {
    output.value = error.message || '解码失败：输入不是有效的 JSON 格式'
  }
}

function handleDrag(e: MouseEvent) {
  const container = document.querySelector('.main-container') as HTMLElement
  if (container) {
    // 获取左侧 padding 值（假设为 1rem）
    const paddingLeft = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
    // 调整鼠标位置，考虑左侧 padding
    const adjustedClientX = e.clientX - paddingLeft
    // 计算新的宽度百分比
    const newWidth = (adjustedClientX / container.offsetWidth) * 100
    leftPanelWidth.value = `${Math.min(Math.max(newWidth, 10), 90)}%`
  }
}

function handleMouseDown(event: MouseEvent) {
  event.preventDefault()
  const handleMouseMove = (e: MouseEvent) => handleDrag(e)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', () => {
    document.removeEventListener('mousemove', handleMouseMove)
  }, { once: true })
}

onMounted(async () => {
  try {
    highlighter = await getHighlighter({
      themes: ['github-dark'],
      langs: ['json'],
    })
  }
  catch (error) {
    console.error('初始化 shiki 失败:', error)
  }
})

watch(input, () => {
  decodeInput()
})

async function getDomData() {
  const copyData = JSON.parse(JSON.stringify(decodeOutput.value))
  output.value = await getHightLight(visualizer.merge(copyData).dom)
}

async function getEnvelopeData() {
  const copyData = JSON.parse(JSON.stringify(decodeOutput.value))
  output.value = await getHightLight(copyData.map((event: any) => event.envelope))
}

async function replay() {
  const copyData = JSON.parse(JSON.stringify(decodeOutput.value))
  output.value = await getHightLight(copyData)
}

async function getDataByEvent(item: Event) {
  const copyData = JSON.parse(JSON.stringify(decodeOutput.value))
  const merged = visualizer.merge(copyData)
  output.value = await getHightLight(merged.events.filter((event: any) => event.event === item))
}
</script>

<template>
  <div class="decoder-container">
    <div class="toolbar" flex gap-10px>
      <!-- 现有的按钮 -->
      <button btn @click="replay">
        源数据
      </button>
      <button btn @click="getDomData">
        获取Dom数据
      </button>
      <button btn @click="getEnvelopeData">
        Envelope
      </button>
      <!-- 新增的动态按钮 -->
      <button
        v-for="event in currentEvent"
        :key="event"
        btn
        @click="getDataByEvent(event)"
      >
        {{ Event[event] }}
      </button>
    </div>
    <div class="main-container">
      <div class="input-section" :style="{ width: leftPanelWidth }">
        <h2>输入</h2>
        <textarea v-model="input" placeholder="请输入未解码的字符串或字符串数组" />
      </div>
      <div
        ref="dividerRef"
        class="divider"
        @mousedown="handleMouseDown"
      />
      <div class="output-section" :style="{ width: `calc(100% - ${leftPanelWidth})` }">
        <h2>输出</h2>
        <div class="output-content" v-html="output" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.decoder-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 5rem); /* 减去上下 padding */
  width: calc(100vw - 2rem); /* 减去左右 padding */
  overflow: hidden;
}

.toolbar {
  background: #24292E;
  border-radius: 10px;
  height: 100px;
  width: 100%;
  flex-shrink: 0;
  margin-bottom: 10px;
  padding: 10px;
}

.toolbar button {
  height: 36px;
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.input-section, .output-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.divider {
  width: 4px;
  background-color: #24292E;
  cursor: col-resize;
  flex-shrink: 0;
}

textarea {
  flex: 1;
  width: calc(100% - 10px);
  resize: none;
  padding: 10px;
  overflow-y: auto;
  background:#24292E;
  border-radius: 10px;

}
textarea:focus {
  outline: none;
}

.output-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  text-align: left;
  background: #24292E;
  border-radius: 10px;
  margin-left: 10px;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.output-content :deep(pre) {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

h2 {
  margin: 0 0 10px 0;
  padding: 0;
}
</style>
