"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  Banknote,
  ImageIcon,
  LayoutPanelTop,
  Loader2,
  Palette,
  Search,
  Sparkles,
  Store,
  TicketPercent,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ThemeColorPicker } from "@/components/themes/ThemeColorPicker"
import { ThemeGradientPicker } from "@/components/themes/ThemeGradientPicker"
import { ThemeImageUploader } from "@/components/themes/ThemeImageUploader"
import { ThemeSectionCard } from "@/components/themes/ThemeSectionCard"
import type {
  ABVariant,
  ThemeData,
  ThemeStoreKey,
  ThemeStatus,
} from "@/types/theme.types"

export const DEFAULT_THEME_DATA: ThemeData = {
  sections: {
    topBar: {
      backgroundColor: "#88D4FE",
      textColor: "#000000",
    },
    storeSelector: {
      backgroundColor: "#88D4FE",
      activeChipColor: "#B1EAFF",
    },
    categoryTabs: {
      visible: true,
      textColor: "#111827",
      indicatorColor: "#111827",
    },
    searchZone: {
      backgroundColor: "#B1EAFF",
      waveColor: "#88D4FE",
      searchHints: [
        "fresh vegetables",
        "Amul butter",
        "cold drinks",
        "snacks",
        "dishwash liquid",
        "Safai Abhiyaan products",
      ],
      promoBoxImageUrl: null,
    },
    bannerAnimation: {
      lottieUrl: null,
      backgroundGradient: ["#B1EAFF", "#A8E6FF"],
      containerColor: "#D8F4FF",
    },
    feeStrip: {
      imageUrl: null,
      visible: true,
    },
    seasonalMosaic: {
      containerColor: "#D8F4FF",
      heroTile: {
        title: "Summer\nCool Deals",
        gradient: ["#3F99FE", "#55C5FD"],
        badgeText: "BUY 2\nGET 1",
        badgeGradient: ["#FF4CB7", "#D91B83"],
      },
      miniTiles: [
        {
          title: "Frozen\nFizz",
          gradient: ["#3F99FE", "#55C5FD"],
          imageUrl: null,
        },
        {
          title: "Scoop\nMagic",
          gradient: ["#4F97FF", "#397BF1"],
          imageUrl: null,
        },
        {
          title: "Crunch\nBreak",
          gradient: ["#43A5FF", "#2E83F3"],
          imageUrl: null,
        },
        {
          title: "Dairy\nDaily",
          gradient: ["#5AA8FF", "#4283F3"],
          imageUrl: null,
        },
      ],
    },
    bankOffers: {
      visible: true,
      bannerImageUrls: [],
    },
  },
  meta: {
    seasonLabel: "Summer Sip & Scoop",
    statusBarBrightness: "light",
  },
}

export interface ThemeEditorMetaFields {
  tab_id: string | null
  store_key: ThemeStoreKey
  status: ThemeStatus
  scheduled_at: string | null
  expires_at: string | null
  ab_variant: ABVariant
  ab_split_percent: number
}

export interface ThemeEditorPayload extends ThemeEditorMetaFields {
  name: string
  theme_data: ThemeData
}

export interface ThemeEditorRenderProps {
  formData: ThemeEditorPayload
  updateField: <K extends keyof ThemeEditorPayload>(
    field: K,
    value: ThemeEditorPayload[K]
  ) => void
}

const DEFAULT_META_FIELDS: ThemeEditorMetaFields = {
  tab_id: null,
  store_key: "zepto",
  status: "draft",
  scheduled_at: null,
  expires_at: null,
  ab_variant: "A",
  ab_split_percent: 100,
}

export function cloneThemeData(data: ThemeData): ThemeData {
  return JSON.parse(JSON.stringify(data)) as ThemeData
}

