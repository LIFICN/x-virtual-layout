# x-virtual

> 面向不定高、单列或多列/瀑布流虚拟列表的原生 JS Adapter 与 Vue 3 Hook。确保 DOM 与 Adapter 状态完全一致，支持 window 滚动和自定义容器。

## 1. 概述

`x-virtual` 提供：

* **VirtualListAdapter** — 原生 JS 单列虚拟列表适配器，负责虚拟区计算、scroll 监听、ResizeObserver，不负责渲染。
* **useVirtualLayout** — Vue 3 Composition Hook，多列/瀑布流封装，基于 Adapter。

**核心原则：** Adapter 与渲染分离，所有 getter 方法必须在 `onChange` 回调中使用。


## 2. 安装

**核心库（原生 JS 使用）**

```bash
npm install @x-virtual/core
```

**Vue 3 Hook（多列/瀑布流封装）**

```bash
npm install @x-virtual/vue
```


## 3. 原生 JS 单列示例（占位元素分离）

```html
<div id="container" style="width:300px; height:400px; position:relative; overflow:auto;"></div>

<script type="module">
import { VirtualListAdapter } from '@x-virtual/core'

const data = Array.from({ length: 1000 }, (_, i) => ({ id: i, text: 'Item ' + i }))
const container = document.getElementById('container')

const adapter = new VirtualListAdapter({
  getContainerElement: () => container,
  itemSelector: '.v-item',
  getKey: i => data[i]?.id,
  estimatedHeight: (i) => 50,
  overscan: 10,
  gap: 0,
  //isWindowScroll: false, //是否页面滚动
  onChange: ({ hasNewData, containerStyle }) => {
    // 渲染虚拟 items
    const items = adapter.getRangeItems()
    container.innerHTML = items.map(item => `
      <div class='v-item' style='${Object.entries(item.style).map(([k,v])=>k+":"+v).join(";")}'>
        ${item.key}: ${data[item.index]?.text}
      </div>
    `).join('')

    if (hasNewData) adapter.updateRenderedItemSize()
  }
})

Object.assign(container.style, VirtualListAdapter.containerStyle)
adapter.init()
adapter.setItemCount(data.length)
</script>
```

## 4. Vue 3 多列/瀑布流 Hook 示例（占位元素分离）

```html
<template>
  <div class="test-scroll" :style="containerStyle" ref="container">
    <!-- 占位元素 -->
    <div :style="{ height: `${totalHeight}px` }"></div>

    <!-- 渲染 item -->
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
</template>

<script setup>
import { ref } from 'vue'
import { useVirtualLayout } from '@x-virtual/vue'

const dataSource = ref(Array.from({ length: 1000 }, (_, i) => ({ el: 'El'+i, text: 'Text'+i })))
const container = ref(null)

const { sliceData, totalHeight, scrollTo, containerStyle, calculateContainerPageTop } = useVirtualLayout(dataSource, {
  columnCount: 1,
  gap: 8,
  itemSelector: '.test-content-item',
  getContainerElement: () => container.value,
  getKey: i => dataSource.value[i]?.el,
  estimatedHeight: (i) => 60,
})
</script>

<style>
.test-scroll {
  position: relative;
  overflow: auto;
}
.test-content-item {
  position: absolute;
}
</style>
```

## 5. 核心 API（网格形式）

| 属性 / 方法                   | 类型       | 说明                                                                               |
| ------------------------- | -------- | -------------------------------------------------------------------------------- |
| getContainerElement       | Function | 返回滚动容器 DOM                                                                       |
| itemSelector              | String   | 渲染项 selector                                                                     |
| getKey                    | Function | 唯一且稳定 key                                                                        |
| estimatedHeight           | Function | 预估高度                                                                             |
| overscan                  | Number   | 前后缓冲条数                                                                           |
| gap                       | Number   | item 间距                                                                          |
| onChange                  | Function | Adapter 更新回调（必须在回调中读取 `getRangeItems()` 和 `getTotalHeight()`，并同步 containerStyle） |
| isWindowScroll            | Boolean  | 是否使用 window 滚动，影响 scrollTop 计算                                                   |
| calculateContainerPageTop | Function | 页面滚动或容器偏移时更新 listTop，需在 mounted 或 resize 后调用                                     |
| updateRenderedItemSize    | Function | 在 DOM 渲染后调用，使 ResizeObserver attach 正确                                           |
| getRangeItems             | Function | 获取当前可视区虚拟 items，包含 `.top` 和 `.style`                                             |
| getTotalHeight            | Function | 获取虚拟列表总高度                                                                        |
| scrollToIndex             | Function | 滚动到指定全局索引                                                                        |
| setItemCount              | Function | 更新列表总条数                                                                          |
| containerStyle            | Object   | Adapter 会返回当前容器 style，需要手动同步到 DOM                                                |

## 6. 使用注意

1. 占位元素必须在 item 前面，并单独撑起总高度。
2. 所有数据获取方法必须在 `onChange` 回调中调用，否则虚拟区和 DOM 不一致。
3. `updateRenderedItemSize()` 必须在 DOM 已插入后调用。
4. `calculateContainerPageTop()` 对 window 滚动或容器非零 top 必须调用。
5. item DOM 必须 `position:absolute`，容器 `position:relative`。
6. `getKey` 必须唯一且稳定。
7. Adapter 跨框架，但原生 JS 使用必须直接操作 DOM，并手动同步 `containerStyle`。

## 7. License

MIT
