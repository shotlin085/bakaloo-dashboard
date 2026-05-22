"use client"

import { useEffect, useRef, useState } from "react"
import { useSocket } from "@/components/providers/SocketProvider"

interface RiderLocation {
  riderId: string
  lat: number
  lng: number
  updatedAt: string
}

/** Hook that subscribes to periodic rider location broadcasts */
export function useRiderLocations() {
  const socket = useSocket()
  const [locations, setLocations] = useState<RiderLocation[]>([])
  const locationsRef = useRef<RiderLocation[]>([])

  useEffect(() => {
    if (!socket) return

    const handler = (data: RiderLocation[]) => {
      locationsRef.current = data
      setLocations(data)
    }

    socket.on("dashboard:rider_locations", handler)
    return () => {
      socket.off("dashboard:rider_locations", handler)
    }
  }, [socket])

  return locations
}

/** Subscribe to a specific socket event */
export function useSocketEvent<T>(event: string, callback: (data: T) => void) {
  const socket = useSocket()
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!socket) return
    const handler = (data: T) => callbackRef.current(data)
    socket.on(event, handler)
    return () => {
      socket.off(event, handler)
    }
  }, [socket, event])
}

/** Track socket connection status */
export type ConnectionStatus = "connected" | "disconnected" | "reconnecting"

export function useConnectionStatus(): ConnectionStatus {
  const socket = useSocket()
  const [status, setStatus] = useState<ConnectionStatus>(
    socket?.connected ? "connected" : "disconnected"
  )

  useEffect(() => {
    if (!socket) {
      setStatus("disconnected")
      return
    }

    setStatus(socket.connected ? "connected" : "disconnected")

    const onConnect = () => setStatus("connected")
    const onDisconnect = () => setStatus("disconnected")
    const onReconnectAttempt = () => setStatus("reconnecting")

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.io.on("reconnect_attempt", onReconnectAttempt)

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.io.off("reconnect_attempt", onReconnectAttempt)
    }
  }, [socket])

  return status
}
