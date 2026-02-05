import { nextTick, onBeforeUnmount, ref, watch, shallowRef } from 'vue'
import { VirtualListAdapter } from '@x-virtual/core'

export function useVirtualLayout(dataSource, options = {}) {
  const sliceData = ref([])
  const totalHeight = shallowRef(0)
  const columnList = shallowRef([])
  const initialized = shallowRef(false)
  const isRefreshHeight = shallowRef(false)

  const { columnCount = 1, ...virtualListOptions } = options || {}

  function getMinColumn(columns) {
    if (columns.length == 1) return columns[0]
    let minCol = columns[0]
    for (let i = 1; i < columns.length; i++) {
      if (columns[i].height < minCol.height) minCol = columns[i]
    }
    return minCol
  }

  async function refreshColumnHeight() {
    if (columnCount == 1 || !initialized.value) return
    await nextTick()
    const { getContainerElement, gap = 0 } = virtualListOptions
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

  function onChange(colIndex, { needUpdateItemSize }) {
    const curCore = columnList.value[colIndex].adapter

    const dataArr = []
    const heightArr = []
    columnList.value.forEach((col) => {
      const arr = col.adapter.getRangeItems().map((e) => {
        return { ...e, columnIndex: col.index, index: col.localToGlobalMap[e.index] }
      })

      dataArr.push(...arr)
      const colHeight = col.adapter.getTotalHeight()
      heightArr.push(colHeight)
      col.height = colHeight
    })

    const firstItem = dataArr[0]
    const lastItem = dataArr[dataArr.length - 1]
    const old = sliceData.value
    const diffLen = old.length == dataArr.length
    if (diffLen && firstItem?.key == old[0]?.key && lastItem?.key == old[old.length - 1]?.key) {
      sliceData.value.forEach((item, index) => {
        if (item.style?.transform != dataArr[index]?.style?.transform) {
          item.style = dataArr[index].style
        }
      })
    } else {
      sliceData.value = dataArr
    }

    totalHeight.value = Math.max(...heightArr)
    needUpdateItemSize && nextTick(() => curCore.updateRenderedItemSize())
    if (!isRefreshHeight.value) {
      refreshColumnHeight()
      isRefreshHeight.value = true
    }
  }

  watch(
    () => dataSource?.value?.slice(),
    async (newVal) => {
      const { gap = 0, estimatedHeight } = virtualListOptions || {}

      if (!initialized.value) {
        await nextTick()
        new Array(columnCount).fill(0).forEach((_, index) => {
          const adapter = new VirtualListAdapter({
            ...virtualListOptions,
            onChange: (val) => onChange(index, val),
            itemSelector: `${virtualListOptions.itemSelector}[data-columnIndex="${index}"]`,
            getKey: (i) => virtualListOptions?.getKey(columnList.value[index].localToGlobalMap[i]),
            estimatedHeight: (i) => {
              return virtualListOptions?.estimatedHeight(columnList.value[index].localToGlobalMap[i])
            },
          })

          columnList.value.push({
            index,
            width: 0,
            height: 0,
            items: [],
            adapter,
            localToGlobalMap: {},
          })

          adapter.init()
        })

        initialized.value = true
      } else {
        columnList.value.forEach((col) => {
          col.items = []
          col.localToGlobalMap = {}
          col.height = 0
        })
      }

      newVal?.forEach((item, i) => {
        const column = getMinColumn(columnList.value)
        column.height += (typeof estimatedHeight == 'function' ? estimatedHeight(i) : estimatedHeight) + gap
        column.items.push(item)
        column.localToGlobalMap[column.items.length - 1] = i
      })

      columnList.value.forEach((col) => col.adapter?.setItemCount(col.items.length))
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    initialized.value = false
    columnList.value.forEach((col) => col.adapter?.dispose())
  })

  return {
    sliceData,
    scrollTo: (globalIndex) => {
      for (let index = 0; index < columnList.value.length; index++) {
        const column = columnList.value[index]
        for (const [localIndexStr, g] of Object.entries(column.localToGlobalMap || {})) {
          if (g == globalIndex) {
            column.adapter?.scrollToIndex(Number(localIndexStr))
            break
          }
        }
      }
    },
    totalHeight,
    containerStyle: VirtualListAdapter.containerStyle,
    resetList: async () => {
      await nextTick()
      initialized.value = false
      columnList.value.forEach((col) => {
        const vLayout = col.adapter
        vLayout.dispose()
        vLayout.init()
        vLayout.setItemCount(col.items?.length)
        vLayout.refreshListTop()
      })
    },
  }
}
