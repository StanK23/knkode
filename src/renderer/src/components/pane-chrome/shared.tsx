/** Shared constants for pane-chrome variant components. */

/** Focus-visible ring applied to interactive elements in all variants. */
export const FOCUS_VIS = 'focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none'

/** Fallback accent color when no theme accent or preset accent is available. */
export const DEFAULT_ACCENT = '#888888'

/** Folder icon SVG used in several variant status bars. Pass className for opacity. */
export function FolderIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 16 16"
			fill="currentColor"
			aria-hidden="true"
			className={`w-3 h-3 shrink-0 ${className ?? ''}`}
		>
			<path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2c-.33-.44-.85-.7-1.4-.7Z" />
		</svg>
	)
}

/** Git branch icon SVG. */
export function GitIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 16 16"
			fill="currentColor"
			aria-hidden="true"
			className={`w-2.5 h-2.5 shrink-0 ${className ?? ''}`}
		>
			<path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.5 2.5 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Z" />
		</svg>
	)
}
