import { describe, expect, it, vi } from 'vitest'
import type { PaneTheme, Workspace } from '../shared/types'
import { DEFAULT_UNFOCUSED_DIM } from '../shared/types'

// Mock Electron's app module before importing config-store
vi.mock('electron', () => ({
	app: { getPath: () => '/tmp/test-knkode' },
}))

// Import after mock is set up
const { migrateTheme, migrateEffectLevels, sanitizeTheme } = await import('./config-store')

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

describe('migrateEffectLevels', () => {
	it('passes through workspace with no legacy fields', () => {
		const ws = makeWorkspace({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			unfocusedDim: 0.3,
			glowLevel: 'medium',
		})
		const result = migrateEffectLevels(ws)
		expect(result).toBe(ws)
	})

	it('converts animatedGlow: true to glowLevel: medium', () => {
		const ws = makeWorkspace({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			unfocusedDim: 0.3,
			animatedGlow: true,
		})
		const result = migrateEffectLevels(ws)
		expect(result.theme.glowLevel).toBe('medium')
	})

	it('does not set glowLevel when animatedGlow is false', () => {
		const ws = makeWorkspace({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			unfocusedDim: 0.3,
			animatedGlow: false,
		})
		const result = migrateEffectLevels(ws)
		expect(result.theme.glowLevel).toBeUndefined()
	})

	it('converts scanline: true to scanlineLevel: medium', () => {
		const ws = makeWorkspace({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			unfocusedDim: 0.3,
			scanline: true,
		})
		const result = migrateEffectLevels(ws)
		expect(result.theme.scanlineLevel).toBe('medium')
	})

	it('does not set scanlineLevel when scanline is false', () => {
		const ws = makeWorkspace({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			unfocusedDim: 0.3,
			scanline: false,
		})
		const result = migrateEffectLevels(ws)
		expect(result.theme.scanlineLevel).toBeUndefined()
	})

	it('adds gradientLevel: medium when gradient present without level', () => {
		const ws = makeWorkspace({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			unfocusedDim: 0.3,
			gradient: 'linear-gradient(180deg, rgba(0,255,65,0.03) 0%, transparent 40%)',
		})
		const result = migrateEffectLevels(ws)
		expect(result.theme.gradientLevel).toBe('medium')
	})

	it('preserves existing gradientLevel when gradient present', () => {
		const ws = makeWorkspace({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			unfocusedDim: 0.3,
			gradient: 'linear-gradient(180deg, rgba(0,255,65,0.03) 0%, transparent 40%)',
			gradientLevel: 'subtle',
		})
		const result = migrateEffectLevels(ws)
		expect(result).toBe(ws)
	})

	it('preserves existing glowLevel when animatedGlow is true', () => {
		const ws = makeWorkspace({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			unfocusedDim: 0.3,
			animatedGlow: true,
			glowLevel: 'subtle',
		})
		const result = migrateEffectLevels(ws)
		expect(result.theme.glowLevel).toBe('subtle')
	})

	it('removes legacy animatedGlow and scanline fields', () => {
		const ws = makeWorkspace({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			unfocusedDim: 0.3,
			animatedGlow: true,
			scanline: true,
		})
		const result = migrateEffectLevels(ws)
		const raw = result.theme as unknown as Record<string, unknown>
		expect('animatedGlow' in raw).toBe(false)
		expect('scanline' in raw).toBe(false)
	})

	it('does not mutate the input workspace', () => {
		const ws = makeWorkspace({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			unfocusedDim: 0.3,
			animatedGlow: true,
		})
		const originalTheme = { ...ws.theme }
		migrateEffectLevels(ws)
		const raw = ws.theme as unknown as Record<string, unknown>
		expect(raw.animatedGlow).toBe(
			(originalTheme as unknown as Record<string, unknown>).animatedGlow,
		)
	})
})

