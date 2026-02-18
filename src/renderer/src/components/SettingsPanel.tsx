import { useCallback, useEffect, useRef, useState } from 'react'
import type { LayoutPreset, PaneConfig, PaneTheme, Workspace } from '../../../shared/types'
import { THEME_PRESETS } from '../data/theme-presets'
import { createLayoutFromPreset, useStore } from '../store'
import { FontPicker } from './FontPicker'
import { LayoutPicker } from './LayoutPicker'

interface SettingsPanelProps {
	workspace: Workspace
	onClose: () => void
}

export function SettingsPanel({ workspace, onClose }: SettingsPanelProps) {
	const updateWorkspace = useStore((s) => s.updateWorkspace)
	const removeWorkspace = useStore((s) => s.removeWorkspace)
	const updatePaneConfig = useStore((s) => s.updatePaneConfig)
	const previewWorkspaceTheme = useStore((s) => s.previewWorkspaceTheme)
	const killPtys = useStore((s) => s.killPtys)
	const homeDir = useStore((s) => s.homeDir)

	const originalTheme = useRef<PaneTheme>({ ...workspace.theme })

	const [name, setName] = useState(workspace.name)
	const [color, setColor] = useState(workspace.color)
	const [bg, setBg] = useState(workspace.theme.background)
	const [fg, setFg] = useState(workspace.theme.foreground)
	const [fontSize, setFontSize] = useState(workspace.theme.fontSize)
	const [opacity, setOpacity] = useState(workspace.theme.opacity)
	const [fontFamily, setFontFamily] = useState(workspace.theme.fontFamily ?? '')

	const currentPreset = workspace.layout.type === 'preset' ? workspace.layout.preset : null

	const buildThemeFromInputs = useCallback(
		(): PaneTheme => ({
			background: bg,
			foreground: fg,
			fontSize,
			opacity,
			fontFamily: fontFamily || undefined,
		}),
		[bg, fg, fontSize, opacity, fontFamily],
	)

	// Live preview: push theme to store (without persisting to disk) on every field change.
	// Skip mount to avoid unnecessary store write with unchanged values.
	const mountedRef = useRef(false)
	useEffect(() => {
		if (!mountedRef.current) {
			mountedRef.current = true
			return
		}
		previewWorkspaceTheme(workspace.id, buildThemeFromInputs())
	}, [workspace.id, buildThemeFromInputs, previewWorkspaceTheme])

	const handleSave = useCallback(async () => {
		try {
			await updateWorkspace({
				...workspace,
				name: name.trim() || workspace.name,
				color,
				theme: buildThemeFromInputs(),
			})
			onClose()
		} catch (err) {
			console.error('[settings] Failed to save workspace:', err)
		}
	}, [workspace, name, color, buildThemeFromInputs, updateWorkspace, onClose])

	const handleCancel = useCallback(() => {
		previewWorkspaceTheme(workspace.id, originalTheme.current)
		onClose()
	}, [workspace.id, previewWorkspaceTheme, onClose])

	const handleLayoutChange = useCallback(
		(preset: LayoutPreset) => {
			killPtys(Object.keys(workspace.panes))
			const { layout, panes } = createLayoutFromPreset(preset, homeDir)
			updateWorkspace({
				...workspace,
				layout,
				panes,
			})
		},
		[workspace, updateWorkspace, killPtys, homeDir],
	)

	const handleDelete = useCallback(() => {
		if (!window.confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)) return
		removeWorkspace(workspace.id)
		onClose()
	}, [workspace.id, workspace.name, removeWorkspace, onClose])

	// Close on Escape key — cancel reverts theme
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') handleCancel()
		}
		document.addEventListener('keydown', handler)
		return () => document.removeEventListener('keydown', handler)
	}, [handleCancel])

	const handlePaneUpdate = useCallback(
		(paneId: string, updates: Partial<PaneConfig>) => {
			updatePaneConfig(workspace.id, paneId, updates)
		},
		[workspace.id, updatePaneConfig],
	)

	const handlePresetClick = (presetBg: string, presetFg: string) => {
		setBg(presetBg)
		setFg(presetFg)
	}

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handled via document listener above
		<div
			role="presentation"
			className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
			onClick={handleCancel}
		>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation only, keyboard handled by overlay */}
			{/* biome-ignore lint/a11y/useSemanticElements: native dialog has styling/focus-trap limitations in Electron */}
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Workspace Settings"
				className="bg-elevated border border-edge rounded-md w-[520px] max-h-[80vh] flex flex-col shadow-panel"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between px-5 py-4 border-b border-edge">
					<h2 className="text-base font-semibold">Workspace Settings</h2>
					<button
						type="button"
						onClick={handleCancel}
						aria-label="Close settings"
						className="bg-transparent border-none text-content-muted cursor-pointer text-sm hover:text-content focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
					>
						✕
					</button>
				</div>

				<div className="px-5 py-4 overflow-y-auto flex flex-col gap-5">
					{/* Name & Color */}
					<div className="flex flex-col gap-2">
						<span className="section-label">General</span>
						<label className="flex items-center gap-2">
							<span className="text-xs text-content-secondary w-20 shrink-0">Name</span>
							<input
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="settings-input"
							/>
						</label>
						<label className="flex items-center gap-2">
							<span className="text-xs text-content-secondary w-20 shrink-0">Color</span>
							<input
								type="color"
								value={color}
								onChange={(e) => setColor(e.target.value)}
								className="bg-sunken border border-edge rounded-sm w-10 h-7 p-0.5 cursor-pointer"
							/>
						</label>
					</div>
					{/* Theme */}
					<div className="flex flex-col gap-2">
						<span className="section-label">Terminal Theme</span>
						{/* Theme preset grid — each button is a fully themed card */}
						<div className="grid grid-cols-4 gap-1.5">
							{THEME_PRESETS.map((preset) => {
								const isActive = bg === preset.background && fg === preset.foreground
								return (
									<button
										type="button"
										key={preset.name}
										onClick={() => handlePresetClick(preset.background, preset.foreground)}
										className={`flex flex-col items-center gap-0.5 py-3 px-2 rounded-md cursor-pointer border focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none ${
											isActive
												? 'border-accent ring-1 ring-accent'
												: 'border-transparent hover:border-content-muted'
										}`}
										title={preset.name}
										aria-label={preset.name}
										style={{ background: preset.background, color: preset.foreground }}
									>
										<span className="text-sm font-semibold">Aa</span>
										<span className="text-[10px] opacity-70">{preset.name}</span>
									</button>
								)
							})}
						</div>
						{/* Custom colors */}
						<label className="flex items-center gap-2">
							<span className="text-xs text-content-secondary w-20 shrink-0">Background</span>
							<input
								type="color"
								value={bg}
								onChange={(e) => setBg(e.target.value)}
								className="bg-sunken border border-edge rounded-sm w-10 h-7 p-0.5 cursor-pointer"
							/>
						</label>
						<label className="flex items-center gap-2">
							<span className="text-xs text-content-secondary w-20 shrink-0">Foreground</span>
							<input
								type="color"
								value={fg}
								onChange={(e) => setFg(e.target.value)}
								className="bg-sunken border border-edge rounded-sm w-10 h-7 p-0.5 cursor-pointer"
							/>
						</label>
						{/* Font family — visual grid */}
						<span className="text-xs text-content-secondary">Font</span>
						<FontPicker value={fontFamily} onChange={setFontFamily} />
						{/* Font size */}
						<div className="flex items-center gap-2">
							<span className="text-xs text-content-secondary w-20 shrink-0">Font Size</span>
							<button
								type="button"
								onClick={() => setFontSize((s) => Math.max(8, s - 1))}
								aria-label="Decrease font size"
								className="bg-sunken border border-edge rounded-sm text-content cursor-pointer w-7 h-7 flex items-center justify-center hover:bg-overlay focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
							>
								-
							</button>
							<span className="text-xs text-content tabular-nums w-5 text-center">
								{fontSize}
							</span>
							<button
								type="button"
								onClick={() => setFontSize((s) => Math.min(32, s + 1))}
								aria-label="Increase font size"
								className="bg-sunken border border-edge rounded-sm text-content cursor-pointer w-7 h-7 flex items-center justify-center hover:bg-overlay focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
							>
								+
							</button>
						</div>
						{/* Opacity */}
						<label className="flex items-center gap-2">
							<span className="text-xs text-content-secondary w-20 shrink-0">Opacity</span>
							<input
								type="range"
								min={0.3}
								max={1}
								step={0.05}
								value={opacity}
								onChange={(e) => setOpacity(Number(e.target.value))}
								className="flex-1"
							/>
							<span className="text-[11px] text-content-muted w-7">
								{Math.round(opacity * 100)}%
							</span>
						</label>
					</div>
					{/* Layout */}
					<div className="flex flex-col gap-2">
						<LayoutPicker current={currentPreset} onSelect={handleLayoutChange} />
					</div>
					{/* Pane list */}
					<div className="flex flex-col gap-2">
						<span className="section-label">Panes</span>
						{Object.entries(workspace.panes).map(([paneId, pane]) => (
							<div key={paneId} className="flex gap-1.5">
								<input
									value={pane.label}
									onChange={(e) => handlePaneUpdate(paneId, { label: e.target.value })}
									className="settings-input flex-1"
									placeholder="Label"
									aria-label={`Pane ${pane.label} label`}
								/>
								<input
									value={pane.cwd}
									onChange={(e) => handlePaneUpdate(paneId, { cwd: e.target.value })}
									className="bg-sunken border border-edge rounded-sm text-content text-xs py-1 px-2 outline-none flex-[2] focus:border-accent"
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
									className="bg-sunken border border-edge rounded-sm text-content text-xs py-1 px-2 outline-none flex-[2] focus:border-accent"
									placeholder="Startup command"
									aria-label={`Pane ${pane.label} startup command`}
								/>
							</div>
						))}
					</div>
				</div>

				<div className="flex items-center gap-2 px-5 py-3 border-t border-edge">
					<button
						type="button"
						onClick={handleDelete}
						className="bg-transparent border border-danger text-danger cursor-pointer text-xs py-1.5 px-3 rounded-sm hover:bg-danger/10 focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
					>
						Delete Workspace
					</button>
					<div className="flex-1" />
					<button
						type="button"
						onClick={handleCancel}
						className="bg-transparent border border-edge text-content-secondary cursor-pointer text-xs py-1.5 px-3 rounded-sm hover:text-content hover:border-content-muted focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleSave}
						className="bg-accent border-none text-white cursor-pointer text-xs py-1.5 px-4 rounded-sm font-semibold hover:brightness-[1.1] focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none focus-visible:ring-offset-1 focus-visible:ring-offset-elevated"
					>
						Save
					</button>
				</div>
			</div>
		</div>
	)
}
