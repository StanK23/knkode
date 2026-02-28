import { useCallback, useEffect, useRef, useState } from 'react'
import {
	CURSOR_STYLES,
	DEFAULT_CURSOR_STYLE,
	DEFAULT_SCROLLBACK,
	type LayoutPreset,
	MAX_SCROLLBACK,
	MIN_SCROLLBACK,
	type PaneConfig,
	type PaneTheme,
	type Workspace,
	isCursorStyle,
} from '../../../shared/types'
import { THEME_PRESETS } from '../data/theme-presets'
import { applyPresetWithRemap, useStore } from '../store'
import { isMac } from '../utils/platform'
import { isValidCwd } from '../utils/validation'
import { FontPicker } from './FontPicker'
import { LayoutPicker } from './LayoutPicker'
import { SettingsSection } from './SettingsSection'

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
		<div className="flex flex-col flex-[2] min-w-0 gap-0.5">
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
				className={`settings-input w-full ${invalid ? '!border-danger' : ''}`}
				placeholder="Working directory"
				aria-label={ariaLabel}
				aria-invalid={invalid}
			/>
			{invalid && (
				<span className="text-danger text-[10px]">
					{isMac ? 'Path must start with / or ~' : 'Path must be absolute (e.g. C:\\)'}
				</span>
			)}
		</div>
	)
}

