/**
 * Feature: multi-vendor-dashboard-ui, Property 10: Shop room rotation
 *
 * Validates: Requirements 11.2, 11.7
 *
 * Property statement (design.md §"Property 10 — Shop room rotation"):
 *   For any sequence of `setActiveShop` / `setAllShopsMode` calls, after
 *   each call the set of joined Socket.IO rooms equals exactly
 *   `{ shop:{Active_Shop_Id}:stock, shop:{Active_Shop_Id}:orders }` when
 *   `Active_Shop_Id != null`, and is empty otherwise; rooms for previously
 *   selected shops are always left.
 *
 * ── Strategy ────────────────────────────────────────────────────────────────
 *
 * Drives `ShopRoomManager` directly (no React, no zustand) by generating an
 * arbitrary sequence of "set id" / "clear" operations and applying them via
 * `manager.switchTo(...)`. A `FakeSocket` (mirroring the test double in
 * `src/hooks/__tests__/useShopRoom.test.tsx`) records every `emit("join", room)`
 * and `emit("leave", room)` call. After each operation we:
 *
 *   1. Compute the expected rooms set: empty when the last id is null, else
 *      `{ shop:{id}:stock, shop:{id}:orders }`.
 *   2. Assert `manager.currentRooms()` matches the expected set exactly.
 *   3. Replay the emit history to compute the *actually* joined rooms — every
 *      `join` adds, every `leave` removes — and assert that the resulting set
 *      equals the expected set. This guarantees rooms for prior shops are
 *      always left when the active id changes (Req 11.2 / Req 11.7).
 */

import { describe, it } from "vitest"
import fc from "fast-check"

import { ShopRoomManager } from "@/lib/shop-room-manager"

// ─────────────────────────────────────────────────────────────────────────────
// FakeSocket — records every (event, room) pair the manager emits.
// Mirrors the test double in `src/hooks/__tests__/useShopRoom.test.tsx`.
// ─────────────────────────────────────────────────────────────────────────────

interface FakeSocket {
  connected: boolean
  emit: (event: string, ...args: unknown[]) => void
  /** Recorded emit calls in order. */
  calls: Array<[string, string]>
}

function makeSocket(): FakeSocket {
  const calls: Array<[string, string]> = []
  return {
    connected: true,
    emit: (event: string, ...args: unknown[]) => {
      calls.push([event, String(args[0])])
    },
    calls,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function expectedRoomsFor(id: string | null): ReadonlySet<string> {
  if (id === null) return new Set<string>()
  return new Set([`shop:${id}:stock`, `shop:${id}:orders`])
}

/**
 * Replay the emit history into a "currently joined" room set: each `join`
 * adds, each `leave` removes. Any other event is ignored.
 */
function replayJoinedRooms(calls: ReadonlyArray<[string, string]>): Set<string> {
  const joined = new Set<string>()
  for (const [event, room] of calls) {
    if (event === "join") joined.add(room)
    else if (event === "leave") joined.delete(room)
  }
  return joined
}

function setsEqual<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// Generators
// ─────────────────────────────────────────────────────────────────────────────

type Op = { kind: "set"; id: string } | { kind: "clear" }

const opArb: fc.Arbitrary<Op> = fc.oneof(
  fc.record({
    kind: fc.constant<"set">("set"),
    id: fc.string({ minLength: 1, maxLength: 5 }),
  }),
  fc.record({ kind: fc.constant<"clear">("clear") }),
)

const opsArb: fc.Arbitrary<Op[]> = fc.array(opArb, {
  minLength: 1,
  maxLength: 20,
})

// ─────────────────────────────────────────────────────────────────────────────
// Property
// ─────────────────────────────────────────────────────────────────────────────

describe("Property 10: shop room rotation", () => {
  it("after every setActiveShop/setAllShopsMode call, joined rooms match the active id and prior rooms are left", () => {
    fc.assert(
      fc.property(opsArb, (ops) => {
        const socket = makeSocket()
        const manager = new ShopRoomManager()
        manager.attachSocket(() => socket)

        let lastId: string | null = null

        for (const op of ops) {
          const nextId = op.kind === "set" ? op.id : null
          manager.switchTo(nextId)
          lastId = nextId

          const expected = expectedRoomsFor(lastId)

          // (1) The manager's read-only view matches the expected rooms.
          const current = new Set(manager.currentRooms())
          if (!setsEqual(current, expected)) {
            return false
          }

          // (2) Replaying the emit history yields the same set, which
          //     proves every prior shop's rooms have been left whenever
          //     the active id changed (Req 11.2 / Req 11.7).
          const joined = replayJoinedRooms(socket.calls)
          if (!setsEqual(joined, expected)) {
            return false
          }
        }

        return true
      }),
      { numRuns: 100 },
    )
  })
})
