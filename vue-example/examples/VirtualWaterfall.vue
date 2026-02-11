<template>
  <div>
    <p>
      <button @click="edit(1)">添加</button>
      <button @click="edit(2)">删除</button>
      <button @click="edit(3)">重置</button>
      <button @click="scrollTo(900)">滚动到指定位置</button>
    </p>

    <div class="test-scroll" :style="containerStyle">
      <div :style="{ height: `${totalHeight}px` }"></div>
      <div
        v-for="item in sliceData"
        :key="item.key"
        class="test-content-item"
        :style="item.style"
        :data-columnIndex="item.columnIndex"
      >
        <div :style="{ minHeight: `${dataSource[item.index].height}px` }">{{ dataSource[item.index]?.text }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useVirtualLayout } from '@x-virtual/vue'

const dataSource = ref(
  Array(1000)
    .fill(1)
    .map((_, index) => ({
      height: getRandomHeight(50, 200, true),
      key: index + 1,
      text: index + 1,
    })),
)

const { sliceData, scrollTo, totalHeight, containerStyle } = useVirtualLayout(dataSource, {
  columnCount: 3,
  gap: 10,
  getContainerElement: () => document.querySelector('.test-scroll'),
  itemSelector: '.test-content-item',
  getKey: (i) => dataSource.value[i]?.key,
  overscan: 2,
  estimatedHeight: (i) => dataSource.value[i]?.height - 10, //减掉10，是为了测试高度变化滚动效果
})

function getRandomHeight(min = 50, max = 300, integer = true) {
  const val = Math.random() * (max - min) + min
  return integer ? Math.round(val) : val
}

function edit(type) {
  if (type == 1) {
    dataSource.value.push({
      height: getRandomHeight(50, 200, true),
      text: dataSource.value.length + 1,
      key: dataSource.value.length + 1,
    })
  }

  if (type == 2) {
    dataSource.value.splice(dataSource.value.length - 1, 1)
  }

  if (type == 3) {
    dataSource.value = []
  }
}
</script>

<style lang="scss" scoped>
.test-scroll {
  width: 400px;
  height: 500px;
  overflow-y: auto;
  background-color: #f0f4f8;

  .test-content-item {
    background-color: #fff;
    width: 100%;
    box-sizing: border-box;
    overflow: hidden;
    color: #666;
    font-size: 17.9px;
    border-radius: 10px;
    overflow: hidden;

    > div {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}
</style>
