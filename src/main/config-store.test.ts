import { describe, expect, it, vi } from 'vitest'
import type { PaneTheme, Workspace } from '../shared/types'
import { DEFAULT_UNFOCUSED_DIM } from '../shared/types'

// Mock Electron's app module before importing config-store
vi.mock('electron', () => ({
	app: { getPath: () => '/tmp/test-knkode' },
}))

// Import after mock is set up
const { migrateTheme } = await import('./config-store')

function makeWorkspace(theme: Record<string, unknown>): Workspace {
	return {
		id: 'test-ws',
		name: 'Test',
		color: '#6c63ff',
		theme: theme as PaneTheme,
		layout: { type: 'preset', preset: 'single', tree: { paneId: 'p1', size: 100 } },
		panes: { p1: { label: 'terminal', cwd: '/tmp', startupCommand: null, themeOverride: null } },
	}
}

describe('migrateTheme', () => {
	it('passes through workspace that already has unfocusedDim', () => {
		const ws = makeWorkspace({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			unfocusedDim: 0.5,
		})
		const result = migrateTheme(ws)
		expect(result).toBe(ws)
		expect(result.theme.unfocusedDim).toBe(0.5)
	})

	it('converts legacy opacity to unfocusedDim (1 - opacity)', () => {
		const ws = makeWorkspace({
			background: '#1a1a2e',
			foreground: '#e0e0e0',
			fontSize: 14,
			opacity: 0.8,
		})
		const result = migrateTheme(ws)
		expect(result.theme.unfocusedDim).toBeCloseTo(0.2, 5)
		expect(result.theme.background).toBe('#1a1a2e')
		expect(result.theme.foreground).toBe('#e0e0e0')
		expect(result.theme.fontSize).toBe(14)
	})

	it('clamps converted opacity to [0, 0.7]', () => {
		const wsLow = makeWorkspace({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			opacity: 1.5,
		})
		expect(migrateTheme(wsLow).theme.unfocusedDim).toBe(0)

		const wsHigh = makeWorkspace({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			opacity: 0.1,
		})
		expect(migrateTheme(wsHigh).theme.unfocusedDim).toBe(0.7)
	})

	it('adds default unfocusedDim when neither opacity nor unfocusedDim present', () => {
		const ws = makeWorkspace({
			background: '#282a36',
			foreground: '#f8f8f2',
			fontSize: 16,
		})
		const result = migrateTheme(ws)
		expect(result.theme.unfocusedDim).toBe(DEFAULT_UNFOCUSED_DIM)
		expect(result.theme.background).toBe('#282a36')
		expect(result.theme.fontSize).toBe(16)
	})

	it('handles workspace with both opacity and unfocusedDim (already migrated)', () => {
		const ws = makeWorkspace({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			opacity: 0.8,
			unfocusedDim: 0.4,
		})
		const result = migrateTheme(ws)
		expect(result).toBe(ws)
		expect(result.theme.unfocusedDim).toBe(0.4)
	})

	it('returns safe defaults for null/invalid theme', () => {
		const ws = { ...makeWorkspace({}), theme: null as unknown as PaneTheme }
		const result = migrateTheme(ws)
		expect(result.theme.background).toBe('#1a1a2e')
		expect(result.theme.foreground).toBe('#e0e0e0')
		expect(result.theme.fontSize).toBe(14)
		expect(result.theme.unfocusedDim).toBe(DEFAULT_UNFOCUSED_DIM)
	})

	it('handles non-finite opacity gracefully', () => {
		const ws = makeWorkspace({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			opacity: Number.NaN,
		})
		const result = migrateTheme(ws)
		expect(result.theme.unfocusedDim).toBe(DEFAULT_UNFOCUSED_DIM)
	})
})
