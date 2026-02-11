/**
 * Type declarations for VirtualListCore (index.d.ts)
 * Generated from the provided JavaScript implementation.
 *
 * Notes:
 * - Keys in the original code can be strings or numbers; we type them as `string | number`.
 * - _keyToIndexObj in the JS uses a plain object (which coerces numeric keys to strings).
 * - If you prefer preserving numeric keys, consider using `Map<string|number, number>` in the TS implementation.
 */

export interface VirtualListOptions {
  /**
   * Return the key for a given item index. May return null/undefined when the item key is not available.
   */
  getKey: (index: number) => string | number | null | undefined

  /**
   * Return the estimated height (in px) for a given item index.
   */
  estimatedHeight: (index: number) => number

  /** Number of extra items to render before/after the visible window. Default: 10. */
  overscan?: number

  /** Size of each chunk used internally for prefix-sum grouping. Default: 100. */
  chunkSize?: number

  /** Gap in pixels between items. Default: 0. */
  gap?: number
}

export interface Chunk {
  start: number
  end: number
  top: number
  height: number
  prefixSums: Float32Array
}

export interface VirtualItem {
  key: string | number
  index: number
  top: number
}

export interface BatchHeightItem {
  index: number
  height: number
}

/**
 * VirtualListCore: core calculation engine for variable-height virtual lists.
 *
 * Only the public API is declared here. The original implementation contains
 * many internal helpers and caches prefixed with `_` — these are declared
 * as private fields for completeness, but you can remove them if you prefer
 * a minimal declaration.
 */
export declare class VirtualListCore {
  constructor(options: VirtualListOptions)

  /** Internal options passed in constructor */
  private _options: VirtualListOptions

  /** Map/object from item key -> item index. Note: JS implementation used plain object. */
  private _keyToIndexObj: Record<string, number>

  /** Chunk array used for prefix-sum calculations */
  private _chunkList: Chunk[]

  /** Cache of measured heights: key -> height (px) */
  private _itemSizeMap: Map<string | number, number>

  /** Total number of items currently tracked */
  private _itemCount: number

  /** Optional reusable item pool used by getVirtualItems */
  private _itemsPool?: VirtualItem[]

  /**
   * Get the top offset (px) of the item at `index`.
   * Returns 0 when index is invalid in the original implementation.
   */
  getItemTop(index: number): number

  /** Get the total scrollable height (px) computed from known measurements. */
  getTotalHeight(): number

  /** Reset all caches and counters (clears measured heights, keys, chunks, etc.). */
  reset(): void

  /**
   * Update internal item count. Accepts non-negative integer. When newItemCount
   * is falsy or negative, reset() is invoked.
   */
  setItemCount(newItemCount: number): void

  /**
   * Batch update measured heights. Returns the total delta in height (new - old).
   * Invalid entries are ignored.
   */
  batchUpdateHeight(arr?: BatchHeightItem[]): number

  /**
   * Main API to retrieve the currently visible (and overscanned) virtual items.
   * - viewportHeight: visible viewport height in pixels
   * - scrollTop: current scrollTop in pixels
   * Returns an array of VirtualItem objects { key, index, top } in ascending index order.
   */
  getVirtualItems(viewportHeight: number, scrollTop: number): VirtualItem[]
}

export function debounceRAF<T extends (...args: any[]) => any>(func: T): (...args: Parameters<T>) => void

export interface VirtualListAdapterOptions {
  isWindowScroll?: boolean
  /** Should return the scrolling container HTMLElement (or null when unavailable) */
  getContainerElement: () => HTMLElement | null
  /** Return a stable key for the given index. May return null/undefined when not available. */
  getKey: (index: number) => string | number | null | undefined
  /** CSS selector for item elements that will be measured/observed (required) */
  itemSelector: string
  overscan?: number
  estimatedHeight?: (index: number) => number
  onChange?: (payload: { hasNewData: boolean }) => void
  gap?: number
}

/** Minimal public surface of the adapter. Internal helpers prefixed with `_` are intentionally omitted from the public API here. */
export declare class VirtualListAdapter {
  static containerStyle: Record<string, string>

  constructor(options?: VirtualListAdapterOptions)

  /** Whether adapter has been initialized via `init()` */
  isInitialized: boolean

  /** Initialize the adapter and attach scroll listeners. Throws if `getContainerElement` does not return an HTMLElement. */
  init(): void

  /** Reset internal state, disconnect observers and remove listeners. */
  reset(): void

  /** Provide the current number of items. Will call through to the core and refresh rendered slice. */
  setItemCount(newValLength: number): void

  /** Observe currently rendered DOM nodes to measure their sizes. */
  updateRenderedItemSize(): void

  /** Scroll to a specific item index (animated via RAF). */
  scrollToIndex(index: number): void

  /** Return total content height as computed by the core. */
  getTotalHeight(): number

  /** Return the currently rendered virtual items array. */
  getRangeItems(): import('./index.d.ts').VirtualItem[]

  /** Set column width/left offset used to produce item styles. */
  setColumnOffsetStyle(width: number, left: number): void

  /** Recalculate top offset (useful when container position changes) and refresh slice. */
  calculateContainerPageTop(): void
}
