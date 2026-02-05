import VirtualListCore, { debounceRAF } from './VirtualListCore.js'

export default class VirtualListAdapter {
  static containerStyle = { position: 'relative', 'overflow-anchor': 'none', 'will-change': 'transform' }
  _options = {} //配置项
  _containerEl = null //滚动容器
  _resizeObserver = null //监听元素变化
  _listTop = 0 //列表顶部
  isInitialized = false //是否初始化
  _core = null
  _sliceData = []
  _total = 0 //总高度

  constructor(_options = {}) {
    const {
      isWindowScroll = false,
      getContainerElement = null,
      getKey = null,
      itemSelector,
      overscan = 10,
      estimatedHeight,
      onChange = null,
      gap = 0,
    } = _options || {}

    if (typeof getContainerElement != 'function' || typeof getKey != 'function')
      throw new Error('The parameters `getContainerElement` `getKey` must be a function')
    if (!itemSelector) throw new Error('The parameters `itemSelector` cannot be null')

    this._options = {
      isWindowScroll,
      getContainerElement,
      itemSelector,
      onChange,
      gap,
    }

    const _core = new VirtualListCore({
      overscan,
      getKey,
      getEstimatedHeight: (i) => {
        const height = typeof estimatedHeight == 'function' ? estimatedHeight(i) || 30 : 30
        return height + (gap || 0)
      },
      chunkSize: 100,
    })

    const callback = debounceRAF((e) => {
      let needRender = false
      e.forEach((el, i) => {
        const localIndex = this._sliceData[i]?.index
        if (typeof localIndex != 'number') return
        const measuredHeigth = el.target.offsetHeight + (gap || 0)
        const res = _core.updateItemSize(localIndex, measuredHeigth)
        if (res) needRender = true
      })
      needRender && this._changeData(false)
    })

    this._resizeObserver = new ResizeObserver(callback)
    this._core = _core
    this.isInitialized = false
  }

  _isHTMLElement = (el) => el instanceof HTMLElement
  _createItemStyle = (top = 0) => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: this._options.columnWidth || '100%',
    transform: `translate3d(${this._options.columnLeft || 0}, ${top}px, 0)`,
  })

  _getItemTop = (index) => this._core?.getItemTop(index)

  _getScrollTop() {
    let scrollTop = !this._options.isWindowScroll ? this._containerEl?.scrollTop : window.scrollY
    return Math.max(0, scrollTop - this._listTop) //页面滚动和容器滚动合并计算scrollTop，容器滚动时listTop始终为0
  }

  _handleScroll = debounceRAF((e) => this._changeData(true))

  _changeData(isReset = true) {
    if (isReset) {
      const viewHeight = this._options.isWindowScroll ? window.innerHeight : this._containerEl?.clientHeight
      this._sliceData = this._core.getVirtualItems(viewHeight, this._getScrollTop())
    }

    this._sliceData.forEach((el) => {
      el.top = this._getItemTop(el.index)
      el['style'] = this._createItemStyle(el.top)
    })

    this._options?.onChange?.({ needUpdateItemSize: isReset })
  }

  _getCurrentRenderedItem = () => {
    const dom = !this._options.isWindowScroll ? this._containerEl : document
    return Array.from(dom.querySelectorAll(this._options.itemSelector) || [])
  }

  init = () => {
    if (this.isInitialized) return
    const { getContainerElement } = this._options
    this._containerEl = getContainerElement?.()
    if (!this._isHTMLElement(this._containerEl) && this._containerEl !== window)
      throw new Error('getContainerElement must return HTMLElement or window')
    const dom = this._options.isWindowScroll ? window : this._containerEl
    dom?.addEventListener('scroll', this._handleScroll)
    this.refreshListTop()
    this.isInitialized = true
  }

  dispose = () => {
    if (!this.isInitialized) return
    this._resizeObserver?.disconnect()
    this.isInitialized = false
    this._listTop = 0
    this._total = 0
    this._core?.reset()
    const dom = this._options.isWindowScroll ? window : this._containerEl
    dom?.removeEventListener('scroll', this._handleScroll)
    dom?.scrollTo(0, 0)
    this._changeData(true)
  }

  setItemCount(newValLength) {
    if (!this.isInitialized) throw new Error('library not initialized')
    const len = newValLength || 0
    this._core?.setItemCount(len)
    this._total = len
    this._changeData(true)
  }

  updateRenderedItemSize() {
    this._resizeObserver?.disconnect()
    this._getCurrentRenderedItem().forEach((el) => this._resizeObserver?.observe(el))
  }

  scrollToIndex(index) {
    requestAnimationFrame(() => {
      const top = this._getItemTop(index)
      const dom = this._options.isWindowScroll ? window : this._containerEl
      dom.scrollTo(0, this._options.isWindowScroll ? this._listTop + top : top)
    })
  }

  refreshListTop() {
    if (this._options.isWindowScroll) {
      this._listTop = window.scrollY + (this._containerEl?.getBoundingClientRect?.()?.top || 0)
    } else this._listTop = 0
  }

  getTotalHeight = () => Math.max(0, this._core?.getTotalHeight() || 0)
  getRangeItems = () => this._sliceData || []

  setColumnOffsetStyle(width, left) {
    if (typeof width != 'number' || typeof left != 'number') return
    this._options.columnWidth = width + 'px'
    this._options.columnLeft = left + 'px'
    this._changeData(false)
  }
}
