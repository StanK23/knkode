import 'react'

declare module 'react' {
	interface CSSProperties {
		/** Electron-specific CSS property for frameless window drag regions */
		WebkitAppRegion?: 'drag' | 'no-drag'
	}
}
