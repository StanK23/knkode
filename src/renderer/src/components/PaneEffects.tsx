import { useMemo } from 'react'
import {
	DEFAULT_PANE_OPACITY,
	EFFECT_MULTIPLIERS,
	type PaneTheme,
	isEffectLevel,
} from '../../../shared/types'
import { findPreset } from '../data/theme-presets'
import { hexToRgba, isValidGradient, resolveBackground } from '../utils/colors'

interface PaneEffectsProps {
	theme: PaneTheme
	isFocused: boolean
}

/**
 * Visual effect overlays for a pane — gradient, glow, scanlines, noise, and
 * preset decoration. Extracted from Terminal.tsx so effects render at the pane
 * level (behind the Frame wrapper) and remain visible through a transparent
 * terminal background.
 *
 * Z-index stacking: z-0 gradient, z-[1] decoration, z-[2] glow, z-[3] scanlines, z-[4] noise.
 * Uses `contain: layout paint style` on each layer for GPU compositing.
 */
export function PaneEffects({ theme, isFocused }: PaneEffectsProps) {
	const { wrapperBg, blurPx } = useMemo(() => {
		const opacity = theme.paneOpacity ?? DEFAULT_PANE_OPACITY
		return {
			wrapperBg: resolveBackground(theme.background, opacity),
			blurPx: opacity < 1 ? Math.round((1 - opacity) * 24) : 0,
		}
	}, [theme.paneOpacity, theme.background])

	const { gradientMul, glowMul, scanlineMul, noiseMul } = useMemo(() => {
		const mul = (level: unknown) => EFFECT_MULTIPLIERS[isEffectLevel(level) ? level : 'off']
		return {
			gradientMul: mul(theme.gradientLevel),
			glowMul: mul(theme.glowLevel),
			scanlineMul: mul(theme.scanlineLevel),
			noiseMul: mul(theme.noiseLevel),
		}
	}, [theme.gradientLevel, theme.glowLevel, theme.scanlineLevel, theme.noiseLevel])

	const effectGlow = theme.glow ?? theme.accent
	const effectGradient =
		theme.gradient ??
		(effectGlow
			? `linear-gradient(180deg, ${hexToRgba(effectGlow, 0.25)} 0%, transparent 50%)`
			: null)

	const glowInnerAlpha = 0.5 * glowMul
	const glowOuterAlpha = 0.7 * glowMul

	const presetDecoration = useMemo(
		() => (theme.preset ? findPreset(theme.preset)?.decoration : undefined),
		[theme.preset],
	)

	return (
		<div
			className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-sm"
			style={{
				backgroundColor: wrapperBg,
				backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
				WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
			}}
		>
			{gradientMul > 0 && effectGradient && isValidGradient(effectGradient) && (
				<div
					className="absolute inset-0 pointer-events-none z-0"
					style={{
						background: effectGradient,
						opacity: gradientMul,
						contain: 'layout paint style',
					}}
				/>
			)}
			{presetDecoration && (
				<div
					className="absolute inset-0 pointer-events-none z-[1]"
					style={{ background: presetDecoration, contain: 'layout paint style' }}
				/>
			)}
			{glowMul > 0 && effectGlow && (
				<div
					className="pane-glow absolute inset-0 pointer-events-none z-[2] transition-opacity duration-300"
					style={{
						opacity: isFocused ? 1 : 0.5,
						boxShadow: `inset 0 0 18px ${hexToRgba(effectGlow, glowInnerAlpha)}, inset 0 0 12px ${hexToRgba(effectGlow, glowOuterAlpha)}`,
					}}
				/>
			)}
			{scanlineMul > 0 && (
				<div
					className="pane-scanline absolute inset-0 pointer-events-none z-[3]"
					style={{ opacity: scanlineMul }}
				/>
			)}
			{noiseMul > 0 && (
				<div
					className="pane-noise absolute inset-0 pointer-events-none z-[4]"
					style={{ opacity: noiseMul * 0.5 }}
				/>
			)}
		</div>
	)
}
