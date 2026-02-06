<template>
  <div>
    <h4>页面滚动虚拟列表示例</h4>
    <div class="banner-area">假设这是一个banner</div>

    <div class="some-words">
      这是一段文字: QdT73nAwL1PogY2P3BztUa6xgR1nnRRjO5WI1Jgw9B3LWbI3RSmFBnEnzCOxQF0OZunZxBi9nEf
      AlMs5jBa0ssO2hIk7NLb7EXoHKdaCMShP8mo6PjN1ce22J13VC100WD8gVYhoD95f6esC4qhNWmcY9kvBLqtPX6XRDMBhjN5r2xf5cAeXPkug2FyW
    </div>

    <p>
      <button @click="edit(1)">添加</button>
      <button @click="edit(2)">删除</button>
      <button @click="edit(3)">重置</button>
      <button @click="scrollTo(90)">滚动到指定位置</button>
    </p>

    <div class="test-list-wrapper" :style="containerStyle">
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
import { onMounted, ref } from 'vue'
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

const { sliceData, scrollTo, totalHeight, containerStyle, resetList } = useVirtualLayout(dataSource, {
  isWindowScroll: true,
  getContainerElement: () => document.querySelector('.test-list-wrapper'),
  itemSelector: '.test-content-item',
  getKey: (i) => dataSource.value[i]?.key,
  overscan: 2,
  estimatedHeight: (i) => 60,
})

onMounted(() => {
  //如果列表上方是异步渲染的视图，需要渲染完成后调用resetList触发列表re-render
  // resetList()
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
.banner-area {
  color: #333;
  background-color: #cccc;
  width: 670px;
  height: 100px;
  text-align: center;
  line-height: 100px;
  font-size: 26px;
  font-weight: bold;
}

.some-words {
  width: 600px;
  overflow: hidden;
  white-space: normal;
  word-break: break-all;
}

.test-list-wrapper {
  width: 600px;

  .test-content-item {
    background-color: #fff;
    width: 100%;
    white-space: normal;
    box-sizing: border-box;
    overflow: hidden;
    word-break: break-all;
    display: flex;
    color: #666;
    padding: 5px;
    font-size: 12px;
    align-items: center;

    > :nth-child(2) {
      margin: 0 0 0 10px;
    }
  }
}
</style>
