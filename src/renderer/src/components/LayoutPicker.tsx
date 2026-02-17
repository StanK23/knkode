import type { LayoutPreset } from '../../../shared/types'
import { sectionLabelStyle } from '../styles/shared'

interface LayoutPickerProps {
	current: LayoutPreset | null
	onSelect: (preset: LayoutPreset) => void
}

const PRESETS: { value: LayoutPreset; label: string; icon: string }[] = [
	{ value: 'single', label: 'Single', icon: '█' },
	{ value: '2-column', label: '2 Columns', icon: '▌▐' },
	{ value: '2-row', label: '2 Rows', icon: '▀▄' },
	{ value: '3-panel-l', label: '3 Panel L', icon: '▌▝▗' },
	{ value: '3-panel-t', label: '3 Panel T', icon: '▀▝▗' },
	{ value: '2x2-grid', label: '2x2 Grid', icon: '▘▝▖▗' },
]

export function LayoutPicker({ current, onSelect }: LayoutPickerProps) {
	return (
		<div style={containerStyle}>
			<span style={sectionLabelStyle}>Layout</span>
			<div style={gridStyle}>
				{PRESETS.map((p) => (
					<button
						type="button"
						key={p.value}
						onClick={() => onSelect(p.value)}
						style={{
							...presetBtnStyle,
							borderColor: current === p.value ? 'var(--accent)' : 'var(--border)',
							background: current === p.value ? 'rgba(108, 99, 255, 0.15)' : 'var(--bg-tertiary)',
						}}
						title={p.label}
					>
						<span style={{ fontSize: 16, letterSpacing: 2 }}>{p.icon}</span>
						<span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{p.label}</span>
					</button>
				))}
			</div>
		</div>
	)
}

const containerStyle: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	gap: 8,
}

const gridStyle: React.CSSProperties = {
	display: 'grid',
	gridTemplateColumns: 'repeat(3, 1fr)',
	gap: 6,
}

const presetBtnStyle: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	alignItems: 'center',
	gap: 4,
	padding: '10px 8px',
	border: '1px solid var(--border)',
	borderRadius: 'var(--radius)',
	cursor: 'pointer',
	color: 'var(--text-primary)',
}