function normalizeThemeData(data: ThemeData): ThemeData {
  const defaults = cloneThemeData(DEFAULT_THEME_DATA)
  const seasonalDefaults = defaults.sections.seasonalMosaic
  const seasonalData = data.sections?.seasonalMosaic

  return {
    ...defaults,
    ...data,
    sections: {
      ...defaults.sections,
      ...data.sections,
      topBar: {
        ...defaults.sections.topBar,
        ...data.sections?.topBar,
      },
      storeSelector: {
        ...defaults.sections.storeSelector,
        ...data.sections?.storeSelector,
      },
      categoryTabs: {
        ...defaults.sections.categoryTabs,
        ...data.sections?.categoryTabs,
      },
      searchZone: {
        ...defaults.sections.searchZone,
        ...data.sections?.searchZone,
        searchHints:
          data.sections?.searchZone?.searchHints ??
          defaults.sections.searchZone.searchHints,
      },
      bannerAnimation: {
        ...defaults.sections.bannerAnimation,
        ...data.sections?.bannerAnimation,
      },
      feeStrip: {
        ...defaults.sections.feeStrip,
        ...data.sections?.feeStrip,
      },
      seasonalMosaic: {
        ...seasonalDefaults,
        ...seasonalData,
        heroTile: {
          ...seasonalDefaults.heroTile,
          ...seasonalData?.heroTile,
        },
        miniTiles: seasonalDefaults.miniTiles.map((tile, index) => ({
          ...tile,
          ...(seasonalData?.miniTiles?.[index] ?? {}),
        })),
      },
      bankOffers: {
        ...defaults.sections.bankOffers,
        ...data.sections?.bankOffers,
        bannerImageUrls:
          data.sections?.bankOffers?.bannerImageUrls ??
          defaults.sections.bankOffers.bannerImageUrls,
      },
    },
    meta: {
      ...defaults.meta,
      ...data.meta,
    },
  }
}

function encodeBreaks(value: string) {
  return value.replace(/\n/g, "\\n")
}

function decodeBreaks(value: string) {
  return value.replace(/\\n/g, "\n")
}

function buildInitialFormData(
  initialName: string,
  initialData: ThemeData,
  initialMeta?: Partial<ThemeEditorMetaFields>
): ThemeEditorPayload {
  return {
    name: initialName,
    theme_data: normalizeThemeData(initialData),
    tab_id: initialMeta?.tab_id ?? DEFAULT_META_FIELDS.tab_id,
    store_key: initialMeta?.store_key ?? DEFAULT_META_FIELDS.store_key,
    status: initialMeta?.status ?? DEFAULT_META_FIELDS.status,
    scheduled_at:
      initialMeta?.scheduled_at ?? DEFAULT_META_FIELDS.scheduled_at,
    expires_at: initialMeta?.expires_at ?? DEFAULT_META_FIELDS.expires_at,
    ab_variant: initialMeta?.ab_variant ?? DEFAULT_META_FIELDS.ab_variant,
    ab_split_percent:
      initialMeta?.ab_split_percent ?? DEFAULT_META_FIELDS.ab_split_percent,
  }
}

interface ThemeEditorFormProps {
  mode: "create" | "edit"
  initialName: string
  initialData: ThemeData
  initialMeta?: Partial<ThemeEditorMetaFields>
  isSaving: boolean
  onSave: (payload: ThemeEditorPayload) => void
  renderBeforeSections?: (props: ThemeEditorRenderProps) => ReactNode
  renderSidebar?: (props: ThemeEditorRenderProps) => ReactNode
}

