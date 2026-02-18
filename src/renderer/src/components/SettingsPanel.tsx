import { useCallback, useEffect, useRef, useState } from 'react'
import type { LayoutPreset, PaneConfig, PaneTheme, Workspace } from '../../../shared/types'
import { THEME_PRESETS } from '../data/theme-presets'
import { applyPresetWithRemap, useStore } from '../store'
import { isValidCwd } from '../utils/validation'
import { FontPicker } from './FontPicker'
import { LayoutPicker } from './LayoutPicker'

/** Read the latest workspace from the store to avoid stale-snapshot races
 *  when multiple auto-persist effects fire in close succession. */
function getLatestWorkspace(wsId: string): Workspace | undefined {
	return useStore.getState().workspaces.find((w) => w.id === wsId)
}

interface CwdInputProps {
	value: string
	homeDir: string
	onChange: (resolved: string) => void
	'aria-label': string
}

function CwdInput({ value, homeDir, onChange, 'aria-label': ariaLabel }: CwdInputProps) {
	const [local, setLocal] = useState(value)
	const [invalid, setInvalid] = useState(false)

	// Sync local state when store value changes externally
	useEffect(() => {
		setLocal(value)
		setInvalid(false)
	}, [value])

	const commit = useCallback(() => {
		let trimmed = local.trim()
		// Resolve tilde to absolute path before validation
		if (trimmed === '~') trimmed = homeDir
		else if (trimmed.startsWith('~/')) trimmed = `${homeDir}${trimmed.slice(1)}`

		if (isValidCwd(trimmed)) {
			if (trimmed !== value) onChange(trimmed)
			setLocal(trimmed)
			setInvalid(false)
		} else {
			setInvalid(true)
		}
	}, [local, homeDir, value, onChange])

	return (
		<div className="flex flex-col flex-[2] gap-0.5">
			<input
				value={local}
				onChange={(e) => {
					setLocal(e.target.value)
					setInvalid(false)
				}}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === 'Enter') {
						e.currentTarget.blur()
					}
					if (e.key === 'Escape') {
						e.stopPropagation()
						setLocal(value)
						setInvalid(false)
					}
				}}
				className={`settings-input ${invalid ? '!border-danger' : ''}`}
				placeholder="Working directory"
				aria-label={ariaLabel}
				aria-invalid={invalid}
			/>
			{invalid && <span className="text-danger text-[10px]">Path must start with / or ~</span>}
		</div>
	)
}

interface SettingsPanelProps {
	workspace: Workspace
	onClose: () => void
}

