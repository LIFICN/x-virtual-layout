<template>
  <div>
    <p>
      <button @click="edit(1)">添加</button>
      <button @click="edit(2)">删除</button>
      <button @click="edit(3)">重置</button>
      <button @click="scrollTo(9000)">滚动到指定位置</button>
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
        <img
          src="https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png"
          style="width: 47px; height: 47px; border-radius: 50%"
        />
        <p>{{ dataSource[item.index]?.el + '-----' + dataSource[item.index]?.text }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useVirtualLayout } from '@x-virtual/vue'

const dataSource = ref(
  Array(100)
    .fill(1)
    .map((_, index) => ({
      el: index + 1,
      text: generateRandomText(),
      key: index + 1,
    })),
)

const { sliceData, scrollTo, totalHeight, containerStyle } = useVirtualLayout(dataSource, {
  columnCount: 2,
  gap: 10,
  getContainerElement: () => document.querySelector('.test-scroll'),
  itemSelector: '.test-content-item',
  getKey: (i) => dataSource.value[i]?.key,
  overscan: 3,
  estimatedHeight: (i) => 50,
})

function generateRandomText() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const length = Math.floor(Math.random() * 141) + 60 // 随机生成60到200之间的长度
  let result = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    result += characters[randomIndex]
  }

  return result
}

function edit(type) {
  if (type == 1) {
    dataSource.value.push({
      el: dataSource.value.length + 1,
      text: generateRandomText(),
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
  height: 450px;
  overflow-y: auto;

  .test-content-item {
    background-color: #fff;
    width: 100%;
    white-space: normal;
    box-sizing: border-box;
    overflow: hidden;
    word-break: break-all;
    color: #666;
    padding: 5px;
    font-size: 12px;

    > :nth-child(2) {
      margin: 0 0 0 0;
    }
  }
}
</style>
