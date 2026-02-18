import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
	children: ReactNode
}

interface State {
	hasError: boolean
	error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false, error: null }

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('[ErrorBoundary]', error, info.componentStack)
	}

	handleReload = () => {
		window.location.reload()
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex flex-col items-center justify-center h-full gap-4 p-8">
					<p className="text-danger text-sm font-semibold">Something went wrong</p>
					<p className="text-content-muted text-xs max-w-md text-center">
						{this.state.error?.message ?? 'An unexpected error occurred.'}
					</p>
					<button
						type="button"
						onClick={this.handleReload}
						className="bg-sunken border border-edge text-content text-xs py-1.5 px-4 rounded-sm cursor-pointer hover:bg-overlay focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
					>
						Reload
					</button>
				</div>
			)
		}
		return this.props.children
	}
}
