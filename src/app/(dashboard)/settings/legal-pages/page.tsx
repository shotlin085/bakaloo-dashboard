"use client"

/**
 * Legal Pages settings — lets an admin edit the Terms & Conditions,
 * Privacy Policy, and About Us content shown on the public website
 * (bakaloo-customer-web /terms, /privacy, /about) and, via the mobile
 * apps' in-app WebView, inside the customer app too. No app release is
 * needed for an edit to take effect — the website re-fetches this content
 * (revalidated every 60s).
 *
 * Content is stored and rendered as HTML. The backend sanitizes on save
 * (strips scripts/event handlers/etc.) since this renders on a public,
 * unauthenticated page — the preview here shows exactly what will be
 * saved, but the authoritative sanitization happens server-side.
 */

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Save, Eye, Code2 } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { getLegalPages, updateLegalPage } from "@/services/legal-pages.service"
import type { LegalPage } from "@/types/legal-page.types"

const PAGE_ORDER: Array<{ slug: LegalPage["slug"]; label: string }> = [
  { slug: "terms", label: "Terms & Conditions" },
  { slug: "privacy", label: "Privacy Policy" },
  { slug: "about", label: "About Us" },
]

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const resp = (error as { response?: { data?: { message?: string } } }).response
    if (resp?.data?.message) return resp.data.message
  }
  if (error instanceof Error) return error.message
  return "Something went wrong"
}

export default function LegalPagesSettingsPage() {
  const [activeSlug, setActiveSlug] = useState<LegalPage["slug"]>("terms")

  const { data: pages, isLoading } = useQuery({
    queryKey: ["admin", "legal-pages"],
    queryFn: getLegalPages,
    staleTime: 30_000,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Legal Pages"
        subtitle="Edit Terms & Conditions, Privacy Policy, and About Us. Changes apply to the website and app immediately — no app release needed."
      />

      {isLoading || !pages ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeSlug} onValueChange={(v) => setActiveSlug(v as LegalPage["slug"])}>
          <TabsList>
            {PAGE_ORDER.map((p) => (
              <TabsTrigger key={p.slug} value={p.slug}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {PAGE_ORDER.map((p) => {
            const page = pages.find((x) => x.slug === p.slug)
            if (!page) return null
            return (
              <TabsContent key={p.slug} value={p.slug} className="mt-4">
                <LegalPageEditor page={page} />
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </div>
  )
}

function LegalPageEditor({ page }: { page: LegalPage }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(page.title)
  const [contentHtml, setContentHtml] = useState(page.content_html)
  const [mode, setMode] = useState<"edit" | "preview">("edit")

  // Reset the draft whenever the underlying page changes (e.g. switching
  // tabs, or a fresh fetch after save) — otherwise a stale draft from a
  // previous slug could leak into this editor's fields.
  useEffect(() => {
    setTitle(page.title)
    setContentHtml(page.content_html)
    setMode("edit")
  }, [page.slug, page.title, page.content_html])

  const dirty = title !== page.title || contentHtml !== page.content_html

  const updateMutation = useMutation({
    mutationFn: () => updateLegalPage(page.slug, { title, contentHtml }),
    onSuccess: () => {
      toast.success(`${page.title} saved`)
      queryClient.invalidateQueries({ queryKey: ["admin", "legal-pages"] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const validationError = useMemo(() => {
    if (!title.trim()) return "Title is required"
    if (!contentHtml.trim()) return "Content is required"
    return null
  }, [title, contentHtml])

  function handleSave() {
    if (validationError) {
      toast.error(validationError)
      return
    }
    updateMutation.mutate()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{page.title}</CardTitle>
            <CardDescription>
              Last saved:{" "}
              {new Date(page.updated_at).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={!dirty || updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save changes
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${page.slug}-title`}>Page title</Label>
          <Input
            id={`${page.slug}-title`}
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor={`${page.slug}-content`}>Content (HTML)</Label>
            <div className="flex items-center gap-1 rounded-md border p-0.5">
              <Button
                type="button"
                variant={mode === "edit" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setMode("edit")}
              >
                <Code2 className="mr-1 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                type="button"
                variant={mode === "preview" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                onClick={() => setMode("preview")}
              >
                <Eye className="mr-1 h-3.5 w-3.5" />
                Preview
              </Button>
            </div>
          </div>

          {mode === "edit" ? (
            <textarea
              id={`${page.slug}-content`}
              value={contentHtml}
              onChange={(e) => setContentHtml(e.target.value)}
              rows={20}
              spellCheck={false}
              className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="<p>Write the page content as HTML — headings (h2/h3), paragraphs, lists, links, bold/italic.</p>"
            />
          ) : (
            <div className="rounded-md border bg-muted/20 p-4">
              <div
                className="prose prose-sm max-w-none prose-a:text-primary"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Allowed tags: headings, paragraphs, lists, links, bold/italic. Scripts and
            other unsafe HTML are stripped automatically when you save.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
