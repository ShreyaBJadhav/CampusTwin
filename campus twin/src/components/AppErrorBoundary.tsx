import { Component, type ErrorInfo, type ReactNode } from 'react'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  error: Error | null
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Campus Twin render failed:', error, errorInfo.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main role="alert">
          <h1>Campus Twin could not render</h1>
          <pre>{this.state.error.message}</pre>
        </main>
      )
    }

    return this.props.children
  }
}
