<script setup lang="ts">
import { usePlay } from '~/composables/play'

const {
  save,
  pageNum,
  currSid,
  getList,
  clickListItem,
  list,
  isPaused,
  currentTime,
  totalTime,
  currentTimeUI,
  totalTimeUI,
  replay,
  draggingRange,
  changeCurrTime,
  isSkipEmptyEvent,
} = usePlay()
</script>

<template>
  <div flex overflow-hidden>
    <ul class="left">
      <li
        v-for="item in list" :key="item.sid" :class="{ 'text-green': currSid === item.sid }" class="cursor-pointer"
        @click="clickListItem(item.sid)"
      >
        {{ item.createTime }}
      </li>

      <button class="i-carbon-update-now mt-4 btn" @click="getList" />
    </ul>
    <div class="clarity-box">
      <div class="iframe-box">
        <iframe id="clarity" title="Clarity Inspector" scrolling="no" />
      </div>
      <div class="control-box">
        <div>
          <input
            v-model="currentTime" style="width: 400px" type="range" :max="totalTime" @input="draggingRange"
            @change="changeCurrTime"
          > {{ `${currentTimeUI} / ${totalTimeUI}` }}
        </div>
        <div flex justify-center gap-2>
          {{ pageNum }}
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
    </div>
  </div>
</template>

<style scoped>
.left {
  float: left;
  width: 200px;
  height: calc(100vh - 5rem);
}

.control-box {
  height: 50px;
}

.iframe-box {
  height: calc(100vh - 50px - 5rem);
  width: calc(100vw - 200px - 2rem);
  overflow: hidden;
  border: 0;
}
</style>
