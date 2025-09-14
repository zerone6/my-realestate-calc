import React from 'react'

interface State { hasError: boolean; error?: Error; info?: React.ErrorInfo }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // 최소 로깅
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught', error, info)
    this.setState({ info })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, info: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 border border-red-300 bg-red-50 rounded">
          <h2 className="text-red-700 font-bold mb-2">화면 렌더링 중 오류가 발생했습니다.</h2>
          <p className="text-sm text-red-600 mb-2">{this.state.error?.message}</p>
          <button onClick={this.handleRetry} className="px-3 py-1 bg-red-600 text-white rounded text-sm">다시 시도</button>
          {this.state.info && (
            <pre className="mt-4 text-xs whitespace-pre-wrap max-h-48 overflow-auto bg-white p-2 border border-red-200 rounded">
{this.state.info.componentStack}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
