import { useCallback, useState } from 'react'
import type { LayoutPreset, PaneConfig, Workspace } from '../../../shared/types'
import { createLayoutFromPreset, useStore } from '../store'
import { LayoutPicker } from './LayoutPicker'

interface SettingsPanelProps {
	workspace: Workspace
	onClose: () => void
}

export function SettingsPanel({ workspace, onClose }: SettingsPanelProps) {
	const updateWorkspace = useStore((s) => s.updateWorkspace)
	const removeWorkspace = useStore((s) => s.removeWorkspace)

	const [name, setName] = useState(workspace.name)
	const [color, setColor] = useState(workspace.color)
	const [bg, setBg] = useState(workspace.theme.background)
	const [fg, setFg] = useState(workspace.theme.foreground)
	const [fontSize, setFontSize] = useState(workspace.theme.fontSize)
	const [opacity, setOpacity] = useState(workspace.theme.opacity)

	const currentPreset = workspace.layout.type === 'preset' ? workspace.layout.preset : null

	const handleSave = useCallback(() => {
		updateWorkspace({
			...workspace,
			name: name.trim() || workspace.name,
			color,
			theme: { background: bg, foreground: fg, fontSize, opacity },
		})
		onClose()
	}, [workspace, name, color, bg, fg, fontSize, opacity, updateWorkspace, onClose])

	const handleLayoutChange = useCallback(
		(preset: LayoutPreset) => {
			const { layout, panes } = createLayoutFromPreset(preset)
			updateWorkspace({
				...workspace,
				layout,
				panes,
			})
		},
		[workspace, updateWorkspace],
	)

	const handleDelete = useCallback(() => {
		removeWorkspace(workspace.id)
		onClose()
	}, [workspace.id, removeWorkspace, onClose])

	const handlePaneUpdate = useCallback(
		(paneId: string, updates: Partial<PaneConfig>) => {
			const pane = workspace.panes[paneId]
			if (!pane) return
			updateWorkspace({
				...workspace,
				panes: {
					...workspace.panes,
					[paneId]: { ...pane, ...updates },
				},
			})
		},
		[workspace, updateWorkspace],
	)

	return (
		<div style={overlayStyle}>
			<div style={panelStyle}>
				<div style={headerStyle}>
					<h2 style={{ fontSize: 16, fontWeight: 600 }}>Workspace Settings</h2>
					<button type="button" onClick={onClose} style={closeBtnStyle}>
						✕
					</button>
				</div>

				<div style={bodyStyle}>
					{/* Name & Color */}
					<div style={sectionStyle}>
						<span style={sectionLabelStyle}>General</span>
						<label style={fieldRowStyle}>
							<span style={fieldLabelStyle}>Name</span>
							<input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
						</label>
						<label style={fieldRowStyle}>
							<span style={fieldLabelStyle}>Color</span>
							<input
								type="color"
								value={color}
								onChange={(e) => setColor(e.target.value)}
								style={{ ...inputStyle, width: 40, height: 28, padding: 2, cursor: 'pointer' }}
							/>
						</label>
					</div>

					{/* Theme */}
					<div style={sectionStyle}>
						<span style={sectionLabelStyle}>Terminal Theme</span>
						<label style={fieldRowStyle}>
							<span style={fieldLabelStyle}>Background</span>
							<input
								type="color"
								value={bg}
								onChange={(e) => setBg(e.target.value)}
								style={{ ...inputStyle, width: 40, height: 28, padding: 2, cursor: 'pointer' }}
							/>
						</label>
						<label style={fieldRowStyle}>
							<span style={fieldLabelStyle}>Foreground</span>
							<input
								type="color"
								value={fg}
								onChange={(e) => setFg(e.target.value)}
								style={{ ...inputStyle, width: 40, height: 28, padding: 2, cursor: 'pointer' }}
							/>
						</label>
						<label style={fieldRowStyle}>
							<span style={fieldLabelStyle}>Font Size</span>
							<input
								type="number"
								min={8}
								max={32}
								value={fontSize}
								onChange={(e) => setFontSize(Number(e.target.value))}
								style={{ ...inputStyle, width: 60 }}
							/>
						</label>
						<label style={fieldRowStyle}>
							<span style={fieldLabelStyle}>Opacity</span>
							<input
								type="range"
								min={0.3}
								max={1}
								step={0.05}
								value={opacity}
								onChange={(e) => setOpacity(Number(e.target.value))}
								style={{ flex: 1 }}
							/>
							<span style={{ fontSize: 11, color: 'var(--text-dim)', width: 30 }}>
								{Math.round(opacity * 100)}%
							</span>
						</label>
					</div>

					{/* Layout */}
					<div style={sectionStyle}>
						<LayoutPicker current={currentPreset} onSelect={handleLayoutChange} />
					</div>

					{/* Pane list */}
					<div style={sectionStyle}>
						<span style={sectionLabelStyle}>Panes</span>
						{Object.entries(workspace.panes).map(([paneId, pane]) => (
							<div key={paneId} style={paneRowStyle}>
								<input
									value={pane.label}
									onChange={(e) => handlePaneUpdate(paneId, { label: e.target.value })}
									style={{ ...inputStyle, flex: 1 }}
									placeholder="Label"
									aria-label={`Pane ${pane.label} label`}
								/>
								<input
									value={pane.cwd}
									onChange={(e) => handlePaneUpdate(paneId, { cwd: e.target.value })}
									style={{ ...inputStyle, flex: 2 }}
									placeholder="Working directory"
									aria-label={`Pane ${pane.label} working directory`}
								/>
								<input
									value={pane.startupCommand || ''}
									onChange={(e) =>
										handlePaneUpdate(paneId, {
											startupCommand: e.target.value || null,
										})
									}
									style={{ ...inputStyle, flex: 2 }}
									placeholder="Startup command"
									aria-label={`Pane ${pane.label} startup command`}
								/>
							</div>
						))}
					</div>
				</div>

				<div style={footerStyle}>
					<button type="button" onClick={handleDelete} style={deleteBtnStyle}>
						Delete Workspace
					</button>
					<div style={{ flex: 1 }} />
					<button type="button" onClick={onClose} style={cancelBtnStyle}>
						Cancel
					</button>
					<button type="button" onClick={handleSave} style={saveBtnStyle}>
						Save
					</button>
				</div>
			</div>
		</div>
	)
}

