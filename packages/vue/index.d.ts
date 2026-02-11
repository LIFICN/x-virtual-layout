/**
 * Declarations for useVirtualLayout (useVirtualLayout.d.ts)
 * This provides a TypeScript surface for the Vue composable `useVirtualLayout`.
 */
import type { Ref, ShallowRef } from 'vue'
import type { VirtualListAdapterOptions, VirtualItem } from '@x-virtual/core'

export interface UseVirtualLayoutOptions extends VirtualListAdapterOptions {
  /** Number of columns in the masonry layout. Default: 1 */
  columnCount?: number
}

export interface UseVirtualLayoutItem extends VirtualItem {
  /** which column this item is placed in (0-based) */
  columnIndex: number
  /** the global index in the original dataSource array */
  index: number
  style?: Record<string, any>
}

export interface UseVirtualLayoutReturn {
  sliceData: Ref<UseVirtualLayoutItem[]>
  /** Scroll to a global index (if columnCount > 1, the implementation finds the column and scrolls there) */
  scrollTo: (globalIndex: number) => void
  totalHeight: ShallowRef<number>
  /** Static container style exported from VirtualListAdapter.containerStyle */
  containerStyle: Record<string, string>
  /** Recalculate container page top (async) and refresh internal state */
  calculateContainerPageTop: () => Promise<void>
}

/**
 * Vue composable to produce a column-based virtual layout (masonry-like) backed by VirtualListAdapter instances.
 * - dataSource: Ref to the source array
 * - options: UseVirtualLayoutOptions (includes VirtualListAdapter options)
 */
export declare function useVirtualLayout(
  dataSource: Ref<any[]>,
  options?: UseVirtualLayoutOptions,
): UseVirtualLayoutReturn
