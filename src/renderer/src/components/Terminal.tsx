import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { WebglAddon } from '@xterm/addon-webgl'
import { Terminal as XTerm } from '@xterm/xterm'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import '@xterm/xterm/css/xterm.css'
import { DEFAULT_CURSOR_STYLE, DEFAULT_SCROLLBACK, type PaneTheme } from '../../../shared/types'
import { buildFontFamily, buildXtermTheme } from '../data/theme-presets'
import { useStore } from '../store'

const SEARCH_BTN =
	'bg-transparent border-none text-content-muted cursor-pointer text-xs min-w-[28px] min-h-[28px] flex items-center justify-center hover:text-content focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none rounded-sm'

/** Whether the terminal viewport is scrolled to the very bottom of the buffer. */
function isTermAtBottom(term: XTerm): boolean {
	return term.buffer.active.viewportY >= term.buffer.active.baseY
}

/**
 * Call fitAddon.fit() and restore the user's scroll position afterward.
 * Skips scroll management for the alternate screen buffer (TUIs like vim,
 * htop) — the alternate buffer has no scrollback, so viewportY/baseY are
 * always 0 and scroll restoration is meaningless.
 * For the normal buffer, preserves exact distance from bottom instead of a
 * ratio. When the terminal narrows, long lines re-wrap into more rows,
 * inflating baseY disproportionately and causing a ratio to overshoot.
 */
function fitAndPreserveScroll(term: XTerm, fitAddon: FitAddon): void {
	const isAlternateBuffer = term.buffer.active.type === 'alternate'
	if (isAlternateBuffer) {
		fitAddon.fit()
		return
	}

	const atBottom = isTermAtBottom(term)
	const linesFromBottom = term.buffer.active.baseY - term.buffer.active.viewportY

	fitAddon.fit()

	if (atBottom) {
		term.scrollToBottom()
	} else {
		term.scrollToLine(Math.max(0, term.buffer.active.baseY - linesFromBottom))
	}
}

// ---------------------------------------------------------------------------
// Module-level cache (keyed by paneId) — survives React unmount/remount
// (e.g. pane split). Per-instance state (xterm, addons, PTY listeners) lives
// here. Per-mount state (ResizeObserver, scroll tracking, focus) is set up in
// the useEffect and torn down on unmount without disposing the terminal.
// ---------------------------------------------------------------------------

interface CachedTerminal {
	term: XTerm
	fitAddon: FitAddon
	searchAddon: SearchAddon
	/** Attached to the current React container on each mount; detached on unmount. */
	termContainer: HTMLDivElement
	webglAddon: WebglAddon | null
	webglRecoveries: number
	removeDataListener: () => void
	removeExitListener: () => void
	// Safe to mutate from onData/onPtyExit because both run on the same JS
	// event loop — no concurrent access is possible.
	ptyExited: boolean
}

const terminalCache = new Map<string, CachedTerminal>()

/**
 * Maximum consecutive WebGL context-loss recoveries before giving up and
 * staying on the canvas renderer for this terminal instance.
 */
const MAX_WEBGL_RECOVERIES = 3

/** Dispose the previous WebGL addon (if any) and try loading a fresh one. */
function tryLoadWebgl(entry: CachedTerminal): void {
	try {
		entry.webglAddon?.dispose()
	} catch {
		/* ignore disposal errors */
	}
	entry.webglAddon = null

	if (entry.webglRecoveries >= MAX_WEBGL_RECOVERIES) {
		console.warn('[terminal] WebGL context lost too many times, staying on canvas renderer')
		return
	}

	try {
		const webglAddon = new WebglAddon()
		webglAddon.onContextLoss(() => {
			console.warn('[terminal] WebGL context lost, recovering...')
			try {
				webglAddon.dispose()
			} catch {
				/* ignore disposal errors */
			}
			entry.webglAddon = null
			entry.webglRecoveries++
			// Delay to let the GPU recover before re-creating the context
			setTimeout(() => {
				tryLoadWebgl(entry)
				// Force full repaint to clear corrupted glyphs
				entry.term.refresh(0, entry.term.rows - 1)
			}, 200)
		})
		entry.term.loadAddon(webglAddon)
		entry.webglAddon = webglAddon
	} catch (err) {
		console.warn('[terminal] WebGL unavailable, using canvas renderer:', err)
	}
}

