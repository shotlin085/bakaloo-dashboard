"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Save, Loader2, Plus, Trash2, Globe, ArrowRight, ArrowLeft, ChevronDown, ChevronUp, Sparkles, ShieldCheck, Store, Star } from "lucide-react"
import { useProductDetail, useCreateProduct, useUpdateProduct } from "@/hooks/useProducts"
import { useCategories } from "@/hooks/useCategories"
import { ImageUpload } from "@/components/products/ImageUpload"
import { AttributesEditor } from "@/components/products/attributes-editor"
import { HighlightsEditor } from "@/components/products/highlights-editor"
import { toast } from "sonner"
import type { ProductAttribute, ProductPayload, ProductReturnPolicy } from "@/types"
import { cn } from "@/lib/utils"

interface ProductFormProps {
  productId?: string
}

interface VariantRow {
  name: string
  price: string
  salePrice: string
  stock: string
  sku: string
  isActive: boolean
}

interface FormData {
  name: string
  description: string
  categoryId: string
  price: string
  salePrice: string
  costPrice: string
  stock: string
  unit: string
  sku: string
  barcode: string
  thumbnailUrl: string
  tags: string
  isFeatured: boolean
  isActive: boolean
  lowStockThreshold: string
  maxOrderQty: string
  // Variants
  variantsEnabled: boolean
  variantGroupName: string
  variants: VariantRow[]
  // SEO
  metaTitle: string
  metaDescription: string
  // Nutrition
  ingredients: string
  allergenInfo: string
  shelfLife: string
  storageInstructions: string
  certifications: string[]
  nutritionRows: { key: string; value: string }[]
  // Brand & merchandising
  brand: string
  brandLogoUrl: string
  netQuantity: string
  highlights: Record<string, string>
  attributes: ProductAttribute[]
  // Vendor & settings
  vendorName: string
  vendorAddress: string
  vendorFssai: string
  returnPolicy: ProductReturnPolicy
  avgRating: string
  ratingCount: string
  isAuthentic: boolean
}

const UNITS = ["kg", "g", "l", "ml", "piece", "pack", "dozen", "box"]
const CERT_OPTIONS = ["Organic", "FSSAI", "ISO", "Vegan", "Gluten-Free"]
const DEFAULT_NUTRITION_KEYS = ["Calories", "Protein", "Fat", "Carbs", "Fiber"]

const INITIAL: FormData = {
  name: "",
  description: "",
  categoryId: "",
  price: "",
  salePrice: "",
  costPrice: "",
  stock: "0",
  unit: "piece",
  sku: "",
  barcode: "",
  thumbnailUrl: "",
  tags: "",
  isFeatured: false,
  isActive: true,
  lowStockThreshold: "10",
  maxOrderQty: "",
  variantsEnabled: false,
  variantGroupName: "Size",
  variants: [],
  metaTitle: "",
  metaDescription: "",
  ingredients: "",
  allergenInfo: "",
  shelfLife: "",
  storageInstructions: "",
  certifications: [],
  nutritionRows: DEFAULT_NUTRITION_KEYS.map((k) => ({ key: k, value: "" })),
  brand: "",
  brandLogoUrl: "",
  netQuantity: "",
  highlights: {},
  attributes: [],
  vendorName: "",
  vendorAddress: "",
  vendorFssai: "",
  returnPolicy: "no_return",
  avgRating: "",
  ratingCount: "",
  isAuthentic: true,
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  )
}

function parseOptionalNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return ""
  const nextValue = typeof value === "string" ? Number(value) : value
  return Number.isFinite(nextValue) ? String(nextValue) : ""
}

