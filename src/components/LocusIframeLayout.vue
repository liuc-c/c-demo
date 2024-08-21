<script setup lang="ts">
defineProps({ iframeId: {
  type: String,
  default: 'clarity',
} })
</script>

<template>
  <div class="content">
    <div class="sidebar-wrapper">
      <slot name="left" />
    </div>
    <div class="container">
      <div class="iframe-content">
        <div class="iframe-box">
          <iframe :id="iframeId" title="Clarity Inspector" scrolling="no" />
        </div>
      </div>
      <div class="footer">
        <slot name="footer" />
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
.sidebar-wrapper{
  display: flex;
  white-space: nowrap;
  text-align: left;
}
.container{
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  overflow: auto;
}

.footer{
  margin: 0 16px 12px 12px;
  display: flex;
  height: 50px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 8px;
  position: relative;
  justify-content: center;
}
.iframe-content{
  display: flex;
  overflow: hidden;
  flex: 1;
  margin: 0 16px 0 12px;
  border-radius: 8px 8px 0 0;
}

.iframe-box {
  width: 100%;
}
</style>
