<script setup lang="ts">
defineProps({ iframeId: {
  type: String,
  default: 'clarity',
} })
</script>

<template>
  <div class="content">
    <div class="heatmap-sidebar-wrapper-compare-parent">
      <slot name="left" />
    </div>
    <div class="heatmap-container">
      <div class="heatmaps-heatmap-content">
        <div class="heatmaps-heatmap-visual">
          <div class="unscaled-heatmap-area">
            <div class="heatmap-wrapper">
              <div class="heatmap-elements" />
              <iframe :id="iframeId" title="Clarity Inspector" scrolling="no" />
            </div>
          </div>
        </div>
      </div>
      <div class="heatmaps-heatmap-footer">
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
