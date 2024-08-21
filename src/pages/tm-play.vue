<script setup lang="ts">
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'
import { computed } from 'vue'
import { decode } from 'clarity-decode'
import { get } from 'idb-keyval'
import { usePlayByTm } from '~/composables/playByTM'
import LocusIframeLayout from '~/components/LocusIframeLayout.vue'

const { data } = useIDBKeyval('clarity', {})

async function remove() {
  data.value = {}
}

async function updateData() {
  data.value = await get('clarity')
}

const {
  save,
  clickListItemByTM,
  isPaused,
  currentTime,
  currentTimeUI,
  totalTime,
  totalTimeUI,
  isSkipEmptyEvent,
  draggingRange,
  replay,
  changeCurrTime,
} = usePlayByTm()
const dataUI = computed(() => {
  const arr = []
  for (const key in data.value) {
    const value = []
    for (const item in data.value[key]) {
      const [userId, sessionId, pageNum] = item.split('_')
      const k = `${userId}_${sessionId}`
      const encodeData = data.value[key][item]
      let url = ''
      for (const encodeDatum of encodeData) {
        const decodeData = decode(encodeDatum)
        if (decodeData.envelope.sequence === 1) {
          url = decodeData.dimension?.[0].data[1][0]
        }
      }
      if (!value.find(v => v.key === k)) {
        value.push({
          key: k,
          value: [
            { url, pageNum, value: encodeData },
          ],
        })
      }
      else {
        value.find(v => v.key === k).value.push({ url, pageNum, value: encodeData })
      }
    }
    arr.push({ key, value })
  }
  return arr
})
</script>

<template>
  <LocusIframeLayout>
    <template #left>
      <div flex="~ col" gap2>
        <div flex gap-3>
          <button class="i-carbon:task-remove c-red" @click="remove()" />
          <button class="i-carbon-reset c-green" @click="updateData()" />
        </div>
        <div w-200px overflow-auto scroll-auto text-align-left>
          <div v-for="item in dataUI" :key="item.key">
            <span text-teal>{{ item.key }}</span>
            <div v-for="v in item.value" :key="v.key" pl-2>
              {{ `用户：${v.key}` }}
              <ul pl-2>
                <li
                  v-for="vv in v.value"
                  :key="vv.pageNum"
                  :title="vv.url" class="hover:c-green"
                  style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                  cursor-pointer @click="clickListItemByTM(vv.value)"
                >
                  {{ `${vv.pageNum}、${vv.url}` }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="control-box">
        <div>
          <input
            v-model="currentTime" style="width: 400px" type="range" :max="totalTime" @input="draggingRange"
            @change="changeCurrTime"
          > {{ `${currentTimeUI} / ${totalTimeUI}` }}
        </div>
        <div flex justify-center gap-2>
          <button class="i-carbon-save btn" @click="save" />
          <button class="i-carbon-reset btn" @click="replay" />
          <button
            class="btn" :class="isPaused ? 'i-carbon-play-outline' : 'i-carbon-pause-outline'"
            @click="isPaused = !isPaused"
          />
          <input id="isSkipEmptyEvent" v-model="isSkipEmptyEvent" type="checkbox">
          <label ml-1 for="isSkipEmptyEvent">跳过空白操作</label>
        </div>
      </div>
    </template>
  </LocusIframeLayout>
</template>

<style scoped>

</style>
