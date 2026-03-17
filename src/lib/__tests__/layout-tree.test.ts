import { describe, expect, it } from "vitest";
import type { LayoutBranch, LayoutNode } from "../../types/workspace";
import { createBranch, createLeaf, isLayoutBranch } from "../../types/workspace";
import {
	countPanes,
	findPanePath,
	getFirstPaneId,
	getPaneIdsInOrder,
	remapTree,
	removeLeaf,
	replaceLeaf,
	splitAtPane,
	updateSizesAtPath,
} from "../layout-tree";

// -- Fixtures --

const singleLeaf: LayoutNode = createLeaf("a", 100);

const twoColumn: LayoutBranch = createBranch("horizontal", 100, [
	createLeaf("a", 50),
	createLeaf("b", 50),
]);

const nested: LayoutBranch = createBranch("vertical", 100, [
	createLeaf("a", 60),
	createBranch("horizontal", 40, [createLeaf("b", 50), createLeaf("c", 50)]),
]);

// -- getFirstPaneId --

describe("getFirstPaneId", () => {
	it("returns the pane ID for a leaf", () => {
		expect(getFirstPaneId(singleLeaf)).toBe("a");
	});

	it("returns the leftmost pane in a branch", () => {
		expect(getFirstPaneId(twoColumn)).toBe("a");
	});

	it("returns the leftmost pane in a nested tree", () => {
		expect(getFirstPaneId(nested)).toBe("a");
	});
});

// -- getPaneIdsInOrder --

describe("getPaneIdsInOrder", () => {
	it("returns single ID for a leaf", () => {
		expect(getPaneIdsInOrder(singleLeaf)).toEqual(["a"]);
	});

	it("returns IDs in depth-first order", () => {
		expect(getPaneIdsInOrder(nested)).toEqual(["a", "b", "c"]);
	});
});

// -- removeLeaf --

describe("removeLeaf", () => {
	it("returns undefined when removing the root leaf", () => {
		expect(removeLeaf(singleLeaf, "a")).toBeUndefined();
	});

	it("returns original reference when pane not found", () => {
		const result = removeLeaf(twoColumn, "z");
		expect(result).toBe(twoColumn);
	});

	it("collapses single-child branch after removal", () => {
		const result = removeLeaf(twoColumn, "a");
		expect(result).toEqual(createLeaf("b", 100));
	});

	it("redistributes sizes proportionally after removal from 3-child branch", () => {
		const threeChildren: LayoutBranch = createBranch("horizontal", 100, [
			createLeaf("a", 33.33),
			createLeaf("b", 33.33),
			createLeaf("c", 33.33),
		]);
		const result = removeLeaf(threeChildren, "b") as LayoutBranch;
		expect(result.children).toHaveLength(2);
		expect(result.children[0]?.size).toBeCloseTo(50);
		expect(result.children[1]?.size).toBeCloseTo(50);
	});

	it("removes from nested tree and collapses with correct size", () => {
		const result = removeLeaf(nested, "b") as LayoutBranch;
		// After removing "b", the inner branch collapses to just "c"
		expect(getPaneIdsInOrder(result)).toEqual(["a", "c"]);
		expect(result.children).toHaveLength(2);
		// Promoted child inherits the parent branch's size (40), not its own (50)
		expect(result.children[1]?.size).toBe(40);
	});
});

// -- replaceLeaf --

describe("replaceLeaf", () => {
	it("replaces a leaf at root level", () => {
		const result = replaceLeaf(singleLeaf, "a", () => createLeaf("x", 100));
		expect(result).toEqual(createLeaf("x", 100));
	});

	it("replaces a leaf in a branch", () => {
		const result = replaceLeaf(twoColumn, "b", () => createLeaf("x", 50));
		expect(getPaneIdsInOrder(result)).toEqual(["a", "x"]);
	});

	it("returns original reference when pane not found", () => {
		const result = replaceLeaf(twoColumn, "z", () => createLeaf("x", 50));
		expect(result).toBe(twoColumn);
	});

	it("replaces a leaf in a nested tree", () => {
		const result = replaceLeaf(nested, "c", () => createLeaf("x", 50));
		expect(getPaneIdsInOrder(result)).toEqual(["a", "b", "x"]);
	});
});

// -- remapTree --

describe("remapTree", () => {
	it("remaps a single leaf", () => {
		const result = remapTree(singleLeaf, (id) => `new-${id}`);
		expect(result).toEqual(createLeaf("new-a", 100));
	});

	it("remaps all leaves in a nested tree preserving structure", () => {
		const result = remapTree(nested, (id) => `new-${id}`);
		expect(getPaneIdsInOrder(result)).toEqual(["new-a", "new-b", "new-c"]);
		// Verify structure is preserved
		expect(isLayoutBranch(result)).toBe(true);
		const branch = result as LayoutBranch;
		expect(branch.direction).toBe("vertical");
		expect(branch.children[0]?.size).toBe(60);
		expect(branch.children[1]?.size).toBe(40);
	});
});

