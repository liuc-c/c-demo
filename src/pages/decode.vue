<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const input = ref('')
const output = ref('')
const leftPanelWidth = ref('50%')
const dividerRef = ref<HTMLElement | null>(null)

function decodeInput() {
  try {
    const decoded = JSON.parse(input.value)
    output.value = JSON.stringify(decoded, null, 2)
  }
  catch {
    output.value = '解码失败：输入不是有效的 JSON 格式'
  }
}

function handleDrag(e: MouseEvent) {
  const container = document.querySelector('.main-container') as HTMLElement
  if (container) {
    const newWidth = (e.clientX / container.offsetWidth) * 100
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
  if (dividerRef.value) {
    dividerRef.value.addEventListener('mousedown', handleMouseDown)
  }
})

watch(input, () => {
  decodeInput()
})
</script>

<template>
  <div class="decoder-container">
    <div class="toolbar">
      <!-- 在这里添加工具栏内容 -->
    </div>
    <div class="main-container">
      <div class="input-section" :style="{ width: leftPanelWidth }">
        <h2>输入</h2>
        <textarea v-model="input" placeholder="请输入未解码的字符串或字符串数组" />
      </div>
      <div
        ref="dividerRef"
        class="divider"
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
  height: 100px;
  width: 100%;
  background-color: #f0f0f0;
  flex-shrink: 0;
  margin-bottom: 10px;
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
  background-color: #ccc;
  cursor: col-resize;
  flex-shrink: 0;
}

textarea {
  flex: 1;
  width: 100%;
  resize: none;
  padding: 10px;
  border: 1px solid #ccc;
  overflow-y: auto;
}

.output-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  text-align: left; /* 添加这一行 */
}

h2 {
  margin: 0 0 10px 0;
  padding: 0;
}
</style>