/** Fully dispose a cached terminal (call on pane close / workspace delete). */
export function disposeTerminal(paneId: string): void {
	const cached = terminalCache.get(paneId)
	if (!cached) return
	// Delete first to prevent stale lookups if dispose throws
	terminalCache.delete(paneId)
	try {
		cached.removeDataListener()
		cached.removeExitListener()
		cached.webglAddon?.dispose()
		cached.term.dispose()
	} catch (err) {
		console.warn(`[terminal] dispose failed for pane ${paneId}:`, err)
	}
}

interface TerminalProps {
	paneId: string
	theme: PaneTheme
	themeOverride: Partial<PaneTheme> | null
	focusGeneration: number
	isFocused: boolean
	onFocus: () => void
}

export function TerminalView({
	paneId,
	theme,
	themeOverride,
	focusGeneration,
	isFocused,
	onFocus,
}: TerminalProps) {
	const wrapperRef = useRef<HTMLDivElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const termRef = useRef<XTerm | null>(null)
	const fitAddonRef = useRef<FitAddon | null>(null)
	const searchAddonRef = useRef<SearchAddon | null>(null)
	const themeRef = useRef({ ...theme, ...themeOverride })
	const onFocusRef = useRef(onFocus)
	onFocusRef.current = onFocus
	// Ref allows the theme-update effect to re-focus without adding isFocused to its deps
	const isFocusedRef = useRef(isFocused)
	isFocusedRef.current = isFocused

	const [isScrolledUp, setIsScrolledUp] = useState(false)
	const [showSearch, setShowSearch] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const searchInputRef = useRef<HTMLInputElement>(null)
	const showSearchRef = useRef(false)
	showSearchRef.current = showSearch

	// Scroll preservation across workspace switches: save position while
	// active, ignore browser-induced scroll resets while hidden, restore on reactivation.
	const savedScrollRef = useRef({ atBottom: true, viewportY: 0 })
	const isActiveRef = useRef(true)
	const isWorkspaceActive = useStore((s) => {
		const ws = s.workspaces.find((w) => paneId in w.panes)
		return ws?.id === s.appState.activeWorkspaceId
	})

	const mergedTheme = useMemo(() => ({ ...theme, ...themeOverride }), [theme, themeOverride])

	// Keep themeRef in sync for the mount effect's initial render
	themeRef.current = mergedTheme

	useEffect(() => {
		if (!containerRef.current || !wrapperRef.current) {
			console.warn('[terminal] containerRef or wrapperRef not ready for pane', paneId)
			return
		}

		let cached = terminalCache.get(paneId)

		if (!cached) {
			// ── CACHE MISS: first mount for this paneId ──────────────────────
			const t = themeRef.current
			const term = new XTerm({
				fontSize: t.fontSize,
				fontFamily: buildFontFamily(t.fontFamily),
				theme: buildXtermTheme(t),
				cursorBlink: true,
				cursorStyle: t.cursorStyle ?? DEFAULT_CURSOR_STYLE,
				allowProposedApi: true,
				scrollback: t.scrollback ?? DEFAULT_SCROLLBACK,
			})

			const fitAddon = new FitAddon()
			term.loadAddon(fitAddon)

			const searchAddon = new SearchAddon()
			term.loadAddon(searchAddon)

			term.loadAddon(
				new WebLinksAddon((_event, url) => {
					window.api.openExternal(url).catch((err) => {
						console.error('[terminal] Failed to open URL:', err)
					})
				}),
			)

			// Detached container — xterm renders into this. Created via
			// document.createElement (not JSX) so inline styles are used
			// instead of Tailwind classes.
			const termContainer = document.createElement('div')
			termContainer.style.width = '100%'
			termContainer.style.height = '100%'
			term.open(termContainer)

			// Entry is built with no-op listener placeholders, then the real
			// listeners are assigned below. The entry is NOT stored in the cache
			// until all fields are fully initialized (see terminalCache.set at
			// the end of this block), so disposeTerminal cannot observe the
			// half-initialized state.
			const entry: CachedTerminal = {
				term,
				fitAddon,
				searchAddon,
				termContainer,
				webglAddon: null,
				webglRecoveries: 0,
				removeDataListener: () => {},
				removeExitListener: () => {},
				ptyExited: false,
			}

			tryLoadWebgl(entry)

			// Shift+Enter → send LF (\n) instead of xterm's default CR (\r).
			// Programs that distinguish the two (e.g. Claude Code CLI) can treat
			// LF as "newline" and CR as "submit".
			term.attachCustomKeyEventHandler((ev) => {
				if (ev.key === 'Enter' && ev.shiftKey) {
					if (ev.type === 'keydown') {
						window.api.writePty(paneId, '\n').catch((err) => {
							console.error(`[terminal] writePty failed for pane ${paneId}:`, err)
						})
					}
					return false
				}
				return true
			})

			term.onData((data) => {
				if (entry.ptyExited) {
					// Restart PTY on any keypress after exit
					entry.ptyExited = false
					term.clear()
					const state = useStore.getState()
					const ws = state.workspaces.find((w) => paneId in w.panes)
					const cwd = ws?.panes[paneId]?.cwd ?? state.homeDir
					state.ensurePty(paneId, cwd, null)
					return
				}
				window.api.writePty(paneId, data).catch((err) => {
					console.error(`[terminal] writePty failed for pane ${paneId}:`, err)
				})
			})

			entry.removeDataListener = window.api.onPtyData((id, data) => {
				if (id === paneId) term.write(data)
			})

			entry.removeExitListener = window.api.onPtyExit((id, exitCode) => {
				if (id === paneId) {
					// If the PTY was restarted, a new one is already active — clear and sync dimensions
					if (useStore.getState().activePtyIds.has(paneId)) {
						term.clear()
						const { cols, rows } = term
						window.api.resizePty(paneId, cols, rows).catch((err) => {
							console.warn('[terminal] resizePty after restart failed:', err)
						})
						return
					}
					entry.ptyExited = true
					term.writeln(
						`\r\n\x1b[90m[Process exited with code ${exitCode}. Press any key to restart.]\x1b[0m`,
					)
					useStore.getState().removePtyId(paneId)
				}
			})

			term.onResize(({ cols, rows }) => {
				window.api.resizePty(paneId, cols, rows).catch((err) => {
					console.error(`[terminal] resizePty failed for pane ${paneId}:`, err)
				})
			})

			// All fields initialized — safe to store in cache
			terminalCache.set(paneId, entry)
			cached = entry
		} else {
			// ── CACHE HIT: remount (e.g. after pane split) ───────────────────
			try {
				cached.searchAddon.clearDecorations()
			} catch (err) {
				console.warn('[terminal] clearDecorations failed on remount:', err)
			}
			// WebGL context may have been lost when detached — reload
			tryLoadWebgl(cached)
		}

		const { term, fitAddon, searchAddon, termContainer } = cached

		// ── PER-MOUNT SETUP (torn down on unmount, not on dispose) ───────

		// Reparent xterm's container into the React-managed div
		containerRef.current.appendChild(termContainer)
		fitAddon.fit()

		termRef.current = term
		fitAddonRef.current = fitAddon
		searchAddonRef.current = searchAddon

		// Track whether user is scrolled up (for scroll-to-bottom button).
		// term.onScroll only fires for buffer scroll (new output), not viewport
		// scroll (mouse wheel), so we listen on the actual xterm viewport DOM element.
		const viewport = term.element?.querySelector('.xterm-viewport')
		const handleViewportScroll = () => {
			if (!isActiveRef.current) return
			const atBottom = isTermAtBottom(term)
			setIsScrolledUp(!atBottom)
			savedScrollRef.current = { atBottom, viewportY: term.buffer.active.viewportY }
		}
		viewport?.addEventListener('scroll', handleViewportScroll)
		// Also track buffer scroll (new output arriving while scrolled up)
		const scrollDisposable = term.onScroll(handleViewportScroll)

		// Skip ResizeObserver callbacks with unchanged dimensions (fires on
		// DOM re-attach, style recalc, etc.) to avoid unnecessary fit/scroll cycles.
		let lastWidth = 0
		let lastHeight = 0
		const resizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0]
			if (!entry) return
			const { width, height } = entry.contentRect
			if (width === lastWidth && height === lastHeight) return
			lastWidth = width
			lastHeight = height

			requestAnimationFrame(() => {
				try {
					if (!containerRef.current?.clientWidth) return
					fitAndPreserveScroll(term, fitAddon)
				} catch (err) {
					console.warn('[terminal] fit()/scroll failed during resize:', err)
				}
			})
		})
		resizeObserver.observe(containerRef.current)

		// Track terminal focus to update pane focus state.
		// Uses DOM focusin on the wrapper so both the xterm container and
		// the search bar trigger pane focus (prevents dim overlay on search).
		const wrapperEl = wrapperRef.current
		const handleFocusIn = () => onFocusRef.current()
		wrapperEl.addEventListener('focusin', handleFocusIn)

		return () => {
			// Per-mount listeners are cleaned up here. Per-instance listeners
			// (onData, onPtyData, onPtyExit, onResize) remain active on the
			// cached entry so the PTY buffer keeps accumulating while detached.
			viewport?.removeEventListener('scroll', handleViewportScroll)
			scrollDisposable.dispose()
			wrapperEl.removeEventListener('focusin', handleFocusIn)
			resizeObserver.disconnect()
			searchAddonRef.current = null
			// Detach termContainer from DOM — do NOT dispose the terminal.
			// PTY data continues writing to the buffer while detached.
			termContainer.remove()
		}
	}, [paneId])

	// Restore terminal scroll position when workspace becomes active.
	// Runs as useLayoutEffect (before paint) so the user never sees a flash
	// of wrong scroll position. While inactive, handleViewportScroll is
	// suppressed via isActiveRef so browser-induced scrollTop resets don't
	// corrupt the saved position.
	useLayoutEffect(() => {
		if (!isWorkspaceActive) {
			isActiveRef.current = false
			return
		}
		if (termRef.current) {
			const term = termRef.current
			const { atBottom, viewportY } = savedScrollRef.current
			if (atBottom) {
				term.scrollToBottom()
			} else {
				term.scrollToLine(viewportY)
			}
			isActiveRef.current = true
			setIsScrolledUp(!isTermAtBottom(term))
		} else {
			isActiveRef.current = true
		}
	}, [isWorkspaceActive])

	// Sync xterm focus with pane focus state (keyboard shortcuts + click).
	// focusGeneration is an intentional trigger dep — it re-fires the effect
	// even when isFocused is already true (e.g. re-clicking the same pane).
	// Skips when search bar is open so clicking the search input doesn't
	// steal focus back to the terminal.
	// biome-ignore lint/correctness/useExhaustiveDependencies: focusGeneration is an intentional trigger dependency
	useEffect(() => {
		if (isFocused && termRef.current && !showSearchRef.current) {
			termRef.current.focus()
		}
	}, [isFocused, focusGeneration])

	// Update xterm theme colors, cursor style, scrollback, and font metrics without
	// re-mounting. Only calls fit() when font size or font family change (fit recalculates
	// cell metrics). Restores scroll position and focus after fit() since it disrupts both.
	useEffect(() => {
		if (!termRef.current || !fitAddonRef.current) return
		termRef.current.options.theme = buildXtermTheme(mergedTheme)
		termRef.current.options.cursorStyle = mergedTheme.cursorStyle ?? DEFAULT_CURSOR_STYLE
		termRef.current.options.scrollback = mergedTheme.scrollback ?? DEFAULT_SCROLLBACK
		const newFontFamily = buildFontFamily(mergedTheme.fontFamily)
		const metricsChanged =
			termRef.current.options.fontSize !== mergedTheme.fontSize ||
			termRef.current.options.fontFamily !== newFontFamily
		termRef.current.options.fontSize = mergedTheme.fontSize
		termRef.current.options.fontFamily = newFontFamily
		if (metricsChanged) {
			try {
				fitAndPreserveScroll(termRef.current, fitAddonRef.current)
				if (isFocusedRef.current) termRef.current.focus()
			} catch (err) {
				console.warn('[terminal] fit()/scroll failed during theme update:', err)
			}
		}
	}, [mergedTheme])

	// Cmd+F to open search (captured at terminal level to prevent browser find)
	useEffect(() => {
		const containerEl = containerRef.current
		if (!containerEl) return
		const handler = (e: KeyboardEvent) => {
			const isMod = e.metaKey || e.ctrlKey
			if (isMod && e.key === 'f') {
				e.preventDefault()
				e.stopPropagation()
				setShowSearch(true)
			}
		}
		containerEl.addEventListener('keydown', handler)
		return () => containerEl.removeEventListener('keydown', handler)
	}, [])

	// Auto-focus search input when search bar opens
	useEffect(() => {
		if (showSearch && searchInputRef.current) {
			searchInputRef.current.focus()
			searchInputRef.current.select()
		}
	}, [showSearch])

	// Reads from refs only — stable empty deps
	const handleSearchChange = useCallback((query: string) => {
		setSearchQuery(query)
		if (searchAddonRef.current) {
			if (query) {
				searchAddonRef.current.findNext(query)
			} else {
				searchAddonRef.current.clearDecorations()
			}
		}
	}, [])

	const handleSearchNav = useCallback(
		(direction: 'next' | 'prev') => {
			if (searchAddonRef.current && searchQuery) {
				if (direction === 'next') searchAddonRef.current.findNext(searchQuery)
				else searchAddonRef.current.findPrevious(searchQuery)
			}
		},
		[searchQuery],
	)

	const closeSearch = useCallback(() => {
		setShowSearch(false)
		setSearchQuery('')
		searchAddonRef.current?.clearDecorations()
		termRef.current?.focus()
	}, [])

	const scrollToBottom = useCallback(() => {
		termRef.current?.scrollToBottom()
		setIsScrolledUp(false)
		termRef.current?.focus()
	}, [])

	const handleSearchKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter') {
				e.preventDefault()
				handleSearchNav(e.shiftKey ? 'prev' : 'next')
			}
			if (e.key === 'Escape') {
				e.preventDefault()
				e.stopPropagation()
				closeSearch()
			}
			// Allow Cmd+F to close search when input has focus
			const isMod = e.metaKey || e.ctrlKey
			if (isMod && e.key === 'f') {
				e.preventDefault()
				closeSearch()
			}
		},
		[handleSearchNav, closeSearch],
	)

	return (
		<div
			ref={wrapperRef}
			className="relative w-full h-full p-1.5"
			style={{ backgroundColor: mergedTheme.background }}
		>
			{showSearch && (
				<search className="absolute top-1 right-2 z-10 flex items-center gap-1 bg-elevated border border-edge rounded-sm px-2 py-1 shadow-panel">
					<input
						ref={searchInputRef}
						value={searchQuery}
						onChange={(e) => handleSearchChange(e.target.value)}
						onKeyDown={handleSearchKeyDown}
						placeholder="Find..."
						className="bg-sunken border border-edge rounded-sm text-content text-xs py-0.5 px-1.5 outline-none w-40 focus:border-accent"
						aria-label="Search terminal"
					/>
					<button
						type="button"
						onClick={() => handleSearchNav('prev')}
						aria-label="Previous match"
						className={SEARCH_BTN}
					>
						&#x25B2;
					</button>
					<button
						type="button"
						onClick={() => handleSearchNav('next')}
						aria-label="Next match"
						className={SEARCH_BTN}
					>
						&#x25BC;
					</button>
					<button
						type="button"
						onClick={closeSearch}
						aria-label="Close search"
						className={SEARCH_BTN}
					>
						&#x2715;
					</button>
				</search>
			)}
			{/* Inline style required: colors must match the terminal's runtime theme,
			    which varies per pane and cannot be expressed as Tailwind classes. */}
			{isScrolledUp && (
				<button
					type="button"
					onClick={scrollToBottom}
					aria-label="Scroll to bottom"
					className="absolute bottom-3 left-3 right-3 z-10 h-9 rounded-sm flex items-center justify-center gap-1.5 text-xs cursor-pointer whitespace-nowrap overflow-hidden hover:brightness-110 focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
					style={{
						backgroundColor: `${mergedTheme.background}e6`,
						color: mergedTheme.foreground,
						border: `1px solid ${mergedTheme.foreground}22`,
						boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
					}}
				>
					Scroll to bottom &#x25BC;
				</button>
			)}
			<div ref={containerRef} className="w-full h-full" />
		</div>
	)
}