// -- updateSizesAtPath --

describe("updateSizesAtPath", () => {
	it("updates root branch children sizes", () => {
		const result = updateSizesAtPath(twoColumn, [], [70, 30]) as LayoutBranch;
		expect(result.children[0]?.size).toBe(70);
		expect(result.children[1]?.size).toBe(30);
	});

	it("updates nested branch sizes", () => {
		const result = updateSizesAtPath(nested, [1], [30, 70]) as LayoutBranch;
		const inner = result.children[1] as LayoutBranch;
		expect(inner.children[0]?.size).toBe(30);
		expect(inner.children[1]?.size).toBe(70);
	});

	it("returns node unchanged for invalid path", () => {
		const result = updateSizesAtPath(singleLeaf, [0], [50, 50]);
		expect(result).toEqual(singleLeaf);
	});

	it("returns node unchanged for mismatched sizes length", () => {
		const result = updateSizesAtPath(twoColumn, [], [50]);
		expect(result).toEqual(twoColumn);
	});

	it("returns node unchanged for invalid sizes (NaN, negative)", () => {
		const result = updateSizesAtPath(twoColumn, [], [Number.NaN, 50]);
		expect(result).toBe(twoColumn);
		const result2 = updateSizesAtPath(twoColumn, [], [-10, 110]);
		expect(result2).toBe(twoColumn);
	});
});

// -- countPanes --

describe("countPanes", () => {
	it("counts 1 for a leaf", () => {
		expect(countPanes(singleLeaf)).toBe(1);
	});

	it("counts all panes in nested tree", () => {
		expect(countPanes(nested)).toBe(3);
	});
});

// -- findPanePath --

describe("findPanePath", () => {
	it("returns empty array for root leaf", () => {
		expect(findPanePath(singleLeaf, "a")).toEqual([]);
	});

	it("returns path to pane in branch", () => {
		expect(findPanePath(twoColumn, "b")).toEqual([1]);
	});

	it("returns path to pane in nested tree", () => {
		expect(findPanePath(nested, "c")).toEqual([1, 1]);
	});

	it("returns undefined for missing pane", () => {
		expect(findPanePath(nested, "z")).toBeUndefined();
	});
});

// -- splitAtPane --

describe("splitAtPane", () => {
	it("splits a root leaf into a branch", () => {
		const result = splitAtPane(singleLeaf, "a", "new", "horizontal") as LayoutBranch;
		expect(result.direction).toBe("horizontal");
		expect(result.children).toHaveLength(2);
		expect(getPaneIdsInOrder(result)).toEqual(["a", "new"]);
		// New branch inherits original leaf's size
		expect(result.size).toBe(100);
		// Children each get 50%
		expect(result.children[0]?.size).toBe(50);
		expect(result.children[1]?.size).toBe(50);
	});

	it("splits a leaf inside a branch with correct size inheritance", () => {
		const result = splitAtPane(twoColumn, "b", "new", "vertical");
		expect(countPanes(result)).toBe(3);
		expect(getPaneIdsInOrder(result)).toEqual(["a", "b", "new"]);
		// Inner branch should inherit original leaf's size (50)
		const branch = result as LayoutBranch;
		const innerBranch = branch.children[1] as LayoutBranch;
		expect(innerBranch.size).toBe(50);
	});

	it("preserves the rest of the tree", () => {
		const result = splitAtPane(nested, "c", "new", "horizontal");
		expect(countPanes(result)).toBe(4);
		expect(getPaneIdsInOrder(result)).toEqual(["a", "b", "c", "new"]);
	});

	it("returns original reference when pane not found", () => {
		const result = splitAtPane(twoColumn, "z", "new", "horizontal");
		expect(result).toBe(twoColumn);
	});
});

// -- Immutability --

describe("immutability", () => {
	it("does not mutate input nodes", () => {
		const frozen = Object.freeze(
			createBranch("horizontal", 100, [
				Object.freeze(createLeaf("a", 50)),
				Object.freeze(createLeaf("b", 50)),
			]),
		);
		Object.freeze(frozen.children);

		// These should not throw despite frozen input
		expect(() => removeLeaf(frozen, "a")).not.toThrow();
		expect(() => replaceLeaf(frozen, "a", () => createLeaf("x", 50))).not.toThrow();
		expect(() => splitAtPane(frozen, "a", "new", "vertical")).not.toThrow();
		expect(() => updateSizesAtPath(frozen, [], [60, 40])).not.toThrow();
	});
});
