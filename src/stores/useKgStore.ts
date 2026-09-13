import { create, type StateCreator } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { createGraphSlice, type GraphSlice } from './slices/graph'

export type KgState = GraphSlice

export type SliceCreator<T> = StateCreator<KgState, [['zustand/immer', never]], [], T>

export const useKgStore = create<KgState>()(
  devtools(
    immer((...a) => ({
      ...createGraphSlice(...a),
    })),
    { name: 'kg-store' },
  ),
)
