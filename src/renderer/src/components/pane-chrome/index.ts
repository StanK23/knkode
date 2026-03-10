import { DefaultVariant } from './DefaultVariant'
import type { PaneVariant, ScrollButtonProps, StatusBarProps } from './types'

export type { PaneVariant, ScrollButtonProps, StatusBarProps }
export type { VariantTheme } from './types'

/** Maps preset name → variant. Lazy-populated as variant files are added. */
const VARIANT_REGISTRY: Record<string, PaneVariant> = {}

/** Register a named variant. Called at module scope by each variant file. */
export function registerVariant(name: string, variant: PaneVariant): void {
	VARIANT_REGISTRY[name] = variant
}

/** Look up the variant for a preset name, falling back to DefaultVariant. */
export function getVariant(presetName: string | undefined): PaneVariant {
	if (presetName && VARIANT_REGISTRY[presetName]) return VARIANT_REGISTRY[presetName]
	return DefaultVariant
}
