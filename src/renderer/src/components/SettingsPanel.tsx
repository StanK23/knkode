import { useCallback, useEffect, useRef, useState } from 'react'
import {
	CURSOR_STYLES,
	DEFAULT_CURSOR_STYLE,
	DEFAULT_PANE_OPACITY,
	DEFAULT_SCROLLBACK,
	EFFECT_LEVELS,
	type EffectLevel,
	type LayoutPreset,
	MAX_SCROLLBACK,
	MIN_SCROLLBACK,
	type PaneConfig,
	type PaneTheme,
	type Workspace,
	isCursorStyle,
	isEffectLevel,
} from '../../../shared/types'
import {
	DEFAULT_PRESET_NAME,
	THEME_PRESETS,
	type ThemePreset,
	findPreset,
} from '../data/theme-presets'
import { applyPresetWithRemap, useStore } from '../store'
import { hexToRgba } from '../utils/colors'
import { isMac } from '../utils/platform'
import { isValidCwd } from '../utils/validation'
import { FontPicker } from './FontPicker'
import { LayoutPicker } from './LayoutPicker'
import { SettingsSection } from './SettingsSection'

/** Numeric values for the EffectLevel-based dim and opacity controls. */
const DIM_VALUES: Record<EffectLevel, number> = { off: 0, subtle: 0.15, medium: 0.3, intense: 0.5 }
const OPACITY_VALUES: Record<EffectLevel, number> = {
	off: 1.0,
	subtle: 0.85,
	medium: 0.7,
	intense: 0.5,
}

/** Find the closest EffectLevel key for a numeric value. */
function closestLevel(value: number, map: Record<EffectLevel, number>): EffectLevel {
	let best: EffectLevel = 'off'
	let bestDist = Number.POSITIVE_INFINITY
	for (const [level, num] of Object.entries(map)) {
		const dist = Math.abs(value - num)
		if (dist < bestDist) {
			bestDist = dist
			best = level as EffectLevel
		}
	}
	return best
}

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
	const [liveMessage, setLiveMessage] = useState('')

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
		e.dataTransfer.setData('text/plain', '')
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
				const name = snippets[from]?.name ?? 'Snippet'
				setLiveMessage(`Moved ${name} to position ${index + 1}`)
			}
			resetDragState()
		},
		[reorderSnippets, resetDragState, snippets],
	)

	const handleKeyboardReorder = useCallback(
		(e: React.KeyboardEvent, index: number) => {
			if (!e.altKey) return
			if (e.key === 'ArrowUp' && index > 0) {
				e.preventDefault()
				reorderSnippets(index, index - 1)
				const name = snippets[index]?.name ?? 'Snippet'
				setLiveMessage(`Moved ${name} to position ${index}`)
			} else if (e.key === 'ArrowDown' && index < snippets.length - 1) {
				e.preventDefault()
				reorderSnippets(index, index + 1)
				const name = snippets[index]?.name ?? 'Snippet'
				setLiveMessage(`Moved ${name} to position ${index + 2}`)
			}
		},
		[reorderSnippets, snippets],
	)

	return (
		<SettingsSection label="Commands" gap={8}>
			<span className="text-[10px] text-content-muted -mt-1 mb-1">
				Global snippets — available from the &gt;_ icon on any pane
			</span>
			{snippets.length === 0 && !isAdding && (
				<span className="text-[11px] text-content-muted italic">No snippets yet</span>
			)}
			{snippets.map((snippet, index) => {
				const isDropTarget =
					dragOverIndex === index && dragFromIndex !== null && dragFromIndex !== index
				const isDragSource = dragFromIndex === index
				const isEditing = editingId === snippet.id
				const showHandle = !isEditing && snippets.length > 1

				return (
					<div
						key={snippet.id}
						draggable={!isEditing}
						onDragStart={(e) => handleDragStart(e, index)}
						onDragOver={(e) => handleDragOver(e, index)}
						onDrop={() => handleDrop(index)}
						onDragEnd={resetDragState}
						aria-roledescription="reorderable snippet"
						className={`flex items-center gap-1.5 rounded-sm transition-colors ${isDropTarget ? 'bg-accent/10' : ''} ${isDragSource ? 'opacity-40' : ''}`}
					>
						{isEditing ? (
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
								{showHandle ? (
									<button
										type="button"
										className="bg-transparent border-none text-content-muted cursor-grab active:cursor-grabbing select-none shrink-0 text-xs p-0 focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none rounded-sm"
										aria-label={`Reorder ${snippet.name}, item ${index + 1} of ${snippets.length}. Use Alt+Arrow keys`}
										onKeyDown={(e) => handleKeyboardReorder(e, index)}
									>
										⠿
									</button>
								) : (
									<span className="w-3 shrink-0" />
								)}
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
										if (window.confirm(`Delete snippet "${snippet.name}"?`))
											removeSnippet(snippet.id)
									}}
									className="btn-ghost text-danger hover:brightness-125"
									aria-label={`Delete ${snippet.name}`}
								>
									Del
								</button>
							</>
						)}
					</div>
				)
			})}
			<span className="sr-only" aria-live="polite">
				{liveMessage}
			</span>
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

