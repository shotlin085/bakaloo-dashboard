"use client"

import { useState } from "react"
import type { Icon as PhosphorIconType } from "@phosphor-icons/react"
import {
  Gift, GameController, Crown, CrownSimple, Star, StarFour,
  Sparkle, Fire, Rocket, RocketLaunch, Trophy, Medal, Target,
  Ticket, Confetti, Diamond, ShieldStar, MoonStars,
  House, Basket, Bag, Handbag, Storefront, Tag, Percent,
  Lightning, Megaphone, Bell, Heart, ShoppingBag, ShoppingCart,
  Coin, Wallet, Image as ImageIcon, Globe, Browser, DeviceMobile,
} from "@phosphor-icons/react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { NAV_BUTTON_ICON_KEYS, type NavButtonIconKey } from "@/types/nav-button.types"

/** One React component per NAV_BUTTON_ICON_KEYS entry — explicit imports
 * (not a dynamic string lookup) so a typo'd key fails at compile time
 * here, not silently at render time. */
const ICON_COMPONENTS: Record<NavButtonIconKey, PhosphorIconType> = {
  gift: Gift, gameController: GameController, crown: Crown, crownSimple: CrownSimple,
  star: Star, starFour: StarFour, sparkle: Sparkle, fire: Fire, rocket: Rocket,
  rocketLaunch: RocketLaunch, trophy: Trophy, medal: Medal, target: Target,
  ticket: Ticket, confetti: Confetti, diamond: Diamond, shieldStar: ShieldStar,
  moonStars: MoonStars, house: House, basket: Basket, bag: Bag, handbag: Handbag,
  storefront: Storefront, tag: Tag, percent: Percent, lightning: Lightning,
  megaphone: Megaphone, bell: Bell, heart: Heart, shoppingBag: ShoppingBag,
  shoppingCart: ShoppingCart, coin: Coin, wallet: Wallet, image: ImageIcon,
  globe: Globe, browser: Browser, deviceMobile: DeviceMobile,
}

const ICON_LABELS: Record<NavButtonIconKey, string> = {
  gift: "Gift", gameController: "Game", crown: "Crown", crownSimple: "Crown (simple)",
  star: "Star", starFour: "Star (sparkle)", sparkle: "Sparkle", fire: "Fire",
  rocket: "Rocket", rocketLaunch: "Rocket launch", trophy: "Trophy", medal: "Medal",
  target: "Target", ticket: "Ticket", confetti: "Confetti", diamond: "Diamond",
  shieldStar: "Shield star", moonStars: "Moon & stars", house: "Home", basket: "Basket",
  bag: "Bag", handbag: "Handbag", storefront: "Storefront", tag: "Tag",
  percent: "Discount", lightning: "Lightning", megaphone: "Megaphone", bell: "Bell",
  heart: "Heart", shoppingBag: "Shopping bag", shoppingCart: "Shopping cart",
  coin: "Coin", wallet: "Wallet", image: "Image", globe: "Website", browser: "Browser",
  deviceMobile: "App",
}

export function NavButtonIconPreview({
  iconType = "PRESET",
  iconKey,
  accentColor,
  customIconUrl,
  size = 20,
}: {
  iconType?: "PRESET" | "CUSTOM"
  iconKey?: NavButtonIconKey | null
  accentColor?: string | null
  customIconUrl?: string | null
  size?: number
}) {
  // CUSTOM renders the uploaded image directly, no badge/circle behind
  // it — a real brand icon or logo loses its own shape and colors if
  // forced into a colored circle the way a PRESET vector glyph needs.
  if (iconType === "CUSTOM") {
    if (!customIconUrl) {
      return (
        <div
          className="flex items-center justify-center rounded-md border border-dashed text-muted-foreground"
          style={{ width: size * 1.8, height: size * 1.8, fontSize: size * 0.5 }}
        >
          ?
        </div>
      )
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={customIconUrl}
        alt=""
        style={{ width: size * 1.8, height: size * 1.8, objectFit: "contain" }}
      />
    )
  }

  const Icon = iconKey ? ICON_COMPONENTS[iconKey] : null
  if (!Icon) return null
  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{
        width: size * 1.8,
        height: size * 1.8,
        backgroundColor: accentColor || "#7C3AED",
      }}
    >
      <Icon size={size} weight="fill" color="#fff" />
    </div>
  )
}

export function IconPicker({
  value,
  accentColor,
  onChange,
}: {
  value: NavButtonIconKey
  accentColor?: string | null
  onChange: (key: NavButtonIconKey) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start gap-2 h-11">
          <NavButtonIconPreview iconKey={value} accentColor={accentColor} size={16} />
          <span>{ICON_LABELS[value]}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="grid grid-cols-6 gap-1.5 max-h-64 overflow-y-auto">
          {NAV_BUTTON_ICON_KEYS.map((key) => {
            const Icon = ICON_COMPONENTS[key]
            const selected = key === value
            return (
              <button
                key={key}
                type="button"
                title={ICON_LABELS[key]}
                onClick={() => {
                  onChange(key)
                  setOpen(false)
                }}
                className={`flex items-center justify-center rounded-md p-2 hover:bg-muted transition-colors ${
                  selected ? "bg-muted ring-2 ring-primary" : ""
                }`}
              >
                <Icon size={20} weight={selected ? "fill" : "regular"} />
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