const overlayStyle: React.CSSProperties = {
	position: 'fixed',
	inset: 0,
	background: 'rgba(0, 0, 0, 0.6)',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	zIndex: 200,
}

const panelStyle: React.CSSProperties = {
	background: 'var(--bg-secondary)',
	border: '1px solid var(--border)',
	borderRadius: 'var(--radius)',
	width: 520,
	maxHeight: '80vh',
	display: 'flex',
	flexDirection: 'column',
	boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
}

const headerStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between',
	padding: '16px 20px',
	borderBottom: '1px solid var(--border)',
}

const closeBtnStyle: React.CSSProperties = {
	background: 'none',
	border: 'none',
	color: 'var(--text-dim)',
	cursor: 'pointer',
	fontSize: 14,
}

const bodyStyle: React.CSSProperties = {
	padding: '16px 20px',
	overflowY: 'auto',
	display: 'flex',
	flexDirection: 'column',
	gap: 20,
}

const sectionStyle: React.CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	gap: 8,
}

const sectionLabelStyle: React.CSSProperties = {
	fontSize: 11,
	color: 'var(--text-secondary)',
	textTransform: 'uppercase',
	letterSpacing: 1,
	fontWeight: 600,
}

const fieldRowStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: 8,
}

const fieldLabelStyle: React.CSSProperties = {
	fontSize: 12,
	color: 'var(--text-secondary)',
	width: 80,
	flexShrink: 0,
}

const inputStyle: React.CSSProperties = {
	background: 'var(--bg-tertiary)',
	border: '1px solid var(--border)',
	borderRadius: 'var(--radius-sm)',
	color: 'var(--text-primary)',
	fontSize: 12,
	padding: '4px 8px',
	outline: 'none',
}

const paneRowStyle: React.CSSProperties = {
	display: 'flex',
	gap: 6,
}

const footerStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: 8,
	padding: '12px 20px',
	borderTop: '1px solid var(--border)',
}

const deleteBtnStyle: React.CSSProperties = {
	background: 'none',
	border: '1px solid var(--danger)',
	color: 'var(--danger)',
	cursor: 'pointer',
	fontSize: 12,
	padding: '6px 12px',
	borderRadius: 'var(--radius-sm)',
}

const cancelBtnStyle: React.CSSProperties = {
	background: 'none',
	border: '1px solid var(--border)',
	color: 'var(--text-secondary)',
	cursor: 'pointer',
	fontSize: 12,
	padding: '6px 12px',
	borderRadius: 'var(--radius-sm)',
}

const saveBtnStyle: React.CSSProperties = {
	background: 'var(--accent)',
	border: 'none',
	color: '#fff',
	cursor: 'pointer',
	fontSize: 12,
	padding: '6px 16px',
	borderRadius: 'var(--radius-sm)',
	fontWeight: 600,
}
