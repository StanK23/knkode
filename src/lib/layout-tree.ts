import {
	createBranch,
	createLeaf,
	isLayoutBranch,
	isLayoutLeaf,
	type LayoutBranch,
	type LayoutLeaf,
	type LayoutNode,
} from "../types/workspace";

/** Maximum tree depth to prevent stack overflow from corrupted persisted state. */
const MAX_DEPTH = 20;

/**
 * Get the first pane ID in the tree (depth-first, left-child traversal).
 */
export function getFirstPaneId(node: LayoutNode, depth = 0): string | undefined {
	if (depth > MAX_DEPTH) return undefined;
	if (isLayoutLeaf(node)) return node.paneId;
	for (const child of node.children) {
		const id = getFirstPaneId(child, depth + 1);
		if (id !== undefined) return id;
	}
	return undefined;
}

/**
 * Get all pane IDs in depth-first order.
 */
export function getPaneIdsInOrder(node: LayoutNode, depth = 0): string[] {
	if (depth > MAX_DEPTH) return [];
	if (isLayoutLeaf(node)) return [node.paneId];
	return node.children.flatMap((c) => getPaneIdsInOrder(c, depth + 1));
}

/**
 * Remove a leaf from the tree by pane ID.
 * Collapses single-child branches after removal.
 * Returns undefined if the removed leaf was the root.
 * Returns the original node reference if paneId was not found.
 */
export function removeLeaf(node: LayoutNode, paneId: string, depth = 0): LayoutNode | undefined {
	if (depth > MAX_DEPTH) return node;
	if (isLayoutLeaf(node)) {
		return node.paneId === paneId ? undefined : node;
	}

	const newChildren: LayoutNode[] = [];
	for (const child of node.children) {
		const result = removeLeaf(child, paneId, depth + 1);
		if (result !== undefined) {
			newChildren.push(result);
		}
	}

	// No change in this subtree — return original node for referential equality
	if (
		newChildren.length === node.children.length &&
		newChildren.every((c, i) => c === node.children[i])
	) {
		return node;
	}

	if (newChildren.length === 0) return undefined;
	if (newChildren.length === 1) {
		// Collapse single-child branch: promote the child, inheriting this branch's size
		const only = newChildren[0] as LayoutNode;
		return { ...only, size: node.size };
	}

	// Redistribute sizes proportionally
	const totalSize = newChildren.reduce((sum, c) => sum + c.size, 0);
	const resized = newChildren.map((c) => ({
		...c,
		size: totalSize > 0 ? (c.size / totalSize) * 100 : 100 / newChildren.length,
	}));

	return createBranch(node.direction, node.size, resized);
}

/**
 * Replace a leaf in the tree by pane ID, using a replacer function.
 * The replacer receives the matched leaf and returns a new node (or subtree).
 * Returns the original node reference if paneId was not found.
 */
export function replaceLeaf(
	node: LayoutNode,
	paneId: string,
	replacer: (leaf: LayoutLeaf) => LayoutNode,
	depth = 0,
): LayoutNode {
	if (depth > MAX_DEPTH) return node;
	if (isLayoutLeaf(node)) {
		return node.paneId === paneId ? replacer(node) : node;
	}

	const newChildren = node.children.map((child) => replaceLeaf(child, paneId, replacer, depth + 1));

	// Short-circuit: if no child changed, return original node
	if (newChildren.every((c, i) => c === node.children[i])) return node;

	return { ...node, children: newChildren };
}

/**
 * Remap every leaf's paneId using a mapping function.
 * Used when duplicating workspaces (new UUIDs for all panes).
 */
export function remapTree(
	node: LayoutNode,
	mapId: (oldId: string) => string,
	depth = 0,
): LayoutNode {
	if (depth > MAX_DEPTH) return node;
	if (isLayoutLeaf(node)) {
		return createLeaf(mapId(node.paneId), node.size);
	}
	return {
		...node,
		children: node.children.map((child) => remapTree(child, mapId, depth + 1)),
	};
}

/**
 * Update child sizes at a specific path in the tree.
 * Path is an array of child indices from root to the target branch.
 * Callers must ensure sizes sum to 100; no normalization is performed.
 */
export function updateSizesAtPath(
	node: LayoutNode,
	path: readonly number[],
	sizes: readonly number[],
	depth = 0,
): LayoutNode {
	if (depth > MAX_DEPTH) return node;

	if (path.length === 0) {
		// We're at the target branch — update its children's sizes
		if (!isLayoutBranch(node)) return node;
		if (sizes.length !== node.children.length) return node;
		if (sizes.some((s) => !Number.isFinite(s) || s < 0)) return node;

		return {
			...node,
			children: node.children.map((child, i) => ({
				...child,
				// Guaranteed defined by the length check above; ?? satisfies noUncheckedIndexedAccess
				size: sizes[i] ?? child.size,
			})),
		};
	}

	if (!isLayoutBranch(node)) return node;

	const [head, ...rest] = path;
	return {
		...node,
		children: node.children.map((child, i) =>
			i === head ? updateSizesAtPath(child, rest, sizes, depth + 1) : child,
		),
	};
}

/**
 * Count the total number of panes (leaves) in the tree.
 */
export function countPanes(node: LayoutNode): number {
	return getPaneIdsInOrder(node).length;
}

/**
 * Find the path (array of child indices) to a specific pane.
 * Returns undefined if the pane is not found.
 */
export function findPanePath(node: LayoutNode, paneId: string, depth = 0): number[] | undefined {
	if (depth > MAX_DEPTH) return undefined;
	if (isLayoutLeaf(node)) {
		return node.paneId === paneId ? [] : undefined;
	}

	for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i];
		if (!child) continue;
		const subPath = findPanePath(child, paneId, depth + 1);
		if (subPath !== undefined) return [i, ...subPath];
	}

	return undefined;
}

/**
 * Create a split by replacing a leaf with a branch containing the original pane
 * and a new pane. Returns the new tree.
 */
export function splitAtPane(
	node: LayoutNode,
	targetPaneId: string,
	newPaneId: string,
	direction: LayoutBranch["direction"],
): LayoutNode {
	return replaceLeaf(node, targetPaneId, (leaf) =>
		createBranch(direction, leaf.size, [createLeaf(leaf.paneId, 50), createLeaf(newPaneId, 50)]),
	);
}
