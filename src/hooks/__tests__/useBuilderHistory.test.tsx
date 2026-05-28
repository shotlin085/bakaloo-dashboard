import { describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useBuilderHistory } from "../useBuilderHistory"

describe("useBuilderHistory", () => {
  it("starts with no undo/redo", () => {
    const { result } = renderHook(() => useBuilderHistory<number[]>([1, 2, 3]))
    expect(result.current.present).toEqual([1, 2, 3])
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it("set pushes the previous value onto past", () => {
    const { result } = renderHook(() => useBuilderHistory<number[]>([1]))
    act(() => result.current.set([2]))
    expect(result.current.present).toEqual([2])
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it("undo restores the previous value and enables redo", () => {
    const { result } = renderHook(() => useBuilderHistory<number[]>([1]))
    act(() => result.current.set([2]))
    act(() => result.current.set([3]))
    act(() => result.current.undo())
    expect(result.current.present).toEqual([2])
    expect(result.current.canRedo).toBe(true)
    act(() => result.current.undo())
    expect(result.current.present).toEqual([1])
    expect(result.current.canUndo).toBe(false)
  })

  it("redo replays a future value", () => {
    const { result } = renderHook(() => useBuilderHistory<number[]>([1]))
    act(() => result.current.set([2]))
    act(() => result.current.undo())
    act(() => result.current.redo())
    expect(result.current.present).toEqual([2])
    expect(result.current.canRedo).toBe(false)
  })

  it("set after an undo discards future stack", () => {
    const { result } = renderHook(() => useBuilderHistory<number[]>([1]))
    act(() => result.current.set([2]))
    act(() => result.current.set([3]))
    act(() => result.current.undo())
    act(() => result.current.set([99]))
    expect(result.current.present).toEqual([99])
    expect(result.current.canRedo).toBe(false)
  })

  it("reset clears past and future", () => {
    const { result } = renderHook(() => useBuilderHistory<number[]>([1]))
    act(() => result.current.set([2]))
    act(() => result.current.set([3]))
    act(() => result.current.reset([42]))
    expect(result.current.present).toEqual([42])
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it("respects the limit cap on past stack", () => {
    const { result } = renderHook(() => useBuilderHistory<number>(0, { limit: 2 }))
    for (let i = 1; i <= 5; i += 1) {
      // push 5 transitions, but only the latest 2 should be in past
      act(() => result.current.set(i))
    }
    expect(result.current.present).toBe(5)
    act(() => result.current.undo())
    expect(result.current.present).toBe(4)
    act(() => result.current.undo())
    expect(result.current.present).toBe(3)
    expect(result.current.canUndo).toBe(false)
  })
})
