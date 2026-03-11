import type { RefObject } from 'react'
import type { PrInfo } from '../../../../shared/types'

/** Runtime theme colors available to every variant. */
export interface VariantTheme {
	background: string
	foreground: string
	accent: string
	glow?: string
}

/** Props passed to every StatusBar variant component. */
export interface StatusBarProps {
	label: string
	cwd: string
	branch: string | null
	/** PR associated with the current branch, or null if no open PR. */
	pr: PrInfo | null
	/** Open a URL in the user's default browser. */
	onOpenExternal: (url: string) => void
	isFocused: boolean
	canClose: boolean
	theme: VariantTheme
	onSplitVertical: () => void
	onSplitHorizontal: () => void
	onClose: () => void
	onDoubleClickLabel: () => void
	isEditing: boolean
	editInputProps: {
		ref: RefObject<HTMLInputElement | null>
		value: string
		onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
		onBlur: () => void
		onKeyDown: (e: React.KeyboardEvent) => void
	}
	SnippetTrigger: React.ComponentType<{
		className?: string
		style?: React.CSSProperties
		children?: React.ReactNode
	}>
	shortcuts: { splitV: string; splitH: string; close: string }
}

/** Props passed to every ScrollButton variant component. */
export interface ScrollButtonProps {
	onClick: () => void
	theme: VariantTheme
}

/** A complete pane chrome variant — one StatusBar + one ScrollButton. */
export interface PaneVariant {
	StatusBar: React.FC<StatusBarProps>
	ScrollButton: React.FC<ScrollButtonProps>
}
