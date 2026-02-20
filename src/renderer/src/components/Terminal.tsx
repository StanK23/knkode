import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { WebglAddon } from '@xterm/addon-webgl'
import { Terminal as XTerm } from '@xterm/xterm'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '@xterm/xterm/css/xterm.css'
import { DEFAULT_CURSOR_STYLE, DEFAULT_SCROLLBACK, type PaneTheme } from '../../../shared/types'
import { buildFontFamily, buildXtermTheme } from '../data/theme-presets'
import { useStore } from '../store'

const SEARCH_BTN =
	'bg-transparent border-none text-content-muted cursor-pointer text-xs min-w-[28px] min-h-[28px] flex items-center justify-center hover:text-content focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none rounded-sm'

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

	const mergedTheme = useMemo(() => ({ ...theme, ...themeOverride }), [theme, themeOverride])

	// Keep themeRef in sync for the mount effect's initial render
	themeRef.current = mergedTheme

	useEffect(() => {
		if (!containerRef.current || !wrapperRef.current) return

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
		searchAddonRef.current = searchAddon

		term.loadAddon(
			new WebLinksAddon((_event, url) => {
				window.api.openExternal(url).catch((err) => {
					console.error('[terminal] Failed to open URL:', err)
				})
			}),
		)

		term.open(containerRef.current)
		fitAddon.fit()

		try {
			const webglAddon = new WebglAddon()
			webglAddon.onContextLoss(() => webglAddon.dispose())
			term.loadAddon(webglAddon)
		} catch (err) {
			console.warn('[terminal] WebGL unavailable, using canvas renderer:', err)
		}

		termRef.current = term
		fitAddonRef.current = fitAddon

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

		let ptyExited = false

		term.onData((data) => {
			if (ptyExited) {
				// Restart PTY on any keypress after exit
				ptyExited = false
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

		const removeDataListener = window.api.onPtyData((id, data) => {
			if (id === paneId) term.write(data)
		})

		const removeExitListener = window.api.onPtyExit((id, exitCode) => {
			if (id === paneId) {
				// If the PTY was restarted, a new one is already active — sync dimensions
				if (useStore.getState().activePtyIds.has(paneId)) {
					const { cols, rows } = term
					window.api.resizePty(paneId, cols, rows).catch((err) => {
						console.warn('[terminal] resizePty after restart failed:', err)
					})
					return
				}
				ptyExited = true
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

		// Track whether user is scrolled up (for scroll-to-bottom button).
		// term.onScroll only fires for buffer scroll (new output), not viewport
		// scroll (mouse wheel), so we listen on the actual xterm viewport DOM element.
		const viewport = term.element?.querySelector('.xterm-viewport')
		const handleViewportScroll = () => {
			const atBottom = term.buffer.active.viewportY >= term.buffer.active.baseY
			setIsScrolledUp(!atBottom)
		}
		viewport?.addEventListener('scroll', handleViewportScroll)
		// Also track buffer scroll (new output arriving while scrolled up)
		term.onScroll(handleViewportScroll)

		// Preserve scroll position across resize. Uses scroll ratio (viewportY/baseY)
		// instead of absolute line numbers so position survives text reflow when
		// columns change. Debounces restoration (150ms) because the shell responds
		// to SIGWINCH with output that re-scrolls xterm to the bottom.
		let savedScrollRatio: number | null = null
		let scrollRestoreTimer: ReturnType<typeof setTimeout> | null = null

		const resizeObserver = new ResizeObserver(() => {
			requestAnimationFrame(() => {
				try {
					const el = containerRef.current
					if (!el || el.clientWidth === 0) return

					// Capture ratio only at the start of a resize sequence
					if (savedScrollRatio === null) {
						const { viewportY, baseY } = term.buffer.active
						if (viewportY >= baseY) {
							fitAddon.fit()
							return
						}
						savedScrollRatio = baseY > 0 ? viewportY / baseY : 0
					}

					fitAddon.fit()

					if (scrollRestoreTimer) clearTimeout(scrollRestoreTimer)
					const ratio = savedScrollRatio
					scrollRestoreTimer = setTimeout(() => {
						if (ratio !== null) {
							const newBaseY = term.buffer.active.baseY
							term.scrollToLine(Math.round(ratio * newBaseY))
						}
						savedScrollRatio = null
						scrollRestoreTimer = null
					}, 150)
				} catch (err) {
					console.warn('[terminal] fit() failed during resize:', err)
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
			viewport?.removeEventListener('scroll', handleViewportScroll)
			wrapperEl.removeEventListener('focusin', handleFocusIn)
			resizeObserver.disconnect()
			if (scrollRestoreTimer) clearTimeout(scrollRestoreTimer)
			removeDataListener()
			removeExitListener()
			searchAddonRef.current = null
			term.dispose()
		}
	}, [paneId])

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
	// cell metrics). Restores focus after fit() since it can cause DOM focus loss.
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
				fitAddonRef.current.fit()
			} catch (err) {
				console.warn('[terminal] fit() failed during theme update:', err)
			}
			if (isFocusedRef.current) termRef.current.focus()
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
			{isScrolledUp && (
				<button
					type="button"
					onClick={scrollToBottom}
					aria-label="Scroll to bottom"
					className="absolute bottom-3 right-3 z-10 bg-elevated/90 border border-edge rounded-full w-7 h-7 flex items-center justify-center text-content-muted hover:text-content hover:bg-overlay cursor-pointer shadow-panel transition-opacity"
				>
					&#x25BC;
				</button>
			)}
			<div ref={containerRef} className="w-full h-full" />
		</div>
	)
}
