import type { LayoutBranch, LayoutNode } from "../types/workspace";
import { isLayoutBranch, isLayoutLeaf } from "../types/workspace";

/**
 * Get the first pane ID in the tree (depth-first, left-child traversal).
 * Returns undefined for empty branches.
 */
export function getFirstPaneId(node: LayoutNode): string | undefined {
	if (isLayoutLeaf(node)) return node.paneId;
	for (const child of node.children) {
		const id = getFirstPaneId(child);
		if (id !== undefined) return id;
	}
	return undefined;
}

/**
 * Get all pane IDs in depth-first order.
 */
export function getPaneIdsInOrder(node: LayoutNode): string[] {
	if (isLayoutLeaf(node)) return [node.paneId];
	return node.children.flatMap(getPaneIdsInOrder);
}

/**
 * Remove a leaf from the tree by pane ID.
 * Collapses single-child branches after removal.
 * Returns undefined if the removed leaf was the root.
 */
export function removeLeaf(node: LayoutNode, paneId: string): LayoutNode | undefined {
	if (isLayoutLeaf(node)) {
		return node.paneId === paneId ? undefined : node;
	}

	const newChildren: LayoutNode[] = [];
	for (const child of node.children) {
		const result = removeLeaf(child, paneId);
		if (result !== undefined) {
			newChildren.push(result);
		}
	}

	if (newChildren.length === 0) return undefined;
	if (newChildren.length === 1) {
		// Collapse single-child branch: promote the child with parent's size
		const only = newChildren[0];
		if (!only) return undefined;
		return { ...only, size: node.size };
	}

	// Redistribute sizes proportionally
	const totalSize = newChildren.reduce((sum, c) => sum + c.size, 0);
	const resized = newChildren.map((c) => ({
		...c,
		size: totalSize > 0 ? (c.size / totalSize) * 100 : 100 / newChildren.length,
	}));

	return { ...node, children: resized };
}

/**
 * Replace a leaf in the tree by pane ID, using a replacer function.
 * The replacer receives the matched leaf and returns a new node (or subtree).
 */
export function replaceLeaf(
	node: LayoutNode,
	paneId: string,
	replacer: (leaf: LayoutNode) => LayoutNode,
): LayoutNode {
	if (isLayoutLeaf(node)) {
		return node.paneId === paneId ? replacer(node) : node;
	}

	return {
		...node,
		children: node.children.map((child) => replaceLeaf(child, paneId, replacer)),
	};
}

/**
 * Remap every leaf's paneId using a mapping function.
 * Used when duplicating workspaces (new UUIDs for all panes).
 */
export function remapTree(node: LayoutNode, mapId: (oldId: string) => string): LayoutNode {
	if (isLayoutLeaf(node)) {
		return { ...node, paneId: mapId(node.paneId) };
	}
	return { ...node, children: node.children.map((child) => remapTree(child, mapId)) };
}

/**
 * Update child sizes at a specific path in the tree.
 * Path is an array of child indices from root to the target branch.
 * Sizes are percentages that should sum to 100.
 */
export function updateSizesAtPath(
	node: LayoutNode,
	path: readonly number[],
	sizes: readonly number[],
): LayoutNode {
	if (path.length === 0) {
		// We're at the target branch — update its children's sizes
		if (!isLayoutBranch(node)) return node;
		if (sizes.length !== node.children.length) return node;

		return {
			...node,
			children: node.children.map((child, i) => ({
				...child,
				size: sizes[i] ?? child.size,
			})),
		};
	}

	if (!isLayoutBranch(node)) return node;

	const [head, ...rest] = path;
	return {
		...node,
		children: node.children.map((child, i) =>
			i === head ? updateSizesAtPath(child, rest, sizes) : child,
		),
	};
}

/**
 * Count the total number of panes (leaves) in the tree.
 */
export function countPanes(node: LayoutNode): number {
	if (isLayoutLeaf(node)) return 1;
	return node.children.reduce((sum, child) => sum + countPanes(child), 0);
}

/**
 * Find the path (array of child indices) to a specific pane.
 * Returns undefined if the pane is not found.
 */
export function findPanePath(node: LayoutNode, paneId: string): number[] | undefined {
	if (isLayoutLeaf(node)) {
		return node.paneId === paneId ? [] : undefined;
	}

	for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i];
		if (!child) continue;
		const subPath = findPanePath(child, paneId);
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
	return replaceLeaf(node, targetPaneId, (leaf) => ({
		direction,
		size: leaf.size,
		children: [
			{ ...leaf, size: 50 },
			{ paneId: newPaneId, size: 50 },
		],
	}));
}