export function ThemeEditorForm({
  mode,
  initialName,
  initialData,
  initialMeta,
  isSaving,
  onSave,
  renderBeforeSections,
  renderSidebar,
}: ThemeEditorFormProps) {
  const [formData, setFormData] = useState<ThemeEditorPayload>(() =>
    buildInitialFormData(initialName, initialData, initialMeta)
  )

  useEffect(() => {
    setFormData(buildInitialFormData(initialName, initialData, initialMeta))
  }, [initialName, initialData, initialMeta])

  const updateField = <K extends keyof ThemeEditorPayload>(
    field: K,
    value: ThemeEditorPayload[K]
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const updateThemeData = (updater: (current: ThemeData) => ThemeData) => {
    setFormData((current) => ({
      ...current,
      theme_data: updater(current.theme_data),
    }))
  }

  const handleSave = () => {
    onSave({
      ...formData,
      name: formData.name.trim(),
      theme_data: {
        ...formData.theme_data,
        sections: {
          ...formData.theme_data.sections,
          searchZone: {
            ...formData.theme_data.sections.searchZone,
            searchHints: formData.theme_data.sections.searchZone.searchHints
              .map((hint) => hint.trim())
              .filter(Boolean),
          },
          bankOffers: {
            ...formData.theme_data.sections.bankOffers,
            bannerImageUrls:
              formData.theme_data.sections.bankOffers.bannerImageUrls
                .map((url) => url.trim())
                .filter(Boolean),
          },
        },
      },
    })
  }

  const themeData = formData.theme_data
  const renderProps: ThemeEditorRenderProps = {
    formData,
    updateField,
  }
  const sidebar = renderSidebar?.(renderProps)

  const formContent = (
    <div className="space-y-6">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Theme Basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="theme-name">Theme Name</Label>
            <Input
              id="theme-name"
              value={formData.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Summer 2026"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="season-label">Season Label</Label>
            <Input
              id="season-label"
              value={themeData.meta.seasonLabel}
              onChange={(event) =>
                updateThemeData((current) => ({
                  ...current,
                  meta: {
                    ...current.meta,
                    seasonLabel: event.target.value,
                  },
                }))
              }
              placeholder="Summer Sip & Scoop"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Status Bar Brightness</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={
                  themeData.meta.statusBarBrightness === "light"
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  updateThemeData((current) => ({
                    ...current,
                    meta: {
                      ...current.meta,
                      statusBarBrightness: "light",
                    },
                  }))
                }
              >
                Light
              </Button>
              <Button
                type="button"
                variant={
                  themeData.meta.statusBarBrightness === "dark"
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  updateThemeData((current) => ({
                    ...current,
                    meta: {
                      ...current.meta,
                      statusBarBrightness: "dark",
                    },
                  }))
                }
              >
                Dark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {renderBeforeSections?.(renderProps)}

      <ThemeSectionCard
        title="Top Bar"
        icon={<LayoutPanelTop className="h-5 w-5" />}
        defaultOpen
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ThemeColorPicker
            label="Background Color"
            value={themeData.sections.topBar.backgroundColor}
            onChange={(backgroundColor) =>
              updateThemeData((current) => ({
                ...current,
                sections: {
                  ...current.sections,
                  topBar: {
                    ...current.sections.topBar,
                    backgroundColor,
                  },
                },
              }))
            }
          />
          <ThemeColorPicker
            label="Text Color"
            value={themeData.sections.topBar.textColor}
            onChange={(textColor) =>
              updateThemeData((current) => ({
                ...current,
                sections: {
                  ...current.sections,
                  topBar: {
                    ...current.sections.topBar,
                    textColor,
                  },
                },
              }))
            }
          />
        </div>
      </ThemeSectionCard>

      <ThemeSectionCard
        title="Store Selector"
        icon={<Store className="h-5 w-5" />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ThemeColorPicker
            label="Background Color"
            value={themeData.sections.storeSelector.backgroundColor}
            onChange={(backgroundColor) =>
              updateThemeData((current) => ({
                ...current,
                sections: {
                  ...current.sections,
                  storeSelector: {
                    ...current.sections.storeSelector,
                    backgroundColor,
                  },
                },
              }))
            }
          />
          <ThemeColorPicker
            label="Active Chip Color"
            value={themeData.sections.storeSelector.activeChipColor}
            onChange={(activeChipColor) =>
              updateThemeData((current) => ({
                ...current,
                sections: {
                  ...current.sections,
                  storeSelector: {
                    ...current.sections.storeSelector,
                    activeChipColor,
                  },
                },
              }))
            }
          />
        </div>
      </ThemeSectionCard>

      <ThemeSectionCard
        title="Category Tabs"
        icon={<LayoutPanelTop className="h-5 w-5" />}
      >
        <div className="mb-4 flex items-center gap-3">
          <Switch
            checked={themeData.sections.categoryTabs.visible}
            onCheckedChange={(visible) =>
              updateThemeData((current) => ({
                ...current,
                sections: {
                  ...current.sections,
                  categoryTabs: {
                    ...current.sections.categoryTabs,
                    visible,
                  },
                },
              }))
            }
          />
          <Label>Visible</Label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ThemeColorPicker
            label="Text Color"
            value={themeData.sections.categoryTabs.textColor}
            onChange={(textColor) =>
              updateThemeData((current) => ({
                ...current,
                sections: {
                  ...current.sections,
                  categoryTabs: {
                    ...current.sections.categoryTabs,
                    textColor,
                  },
                },
              }))
            }
          />
          <ThemeColorPicker
            label="Indicator Color"
            value={themeData.sections.categoryTabs.indicatorColor}
            onChange={(indicatorColor) =>
              updateThemeData((current) => ({
                ...current,
                sections: {
                  ...current.sections,
                  categoryTabs: {
                    ...current.sections.categoryTabs,
                    indicatorColor,
                  },
                },
              }))
            }
          />
        </div>
      </ThemeSectionCard>

      <ThemeSectionCard
        title="Search Zone"
        icon={<Search className="h-5 w-5" />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ThemeColorPicker
            label="Background Color"
            value={themeData.sections.searchZone.backgroundColor}
            onChange={(backgroundColor) =>
              updateThemeData((current) => ({
                ...current,
                sections: {
                  ...current.sections,
                  searchZone: {
                    ...current.sections.searchZone,
                    backgroundColor,
                  },
                },
              }))
            }
          />
          <ThemeColorPicker
            label="Wave Color"
            value={themeData.sections.searchZone.waveColor}
            onChange={(waveColor) =>
              updateThemeData((current) => ({
                ...current,
                sections: {
                  ...current.sections,
                  searchZone: {
                    ...current.sections.searchZone,
                    waveColor,
                  },
                },
              }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="search-hints">Search Hints</Label>
          <Input
            id="search-hints"
            value={themeData.sections.searchZone.searchHints.join(", ")}
            onChange={(event) =>
              updateThemeData((current) => ({
                ...current,
                sections: {
                  ...current.sections,
                  searchZone: {
                    ...current.sections.searchZone,
                    searchHints: event.target.value
                      .split(",")
                      .map((hint) => hint.trim()),
                  },
                },
              }))
            }
            placeholder="fresh vegetables, snacks, cold drinks"
          />
          <p className="text-xs text-muted-foreground">
            Separate hints with commas.
          </p>
        </div>

        <ThemeImageUploader
          label="Promo Box Image"
          value={themeData.sections.searchZone.promoBoxImageUrl}
          onChange={(promoBoxImageUrl) =>
            updateThemeData((current) => ({
              ...current,
              sections: {
                ...current.sections,
                searchZone: {
                  ...current.sections.searchZone,
                  promoBoxImageUrl,
                },
              },
            }))
          }
        />
      </ThemeSectionCard>

      <ThemeSectionCard
        title="Banner Animation"
        icon={<Sparkles className="h-5 w-5" />}
      >
        <ThemeImageUploader
          label="Lottie Animation"
          value={themeData.sections.bannerAnimation.lottieUrl}
          onChange={(lottieUrl) =>
            updateThemeData((current) => ({
              ...current,
              sections: {
                ...current.sections,
                bannerAnimation: {
                  ...current.sections.bannerAnimation,
                  lottieUrl,
                },
              },
            }))
          }
          accept=".lottie,.json"
        />

        <ThemeGradientPicker
          label="Background Gradient"
          value={themeData.sections.bannerAnimation.backgroundGradient}
          onChange={(backgroundGradient) =>
            updateThemeData((current) => ({
              ...current,
              sections: {
                ...current.sections,
                bannerAnimation: {
                  ...current.sections.bannerAnimation,
                  backgroundGradient,
                },
              },
            }))
          }
        />

        <ThemeColorPicker
          label="Container Color"
          value={themeData.sections.bannerAnimation.containerColor}
          onChange={(containerColor) =>
            updateThemeData((current) => ({
              ...current,
              sections: {
                ...current.sections,
                bannerAnimation: {
                  ...current.sections.bannerAnimation,
                  containerColor,
                },
              },
            }))
          }
        />
      </ThemeSectionCard>

      <ThemeSectionCard
        title="Fee Strip"
        icon={<TicketPercent className="h-5 w-5" />}
      >
        <ThemeImageUploader
          label="Fee Strip Image"
          value={themeData.sections.feeStrip.imageUrl}
          onChange={(imageUrl) =>
            updateThemeData((current) => ({
              ...current,
              sections: {
                ...current.sections,
                feeStrip: {
                  ...current.sections.feeStrip,
                  imageUrl,
                },
              },
            }))
          }
        />

        <div className="flex items-center gap-3">
          <Switch
            checked={themeData.sections.feeStrip.visible}
            onCheckedChange={(visible) =>
              updateThemeData((current) => ({
                ...current,
                sections: {
                  ...current.sections,
                  feeStrip: {
                    ...current.sections.feeStrip,
                    visible,
                  },
                },
              }))
            }
          />
          <Label>Visible</Label>
        </div>
      </ThemeSectionCard>

      <ThemeSectionCard
        title="Seasonal Mosaic"
        icon={<Palette className="h-5 w-5" />}
      >
        <ThemeColorPicker
          label="Container Color"
          value={themeData.sections.seasonalMosaic.containerColor}
          onChange={(containerColor) =>
            updateThemeData((current) => ({
              ...current,
              sections: {
                ...current.sections,
                seasonalMosaic: {
                  ...current.sections.seasonalMosaic,
                  containerColor,
                },
              },
            }))
          }
        />

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Hero Tile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hero-title">Title</Label>
              <Textarea
                id="hero-title"
                value={themeData.sections.seasonalMosaic.heroTile.title}
                onChange={(event) =>
                  updateThemeData((current) => ({
                    ...current,
                    sections: {
                      ...current.sections,
                      seasonalMosaic: {
                        ...current.sections.seasonalMosaic,
                        heroTile: {
                          ...current.sections.seasonalMosaic.heroTile,
                          title: event.target.value,
                        },
                      },
                    },
                  }))
                }
                placeholder={"Summer\nCool Deals"}
              />
            </div>

            <ThemeGradientPicker
              label="Hero Gradient"
              value={themeData.sections.seasonalMosaic.heroTile.gradient}
              onChange={(gradient) =>
                updateThemeData((current) => ({
                  ...current,
                  sections: {
                    ...current.sections,
                    seasonalMosaic: {
                      ...current.sections.seasonalMosaic,
                      heroTile: {
                        ...current.sections.seasonalMosaic.heroTile,
                        gradient,
                      },
                    },
                  },
                }))
              }
            />

            <div className="space-y-2">
              <Label htmlFor="badge-text">Badge Text</Label>
              <Input
                id="badge-text"
                value={encodeBreaks(
                  themeData.sections.seasonalMosaic.heroTile.badgeText
                )}
                onChange={(event) =>
                  updateThemeData((current) => ({
                    ...current,
                    sections: {
                      ...current.sections,
                      seasonalMosaic: {
                        ...current.sections.seasonalMosaic,
                        heroTile: {
                          ...current.sections.seasonalMosaic.heroTile,
                          badgeText: decodeBreaks(event.target.value),
                        },
                      },
                    },
                  }))
                }
                placeholder="BUY 2\\nGET 1"
              />
            </div>

            <ThemeGradientPicker
              label="Badge Gradient"
              value={themeData.sections.seasonalMosaic.heroTile.badgeGradient}
              onChange={(badgeGradient) =>
                updateThemeData((current) => ({
                  ...current,
                  sections: {
                    ...current.sections,
                    seasonalMosaic: {
                      ...current.sections.seasonalMosaic,
                      heroTile: {
                        ...current.sections.seasonalMosaic.heroTile,
                        badgeGradient,
                      },
                    },
                  },
                }))
              }
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          {themeData.sections.seasonalMosaic.miniTiles.map((miniTile, index) => (
            <Card key={index} className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">
                  Mini Tile {index + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`mini-title-${index}`}>Title</Label>
                  <Input
                    id={`mini-title-${index}`}
                    value={encodeBreaks(miniTile.title)}
                    onChange={(event) =>
                      updateThemeData((current) => ({
                        ...current,
                        sections: {
                          ...current.sections,
                          seasonalMosaic: {
                            ...current.sections.seasonalMosaic,
                            miniTiles:
                              current.sections.seasonalMosaic.miniTiles.map(
                                (item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        title: decodeBreaks(event.target.value),
                                      }
                                    : item
                              ),
                          },
                        },
                      }))
                    }
                    placeholder="Frozen\\nFizz"
                  />
                </div>

                <ThemeGradientPicker
                  label="Gradient"
                  value={miniTile.gradient}
                  onChange={(gradient) =>
                    updateThemeData((current) => ({
                      ...current,
                      sections: {
                        ...current.sections,
                        seasonalMosaic: {
                          ...current.sections.seasonalMosaic,
                          miniTiles:
                            current.sections.seasonalMosaic.miniTiles.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      gradient,
                                    }
                                  : item
                            ),
                        },
                      },
                    }))
                  }
                />

                <ThemeImageUploader
                  label="Tile Image"
                  value={miniTile.imageUrl}
                  onChange={(imageUrl) =>
                    updateThemeData((current) => ({
                      ...current,
                      sections: {
                        ...current.sections,
                        seasonalMosaic: {
                          ...current.sections.seasonalMosaic,
                          miniTiles:
                            current.sections.seasonalMosaic.miniTiles.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      imageUrl,
                                    }
                                  : item
                            ),
                        },
                      },
                    }))
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </ThemeSectionCard>

      <ThemeSectionCard
        title="Bank Offers"
        icon={<Banknote className="h-5 w-5" />}
      >
        <div className="flex items-center gap-3">
          <Switch
            checked={themeData.sections.bankOffers.visible}
            onCheckedChange={(visible) =>
              updateThemeData((current) => ({
                ...current,
                sections: {
                  ...current.sections,
                  bankOffers: {
                    ...current.sections.bankOffers,
                    visible,
                  },
                },
              }))
            }
          />
          <Label>Visible</Label>
        </div>

        <div className="space-y-3">
          {themeData.sections.bankOffers.bannerImageUrls.map((imageUrl, index) => (
            <div key={index} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Banner Image {index + 1}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateThemeData((current) => ({
                      ...current,
                      sections: {
                        ...current.sections,
                        bankOffers: {
                          ...current.sections.bankOffers,
                          bannerImageUrls:
                            current.sections.bankOffers.bannerImageUrls.filter(
                              (_, itemIndex) => itemIndex !== index
                            ),
                        },
                      },
                    }))
                  }
                >
                  Remove Row
                </Button>
              </div>

              <ThemeImageUploader
                label={`Banner Image ${index + 1}`}
                value={imageUrl || null}
                onChange={(nextUrl) =>
                  updateThemeData((current) => ({
                    ...current,
                    sections: {
                      ...current.sections,
                      bankOffers: {
                        ...current.sections.bankOffers,
                        bannerImageUrls:
                          current.sections.bankOffers.bannerImageUrls.map(
                            (item, itemIndex) =>
                              itemIndex === index ? nextUrl ?? "" : item
                          ),
                      },
                    },
                  }))
                }
              />
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              updateThemeData((current) => ({
                ...current,
                sections: {
                  ...current.sections,
                  bankOffers: {
                    ...current.sections.bankOffers,
                    bannerImageUrls: [
                      ...current.sections.bankOffers.bannerImageUrls,
                      "",
                    ],
                  },
                },
              }))
            }
          >
            Add Banner Image
          </Button>
        </div>
      </ThemeSectionCard>

      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="outline">
          <Link href="/themes">Back to Themes</Link>
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !formData.name.trim()}
          className="sm:min-w-[160px]"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Theme
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "create" ? "Create Theme" : "Edit Theme"}
        subtitle={
          mode === "create"
            ? "Build a new seasonal homepage theme section by section."
            : "Update the theme configuration that controls the customer homepage."
        }
      />

      {sidebar ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <div>{formContent}</div>
          <div className="space-y-4">{sidebar}</div>
        </div>
      ) : (
        formContent
      )}
    </div>
  )
}
