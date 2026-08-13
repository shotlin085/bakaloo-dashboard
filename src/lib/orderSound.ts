"use client"

/**
 * New-order sound alert — same tone for every incoming order (ASAP or
 * SCHEDULED). Kept as a per-mode map so a distinct tone per mode can be
 * reintroduced later without touching callers.
 */

const SOUND_URLS = {
  ASAP: "/sounds/order-alert.mp3",
  SCHEDULED: "/sounds/order-alert.mp3",
} as const

type DeliveryMode = keyof typeof SOUND_URLS

let audioElements: Record<DeliveryMode, HTMLAudioElement> | null = null
let unlocked = false

function getAudioElements() {
  if (typeof window === "undefined") return null
  if (!audioElements) {
    audioElements = {
      ASAP: new Audio(SOUND_URLS.ASAP),
      SCHEDULED: new Audio(SOUND_URLS.SCHEDULED),
    }
    for (const el of Object.values(audioElements)) {
      el.preload = "auto"
      el.volume = 1
    }
  }
  return audioElements
}

/**
 * Browsers block audio playback until the page has received a real user
 * gesture — a later `play()` triggered by a Socket.IO event (not a click)
 * would otherwise be silently rejected. Call this once on the first
 * click/keydown anywhere in the dashboard to "warm up" both clips.
 */
export function unlockOrderSounds() {
  if (unlocked) return
  const els = getAudioElements()
  if (!els) return
  unlocked = true
  for (const el of Object.values(els)) {
    el.play()
      .then(() => {
        el.pause()
        el.currentTime = 0
      })
      .catch(() => {
        unlocked = false
      })
  }
}

/** Plays the ASAP or SCHEDULED alert tone based on the order's delivery mode. */
export function playOrderSound(deliveryMode: string | null | undefined) {
  const els = getAudioElements()
  if (!els) return
  const mode: DeliveryMode = deliveryMode === "SCHEDULED" ? "SCHEDULED" : "ASAP"
  const el = els[mode]
  el.currentTime = 0
  el.volume = 1
  el.play().catch((err) => {
    console.warn("[OrderSound] Playback blocked:", err?.message)
  })
}
