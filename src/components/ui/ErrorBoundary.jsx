import { Component } from 'react'

/**
 * Lightweight ErrorBoundary — catches render errors in the subtree
 * and shows a non-blocking diagnostic instead of crashing the whole page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="mx-auto my-6 max-w-2xl rounded-xl border border-error-container bg-error-container/30 p-6 text-on-surface shadow-lw-sm">
        <div className="flex items-start gap-3">
          <span
            className="material-symbols-outlined mt-0.5 text-error"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            error
          </span>
          <div className="flex-1">
            <h2 className="font-sora text-lg font-semibold text-error">
              Đã có lỗi khi hiển thị trang này
            </h2>
            <p className="mt-1 text-sm text-on-surface">
              Vui lòng tải lại trang hoặc liên hệ quản trị viên nếu lỗi tiếp diễn.
            </p>
            <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-surface-container-lowest p-3 text-xs text-on-surface-variant">
              {String(error?.message ?? error)}
              {error?.stack ? `\n\n${error.stack.split('\n').slice(0, 6).join('\n')}` : ''}
            </pre>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-error px-4 py-2 text-sm font-semibold text-on-error transition-all hover:bg-error/90 active:scale-95"
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                refresh
              </span>
              Thử lại
            </button>
          </div>
        </div>
      </div>
    )
  }
}