<template>
  <div class="tabs">
    <div class="nav">
      <button
        v-for="(tab, index) in tabs"
        :key="tab"
        :class="{ active: currentTab == index }"
        @click="currentTab = index"
      >
        {{ tab }}
      </button>
    </div>

    <div class="content">
      <component :is="componentmMap[currentTab]" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import VirtualList from './VirtualList.vue'
import WindowVirtualList from './WindowVirtualList.vue'
import VirtualWaterfall from './VirtualWaterfall.vue'

const tabs = ['List', 'Window List', 'Waterfall']
const currentTab = ref('0')

const componentmMap = {
  0: VirtualList,
  1: WindowVirtualList,
  2: VirtualWaterfall,
}
</script>

<style scoped>
.nav {
  display: flex;
  border-bottom: 1px solid #eee;
}
button {
  padding: 10px 20px;
  border: none;
  background: none;
  cursor: pointer;
}
button.active {
  color: #42b983;
  border-bottom: 2px solid #42b983;
  font-weight: bold;
}
.content {
  padding: 20px;
}
</style>
