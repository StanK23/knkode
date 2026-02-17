import type { LayoutPreset } from '../../../shared/types'

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
		<div className="flex flex-col gap-2">
			<span className="section-label">Layout</span>
			<div className="grid grid-cols-3 gap-1.5">
				{PRESETS.map((p) => (
					<button
						type="button"
						key={p.value}
						onClick={() => onSelect(p.value)}
						className={`flex flex-col items-center gap-1 py-2.5 px-2 border rounded-md cursor-pointer text-content ${
							current === p.value
								? 'border-accent bg-accent/15'
								: 'border-edge bg-sunken hover:border-content-muted'
						}`}
						title={p.label}
					>
						<span className="text-base tracking-widest">{p.icon}</span>
						<span className="text-[10px] text-content-muted">{p.label}</span>
					</button>
				))}
			</div>
		</div>
	)
}
