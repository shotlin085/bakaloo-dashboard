"use client"

/**
 * FamilyOptionsTable — table of all products linked to a product family.
 * Shown on the family detail page so admins can see option labels, sort
 * order, default flag, food type, and active status at a glance.
 */

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Edit, Loader2, X } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { listFamilyOptions } from "@/services/product-families.service"
import { useUpdateProduct } from "@/hooks/useProducts"
import { toast } from "sonner"

interface FamilyOptionRow {
  id: string
  name: string
  thumbnail_url: string | null
  price: number
  sale_price: number | null
  stock_quantity: number
  unit: string
  is_active: boolean
  option_label: string | null
  option_sort_order: number
  is_default_option: boolean
  food_type: string
  origin_tag: string
  custom_badges: string[] | null
}

interface Props {
  familyId: string
  familyName: string
  onProductRemoved?: () => void
}

export function FamilyOptionsTable({ familyId, familyName, onProductRemoved }: Props) {
  const queryClient = useQueryClient()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["family-options-table", familyId],
    queryFn: () => listFamilyOptions(familyId),
    staleTime: 30_000,
  })

  const updateProduct = useUpdateProduct()

  const options = (data?.options ?? []) as unknown as FamilyOptionRow[]

  const handleRemoveFromFamily = async (productId: string, productName: string) => {
    setRemovingId(productId)
    try {
      const product = options.find((opt) => opt.id === productId)
      if (!product) return

      await updateProduct.mutateAsync({
        id: productId,
        payload: {
          productFamilyId: null,
          isDefaultOption: false,
          // Keep existing values
          name: product.name,
          price: product.price,
          stock: product.stock_quantity,
          unit: product.unit,
          isActive: product.is_active,
        },
      })
      toast.success(`${productName} removed from ${familyName}`)
      queryClient.invalidateQueries({ queryKey: ["family-options-table", familyId] })
      onProductRemoved?.()
    } catch (error) {
      toast.error("Failed to remove product from family")
      console.error(error)
    } finally {
      setRemovingId(null)
      setConfirmRemoveId(null)
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Options in this family ({options.length})</h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : options.length === 0 ? (
        <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
          No options in this family yet. Options are existing products grouped under one family, such as 95g, 3 x 95g, and 4 x 95g.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left">Image</th>
                <th className="py-2 text-left">Name</th>
                <th className="py-2 text-left">Option</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-center">Sort</th>
                <th className="py-2 text-center">Default</th>
                <th className="py-2 text-center">Food</th>
                <th className="py-2 text-center">Origin</th>
                <th className="py-2 text-center">Active</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {options.map((opt) => {
                const price = opt.sale_price ?? opt.price
                const original =
                  opt.sale_price && opt.sale_price < opt.price ? opt.price : null
                return (
                  <tr key={opt.id} className="border-b last:border-0">
                    <td className="py-2">
                      <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted">
                        {opt.thumbnail_url && (
                          <Image
                            src={opt.thumbnail_url}
                            alt={opt.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-2 font-medium">{opt.name}</td>
                    <td className="py-2 text-muted-foreground">
                      {opt.option_label || "—"}
                    </td>
                    <td className="py-2 text-right">
                      ₹{Number(price).toFixed(0)}
                      {original && (
                        <span className="ml-1 text-xs line-through text-muted-foreground">
                          ₹{Number(original).toFixed(0)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-center text-muted-foreground">
                      {opt.option_sort_order ?? 0}
                    </td>
                    <td className="py-2 text-center">
                      {opt.is_default_option ? (
                        <Badge variant="default" className="text-[10px]">
                          Default
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 text-center text-xs">
                      {opt.food_type !== "NONE" ? opt.food_type : "—"}
                    </td>
                    <td className="py-2 text-center text-xs">
                      {opt.origin_tag !== "NONE" ? opt.origin_tag : "—"}
                    </td>
                    <td className="py-2 text-center">
                      {opt.is_active ? (
                        <Badge variant="default" className="text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/products/${opt.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setConfirmRemoveId(opt.id)}
                          disabled={removingId === opt.id}
                        >
                          {removingId === opt.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!confirmRemoveId} onOpenChange={(open) => !open && setConfirmRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from family?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the product from this family, but it will not delete the product or store inventory. The product will remain active in the master catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const product = options.find((opt) => opt.id === confirmRemoveId)
                if (product) {
                  handleRemoveFromFamily(product.id, product.name)
                }
              }}
            >
              Remove from family
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
