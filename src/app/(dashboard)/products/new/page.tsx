"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ProductForm } from "@/components/products/ProductForm"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { usePermissions } from "@/hooks/usePermissions"

export default function NewProductPage() {
  const { can } = usePermissions()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Optional pre-fill from family manager / options panel:
  // /products/new?familyId=<uuid>&familyName=<name>
  const initialFamilyId = searchParams.get("familyId") ?? undefined
  const initialFamilyName = searchParams.get("familyName") ?? undefined

  useEffect(() => {
    if (!can("products.manage")) {
      router.replace("/products")
    }
  }, [can, router])

  if (!can("products.manage")) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/products">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={initialFamilyName ? `Add option to ${initialFamilyName}` : "Add Product"}
          subtitle={
            initialFamilyName
              ? "Create another option for this product family"
              : "Create a new product in your catalog"
          }
        />
      </div>
      <ProductForm
        initialFamilyId={initialFamilyId}
        initialFamilyName={initialFamilyName}
      />
    </div>
  )
}
