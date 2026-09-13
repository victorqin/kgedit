import { create, type StateCreator } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { createGraphSlice, type GraphSlice } from './slices/graph'
import { createPickerSlice, type PickerSlice } from './slices/picker'

export type KgState = GraphSlice & PickerSlice

export type SliceCreator<T> = StateCreator<KgState, [['zustand/immer', never]], [], T>

export const useKgStore = create<KgState>()(
  devtools(
    immer((...a) => ({
      ...createGraphSlice(...a),
      ...createPickerSlice(...a),
    })),
    { name: 'kg-store' },
  ),
)