export function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter()
  const isEdit = !!productId
  const { data: product, isLoading: productLoading } = useProductDetail(productId ?? null)
  const { data: categories } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  // Build initial form state from product (if editing) — computed once
  const initialForm = useMemo<FormData>(() => {
    if (!product) return INITIAL
    return {
      name: product.name ?? "",
      description: product.description ?? "",
      categoryId: product.category_id ?? "",
      price: (product.price ?? product.mrp ?? 0).toString(),
      salePrice: product.sale_price ? product.sale_price.toString() : "",
      costPrice: product.cost_price ? product.cost_price.toString() : "",
      stock: (product.stock_quantity ?? 0).toString(),
      unit: product.unit ?? "piece",
      sku: product.sku ?? "",
      barcode: product.barcode ?? "",
      thumbnailUrl: product.thumbnail_url ?? "",
      tags: product.tags?.join(", ") ?? "",
      isFeatured: product.is_featured ?? false,
      isActive: product.is_active ?? true,
      lowStockThreshold: (product.low_stock_threshold ?? 10).toString(),
      maxOrderQty: product.max_order_qty ? product.max_order_qty.toString() : "",
      variantsEnabled: (product.variants?.length ?? 0) > 0,
      variantGroupName: "Size",
      variants: product.variants?.map((v) => ({
        name: v.name,
        price: (v.price ?? 0).toString(),
        salePrice: v.sale_price?.toString() ?? "",
        stock: (v.stock ?? 0).toString(),
        sku: v.sku ?? "",
        isActive: v.is_active ?? true,
      })) ?? [],
      metaTitle: product.meta_title ?? "",
      metaDescription: product.meta_description ?? "",
      ingredients: product.ingredients ?? "",
      allergenInfo: product.allergen_info ?? "",
      shelfLife: product.shelf_life ?? "",
      storageInstructions: product.storage_instructions ?? "",
      certifications: product.certifications ?? [],
      nutritionRows: product.nutrition_info
        ? Object.entries(product.nutrition_info).map(([key, value]) => ({ key, value }))
        : DEFAULT_NUTRITION_KEYS.map((k) => ({ key: k, value: "" })),
      brand: product.brand ?? "",
      brandLogoUrl: product.brandLogoUrl ?? product.brand_logo_url ?? "",
      netQuantity: product.netQuantity ?? product.net_quantity ?? "",
      highlights: isStringRecord(product.highlights) ? product.highlights : {},
      attributes: Array.isArray(product.attributes)
        ? product.attributes.map((attribute) => ({
          label: attribute.label ?? "",
          value: attribute.value ?? "",
        }))
        : [],
      vendorName: product.vendorName ?? product.vendor_name ?? "",
      vendorAddress: product.vendorAddress ?? product.vendor_address ?? "",
      vendorFssai: product.vendorFssai ?? product.vendor_fssai ?? "",
      returnPolicy: product.returnPolicy ?? product.return_policy ?? "no_return",
      avgRating: parseOptionalNumber(product.avgRating ?? product.avg_rating),
      ratingCount: parseOptionalNumber(product.ratingCount ?? product.rating_count),
      isAuthentic: product.isAuthentic ?? product.is_authentic ?? true,
    }
  }, [product])

  const [form, setForm] = useState<FormData>(initialForm)

  // Sync form when product data loads/changes (e.g. from cache → fresh fetch)
  useEffect(() => {
    setForm(initialForm)
  }, [initialForm])

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const addVariant = () =>
    setForm((prev) => ({
      ...prev,
      variants: [...prev.variants, { name: "", price: "", salePrice: "", stock: "0", sku: "", isActive: true }],
    }))

  const updateVariant = (idx: number, key: keyof VariantRow, val: string | boolean) =>
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === idx ? { ...v, [key]: val } : v)),
    }))

  const removeVariant = (idx: number) =>
    setForm((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== idx) }))

  const addNutritionRow = () =>
    setForm((prev) => ({ ...prev, nutritionRows: [...prev.nutritionRows, { key: "", value: "" }] }))

  const updateNutritionRow = (idx: number, field: "key" | "value", val: string) =>
    setForm((prev) => ({
      ...prev,
      nutritionRows: prev.nutritionRows.map((r, i) => (i === idx ? { ...r, [field]: val } : r)),
    }))

  const removeNutritionRow = (idx: number) =>
    setForm((prev) => ({ ...prev, nutritionRows: prev.nutritionRows.filter((_, i) => i !== idx) }))

  const toggleCert = (cert: string) =>
    setForm((prev) => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter((c) => c !== cert)
        : [...prev.certifications, cert],
    }))

  const isPending = createProduct.isPending || updateProduct.isPending

  const STEPS = ["general", "pricing", "media", "details", "variants", "nutrition", "seo"] as const
  type Step = (typeof STEPS)[number]
  const [step, setStep] = useState<Step>("general")

  const stepIdx = STEPS.indexOf(step)
  const canPrev = stepIdx > 0
  const canNext = stepIdx < STEPS.length - 1
  const goNext = () => canNext && setStep(STEPS[stepIdx + 1])
  const goPrev = () => canPrev && setStep(STEPS[stepIdx - 1])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const cleanedAttributes = form.attributes
      .map((attribute) => ({
        label: attribute.label.trim(),
        value: attribute.value.trim(),
      }))
      .filter((attribute) => attribute.label || attribute.value)

    if (cleanedAttributes.some((attribute) => !attribute.label || !attribute.value)) {
      toast.error("Each product attribute needs both a label and a value.")
      setStep("details")
      return
    }

    const cleanedHighlights = Object.fromEntries(
      Object.entries(form.highlights)
        .map(([key, value]) => [key.trim(), value.trim()])
        .filter(([key, value]) => key && value)
    )

    const payload: ProductPayload = {
      name: form.name,
      description: form.description || undefined,
      categoryId: form.categoryId || undefined,
      price: parseFloat(form.price),
      salePrice: form.salePrice ? parseFloat(form.salePrice) : undefined,
      costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
      stock: parseInt(form.stock, 10),
      unit: form.unit,
      sku: form.sku || undefined,
      barcode: form.barcode || undefined,
      thumbnailUrl: form.thumbnailUrl || undefined,
      lowStockThreshold: form.lowStockThreshold ? parseInt(form.lowStockThreshold, 10) : undefined,
      maxOrderQty: form.maxOrderQty ? parseInt(form.maxOrderQty, 10) : undefined,
      tags: form.tags
        ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
      // Variants
      variants: form.variantsEnabled
        ? form.variants.map((v) => ({
          name: v.name,
          price: parseFloat(v.price) || 0,
          salePrice: v.salePrice ? parseFloat(v.salePrice) : undefined,
          stockQuantity: parseInt(v.stock, 10) || 0,
          sku: v.sku || undefined,
          isActive: v.isActive,
        }))
        : [],
      // SEO
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      // Nutrition & Details
      ingredients: form.ingredients || undefined,
      allergenInfo: form.allergenInfo || undefined,
      shelfLife: form.shelfLife || undefined,
      storageInstructions: form.storageInstructions || undefined,
      certifications: form.certifications.length > 0 ? form.certifications : undefined,
      nutritionInfo: form.nutritionRows.some((r) => r.key && r.value)
        ? Object.fromEntries(form.nutritionRows.filter((r) => r.key && r.value).map((r) => [r.key, r.value]))
        : undefined,
      brand: form.brand || undefined,
      brandLogoUrl: form.brandLogoUrl || undefined,
      netQuantity: form.netQuantity || undefined,
      highlights: Object.keys(cleanedHighlights).length > 0 ? cleanedHighlights : undefined,
      attributes: cleanedAttributes.length > 0 ? cleanedAttributes : undefined,
      vendorName: form.vendorName || undefined,
      vendorAddress: form.vendorAddress || undefined,
      vendorFssai: form.vendorFssai || undefined,
      returnPolicy: form.returnPolicy,
      avgRating: form.avgRating ? parseFloat(form.avgRating) : undefined,
      ratingCount: form.ratingCount ? parseInt(form.ratingCount, 10) : undefined,
      isAuthentic: form.isAuthentic,
    }

    if (isEdit && productId) {
      updateProduct.mutate(
        { id: productId, payload },
        { onSuccess: () => router.push("/products") }
      )
    } else {
      createProduct.mutate(payload, {
        onSuccess: () => router.push("/products"),
      })
    }
  }

  if ((isEdit && productLoading) || !categories) {
    return <ProductFormSkeleton />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={step} onValueChange={(v) => setStep(v as Step)}>
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 md:grid-cols-7">
          <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs">Pricing</TabsTrigger>
          <TabsTrigger value="media" className="text-xs">Media</TabsTrigger>
          <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
          <TabsTrigger value="variants" className="text-xs">Variants</TabsTrigger>
          <TabsTrigger value="nutrition" className="text-xs">Nutrition</TabsTrigger>
          <TabsTrigger value="seo" className="text-xs">SEO</TabsTrigger>
        </TabsList>

        {/* ────── Step 1: General ────── */}
        <TabsContent value="general" className="space-y-6 mt-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Basic Information</h3>
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Organic Whole Milk 500ml"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Product details, ingredients, storage info..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. MLK-ORG-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input id="barcode" value={form.barcode} onChange={(e) => set("barcode", e.target.value)} placeholder="e.g. 8901234567890" />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Status</h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch id="isActive" checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isFeatured">Featured</Label>
                <Switch id="isFeatured" checked={form.isFeatured} onCheckedChange={(v) => set("isFeatured", v)} />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Category</h3>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
              >
                <option value="">Select category</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Tags</h3>
              <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="organic, dairy, milk (comma separated)" />
              <p className="text-xs text-muted-foreground">Comma-separated list</p>
            </Card>
          </div>
        </TabsContent>

        {/* ────── Step 2: Pricing & Inventory ────── */}
        <TabsContent value="pricing" className="space-y-6 mt-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Pricing</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">MRP (₹) *</Label>
                <Input id="price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0.00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salePrice">Sale Price (₹)</Label>
                <Input id="salePrice" type="number" step="0.01" min="0" value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price (₹)</Label>
                <Input id="costPrice" type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} placeholder="0.00" />
              </div>
            </div>
            {form.salePrice && form.price && parseFloat(form.salePrice) < parseFloat(form.price) && (
              <p className="text-xs text-green-600">
                Discount: {Math.round(((parseFloat(form.price) - parseFloat(form.salePrice)) / parseFloat(form.price)) * 100)}% off
              </p>
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Inventory</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity *</Label>
                <Input id="stock" type="number" min="0" step="1" value={form.stock} onChange={(e) => set("stock", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                  <SelectTrigger id="unit"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowStock">Low Stock Alert</Label>
                <Input id="lowStock" type="number" min="0" step="1" value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxOrder">Max Order Qty</Label>
                <Input id="maxOrder" type="number" min="1" step="1" value={form.maxOrderQty} onChange={(e) => set("maxOrderQty", e.target.value)} placeholder="No limit" />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ────── Step 3: Media ────── */}
        <TabsContent value="media" className="mt-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Media</h3>
            <div className="space-y-2">
              <Label>Thumbnail Image</Label>
              <ImageUpload
                value={form.thumbnailUrl || null}
                onChange={(url) => set("thumbnailUrl", url ?? "")}
                label="Upload Thumbnail"
              />
              <p className="text-xs text-muted-foreground">Or paste URL directly:</p>
              <Input
                id="thumbnailUrl"
                value={form.thumbnailUrl}
                onChange={(e) => set("thumbnailUrl", e.target.value)}
                placeholder="https://res.cloudinary.com/..."
                className="text-xs"
              />
            </div>
          </Card>
        </TabsContent>

        {/* ────── Step 4: Details ────── */}
        <TabsContent value="details" className="space-y-6 mt-6">
          <CollapsibleCard
            title="Brand Details"
            description="Organize merchandising metadata for branding and packaging."
            icon={<Sparkles className="h-4 w-4" />}
            defaultOpen
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_220px]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand Name</Label>
                  <Input
                    id="brand"
                    value={form.brand}
                    onChange={(e) => set("brand", e.target.value)}
                    placeholder="e.g. Comfort Knit"
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandLogoUrl">Brand Logo URL</Label>
                  <Input
                    id="brandLogoUrl"
                    value={form.brandLogoUrl}
                    onChange={(e) => set("brandLogoUrl", e.target.value)}
                    placeholder="https://res.cloudinary.com/..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Brand Logo Upload</Label>
                <ImageUpload
                  value={form.brandLogoUrl || null}
                  onChange={(url) => set("brandLogoUrl", url ?? "")}
                  label="Upload Logo"
                  helperText="Optional. Use a square logo for the cleanest card preview."
                />
              </div>
            </div>
          </CollapsibleCard>

          <Card className="p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="font-semibold">Net Quantity</h3>
              <p className="text-sm text-muted-foreground">
                Capture the shopper-facing pack or quantity label exactly as it should appear.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="netQuantity">Net Quantity</Label>
              <Input
                id="netQuantity"
                value={form.netQuantity}
                onChange={(e) => set("netQuantity", e.target.value)}
                placeholder="e.g., 1 pack (6 pairs)"
                maxLength={200}
              />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="font-semibold">Highlights</h3>
              <p className="text-sm text-muted-foreground">
                Short, scannable points for PDP cards and merchandising modules.
              </p>
            </div>
            <HighlightsEditor
              value={form.highlights ?? {}}
              onChange={(nextHighlights) => set("highlights", nextHighlights)}
            />
          </Card>

          <Card className="p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="font-semibold">Product Attributes</h3>
              <p className="text-sm text-muted-foreground">
                Structured label-value pairs for specs, sizing, materials, or composition.
              </p>
            </div>
            <AttributesEditor
              value={form.attributes ?? []}
              onChange={(nextAttributes) => set("attributes", nextAttributes)}
            />
          </Card>

          <CollapsibleCard
            title="Vendor Details"
            description="Store supplier and compliance metadata without cluttering the main product entry flow."
            icon={<Store className="h-4 w-4" />}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vendorName">Vendor Name</Label>
                <Input
                  id="vendorName"
                  value={form.vendorName}
                  onChange={(e) => set("vendorName", e.target.value)}
                  placeholder="e.g. Bakaloo Textiles Pvt. Ltd."
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendorFssai">Vendor FSSAI</Label>
                <Input
                  id="vendorFssai"
                  value={form.vendorFssai}
                  onChange={(e) => set("vendorFssai", e.target.value)}
                  placeholder="FSSAI License Number"
                  maxLength={50}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorAddress">Vendor Address</Label>
              <Textarea
                id="vendorAddress"
                value={form.vendorAddress}
                onChange={(e) => set("vendorAddress", e.target.value)}
                placeholder="Street, locality, city, state, pin code"
                rows={3}
              />
            </div>
          </CollapsibleCard>

          <Card className="p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Settings
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure post-purchase policy and trust signals for the storefront.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="returnPolicy">Return Policy</Label>
                <Select
                  value={form.returnPolicy}
                  onValueChange={(value: ProductReturnPolicy) => set("returnPolicy", value)}
                >
                  <SelectTrigger id="returnPolicy">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_return">No Return</SelectItem>
                    <SelectItem value="7_day">7 Day Return</SelectItem>
                    <SelectItem value="instant">Instant Return</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="isAuthentic">Is Authentic</Label>
                    <p className="text-xs text-muted-foreground">
                      Mark products as verified and genuine for shopper trust.
                    </p>
                  </div>
                  <Switch
                    id="isAuthentic"
                    checked={form.isAuthentic}
                    onCheckedChange={(checked) => set("isAuthentic", checked)}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="avgRating">Average Rating</Label>
                <div className="relative">
                  <Star className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
                  <Input
                    id="avgRating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={form.avgRating}
                    onChange={(e) => set("avgRating", e.target.value)}
                    placeholder="0.0"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ratingCount">Rating Count</Label>
                <Input
                  id="ratingCount"
                  type="number"
                  min="0"
                  step="1"
                  value={form.ratingCount}
                  onChange={(e) => set("ratingCount", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ────── Step 5: Variants ────── */}
        <TabsContent value="variants" className="mt-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Variants</h3>
              <Switch checked={form.variantsEnabled} onCheckedChange={(v) => set("variantsEnabled", v)} />
            </div>
            {form.variantsEnabled && (
              <>
                <div className="space-y-2">
                  <Label>Variant Group Name</Label>
                  <Input value={form.variantGroupName} onChange={(e) => set("variantGroupName", e.target.value)} placeholder='e.g. "Size", "Weight", "Pack"' />
                </div>
                <Separator />
                <div className="space-y-3">
                  {form.variants.map((v, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Variant #{i + 1}</span>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Active</Label>
                          <Switch checked={v.isActive} onCheckedChange={(val) => updateVariant(i, "isActive", val)} />
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeVariant(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Name *</Label>
                          <Input placeholder="e.g. 250g" value={v.name} onChange={(e) => updateVariant(i, "name", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">SKU</Label>
                          <Input placeholder="e.g. PROD-250G" value={v.sku} onChange={(e) => updateVariant(i, "sku", e.target.value)} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Price (₹) *</Label>
                          <Input type="number" step="0.01" min="0" value={v.price} onChange={(e) => updateVariant(i, "price", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Sale Price (₹)</Label>
                          <Input type="number" step="0.01" min="0" value={v.salePrice} onChange={(e) => updateVariant(i, "salePrice", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Stock *</Label>
                          <Input type="number" min="0" step="1" value={v.stock} onChange={(e) => updateVariant(i, "stock", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={addVariant}>
                    <Plus className="h-4 w-4 mr-1" /> Add Variant
                  </Button>
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        {/* ────── Step 6: Nutrition & Details ────── */}
        <TabsContent value="nutrition" className="mt-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold">Nutrition & Details</h3>
            <div className="space-y-2">
              <Label>Ingredients</Label>
              <Textarea value={form.ingredients} onChange={(e) => set("ingredients", e.target.value)} placeholder="e.g. Whole milk, Pasteurized cream, Vitamin D3..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Nutritional Info (per 100g/ml)</Label>
              <div className="space-y-2">
                {form.nutritionRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={row.key} onChange={(e) => updateNutritionRow(i, "key", e.target.value)} placeholder="Nutrient" className="flex-1" />
                    <Input value={row.value} onChange={(e) => updateNutritionRow(i, "value", e.target.value)} placeholder="Value" className="w-28" />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeNutritionRow(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addNutritionRow}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
                </Button>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Allergen Info</Label>
              <Input value={form.allergenInfo} onChange={(e) => set("allergenInfo", e.target.value)} placeholder="e.g. Contains milk, soy" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shelf Life</Label>
                <Input value={form.shelfLife} onChange={(e) => set("shelfLife", e.target.value)} placeholder="e.g. 6 months" />
              </div>
              <div className="space-y-2">
                <Label>Storage Instructions</Label>
                <Input value={form.storageInstructions} onChange={(e) => set("storageInstructions", e.target.value)} placeholder="e.g. Keep refrigerated" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Certifications</Label>
              <div className="flex flex-wrap gap-3">
                {CERT_OPTIONS.map((cert) => (
                  <label key={cert} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <Checkbox checked={form.certifications.includes(cert)} onCheckedChange={() => toggleCert(cert)} />
                    {cert}
                  </label>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ────── Step 7: SEO ────── */}
        <TabsContent value="seo" className="mt-6">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4" /> SEO
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <span className={`text-[10px] ${form.metaTitle.length > 60 ? "text-destructive" : "text-muted-foreground"}`}>
                  {form.metaTitle.length}/60
                </span>
              </div>
              <Input id="metaTitle" value={form.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} placeholder="Product title for search engines" maxLength={80} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="metaDesc">Meta Description</Label>
                <span className={`text-[10px] ${form.metaDescription.length > 160 ? "text-destructive" : "text-muted-foreground"}`}>
                  {form.metaDescription.length}/160
                </span>
              </div>
              <Textarea id="metaDesc" value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} placeholder="Brief description for search results" rows={3} maxLength={200} />
            </div>
            {(form.metaTitle || form.name) && (
              <div className="border rounded-lg p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Google Preview</p>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium truncate">
                  {form.metaTitle || form.name}
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 truncate">
                  bakaloo.com/products/{form.name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "product-slug"}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {form.metaDescription || form.description || "No description provided"}
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Step navigation + submit */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button type="button" variant="outline" onClick={goPrev} disabled={!canPrev}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <p className="text-xs text-muted-foreground">
          Step {stepIdx + 1} of {STEPS.length}
        </p>
        <div className="flex items-center gap-2">
          {canNext && (
            <Button type="button" variant="outline" onClick={goNext}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isEdit ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </div>
    </form>
  )
}

function CollapsibleCard({
  title,
  description,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string
  description: string
  icon: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card className="overflow-hidden border-border/80">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full border border-border/70 bg-muted/50 p-2 text-muted-foreground">
            {icon}
          </div>
          <div className="space-y-1">
            <div className="font-semibold">{title}</div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="rounded-full border border-border/70 bg-background p-2 text-muted-foreground">
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/70 px-6 py-5">
            {children}
          </div>
        </div>
      </div>
    </Card>
  )
}

function ProductFormSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </Card>
        ))}
      </div>
      <div className="space-y-6">
        <Card className="p-6 space-y-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </Card>
        <Card className="p-6 space-y-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>
    </div>
  )
}
