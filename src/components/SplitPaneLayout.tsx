import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { memo, useCallback, useMemo, useRef } from "react";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { getFirstPaneId } from "../lib/layout-tree";
import { useWorkspaceStore } from "../store/workspace";
import type { LayoutBranch, LayoutNode } from "../types/workspace";
import { isLayoutLeaf } from "../types/workspace";
import Pane from "./Pane";

const PANE_MIN_SIZE = 100;
const SIZE_PERSIST_DEBOUNCE_MS = 250;
const ROOT_PATH = "";

interface SplitPaneLayoutProps {
	workspaceId: string;
	tree: LayoutNode;
}

export default function SplitPaneLayout({ workspaceId, tree }: SplitPaneLayoutProps) {
	return <LayoutNodeRenderer node={tree} path={ROOT_PATH} workspaceId={workspaceId} />;
}

// -- Node renderer (dispatches to Pane or BranchRenderer) --

interface LayoutNodeRendererProps {
	node: LayoutNode;
	path: string;
	workspaceId: string;
}

const LayoutNodeRenderer = memo(function LayoutNodeRenderer({
	node,
	path,
	workspaceId,
}: LayoutNodeRendererProps) {
	if (isLayoutLeaf(node)) {
		return <Pane paneId={node.paneId} workspaceId={workspaceId} />;
	}

	return <BranchRenderer node={node} path={path} workspaceId={workspaceId} />;
});

// -- Branch renderer (Allotment split with onChange size persistence) --

interface BranchRendererProps {
	node: LayoutBranch;
	path: string;
	workspaceId: string;
}

const BranchRenderer = memo(function BranchRenderer({
	node,
	path,
	workspaceId,
}: BranchRendererProps) {
	const updatePaneSizes = useWorkspaceStore((s) => s.updatePaneSizes);

	// path is a string that changes reference on every render when created via
	// template literal in the parent's .map(). We store it in a ref so the
	// debounced handleChange callback can read the latest value without needing
	// path in its dependency array, keeping the callback reference stable.
	const pathRef = useRef(path);
	pathRef.current = path;

	const handleChange = useDebouncedCallback(
		useCallback(
			(sizes: number[]) => {
				const total = sizes.reduce((sum, s) => sum + s, 0);
				if (total <= 0) return;
				const percentages = sizes.map((s) => (s / total) * 100);
				const numericPath = pathRef.current === "" ? [] : pathRef.current.split(".").map(Number);
				updatePaneSizes(workspaceId, numericPath, percentages);
			},
			[updatePaneSizes, workspaceId],
		),
		SIZE_PERSIST_DEBOUNCE_MS,
	);

	const defaultSizes = useMemo(() => node.children.map((child) => child.size), [node.children]);

	return (
		<Allotment
			vertical={node.direction === "vertical"}
			defaultSizes={defaultSizes}
			minSize={PANE_MIN_SIZE}
			onChange={handleChange}
		>
			{node.children.map((child, index) => (
				<Allotment.Pane key={getNodeKey(child, index)}>
					<LayoutNodeRenderer
						node={child}
						path={path === "" ? `${index}` : `${path}.${index}`}
						workspaceId={workspaceId}
					/>
				</Allotment.Pane>
			))}
		</Allotment>
	);
});

// -- Helpers --

function getNodeKey(node: LayoutNode, index: number): string {
	if (isLayoutLeaf(node)) return node.paneId;
	// Branches use their first leaf descendant's paneId as a stable key.
	// Fallback to positional key is safe: valid trees always have at least one
	// leaf descendant per branch, so getFirstPaneId only returns undefined for
	// degenerate trees that fail validateWorkspace.
	return getFirstPaneId(node) ?? `branch-${index}`;
}