interface SegmentedButtonProps<T extends string> {
	options: readonly T[]
	value: T
	onChange: (value: T) => void
	label: string
}

function SegmentedButton<T extends string>({
	options,
	value,
	onChange,
	label,
}: SegmentedButtonProps<T>) {
	return (
		<div className="flex items-center gap-3">
			<span className="text-xs text-content-secondary w-20 shrink-0">{label}</span>
			<div
				className="flex rounded-sm overflow-hidden border border-edge"
				role="radiogroup"
				aria-label={label}
				onKeyDown={(e) => {
					if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
					e.preventDefault()
					const idx = options.indexOf(value)
					const next =
						e.key === 'ArrowRight'
							? options[(idx + 1) % options.length]
							: options[(idx - 1 + options.length) % options.length]
					onChange(next)
					const el = e.currentTarget.querySelector(`[data-value="${next}"]`)
					if (el instanceof HTMLElement) el.focus()
				}}
			>
				{options.map((option) => (
					<button
						key={option}
						type="button"
						role="radio"
						aria-checked={value === option}
						tabIndex={value === option ? 0 : -1}
						data-value={option}
						onClick={() => onChange(option)}
						className={`text-[11px] px-2.5 py-1 cursor-pointer border-none transition-colors ${
							value === option
								? 'bg-accent/20 text-accent font-medium'
								: 'bg-transparent text-content-muted hover:text-content-secondary'
						}`}
					>
						{option.charAt(0).toUpperCase() + option.slice(1)}
					</button>
				))}
			</div>
		</div>
	)
}

interface SettingsPanelProps {
	workspace: Workspace
	onClose: () => void
}

const SETTINGS_TABS = ['Workspace', 'Terminal'] as const
type SettingsTab = (typeof SETTINGS_TABS)[number]

