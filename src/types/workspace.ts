/** Layout presets matching v1 feature set. */
export type LayoutPreset = "single" | "2-column" | "2-row" | "3-panel-l" | "3-panel-t" | "2x2-grid";

/** Leaf node — a single pane in the layout tree. */
export interface LayoutLeaf {
	readonly type: "leaf";
	readonly paneId: string;
	/** Percentage size relative to siblings (0-100). Root node is always 100. */
	readonly size: number;
}

/**
 * Branch node — splits children horizontally or vertically.
 * Must have at least 2 children. Single-child branches are collapsed by removeLeaf.
 */
export interface LayoutBranch {
	readonly type: "branch";
	/** 'horizontal' = side-by-side (vertical divider), 'vertical' = stacked (horizontal divider). */
	readonly direction: "horizontal" | "vertical";
	/** Percentage size relative to siblings (0-100). Root node is always 100. */
	readonly size: number;
	readonly children: readonly LayoutNode[];
}

/** A node in the layout tree — either a leaf (pane) or a branch (split). */
export type LayoutNode = LayoutLeaf | LayoutBranch;

/** Workspace layout: either a named preset or a custom (user-modified) layout. */
export type WorkspaceLayout =
	| {
			readonly type: "preset";
			readonly preset: LayoutPreset;
			readonly tree: LayoutNode;
	  }
	| { readonly type: "custom"; readonly tree: LayoutNode };

/** Per-pane configuration. */
export interface PaneConfig {
	/** Display name shown in the pane's tab header. */
	readonly label: string;
	readonly cwd: string;
	readonly startupCommand: string | null;
}

/** 8-color palette for workspace tab accents. */
export const WORKSPACE_COLORS = [
	"#6c63ff",
	"#e74c3c",
	"#2ecc71",
	"#f39c12",
	"#3498db",
	"#9b59b6",
	"#1abc9c",
	"#e67e22",
] as const;

/**
 * Full workspace definition.
 * The panes record is keyed by paneId values from the layout tree's leaf nodes.
 */
export interface Workspace {
	readonly id: string;
	readonly name: string;
	readonly color: (typeof WORKSPACE_COLORS)[number];
	readonly layout: WorkspaceLayout;
	readonly panes: Readonly<Record<string, PaneConfig>>;
}

/** Persistent app-level state (tab order, active workspace, window bounds). */
export interface AppState {
	readonly openWorkspaceIds: readonly string[];
	readonly activeWorkspaceId: string | null;
	readonly windowBounds: {
		readonly x: number;
		readonly y: number;
		readonly width: number;
		readonly height: number;
	};
}

// -- Type guards --

export function isLayoutLeaf(node: LayoutNode): node is LayoutLeaf {
	return node.type === "leaf";
}

export function isLayoutBranch(node: LayoutNode): node is LayoutBranch {
	return node.type === "branch";
}

// -- Factory functions --

export function createLeaf(paneId: string, size: number): LayoutLeaf {
	return { type: "leaf", paneId, size };
}

/**
 * Create a branch node. Children must contain at least 2 nodes.
 */
export function createBranch(
	direction: LayoutBranch["direction"],
	size: number,
	children: readonly LayoutNode[],
): LayoutBranch {
	return { type: "branch", direction, size, children };
}

// -- Validation --

/**
 * Validate workspace referential integrity: every leaf paneId in the layout tree
 * must have a corresponding entry in the panes record, and vice versa.
 */
export function validateWorkspace(workspace: Workspace): boolean {
	const treeIds = new Set<string>();
	function collectIds(node: LayoutNode): void {
		if (isLayoutLeaf(node)) {
			treeIds.add(node.paneId);
		} else {
			for (const child of node.children) {
				collectIds(child);
			}
		}
	}
	collectIds(workspace.layout.tree);

	const paneKeys = new Set(Object.keys(workspace.panes));
	if (treeIds.size !== paneKeys.size) return false;
	for (const id of treeIds) {
		if (!paneKeys.has(id)) return false;
	}
	return true;
}