describe('sanitizeTheme', () => {
	it('returns safe defaults for empty input', () => {
		const result = sanitizeTheme({})
		expect(result.background).toBe('#1a1a2e')
		expect(result.foreground).toBe('#e0e0e0')
		expect(result.fontSize).toBe(14)
		expect(result.unfocusedDim).toBe(DEFAULT_UNFOCUSED_DIM)
	})

	it('preserves valid fields', () => {
		const result = sanitizeTheme({
			background: '#282a36',
			foreground: '#f8f8f2',
			fontSize: 16,
			unfocusedDim: 0.5,
			accent: '#bd93f9',
			cursorStyle: 'block',
			glowLevel: 'medium',
			scrollback: 10000,
		})
		expect(result.background).toBe('#282a36')
		expect(result.foreground).toBe('#f8f8f2')
		expect(result.fontSize).toBe(16)
		expect(result.unfocusedDim).toBe(0.5)
		expect(result.accent).toBe('#bd93f9')
		expect(result.cursorStyle).toBe('block')
		expect(result.glowLevel).toBe('medium')
		expect(result.scrollback).toBe(10000)
	})

	it('strips invalid hex color fields', () => {
		const result = sanitizeTheme({
			background: 'not-a-color',
			foreground: '###invalid',
			accent: 'red',
			glow: 12345,
			cursorColor: '',
		})
		expect(result.background).toBe('#1a1a2e')
		expect(result.foreground).toBe('#e0e0e0')
		expect(result.accent).toBeUndefined()
		expect(result.glow).toBeUndefined()
		expect(result.cursorColor).toBeUndefined()
	})

	it('strips invalid effect levels', () => {
		const result = sanitizeTheme({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			unfocusedDim: 0.3,
			gradientLevel: 'turbo',
			glowLevel: 42,
			scanlineLevel: 'subtle',
		})
		expect(result.gradientLevel).toBeUndefined()
		expect(result.glowLevel).toBeUndefined()
		expect(result.scanlineLevel).toBe('subtle')
	})

	it('strips invalid cursor style', () => {
		const result = sanitizeTheme({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			unfocusedDim: 0.3,
			cursorStyle: 'blink',
		})
		expect(result.cursorStyle).toBeUndefined()
	})

	it('validates AnsiColors — rejects if any field is invalid', () => {
		const result = sanitizeTheme({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			unfocusedDim: 0.3,
			ansiColors: {
				black: '#000000', red: '#cc0000', green: '#4e9a06', yellow: '#c4a000',
				blue: '#3465a4', magenta: '#75507b', cyan: '#06989a', white: '#d3d7cf',
				brightBlack: '#555753', brightRed: '#ef2929', brightGreen: '#8ae234', brightYellow: '#fce94f',
				brightBlue: '#729fcf', brightMagenta: '#ad7fa8', brightCyan: 'INVALID', brightWhite: '#eeeeec',
			},
		})
		expect(result.ansiColors).toBeUndefined()
	})

	it('accepts valid AnsiColors', () => {
		const ansi = {
			black: '#000000', red: '#cc0000', green: '#4e9a06', yellow: '#c4a000',
			blue: '#3465a4', magenta: '#75507b', cyan: '#06989a', white: '#d3d7cf',
			brightBlack: '#555753', brightRed: '#ef2929', brightGreen: '#8ae234', brightYellow: '#fce94f',
			brightBlue: '#729fcf', brightMagenta: '#ad7fa8', brightCyan: '#34e2e2', brightWhite: '#eeeeec',
		}
		const result = sanitizeTheme({
			background: '#000',
			foreground: '#fff',
			fontSize: 14,
			unfocusedDim: 0.3,
			ansiColors: ansi,
		})
		expect(result.ansiColors).toEqual(ansi)
	})

	it('strips non-finite numeric fields', () => {
		const result = sanitizeTheme({
			background: '#000',
			foreground: '#fff',
			fontSize: Number.NaN,
			unfocusedDim: Number.POSITIVE_INFINITY,
			scrollback: Number.NaN,
			paneOpacity: Number.NEGATIVE_INFINITY,
		})
		expect(result.fontSize).toBe(14)
		expect(result.unfocusedDim).toBe(DEFAULT_UNFOCUSED_DIM)
		expect(result.scrollback).toBeUndefined()
		expect(result.paneOpacity).toBeUndefined()
	})
})
