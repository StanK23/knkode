import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { Terminal as XTerm } from '@xterm/xterm'
import { useEffect, useMemo, useRef } from 'react'
import '@xterm/xterm/css/xterm.css'
import type { PaneTheme } from '../../../shared/types'

interface TerminalProps {
	paneId: string
	theme: PaneTheme
	themeOverride: Partial<PaneTheme> | null
}

export function TerminalView({ paneId, theme, themeOverride }: TerminalProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const termRef = useRef<XTerm | null>(null)
	const fitAddonRef = useRef<FitAddon | null>(null)
	const themeRef = useRef({ ...theme, ...themeOverride })

	const mergedTheme = useMemo(() => ({ ...theme, ...themeOverride }), [theme, themeOverride])

	// Keep themeRef in sync for the mount effect's initial render
	themeRef.current = mergedTheme

	useEffect(() => {
		if (!containerRef.current) return

		const t = themeRef.current
		const term = new XTerm({
			fontSize: t.fontSize,
			fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
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
			window.api.writePty(paneId, data).catch(() => {})
		})

		const removeDataListener = window.api.onPtyData((id, data) => {
			if (id === paneId) term.write(data)
		})

		const removeExitListener = window.api.onPtyExit((id, exitCode) => {
			if (id === paneId) {
				term.writeln(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m`)
			}
		})

		term.onResize(({ cols, rows }) => {
			window.api.resizePty(paneId, cols, rows).catch(() => {})
		})

		const resizeObserver = new ResizeObserver(() => {
			requestAnimationFrame(() => fitAddon.fit())
		})
		resizeObserver.observe(containerRef.current)

		return () => {
			resizeObserver.disconnect()
			removeDataListener()
			removeExitListener()
			term.dispose()
		}
	}, [paneId])

	// Update theme without re-mounting
	useEffect(() => {
		if (!termRef.current) return
		termRef.current.options.theme = {
			background: mergedTheme.background,
			foreground: mergedTheme.foreground,
			cursor: mergedTheme.foreground,
			selectionBackground: `${mergedTheme.foreground}33`,
		}
		termRef.current.options.fontSize = mergedTheme.fontSize
	}, [mergedTheme])

	return (
		<div
			ref={containerRef}
			style={{
				width: '100%',
				height: '100%',
				opacity: mergedTheme.opacity,
			}}
		/>
	)
}
