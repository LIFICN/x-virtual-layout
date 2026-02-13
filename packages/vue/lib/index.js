import { nextTick, onBeforeUnmount, ref, watch, shallowRef } from 'vue'
import { VirtualListAdapter } from '@x-virtual/core'

export function useVirtualLayout(dataSource, options = {}) {
  const sliceData = ref([])
  const totalHeight = shallowRef(0)
  const columnList = shallowRef([])
  const initialized = shallowRef(false)
  const isCalcColumnWidth = shallowRef(false)

  const { columnCount = 1, ...virtualListOptions } = options || {}

  function getMinColumn(columns) {
    if (columns.length == 1) return columns[0]
    let minCol = columns[0]
    for (let i = 1; i < columns.length; i++) {
      if (columns[i].height < minCol.height) minCol = columns[i]
    }
    return minCol
  }

  async function calcColumnWidth() {
    const { getContainerElement, gap = 0 } = virtualListOptions
    if (!initialized.value || gap <= 0 || isCalcColumnWidth.value) return
    isCalcColumnWidth.value = true
    await nextTick()
    const dom = getContainerElement?.()
    if (!(dom instanceof HTMLElement) && dom != window) throw new Error(`can not get getContainerElement result`)
    const containerWidth = dom.clientWidth
    const colWidth = (containerWidth - gap * (columnCount + 1)) / columnCount
    columnList.value.forEach((col) => {
      if (colWidth && colWidth != col.width) {
        col.adapter?.setColumnOffsetStyle(colWidth, gap + col.index * (colWidth + gap))
        col.width = colWidth
      }
    })
  }

  function onChange(colIndex, { hasNewData }) {
    const curCore = columnList.value[colIndex].adapter

    const dataArr = []
    const heightArr = []
    columnList.value.forEach((col) => {
      const arr = col.adapter.getRangeItems().map((e) => {
        return { ...e, columnIndex: col.index, index: col.localToGlobalMap.get(e.index) }
      })

      dataArr.push(...arr)
      const colHeight = col.adapter.getTotalHeight()
      heightArr.push(colHeight)
      col.height = colHeight
    })

    totalHeight.value = Math.max(...heightArr)
    if (hasNewData) {
      sliceData.value = dataArr
      nextTick(() => curCore.updateRenderedItemSize())
    } else {
      sliceData.value.forEach((item, index) => {
        if (item.style?.transform != dataArr[index]?.style?.transform) {
          item.style = dataArr[index].style
        }
      })
    }
  }

  watch(
    () => dataSource?.value?.slice(),
    async (newVal, oldVal) => {
      const { estimatedHeight, itemSelector } = virtualListOptions || {}
      const isAppend = newVal.length > oldVal?.length && newVal[oldVal.length - 1] === oldVal[oldVal.length - 1]

      if (!initialized.value) {
        await nextTick()
        new Array(columnCount).fill(0).forEach((_, index) => {
          const adapter = new VirtualListAdapter({
            ...virtualListOptions,
            onChange: (val) => onChange(index, val),
            itemSelector: columnCount > 1 ? `${itemSelector}[data-columnIndex="${index}"]` : itemSelector,
            getKey: (i) => virtualListOptions?.getKey(columnList.value[index].localToGlobalMap.get(i)),
            estimatedHeight: (i) => {
              return virtualListOptions?.estimatedHeight(columnList.value[index].localToGlobalMap.get(i))
            },
          })

          columnList.value.push({
            index,
            width: 0,
            height: 0,
            items: [],
            adapter,
            localToGlobalMap: new Map(),
          })

          adapter.init()
        })

        initialized.value = true
      }

      if (initialized.value && !isAppend) {
        columnList.value.forEach((col) => {
          col.items = []
          col.localToGlobalMap.clear()
          col.height = 0
        })
      }

      const start = isAppend ? oldVal.length : 0
      for (let i = start; i < newVal.length; i++) {
        const item = newVal[i]
        const column = getMinColumn(columnList.value)
        column.height += typeof estimatedHeight == 'function' ? estimatedHeight(i) : estimatedHeight
        column.items.push(item)
        column.localToGlobalMap.set(column.items.length - 1, i)
      }

      columnList.value.forEach((col) => col.adapter?.setItemCount(col.items.length))
      calcColumnWidth()
    },
    { immediate: true, deep: false },
  )

  onBeforeUnmount(() => {
    initialized.value = false
    columnList.value.forEach((col) => {
      col.localToGlobalMap?.clear()
      col.adapter?.reset()
    })
  })

  return {
    sliceData,
    scrollTo: (globalIndex) => {
      if (typeof globalIndex != 'number' || isNaN(globalIndex)) return
      if (columnCount == 1) return columnList.value[0]?.adapter?.scrollToIndex(globalIndex)
      for (let index = 0; index < columnList.value.length; index++) {
        const column = columnList.value[index]
        for (const [localIndex, g] of column.localToGlobalMap) {
          if (g == globalIndex) return column.adapter?.scrollToIndex(localIndex)
        }
      }
    },
    totalHeight,
    containerStyle: VirtualListAdapter.containerStyle,
    calculateContainerPageTop: async () => {
      await nextTick()
      columnList.value.forEach((col) => {
        const vLayout = col.adapter
        vLayout.calculateContainerPageTop()
      })
    },
  }
}