export function SettingsPanel({ workspace, onClose }: SettingsPanelProps) {
	const updateWorkspace = useStore((s) => s.updateWorkspace)
	const removeWorkspace = useStore((s) => s.removeWorkspace)
	const updatePaneConfig = useStore((s) => s.updatePaneConfig)
	const killPtys = useStore((s) => s.killPtys)
	const homeDir = useStore((s) => s.homeDir)

	const [name, setName] = useState(workspace.name)
	const [color, setColor] = useState(workspace.color)
	const [bg, setBg] = useState(workspace.theme.background)
	const [fg, setFg] = useState(workspace.theme.foreground)
	const [fontSize, setFontSize] = useState(workspace.theme.fontSize)
	const [unfocusedDim, setUnfocusedDim] = useState(workspace.theme.unfocusedDim)
	const [fontFamily, setFontFamily] = useState(workspace.theme.fontFamily ?? '')

	const currentPreset = workspace.layout.type === 'preset' ? workspace.layout.preset : null

	const buildThemeFromInputs = useCallback(
		(): PaneTheme => ({
			background: bg,
			foreground: fg,
			fontSize,
			unfocusedDim,
			fontFamily: fontFamily || undefined,
		}),
		[bg, fg, fontSize, unfocusedDim, fontFamily],
	)

	// Auto-persist: save full workspace with updated color/theme whenever those fields change.
	// Reads latest workspace from store (not a ref) to avoid overwriting concurrent updates.
	const themeMountedRef = useRef(false)
	useEffect(() => {
		if (!themeMountedRef.current) {
			themeMountedRef.current = true
			return
		}
		const latest = getLatestWorkspace(workspace.id)
		if (!latest) return
		updateWorkspace({ ...latest, color, theme: buildThemeFromInputs() }).catch((err) => {
			console.error('[settings] auto-persist theme failed:', err)
		})
	}, [workspace.id, color, buildThemeFromInputs, updateWorkspace])

	// Auto-persist name with debounce to avoid excessive disk writes on every keystroke.
	const nameMountedRef = useRef(false)
	useEffect(() => {
		if (!nameMountedRef.current) {
			nameMountedRef.current = true
			return
		}
		const trimmed = name.trim()
		if (!trimmed) return
		const latest = getLatestWorkspace(workspace.id)
		if (!latest || trimmed === latest.name) return
		const timer = setTimeout(() => {
			const current = getLatestWorkspace(workspace.id)
			if (!current) return
			updateWorkspace({ ...current, name: trimmed }).catch((err) => {
				console.error('[settings] auto-persist name failed:', err)
			})
		}, 300)
		return () => clearTimeout(timer)
	}, [workspace.id, name, updateWorkspace])

	const handleLayoutChange = useCallback(
		(preset: LayoutPreset) => {
			const latest = getLatestWorkspace(workspace.id)
			if (!latest) return
			const { layout, panes, killedPaneIds } = applyPresetWithRemap(latest, preset, homeDir)
			if (killedPaneIds.length > 0) {
				killPtys(killedPaneIds)
			}
			updateWorkspace({ ...latest, layout, panes }).catch((err) => {
				console.error('[settings] layout change failed:', err)
			})
		},
		[workspace.id, updateWorkspace, killPtys, homeDir],
	)

	const handleDelete = useCallback(() => {
		if (!window.confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)) return
		removeWorkspace(workspace.id)
		onClose()
	}, [workspace.id, workspace.name, removeWorkspace, onClose])

	// Close on Escape key
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', handler)
		return () => document.removeEventListener('keydown', handler)
	}, [onClose])

	const handlePaneUpdate = useCallback(
		(paneId: string, updates: Partial<PaneConfig>) => {
			updatePaneConfig(workspace.id, paneId, updates)
		},
		[workspace.id, updatePaneConfig],
	)

	const handlePresetClick = useCallback((presetBg: string, presetFg: string) => {
		setBg(presetBg)
		setFg(presetFg)
	}, [])

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handled via document listener above
		<div
			role="presentation"
			className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]"
			onClick={onClose}
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
						onClick={onClose}
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
								maxLength={128}
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
						{/* Panes */}
						<span className="text-xs text-content-secondary mt-1">Panes</span>
						{Object.entries(workspace.panes).map(([paneId, pane]) => (
							<div key={paneId} className="flex gap-1.5">
								<input
									value={pane.label}
									onChange={(e) => handlePaneUpdate(paneId, { label: e.target.value })}
									className="settings-input flex-1"
									placeholder="Label"
									aria-label={`Pane ${pane.label} label`}
								/>
								<CwdInput
									value={pane.cwd}
									homeDir={homeDir}
									onChange={(cwd) => handlePaneUpdate(paneId, { cwd })}
									aria-label={`Pane ${pane.label} working directory`}
								/>
								<input
									value={pane.startupCommand || ''}
									onChange={(e) =>
										handlePaneUpdate(paneId, {
											startupCommand: e.target.value || null,
										})
									}
									className="settings-input flex-[2]"
									placeholder="Startup command"
									aria-label={`Pane ${pane.label} startup command`}
								/>
							</div>
						))}
					</div>
					{/* Theme */}
					<div className="flex flex-col gap-2">
						<span className="section-label">Terminal Theme</span>
						{/* Theme preset grid — name rendered in theme colors as preview */}
						<div className="grid grid-cols-4 gap-1.5">
							{THEME_PRESETS.map((preset) => {
								const isActive = bg === preset.background && fg === preset.foreground
								return (
									<button
										type="button"
										key={preset.name}
										onClick={() => handlePresetClick(preset.background, preset.foreground)}
										aria-pressed={isActive}
										className={`py-1.5 px-1 rounded-md cursor-pointer border text-center focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none ${
											isActive
												? 'border-accent ring-1 ring-accent'
												: 'border-transparent hover:border-content-muted'
										}`}
										title={preset.name}
										aria-label={preset.name}
										style={{ background: preset.background, color: preset.foreground }}
									>
										<span className="text-[11px] font-medium leading-tight block truncate">
											{preset.name}
										</span>
									</button>
								)
							})}
						</div>
						{/* Custom colors — BG and FG on same row */}
						<div className="flex items-center gap-4">
							<label className="flex items-center gap-2">
								<span className="text-xs text-content-secondary shrink-0">Background</span>
								<input
									type="color"
									value={bg}
									onChange={(e) => setBg(e.target.value)}
									className="bg-sunken border border-edge rounded-sm w-10 h-7 p-0.5 cursor-pointer"
								/>
							</label>
							<label className="flex items-center gap-2">
								<span className="text-xs text-content-secondary shrink-0">Foreground</span>
								<input
									type="color"
									value={fg}
									onChange={(e) => setFg(e.target.value)}
									className="bg-sunken border border-edge rounded-sm w-10 h-7 p-0.5 cursor-pointer"
								/>
							</label>
						</div>
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
							<span className="text-xs text-content tabular-nums w-5 text-center">{fontSize}</span>
							<button
								type="button"
								onClick={() => setFontSize((s) => Math.min(32, s + 1))}
								aria-label="Increase font size"
								className="bg-sunken border border-edge rounded-sm text-content cursor-pointer w-7 h-7 flex items-center justify-center hover:bg-overlay focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
							>
								+
							</button>
						</div>
						{/* Unfocused pane dimming */}
						<label className="flex items-center gap-2">
							<span className="text-xs text-content-secondary w-20 shrink-0">Dim unfocused</span>
							<input
								type="range"
								min={0}
								max={0.7}
								step={0.05}
								value={unfocusedDim}
								onChange={(e) => setUnfocusedDim(Number(e.target.value))}
								className="flex-1"
							/>
							<span className="text-[11px] text-content-muted w-7">
								{Math.round(unfocusedDim * 100)}%
							</span>
						</label>
					</div>
					{/* Layout */}
					<div className="flex flex-col gap-2">
						<LayoutPicker current={currentPreset} onSelect={handleLayoutChange} />
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
						onClick={onClose}
						className="bg-transparent border border-edge text-content-secondary cursor-pointer text-xs py-1.5 px-3 rounded-sm hover:text-content hover:border-content-muted focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
					>
						Done
					</button>
				</div>
			</div>
		</div>
	)
}
