export default class VirtualListCore {
  _options = {} //配置项
  _keyToIndexObj = {} //key-index对照
  _chunkList = [] //缓存数据
  _itemSizeMap = new Map() //缓存数据
  _itemCount = 0

  constructor(options = {}) {
    const { getKey = null, getEstimatedHeight = null, overscan = 10, chunkSize = 100 } = options || {}

    if (typeof getKey != 'function') throw new Error('The parameter `getKey` must be a function')
    if (typeof getEstimatedHeight != 'function')
      throw new Error('The parameter `getEstimatedHeight` must be a function')

    this._options = {
      getKey,
      getEstimatedHeight,
      overscan,
      chunkSize,
    }
  }

  _getItemHeight = (key) => this._itemSizeMap.get(key) || 0
  _getChunkIndex = (index) => Math.floor(index / this._options.chunkSize)
  _getItemTop = (key) => {
    const i = this._keyToIndexObj[key]
    const chunk = this._chunkList[this._getChunkIndex(i)]
    let top = chunk?.top || 0
    if (chunk) top += chunk.prefixSums[Math.max(i - chunk.start, 0)] || 0
    return top
  }

  _setItemHeight = (key, height) => this._itemSizeMap.set(key, height || 0)
  _getItemKey = (index) => this._options?.getKey?.(index) || null

  _computeChunk(chunk) {
    let height = 0
    let prefixSums = []
    for (let i = chunk.start; i < chunk.end; i++) {
      prefixSums.push(height)
      height += this._getItemHeight(this._getItemKey(i))
    }
    chunk.prefixSums = prefixSums
    chunk.height = height
  }

  _rebuildChunkListFrom(dirtyIndex = 0) {
    const itemCount = this._itemCount
    if (!itemCount) return
    const { chunkSize } = this._options
    const startChunkIndex = this._getChunkIndex(dirtyIndex)
    this._chunkList = this._chunkList?.slice?.(0, startChunkIndex) || []
    const lastChunk = this._chunkList[this._chunkList.length - 1]
    let top = (lastChunk?.top || 0) + (lastChunk?.height || 0)
    const forCount = Math.ceil(itemCount / chunkSize) - startChunkIndex
    for (let i = 0; i < forCount; i++) {
      const start = (startChunkIndex + i) * chunkSize
      const end = Math.min(start + chunkSize, itemCount)
      const chunk = { start, end, top, height: 0, prefixSums: [] }
      this._computeChunk(chunk)
      this._chunkList.push(chunk)
      top += chunk.height
    }
  }

  _updateChunkListFrom(chunkChangedIndexList = new Set()) {
    const chunkList = this._chunkList
    const arr = Array.from(chunkChangedIndexList || []).sort((a, b) => a - b)
    if (!arr.length) return
    const minIndex = arr[0]
    arr?.forEach((index) => {
      const chunk = chunkList[index]
      this._computeChunk(chunk)
    })

    let top = (chunkList[minIndex]?.top || 0) + (chunkList[minIndex]?.height || 0)
    for (let i = minIndex + 1; i < chunkList.length; i++) {
      chunkList[i].top = top
      top += chunkList[i].height
    }
  }

  _binarySearch(scrollTop, length) {
    let left = 0
    let right = length - 1
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const midTop = this._getItemTop(this._getItemKey(mid))
      if (scrollTop >= midTop && scrollTop < midTop + this._getItemHeight(this._getItemKey(mid))) return mid
      else if (midTop < scrollTop) left = mid + 1
      else right = mid - 1
    }
    return Math.max(0, right)
  }

  reset() {
    this._itemSizeMap.clear()
    this._keyToIndexObj = {}
    this._chunkList = []
    this._itemCount = 0
  }

  setItemCount(newItemCount) {
    if (!newItemCount) return this.reset()
    let firstDirtyIndex = -1
    let newKeyToIndexObj = {}
    for (let i = 0; i < newItemCount; i++) {
      const key = this._getItemKey(i)
      if (!key) continue
      newKeyToIndexObj[key] = i
      if (!this._itemSizeMap.has(key)) this._setItemHeight(key, this._options.getEstimatedHeight?.(i) || 0)
      if (firstDirtyIndex < 0 && this._keyToIndexObj[key] != i) firstDirtyIndex = i
    }

    this._itemCount = newItemCount
    this._keyToIndexObj = newKeyToIndexObj
    firstDirtyIndex > -1 && this._rebuildChunkListFrom(firstDirtyIndex)
    newKeyToIndexObj = null
  }

  getTotalHeight() {
    const itemCount = this._itemCount
    const endKey = this._getItemKey(itemCount - 1)
    return this._getItemTop(endKey) + this._getItemHeight(endKey) || 0
  }

  updateItemHeightBatch(arr = []) {
    if (!Array.isArray(arr)) return false
    const chunkChangedIndexList = new Set() //缓存数据变更Chunk索引
    arr.forEach((item) => {
      const { index, height: ofsh } = item || {}
      if (typeof index != 'number' || typeof ofsh != 'number' || index < 0) return
      const key = this._getItemKey(index)
      if (!key || this._getItemHeight(key) === ofsh) return
      this._setItemHeight(key, ofsh)
      chunkChangedIndexList.add(this._getChunkIndex(index))
    })

    this._updateChunkListFrom(chunkChangedIndexList)
    return chunkChangedIndexList.size > 0
  }

  getVirtualItems(viewportHeight, scrollTop) {
    if (!viewportHeight) return []
    const { overscan } = this._options
    const itemCount = this._itemCount
    const curIndex = this._binarySearch(scrollTop, itemCount)
    const nBufSize = overscan || 10
    let start = Math.max(curIndex - nBufSize, 0)
    let end = curIndex
    let currentHeight = 0
    //向下循环出一屏的高度结束位置
    while (end < itemCount && currentHeight < viewportHeight) {
      currentHeight += this._getItemHeight(this._getItemKey(end))
      end++
    }
    end = Math.min(end + nBufSize, itemCount)
    //前后缓冲区一定要对称,不然会有抖动,缓冲区不足向上或者向下补充
    const requiredLength = nBufSize + nBufSize
    const actualLength = end - start
    if (requiredLength > actualLength) {
      let missing = requiredLength - actualLength
      if (start == 0) end = Math.min(end + missing, itemCount)
      else if (end == itemCount) start = Math.max(start - missing, 0)
    }

    const items = []
    for (let i = start; i < end; i++) {
      const key = this._getItemKey(i)
      if (key) items.push({ key, index: i, top: this._getItemTop(key) })
    }
    return items
  }

  getItemTop(index) {
    return this._getItemTop(this._getItemKey(index))
  }
}
