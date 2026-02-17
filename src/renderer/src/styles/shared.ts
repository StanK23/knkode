export const contextMenuStyle: React.CSSProperties = {
	position: 'absolute',
	background: 'var(--bg-secondary)',
	border: '1px solid var(--border)',
	borderRadius: 'var(--radius)',
	padding: 4,
	zIndex: 100,
	minWidth: 160,
	boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
}

export const contextItemStyle: React.CSSProperties = {
	display: 'block',
	width: '100%',
	textAlign: 'left',
	background: 'none',
	border: 'none',
	color: 'var(--text-primary)',
	padding: '6px 12px',
	fontSize: 12,
	cursor: 'pointer',
	borderRadius: 'var(--radius-sm)',
}

export const contextSeparatorStyle: React.CSSProperties = {
	height: 1,
	background: 'var(--border)',
	margin: '4px 0',
}

export const sectionLabelStyle: React.CSSProperties = {
	fontSize: 11,
	color: 'var(--text-secondary)',
	textTransform: 'uppercase',
	letterSpacing: 1,
	fontWeight: 600,
}

export const editInputBaseStyle: React.CSSProperties = {
	background: 'var(--bg-secondary)',
	border: '1px solid var(--accent)',
	borderRadius: 'var(--radius-sm)',
	color: 'var(--text-primary)',
	padding: '1px 4px',
	outline: 'none',
	width: 80,
}

export const colorDotStyle: React.CSSProperties = {
	width: 8,
	height: 8,
	borderRadius: '50%',
	flexShrink: 0,
}
