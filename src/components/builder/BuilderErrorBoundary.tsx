"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  sectionType: string
  sectionId: string
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class BuilderErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[BuilderErrorBoundary] ${this.props.sectionType} (${this.props.sectionId}):`,
      error,
      info
    )
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <p className="text-xs font-medium text-amber-700">
            {this.props.sectionType} failed to render
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 rounded-lg text-xs"
            onClick={this.handleRetry}
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