export function SettingsPanel({ workspace, onClose }: SettingsPanelProps) {
	const updateWorkspace = useStore((s) => s.updateWorkspace)
	const removeWorkspace = useStore((s) => s.removeWorkspace)
	const updatePaneConfig = useStore((s) => s.updatePaneConfig)
	const killPtys = useStore((s) => s.killPtys)
	const homeDir = useStore((s) => s.homeDir)

	const [activeTab, setActiveTab] = useState<SettingsTab>('Workspace')
	const [name, setName] = useState(workspace.name)
	const [color, setColor] = useState(workspace.color)
	const [selectedPreset, setSelectedPreset] = useState(
		workspace.theme.preset ?? DEFAULT_PRESET_NAME,
	)
	const [fontSize, setFontSize] = useState(workspace.theme.fontSize)
	const [fontFamily, setFontFamily] = useState(workspace.theme.fontFamily ?? '')
	const [scrollback, setScrollback] = useState(workspace.theme.scrollback ?? DEFAULT_SCROLLBACK)
	const [cursorStyle, setCursorStyle] = useState(
		workspace.theme.cursorStyle ?? DEFAULT_CURSOR_STYLE,
	)
	const [dimLevel, setDimLevel] = useState<EffectLevel>(
		closestLevel(workspace.theme.unfocusedDim, DIM_VALUES),
	)
	const [opacityLevel, setOpacityLevel] = useState<EffectLevel>(
		closestLevel(workspace.theme.paneOpacity ?? DEFAULT_PANE_OPACITY, OPACITY_VALUES),
	)
	const [gradientLevel, setGradientLevel] = useState<EffectLevel>(
		isEffectLevel(workspace.theme.gradientLevel) ? workspace.theme.gradientLevel : 'off',
	)
	const [glowLevel, setGlowLevel] = useState<EffectLevel>(
		isEffectLevel(workspace.theme.glowLevel) ? workspace.theme.glowLevel : 'off',
	)
	const [scanlineLevel, setScanlineLevel] = useState<EffectLevel>(
		isEffectLevel(workspace.theme.scanlineLevel) ? workspace.theme.scanlineLevel : 'off',
	)

	const currentPreset = workspace.layout.type === 'preset' ? workspace.layout.preset : null

	const buildThemeFromInputs = useCallback((): PaneTheme => {
		const preset = findPreset(selectedPreset)
		if (!preset) console.warn('[settings] unknown theme preset:', selectedPreset)
		return {
			background: preset?.background ?? '#1a1a2e',
			foreground: preset?.foreground ?? '#e0e0e0',
			fontSize,
			unfocusedDim: DIM_VALUES[dimLevel],
			fontFamily: fontFamily || undefined,
			scrollback,
			cursorStyle,
			paneOpacity: OPACITY_VALUES[opacityLevel],
			ansiColors: preset?.ansiColors,
			accent: preset?.accent,
			glow: preset?.glow,
			gradient: preset?.gradient,
			gradientLevel,
			glowLevel,
			scanlineLevel,
			preset: selectedPreset,
		}
	}, [
		selectedPreset,
		fontSize,
		dimLevel,
		fontFamily,
		scrollback,
		cursorStyle,
		opacityLevel,
		gradientLevel,
		glowLevel,
		scanlineLevel,
	])

	// Auto-persist: save full workspace with updated color/theme whenever those fields change.
	// Reads latest workspace from store (not the prop) to avoid overwriting concurrent updates.
	// Uses value-comparison ref instead of useRef(false) mount guard — the boolean flag
	// breaks under React 18 StrictMode which double-fires effects on mount.
	const prevAutoSaveRef = useRef({ color, buildThemeFromInputs })
	useEffect(() => {
		if (
			prevAutoSaveRef.current.color === color &&
			prevAutoSaveRef.current.buildThemeFromInputs === buildThemeFromInputs
		) {
			return
		}
		prevAutoSaveRef.current = { color, buildThemeFromInputs }
		const latest = getLatestWorkspace(workspace.id)
		if (!latest) return
		updateWorkspace({ ...latest, color, theme: buildThemeFromInputs() }).catch((err) => {
			console.error('[settings] auto-persist theme failed:', err)
		})
	}, [workspace.id, color, buildThemeFromInputs, updateWorkspace])

	// Reset effect levels to preset defaults when the user switches presets.
	// Uses value-comparison ref instead of useRef(false) mount guard — the boolean
	// flag breaks under React 18 StrictMode which double-fires effects on mount.
	const prevPresetRef = useRef(selectedPreset)
	useEffect(() => {
		if (prevPresetRef.current === selectedPreset) return
		prevPresetRef.current = selectedPreset
		const preset = findPreset(selectedPreset)
		setGradientLevel(preset?.gradientLevel ?? 'off')
		setGlowLevel(preset?.glowLevel ?? 'off')
		setScanlineLevel(preset?.scanlineLevel ?? 'off')
	}, [selectedPreset])

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
				className="bg-canvas/80 backdrop-blur-2xl border border-edge/50 rounded-md w-[600px] max-w-[calc(100vw-2rem)] min-h-[50vh] max-h-[85vh] flex flex-col shadow-panel animate-panel-in"
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

				{/* Tab bar — WAI-ARIA tabs pattern with arrow-key navigation */}
				<div className="flex px-6 border-b border-edge/50" role="tablist" aria-label="Settings">
					{SETTINGS_TABS.map((tab) => (
						<button
							key={tab}
							id={`settings-tab-${tab}`}
							type="button"
							role="tab"
							aria-selected={activeTab === tab}
							aria-controls={`settings-tabpanel-${tab}`}
							tabIndex={activeTab === tab ? 0 : -1}
							onClick={() => setActiveTab(tab)}
							onKeyDown={(e) => {
								const idx = SETTINGS_TABS.indexOf(tab)
								if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
									e.preventDefault()
									const next =
										e.key === 'ArrowRight'
											? SETTINGS_TABS[(idx + 1) % SETTINGS_TABS.length]
											: SETTINGS_TABS[(idx - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length]
									setActiveTab(next)
									document.getElementById(`settings-tab-${next}`)?.focus()
								}
							}}
							className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer bg-transparent ${
								activeTab === tab
									? 'border-accent text-content'
									: 'border-transparent text-content-muted hover:text-content-secondary'
							}`}
						>
							{tab}
						</button>
					))}
				</div>

				{/* Workspace tab panel */}
				<div
					id="settings-tabpanel-Workspace"
					role="tabpanel"
					aria-labelledby="settings-tab-Workspace"
					hidden={activeTab !== 'Workspace'}
					className="px-6 py-6 overflow-y-auto overflow-x-hidden flex flex-col gap-8"
				>
					<>
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
						{/* Layout */}
						<LayoutPicker current={currentPreset} onSelect={handleLayoutChange} />
						{/* Snippets */}
						<SnippetsSection />
					</>
				</div>

				{/* Terminal tab panel */}
				<div
					id="settings-tabpanel-Terminal"
					role="tabpanel"
					aria-labelledby="settings-tab-Terminal"
					hidden={activeTab !== 'Terminal'}
					className="px-6 py-6 overflow-y-auto overflow-x-hidden flex flex-col gap-8"
				>
					<>
						{/* Theme */}
						<SettingsSection label="Theme" gap={16}>
							<div
								className="grid grid-cols-4 gap-1.5"
								role="radiogroup"
								aria-label="Theme presets"
								onKeyDown={(e) => {
									if (
										e.key !== 'ArrowRight' &&
										e.key !== 'ArrowLeft' &&
										e.key !== 'ArrowDown' &&
										e.key !== 'ArrowUp'
									)
										return
									e.preventDefault()
									const idx = THEME_PRESETS.findIndex((p) => p.name === selectedPreset)
									const cols = 4
									let next = idx
									if (e.key === 'ArrowRight') next = (idx + 1) % THEME_PRESETS.length
									else if (e.key === 'ArrowLeft')
										next = (idx - 1 + THEME_PRESETS.length) % THEME_PRESETS.length
									else if (e.key === 'ArrowDown')
										next = Math.min(idx + cols, THEME_PRESETS.length - 1)
									else if (e.key === 'ArrowUp') next = Math.max(idx - cols, 0)
									setSelectedPreset(THEME_PRESETS[next].name)
									document.getElementById(`theme-preset-${next}`)?.focus()
								}}
							>
								{(THEME_PRESETS as readonly ThemePreset[]).map((preset, index) => {
									const isActive = selectedPreset === preset.name
									return (
										<button
											type="button"
											id={`theme-preset-${index}`}
											key={preset.name}
											onClick={() => setSelectedPreset(preset.name)}
											role="radio"
											aria-checked={isActive}
											tabIndex={isActive ? 0 : -1}
											className={`py-1.5 px-1 rounded-md cursor-pointer border text-center focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none ${
												isActive
													? 'border-accent ring-1 ring-accent'
													: 'border-transparent hover:border-content-muted'
											}`}
											title={preset.name}
											aria-label={preset.name}
											style={{
												background: preset.background,
												color: preset.foreground,
												boxShadow:
													isActive && preset.glow
														? `0 0 8px ${hexToRgba(preset.glow, 0.25)}`
														: undefined,
											}}
										>
											<span className="text-[11px] font-medium leading-tight block truncate">
												{preset.name}
											</span>
										</button>
									)
								})}
							</div>
						</SettingsSection>

						{/* Font */}
						<SettingsSection label="Font" gap={12}>
							<FontPicker value={fontFamily} onChange={setFontFamily} />
						</SettingsSection>

						{/* Display */}
						<SettingsSection label="Display" gap={12}>
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
						</SettingsSection>

						{/* Behavior */}
						<SettingsSection label="Behavior" gap={8}>
							<SegmentedButton
								options={EFFECT_LEVELS}
								value={dimLevel}
								onChange={setDimLevel}
								label="Dim unfocused"
							/>
							<SegmentedButton
								options={EFFECT_LEVELS}
								value={opacityLevel}
								onChange={setOpacityLevel}
								label="Opacity"
							/>
						</SettingsSection>

						{/* Visual Effects */}
						<SettingsSection label="Visual Effects" gap={8}>
							<SegmentedButton
								options={EFFECT_LEVELS}
								value={gradientLevel}
								onChange={setGradientLevel}
								label="Gradient"
							/>
							<SegmentedButton
								options={EFFECT_LEVELS}
								value={glowLevel}
								onChange={setGlowLevel}
								label="Glow"
							/>
							<SegmentedButton
								options={EFFECT_LEVELS}
								value={scanlineLevel}
								onChange={setScanlineLevel}
								label="Scanlines"
							/>
						</SettingsSection>
					</>
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
