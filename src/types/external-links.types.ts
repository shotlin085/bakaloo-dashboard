/**
 * Dashboard-configurable destination URLs — the Profile screen's
 * "Business Transaction" button and the Payments section's "Games"
 * button both open one of these in the app's in-app WebView. A blank
 * value means that button is hidden in the app.
 */
export interface ExternalLinksSettings {
  businessTransactionUrl: string
  gamesUrl: string
}

export type UpdateExternalLinksPayload = Partial<ExternalLinksSettings>
