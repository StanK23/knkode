import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { Terminal as XTerm } from '@xterm/xterm'
import { useEffect, useMemo, useRef } from 'react'
import '@xterm/xterm/css/xterm.css'
import type { PaneTheme } from '../../../shared/types'
import { buildFontFamily } from '../data/theme-presets'
import { useStore } from '../store'

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
	const containerRef = useRef<HTMLDivElement>(null)
	const termRef = useRef<XTerm | null>(null)
	const fitAddonRef = useRef<FitAddon | null>(null)
	const themeRef = useRef({ ...theme, ...themeOverride })
	const onFocusRef = useRef(onFocus)
	onFocusRef.current = onFocus
	const isFocusedRef = useRef(isFocused)
	isFocusedRef.current = isFocused

	const mergedTheme = useMemo(() => ({ ...theme, ...themeOverride }), [theme, themeOverride])

	// Keep themeRef in sync for the mount effect's initial render
	themeRef.current = mergedTheme

	useEffect(() => {
		if (!containerRef.current) return

		const t = themeRef.current
		const term = new XTerm({
			fontSize: t.fontSize,
			fontFamily: buildFontFamily(t.fontFamily),
			theme: {
				background: t.background,
				foreground: t.foreground,
				cursor: t.foreground,
				selectionBackground: `${t.foreground}33`,
			},
			cursorBlink: true,
			cursorStyle: 'bar',
			allowProposedApi: true,
			scrollback: 5000,
		})

		const fitAddon = new FitAddon()
		term.loadAddon(fitAddon)
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

		term.onData((data) => {
			window.api.writePty(paneId, data).catch((err) => {
				console.error(`[terminal] writePty failed for pane ${paneId}:`, err)
			})
		})

		const removeDataListener = window.api.onPtyData((id, data) => {
			if (id === paneId) term.write(data)
		})

		const removeExitListener = window.api.onPtyExit((id, exitCode) => {
			if (id === paneId) {
				term.writeln(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m`)
				// Remove from activePtyIds so ensurePty can re-create if needed
				useStore.getState().removePtyId(paneId)
			}
		})

		term.onResize(({ cols, rows }) => {
			window.api.resizePty(paneId, cols, rows).catch((err) => {
				console.error(`[terminal] resizePty failed for pane ${paneId}:`, err)
			})
		})

		const resizeObserver = new ResizeObserver(() => {
			requestAnimationFrame(() => fitAddon.fit())
		})
		resizeObserver.observe(containerRef.current)

		// Track terminal focus to update pane focus state.
		// Uses DOM focusin because @xterm/xterm v5 does not expose an onFocus event.
		const containerEl = containerRef.current
		const handleFocusIn = () => onFocusRef.current()
		containerEl.addEventListener('focusin', handleFocusIn)

		return () => {
			containerEl.removeEventListener('focusin', handleFocusIn)
			resizeObserver.disconnect()
			removeDataListener()
			removeExitListener()
			term.dispose()
		}
	}, [paneId])

	// Sync xterm focus with pane focus state (keyboard shortcuts + click).
	// focusGeneration is an intentional trigger dep — it re-fires the effect
	// even when isFocused is already true (e.g. re-clicking the same pane).
	// biome-ignore lint/correctness/useExhaustiveDependencies: focusGeneration is an intentional trigger dependency
	useEffect(() => {
		if (isFocused && termRef.current) {
			termRef.current.focus()
		}
	}, [isFocused, focusGeneration])

	// Update theme (colors, font, size) without re-mounting; fit() recalculates cell metrics after font changes
	useEffect(() => {
		if (!termRef.current || !fitAddonRef.current) return
		termRef.current.options.theme = {
			background: mergedTheme.background,
			foreground: mergedTheme.foreground,
			cursor: mergedTheme.foreground,
			selectionBackground: `${mergedTheme.foreground}33`,
		}
		termRef.current.options.fontSize = mergedTheme.fontSize
		termRef.current.options.fontFamily = buildFontFamily(mergedTheme.fontFamily)
		try {
			fitAddonRef.current.fit()
		} catch {
			// fit() can throw when container has zero dimensions during layout transitions
		}
		// Re-focus terminal after fit() — fit() can cause DOM focus loss
		if (isFocusedRef.current) termRef.current.focus()
	}, [mergedTheme])

	return (
		<div ref={containerRef} className="w-full h-full" style={{ opacity: mergedTheme.opacity }} />
	)
}
