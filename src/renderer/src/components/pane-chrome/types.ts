import type { RefObject } from 'react'

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
	snippetDropdown: React.ReactNode
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
