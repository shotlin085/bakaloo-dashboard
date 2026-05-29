"use client"

/**
 * FamilyOptionsTable — table of all products linked to a product family.
 * Shown on the family detail page so admins can see option labels, sort
 * order, default flag, food type, and active status at a glance.
 */

import Image from "next/image"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Edit, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { listFamilyOptions } from "@/services/product-families.service"

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
}

export function FamilyOptionsTable({ familyId, familyName }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["family-options-table", familyId],
    queryFn: () => listFamilyOptions(familyId),
    staleTime: 30_000,
  })

  const options = (data?.options ?? []) as unknown as FamilyOptionRow[]

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Options ({options.length})</h3>
        <Link
          href={`/products/new?familyId=${familyId}&familyName=${encodeURIComponent(familyName)}`}
        >
          <Button size="sm">
            <Plus className="mr-1 h-3.5 w-3.5" /> Add option
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : options.length === 0 ? (
        <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
          No options in this family yet.
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
                      <Link href={`/products/${opt.id}/edit`}>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
