"use client"

/**
 * Profile (/me) page — task 22.1
 * Displays user profile + active shop + permissions.
 * Provides "Change Password" link.
 */

import Link from "next/link"
import { Key, Shield, Store, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"
import { useAuthStore } from "@/store/auth.store"
import { useShopContext } from "@/hooks/useShopContext"
import { usePermissions } from "@/hooks/usePermissions"

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const { activeShopId, mode, shopMeta, permissions: shopPermissions } = useShopContext()
  const { permissions } = usePermissions()

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="My Profile" />

      {/* User Info */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/10 p-3"><User className="h-6 w-6 text-primary" /></div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{user?.name ?? "Unknown User"}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {user?.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
            <div className="mt-2"><Badge variant="secondary">{user?.role ?? "Unknown Role"}</Badge></div>
          </div>
        </div>
      </Card>

      {/* Active Shop */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3"><Store className="h-6 w-6 text-blue-600" /></div>
          <div className="flex-1">
            <h3 className="font-semibold">Active Shop</h3>
            {mode === "STORE_MODE" && shopMeta ? (
              <div className="mt-1"><p className="text-sm font-medium">{shopMeta.name}</p><p className="text-xs text-muted-foreground">Branch: {shopMeta.branchCode} · City: {shopMeta.city}</p><p className="text-xs text-muted-foreground mt-1">Shop ID: <code className="font-mono">{activeShopId}</code></p></div>
            ) : mode === "HQ_MODE" ? (<p className="text-sm text-muted-foreground mt-1">All Shops (Super Admin mode)</p>) : (<p className="text-sm text-muted-foreground mt-1">No shop selected</p>)}
          </div>
        </div>
      </Card>

      {/* Permissions */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3"><Shield className="h-6 w-6 text-amber-600" /></div>
          <div className="flex-1">
            <h3 className="font-semibold">Permissions</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(shopPermissions.length > 0 ? shopPermissions : permissions).length > 0 ? (
                (shopPermissions.length > 0 ? shopPermissions : permissions).map((perm) => (<Badge key={perm} variant="outline" className="text-xs font-mono">{perm}</Badge>))
              ) : (<p className="text-sm text-muted-foreground">No specific permissions assigned</p>)}
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3"><Key className="h-6 w-6 text-green-600" /></div>
          <div className="flex-1">
            <h3 className="font-semibold">Security</h3>
            <p className="text-sm text-muted-foreground mt-1">Manage your account security settings.</p>
            <div className="mt-3"><Link href="/settings"><Button variant="outline" size="sm" className="gap-1.5"><Key className="h-4 w-4" /> Change Password</Button></Link></div>
          </div>
        </div>
      </Card>
    </div>
  )
}