function SnippetsSection() {
	const snippets = useStore((s) => s.snippets)
	const addSnippet = useStore((s) => s.addSnippet)
	const updateSnippet = useStore((s) => s.updateSnippet)
	const removeSnippet = useStore((s) => s.removeSnippet)
	const reorderSnippets = useStore((s) => s.reorderSnippets)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editName, setEditName] = useState('')
	const [editCommand, setEditCommand] = useState('')
	const [isAdding, setIsAdding] = useState(false)
	const [newName, setNewName] = useState('')
	const [newCommand, setNewCommand] = useState('')
	const [dragFromIndex, setDragFromIndex] = useState<number | null>(null)
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
	const dragFromRef = useRef<number | null>(null)

	const startEdit = useCallback(
		(id: string) => {
			const s = snippets.find((sn) => sn.id === id)
			if (!s) return
			setEditingId(id)
			setEditName(s.name)
			setEditCommand(s.command)
		},
		[snippets],
	)

	const commitEdit = useCallback(() => {
		if (!editingId) return
		if (editName.trim() && editCommand.trim()) {
			updateSnippet(editingId, { name: editName.trim(), command: editCommand.trim() })
			setEditingId(null)
		}
	}, [editingId, editName, editCommand, updateSnippet])

	const commitAdd = useCallback(() => {
		if (newName.trim() && newCommand.trim()) {
			addSnippet(newName.trim(), newCommand.trim())
			setNewName('')
			setNewCommand('')
			setIsAdding(false)
		}
	}, [newName, newCommand, addSnippet])

	const resetDragState = useCallback(() => {
		setDragFromIndex(null)
		setDragOverIndex(null)
		dragFromRef.current = null
	}, [])

	const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
		e.dataTransfer.effectAllowed = 'move'
		setDragFromIndex(index)
		dragFromRef.current = index
	}, [])

	const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
		e.preventDefault()
		e.dataTransfer.dropEffect = 'move'
		setDragOverIndex((prev) => (prev === index ? prev : index))
	}, [])

	const handleDrop = useCallback(
		(index: number) => {
			const from = dragFromRef.current
			if (from !== null && from !== index) {
				reorderSnippets(from, index)
			}
			resetDragState()
		},
		[reorderSnippets, resetDragState],
	)

	return (
		<SettingsSection label="Commands" gap={8}>
			<span className="text-[10px] text-content-muted -mt-1 mb-1">
				Global snippets — available from the &gt;_ icon on any pane
			</span>
			{snippets.length === 0 && !isAdding && (
				<span className="text-[11px] text-content-muted italic">No snippets yet</span>
			)}
			{snippets.map((snippet, index) => (
				<div
					key={snippet.id}
					draggable={editingId !== snippet.id}
					onDragStart={(e) => handleDragStart(e, index)}
					onDragOver={(e) => handleDragOver(e, index)}
					onDrop={() => handleDrop(index)}
					onDragEnd={resetDragState}
					className={`flex items-center gap-1.5 rounded-sm transition-colors ${
						dragOverIndex === index && dragFromIndex !== null && dragFromIndex !== index
							? 'bg-accent/10'
							: ''
					} ${dragFromIndex === index ? 'opacity-40' : ''}`}
				>
					{editingId === snippet.id ? (
						<>
							<input
								value={editName}
								onChange={(e) => setEditName(e.target.value)}
								className="settings-input flex-1 min-w-0"
								placeholder="Name"
								aria-label="Snippet name"
								// biome-ignore lint/a11y/noAutofocus: intentional focus for inline edit
								autoFocus
								onKeyDown={(e) => {
									if (e.key === 'Enter') commitEdit()
									if (e.key === 'Escape') setEditingId(null)
								}}
							/>
							<input
								value={editCommand}
								onChange={(e) => setEditCommand(e.target.value)}
								className="settings-input flex-[2] min-w-0"
								placeholder="Command"
								aria-label="Snippet command"
								onKeyDown={(e) => {
									if (e.key === 'Enter') commitEdit()
									if (e.key === 'Escape') setEditingId(null)
								}}
							/>
							<button
								type="button"
								onClick={commitEdit}
								className="btn-ghost text-accent hover:brightness-125"
							>
								Save
							</button>
						</>
					) : (
						<>
							<span
								className="text-content-muted cursor-grab active:cursor-grabbing select-none shrink-0 text-xs"
								aria-label={`Drag to reorder ${snippet.name}`}
							>
								⠿
							</span>
							<span className="text-xs text-content font-medium w-24 truncate shrink-0">
								{snippet.name}
							</span>
							<span className="text-[11px] text-content-muted flex-1 truncate font-mono">
								{snippet.command}
							</span>
							<button
								type="button"
								onClick={() => startEdit(snippet.id)}
								className="btn-ghost text-content-muted hover:text-content"
								aria-label={`Edit ${snippet.name}`}
							>
								Edit
							</button>
							<button
								type="button"
								onClick={() => {
									if (window.confirm(`Delete snippet "${snippet.name}"?`)) removeSnippet(snippet.id)
								}}
								className="btn-ghost text-danger hover:brightness-125"
								aria-label={`Delete ${snippet.name}`}
							>
								Del
							</button>
						</>
					)}
				</div>
			))}
			{isAdding ? (
				<div className="flex items-center gap-1.5">
					<input
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						className="settings-input flex-1 min-w-0"
						placeholder="Name (e.g. Claude)"
						aria-label="New snippet name"
						// biome-ignore lint/a11y/noAutofocus: intentional focus for new snippet
						autoFocus
						onKeyDown={(e) => {
							if (e.key === 'Enter') commitAdd()
							if (e.key === 'Escape') setIsAdding(false)
						}}
					/>
					<input
						value={newCommand}
						onChange={(e) => setNewCommand(e.target.value)}
						className="settings-input flex-[2] min-w-0"
						placeholder="Command (e.g. claude --dangerously-skip-permissions)"
						aria-label="New snippet command"
						onKeyDown={(e) => {
							if (e.key === 'Enter') commitAdd()
							if (e.key === 'Escape') setIsAdding(false)
						}}
					/>
					<button
						type="button"
						onClick={commitAdd}
						className="btn-ghost text-accent hover:brightness-125"
					>
						Add
					</button>
				</div>
			) : (
				<button
					type="button"
					onClick={() => setIsAdding(true)}
					className="bg-transparent border border-edge text-content-secondary cursor-pointer text-xs py-1 px-3 rounded-sm hover:text-content hover:border-content-muted focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none self-start"
				>
					+ Add Snippet
				</button>
			)}
		</SettingsSection>
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
	const [scrollback, setScrollback] = useState(workspace.theme.scrollback ?? DEFAULT_SCROLLBACK)
	const [cursorStyle, setCursorStyle] = useState(
		workspace.theme.cursorStyle ?? DEFAULT_CURSOR_STYLE,
	)

	const currentPreset = workspace.layout.type === 'preset' ? workspace.layout.preset : null

	const buildThemeFromInputs = useCallback(
		(): PaneTheme => ({
			background: bg,
			foreground: fg,
			fontSize,
			unfocusedDim,
			fontFamily: fontFamily || undefined,
			scrollback,
			cursorStyle,
		}),
		[bg, fg, fontSize, unfocusedDim, fontFamily, scrollback, cursorStyle],
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
				className="bg-canvas/80 backdrop-blur-2xl border border-edge/50 rounded-md w-[600px] max-w-[calc(100vw-2rem)] max-h-[85vh] flex flex-col shadow-panel animate-panel-in"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between px-6 py-4 border-b border-edge/50">
					<h2 className="text-sm font-semibold tracking-wide">Workspace Settings</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close settings"
						className="bg-transparent border-none text-content-muted cursor-pointer text-sm hover:text-content focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
					>
						✕
					</button>
				</div>

				<div className="px-6 py-6 overflow-y-auto overflow-x-hidden flex flex-col gap-8">
					{/* General */}
					<SettingsSection label="General">
						<label className="flex items-center gap-3">
							<span className="text-xs text-content-secondary w-16 shrink-0">Name</span>
							<input
								value={name}
								onChange={(e) => setName(e.target.value)}
								maxLength={128}
								className="settings-input flex-1 min-w-0"
							/>
						</label>
						<label className="flex items-center gap-3">
							<span className="text-xs text-content-secondary w-16 shrink-0">Color</span>
							<input
								type="color"
								value={color}
								onChange={(e) => setColor(e.target.value)}
								className="color-swatch"
							/>
						</label>
					</SettingsSection>
					{/* Panes */}
					<SettingsSection label="Panes" gap={8}>
						{Object.entries(workspace.panes).map(([paneId, pane]) => (
							<div key={paneId} className="flex gap-1.5">
								<input
									value={pane.label}
									onChange={(e) => handlePaneUpdate(paneId, { label: e.target.value })}
									className="settings-input w-24 shrink-0"
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
									className="settings-input flex-[2] min-w-0"
									placeholder="Startup command"
									aria-label={`Pane ${pane.label} startup command`}
								/>
							</div>
						))}
					</SettingsSection>
					{/* Terminal */}
					<SettingsSection label="Terminal" gap={16}>
						{/* Theme preset grid — each name is rendered in its own theme colors as a live preview */}
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

						<div className="flex flex-col gap-3">
							{/* Custom colors */}
							<div className="flex items-center gap-4">
								<label className="flex items-center gap-2">
									<span className="text-xs text-content-secondary shrink-0">Background</span>
									<input
										type="color"
										value={bg}
										onChange={(e) => setBg(e.target.value)}
										className="color-swatch"
									/>
								</label>
								<label className="flex items-center gap-2">
									<span className="text-xs text-content-secondary shrink-0">Foreground</span>
									<input
										type="color"
										value={fg}
										onChange={(e) => setFg(e.target.value)}
										className="color-swatch"
									/>
								</label>
							</div>

							{/* Font settings */}
							<div className="flex items-center gap-3">
								<span className="text-xs text-content-secondary w-20 shrink-0">Font</span>
								<div className="flex-1 min-w-0">
									<FontPicker value={fontFamily} onChange={setFontFamily} />
								</div>
							</div>

							<div className="flex items-center gap-3">
								<span className="text-xs text-content-secondary w-20 shrink-0">Size</span>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setFontSize((s) => Math.max(8, s - 1))}
										aria-label="Decrease font size"
										className="stepper-btn"
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
										className="stepper-btn"
									>
										+
									</button>
								</div>
							</div>

							{/* Behavior */}
							<label className="flex items-center gap-3">
								<span className="text-xs text-content-secondary w-20 shrink-0">Dim unfocused</span>
								<input
									type="range"
									min={0}
									max={0.7}
									step={0.05}
									value={unfocusedDim}
									onChange={(e) => setUnfocusedDim(Number(e.target.value))}
									className="w-32"
								/>
								<span className="text-[11px] text-content-muted w-7">
									{Math.round(unfocusedDim * 100)}%
								</span>
							</label>

							<label className="flex items-center gap-3">
								<span className="text-xs text-content-secondary w-20 shrink-0">Cursor</span>
								<select
									value={cursorStyle}
									onChange={(e) => {
										if (isCursorStyle(e.target.value)) setCursorStyle(e.target.value)
									}}
									className="settings-input w-32"
								>
									{CURSOR_STYLES.map((s) => (
										<option key={s} value={s}>
											{s[0].toUpperCase() + s.slice(1)}
										</option>
									))}
								</select>
							</label>

							<label className="flex items-center gap-3">
								<span className="text-xs text-content-secondary w-20 shrink-0">Scrollback</span>
								<input
									type="number"
									min={MIN_SCROLLBACK}
									max={MAX_SCROLLBACK}
									step={500}
									value={scrollback}
									onChange={(e) => {
										const n = Number(e.target.value)
										if (!Number.isFinite(n)) return
										setScrollback(Math.max(MIN_SCROLLBACK, Math.min(MAX_SCROLLBACK, n)))
									}}
									className="settings-input w-24"
								/>
								<span className="text-[11px] text-content-muted">lines</span>
							</label>
						</div>
					</SettingsSection>
					{/* Layout */}
					<LayoutPicker current={currentPreset} onSelect={handleLayoutChange} />
					{/* Snippets */}
					<SnippetsSection />
				</div>

				<div className="flex items-center gap-2 px-6 py-3 border-t border-edge/50">
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
