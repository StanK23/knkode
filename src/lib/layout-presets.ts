import type { LayoutNode, LayoutPreset, PaneConfig, WorkspaceLayout } from "../types/workspace";
import { createBranch, createLeaf } from "../types/workspace";
import { getPaneIdsInOrder } from "./layout-tree";

type PresetFactory = (generateId: () => string) => { tree: LayoutNode };

function twoPane(direction: "horizontal" | "vertical"): PresetFactory {
	return (generateId) => {
		const a = generateId();
		const b = generateId();
		return {
			tree: createBranch(direction, 100, [createLeaf(a, 50), createLeaf(b, 50)]),
		};
	};
}

function threePanel(
	outerDir: "horizontal" | "vertical",
	innerDir: "horizontal" | "vertical",
): PresetFactory {
	return (generateId) => {
		const main = generateId();
		const a = generateId();
		const b = generateId();
		return {
			tree: createBranch(outerDir, 100, [
				createLeaf(main, 60),
				createBranch(innerDir, 40, [createLeaf(a, 50), createLeaf(b, 50)]),
			]),
		};
	};
}

const PRESET_FACTORIES: Record<LayoutPreset, PresetFactory> = {
	single: (generateId) => {
		const id = generateId();
		return { tree: createLeaf(id, 100) };
	},

	"2-column": twoPane("horizontal"),
	"2-row": twoPane("vertical"),
	"3-panel-l": threePanel("horizontal", "vertical"),
	"3-panel-t": threePanel("vertical", "horizontal"),

	"2x2-grid": (generateId) => {
		const [tl, tr, bl, br] = [generateId(), generateId(), generateId(), generateId()];
		return {
			tree: createBranch("vertical", 100, [
				createBranch("horizontal", 50, [createLeaf(tl, 50), createLeaf(tr, 50)]),
				createBranch("horizontal", 50, [createLeaf(bl, 50), createLeaf(br, 50)]),
			]),
		};
	},
};

/**
 * Create a workspace layout from a preset.
 * Returns the layout and a map of pane configs keyed by pane ID.
 */
export function createLayoutFromPreset(
	preset: LayoutPreset,
	generateId: () => string,
	defaultCwd: string,
): { layout: WorkspaceLayout; panes: Record<string, PaneConfig> } {
	const factory = PRESET_FACTORIES[preset];
	const { tree } = factory(generateId);
	const paneIds = getPaneIdsInOrder(tree);

	const panes: Record<string, PaneConfig> = {};
	for (const id of paneIds) {
		panes[id] = { label: "", cwd: defaultCwd, startupCommand: null };
	}

	return {
		layout: { type: "preset", preset, tree },
		panes,
	};
}

/** All available preset names, derived from PRESET_FACTORIES. */
export const LAYOUT_PRESETS = Object.keys(PRESET_FACTORIES) as LayoutPreset[];
