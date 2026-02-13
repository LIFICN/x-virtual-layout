export default class VirtualListCore {
  _options = {} //配置项
  _keyToIndexObj = {} //key-index对照,包含脏数据,不做删除是因为需要On遍历收益不高
  _chunkList = [] //分块数据
  _itemSizeMap = new Map() //高度缓存数据,包含脏数据,不做删除是因为需要On遍历收益不高
  _itemCount = 0 //总条数

  constructor(options = {}) {
    const { getKey = null, estimatedHeight = null, overscan = 10, chunkSize = 100, gap } = options || {}
    if (typeof getKey != 'function') throw new Error('The parameter getKey must be a function')
    if (typeof estimatedHeight != 'function') throw new Error('The parameter estimatedHeight must be a function')
    this._options = { getKey, estimatedHeight, overscan, chunkSize, gap: Number(gap) || 0 }
  }

  _getItemHeight = (key) => this._itemSizeMap.get(key) || 0
  _getChunkIndex = (index) => Math.floor(index / this._options.chunkSize)
  _getItemTop = (key) => {
    const i = this._keyToIndexObj[key]
    const chunk = this._chunkList[this._getChunkIndex(i)]
    let top = chunk?.top || 0
    if (chunk) top += chunk.prefixSums[Math.max(i - chunk.start, 0)] || 0
    return top + ((i || 0) + 1) * this._options.gap
  }

  _setItemHeight = (key, height) => this._itemSizeMap.set(key, height || 0)
  _getItemKey = (index) => this._options?.getKey?.(index) || null
  _computeChunk(chunk) {
    let height = 0
    const prefixSums = chunk.prefixSums
    for (let i = chunk.start; i < chunk.end; i++) {
      prefixSums[i - chunk.start] = height
      height += this._getItemHeight(this._getItemKey(i))
    }
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
      const chunk = { start, end, top, height: 0, prefixSums: new Float32Array(end - start) }
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
    arr?.forEach((index) => this._computeChunk(chunkList[index]))

    let top = (chunkList[minIndex]?.top || 0) + (chunkList[minIndex]?.height || 0)
    for (let i = minIndex + 1; i < chunkList.length; i++) {
      chunkList[i].top = top
      top += chunkList[i].height
    }
  }

  _binarySearch(scrollTop, length) {
    if (length <= 0 || typeof scrollTop != 'number' || isNaN(scrollTop)) return 0
    let left = 0
    let right = length - 1
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const key = this._getItemKey(mid)
      if (key === null || key === undefined || key === '') {
        right = mid - 1
        continue
      }
      const midTop = this._getItemTop(key)
      if (scrollTop >= midTop && scrollTop < midTop + this._getItemHeight(key)) return mid
      else if (scrollTop < midTop) right = mid - 1
      else left = mid + 1
    }
    return Math.min(Math.max(0, right), length - 1)
  }

  getItemTop = (index) => this._getItemTop(this._getItemKey(index))
  getTotalHeight() {
    const endKey = this._getItemKey(this._itemCount - 1)
    return this._getItemTop(endKey) + this._getItemHeight(endKey) + this._options.gap
  }

  reset() {
    this._itemSizeMap.clear()
    this._keyToIndexObj = {}
    this._chunkList = []
    this._itemCount = 0
    this._itemsPool = []
  }

  setItemCount(newItemCount) {
    if (!newItemCount || newItemCount < 0) return this.reset()
    let firstDirtyIndex = -1
    const endKey = this._getItemKey(this._itemCount - 1)
    const isAppend = newItemCount > this._itemCount && this._itemCount - 1 == this._keyToIndexObj[endKey]
    const start = isAppend ? this._itemCount : 0
    for (let i = start; i < newItemCount; i++) {
      const key = this._getItemKey(i)
      if (!key) continue
      if (firstDirtyIndex < 0 && this._keyToIndexObj[key] !== i) firstDirtyIndex = i
      this._keyToIndexObj[key] = i
      if (!this._itemSizeMap.has(key)) this._setItemHeight(key, Number(this._options.estimatedHeight?.(i) || 0))
    }

    this._itemCount = newItemCount
    firstDirtyIndex > -1 && this._rebuildChunkListFrom(firstDirtyIndex)
  }

  batchUpdateHeight(arr = []) {
    let delta = 0
    if (!Array.isArray(arr)) return delta
    const chunkChangedIndexSet = new Set()
    arr.forEach((item) => {
      const { index, height: ofsh } = item || {}
      if (typeof index != 'number' || typeof ofsh != 'number' || index < 0) return
      const key = this._getItemKey(index)
      if (!key || this._getItemHeight(key) === ofsh) return
      delta += ofsh - this._getItemHeight(key)
      this._setItemHeight(key, ofsh)
      chunkChangedIndexSet.add(this._getChunkIndex(index))
    })
    chunkChangedIndexSet.size > 0 && this._updateChunkListFrom(chunkChangedIndexSet)
    return delta
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

    if (!this._itemsPool) this._itemsPool = [] //对象复用池
    const items = this._itemsPool
    for (let i = start; i < end; i++) {
      const key = this._getItemKey(i)
      if (!key) continue
      const obj = items[i - start]
      if (!obj) items.push({ key, index: i, top: this._getItemTop(key) })
      else {
        obj.key = key
        obj.index = i
        obj.top = this._getItemTop(key)
      }
    }
    return items.slice(0, end - start || 0)
  }
}
