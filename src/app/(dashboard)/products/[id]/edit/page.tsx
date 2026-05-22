"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProductForm } from "@/components/products/ProductForm"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { usePermissions } from "@/hooks/usePermissions"

export default function EditProductPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const { can } = usePermissions()
  const router = useRouter()

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
        <PageHeader title="Edit Product" subtitle={`Editing product ID: ${id}`} />
      </div>
      <ProductForm productId={id} />
    </div>
  )
}
