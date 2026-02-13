# x-virtual

> A native JS Adapter and a Vue 3 Hook for variable-height single-column or multi-column / masonry virtual lists. Ensures the DOM stays fully consistent with Adapter state, and supports both window scrolling and custom containers.

## 1. Overview

`x-virtual` provides:

* **VirtualListAdapter** — a native JS single-column virtual list adapter responsible for virtual range calculation, scroll listening, and ResizeObserver. It does NOT handle rendering.
* **useVirtualLayout** — a Vue 3 Composition Hook for multi-column / masonry layouts, built on top of the Adapter.

**Core principle:** Adapter and rendering are separated. All getter methods must be used inside the `onChange` callback.

## 2. Installation

**Core library (native JS usage)**

```bash
npm install @x-virtual/core
```

**Vue 3 Hook (multi-column / masonry wrapper)**

```bash
npm install @x-virtual/vue
```

## 3. Native JS single-column example (separated placeholder element)

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
  //isWindowScroll: false, // whether to use page/window scrolling
  onChange: ({ hasNewData, containerStyle }) => {
    const items = adapter.getRangeItems()
    container.innerHTML = items.map(item => `
      <div class='v-item' style='${Object.entries(item.style).map(([k,v])=>k+":"+v).join(";")}' >
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

## 4. Vue 3 multi-column / masonry Hook example (separated placeholder element)

```html
<template>
  <div class="test-scroll" :style="containerStyle" ref="container">
    <!-- placeholder element -->
    <div :style="{ height: `${totalHeight}px` }"></div>

    <!-- rendered item -->
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

const { sliceData, totalHeight, scrollTo, containerStyle, calculateContainerPageTop } =
  useVirtualLayout(dataSource, {
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

## 5. Core API (grid format)

| Prop / Method              | Type     | Description |
|---------------------------|----------|-------------|
| getContainerElement       | Function | Returns the scrolling container DOM |
| itemSelector              | String   | Selector for rendered items |
| getKey                    | Function | Unique and stable key |
| estimatedHeight           | Function | Estimated item height |
| overscan                  | Number   | Number of buffered items before/after visible range |
| gap                       | Number   | Spacing between items |
| onChange                  | Function | Adapter update callback (must call `getRangeItems()` and `getTotalHeight()` inside this callback and sync `containerStyle`) |
| isWindowScroll            | Boolean  | Whether to use window scrolling; affects scrollTop calculation |
| calculateContainerPageTop | Function | Updates listTop when using window scroll or when container has a non-zero top offset; call after mounted or resize |
| updateRenderedItemSize    | Function | Call after DOM rendering so ResizeObserver attaches correctly |
| getRangeItems             | Function | Gets current visible virtual items, including `.top` and `.style` |
| getTotalHeight            | Function | Gets total virtual list height |
| scrollToIndex             | Function | Scrolls to a specific global index |
| setItemCount              | Function | Updates total item count |
| containerStyle            | Object   | Adapter returns container style that must be manually synced to DOM |

## 6. Usage Notes

1. The placeholder element must be placed before items and must independently occupy the total height.
2. All data access methods must be called inside `onChange`; otherwise the virtual range and DOM will become inconsistent.
3. `updateRenderedItemSize()` must be called after DOM insertion.
4. `calculateContainerPageTop()` must be called when using window scrolling or when the container has a non-zero top offset.
5. Item DOM must use `position: absolute`, and the container must use `position: relative`.
6. `getKey` must be unique and stable.
7. The Adapter is framework-agnostic, but native JS usage requires direct DOM manipulation and manual synchronization of `containerStyle`.

## 7. License

MIT
