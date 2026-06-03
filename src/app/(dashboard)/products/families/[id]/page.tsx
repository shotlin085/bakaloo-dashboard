"use client"

/**
 * Product Family detail page — shows family metadata + linked option
 * products. Admins can edit name/description/active state and add new
 * options that auto-link to this family.
 */

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Power,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/PageHeader"
import { usePermissions } from "@/hooks/usePermissions"
import {
  useDeactivateProductFamily,
  useProductFamily,
  useUpdateProductFamily,
} from "@/hooks/useProductFamilies"

import { AddOptionDialog } from "../_components/add-option-dialog"
import { EditFamilyDialog } from "../_components/edit-family-dialog"
import { FamilyGuidedWorkflow } from "../_components/family-guided-workflow"
import { FamilyOptionsTable } from "../_components/family-options-table"

export default function FamilyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { can } = usePermissions()
  const router = useRouter()
  const [openEdit, setOpenEdit] = useState(false)
  const [openAddOption, setOpenAddOption] = useState(false)

  const { data: family, isLoading, refetch } = useProductFamily(id)
  const update = useUpdateProductFamily()
  const deactivate = useDeactivateProductFamily()

  useEffect(() => {
    if (!can("products.manage")) {
      router.replace("/products")
    }
  }, [can, router])

  if (!can("products.manage")) return null

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!family) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          Product family not found.
        </p>
        <Link href="/products/families" className="mt-2 inline-block">
          <Button variant="ghost" size="sm">
            ← Back to families
          </Button>
        </Link>
      </Card>
    )
  }

  const handleToggleActive = () => {
    if (family.is_active) {
      deactivate.mutate(family.id)
    } else {
      update.mutate({ id: family.id, payload: { is_active: true } })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/products/families">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={family.name}
          subtitle={`Slug: ${family.slug}${
            family.product_count !== undefined
              ? ` · ${family.product_count} options`
              : ""
          }`}
        />
        <div className="ml-auto flex items-center gap-2">
          {family.is_active ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Active
            </Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          )}
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            {family.description ? (
              <p className="text-sm text-muted-foreground">
                {family.description}
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                No description.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenEdit(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleActive}
              disabled={update.isPending || deactivate.isPending}
            >
              {(update.isPending || deactivate.isPending) && (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              )}
              <Power className="mr-1 h-3.5 w-3.5" />
              {family.is_active ? "Deactivate" : "Activate"}
            </Button>
            <Button size="sm" onClick={() => setOpenAddOption(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Option
            </Button>
          </div>
        </div>
      </Card>

      <FamilyGuidedWorkflow
        familyId={family.id}
        familyName={family.name}
        onAddOptionClick={() => setOpenAddOption(true)}
      />

      <FamilyOptionsTable 
        familyId={family.id} 
        familyName={family.name}
        onProductRemoved={() => refetch()}
        onAddOptionClick={() => setOpenAddOption(true)}
      />

      <EditFamilyDialog
        family={family}
        open={openEdit}
        onOpenChange={setOpenEdit}
      />

      <AddOptionDialog
        open={openAddOption}
        onOpenChange={setOpenAddOption}
        familyId={family.id}
        familyName={family.name}
        onProductAttached={() => refetch()}
      />
    </div>
  )
}
