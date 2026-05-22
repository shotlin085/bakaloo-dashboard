import type { FC } from "react"
import type { Category, Product } from "@/types"
import type { SectionManifest, SectionType } from "@/types/theme.types"
import ArchedShowcasePreview from "./ArchedShowcasePreview"
import BannerPreview from "./BannerPreview"
import CarouselPreview from "./CarouselPreview"
import CategoryIconsPreview from "./CategoryIconsPreview"
import CustomBannerPreview from "./CustomBannerPreview"
import FeeStripPreview from "./FeeStripPreview"
import MosaicPreview from "./MosaicPreview"
import ProductGridPreview from "./ProductGridPreview"
import SpacerPreview from "./SpacerPreview"
import TextHeaderPreview from "./TextHeaderPreview"
import TrendingPreview from "./TrendingPreview"

export interface PreviewProps {
  section: SectionManifest
  isSelected: boolean
  onClick: () => void
  categories?: Category[]
  products?: Product[]
}

export const previewRegistry: Record<SectionType, FC<PreviewProps>> = {
  animated_banner: BannerPreview,
  fee_strip: FeeStripPreview,
  seasonal_mosaic: MosaicPreview,
  round_category_icons: CategoryIconsPreview,
  category_product_grid: ProductGridPreview,
  product_carousel: CarouselPreview,
  trending_products: TrendingPreview,
  promo_carousel: CarouselPreview,
  bank_offers: FeeStripPreview,
  custom_banner: CustomBannerPreview,
  text_header: TextHeaderPreview,
  arched_product_showcase: ArchedShowcasePreview,
  spacer: SpacerPreview,
}
