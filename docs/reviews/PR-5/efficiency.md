# PR-5 Efficiency Review: Layout Tree Types & Operations

## Summary

The code is well-structured with clean immutable recursive operations. The tree depth is inherently bounded by practical UI constraints (terminal panes rarely exceed ~10), so algorithmic complexity is not a real concern. The main efficiency findings are about unnecessary allocations on unchanged branches and a path-building pattern that creates intermediate arrays.

## Must Fix

None

## Suggestions

- `layout-tree.ts:74-77` — `replaceLeaf` spreads and rebuilds every branch node on the path from root even when the target pane is not found in that subtree. The `.map()` always creates a new `children` array and a new branch object. Add a short-circuit: if no child changed, return the original node unchanged.
  ```ts
  const newChildren = node.children.map((child) => replaceLeaf(child, paneId, replacer));
  if (newChildren.every((c, i) => c === node.children[i])) return node;
  return { ...node, children: newChildren };
  ```
  This matters because `replaceLeaf` is also the hot path for `splitAtPane` (called on every pane split interaction), and it avoids creating garbage objects for the entire untouched side of the tree.

- `layout-tree.ts:147` — `findPanePath` builds the path array bottom-up using `[i, ...subPath]`, which copies the array at every recursion level, giving O(d^2) allocations where d is depth. Consider using a mutable accumulator array and pushing indices, or reversing at the end:
  ```ts
  // push-based approach avoids intermediate array copies
  if (subPath !== undefined) { subPath.push(i); return subPath; }
  // then reverse once at the call site, or build top-down
  ```
  At typical tree depths (3-5) this is negligible, but it is a gratuitous quadratic pattern that could be avoided for free.

- `layout-tree.ts:53-56` — In `removeLeaf`, when redistributing sizes, every remaining child gets spread (`{ ...c, size: ... }`). If the removed pane was not in this subtree at all, the function still enters the redistribution path because `newChildren` is rebuilt by the loop regardless. An early check `if (newChildren.length === node.children.length)` before redistributing would let you return the original node reference when nothing was actually removed, avoiding all the spreads.

- `layout-tree.ts:117` — `updateSizesAtPath` uses `const [head, ...rest] = path` which allocates a new array for `rest` on every recursive step. Since `path` is `readonly number[]`, you could pass an index offset instead:
  ```ts
  function updateSizesAtPath(node, path, sizes, pathIdx = 0)
  ```
  This eliminates one array allocation per recursion level.

## Nitpicks

- `layout-tree.ts:108-110` — Inside `updateSizesAtPath` at the target branch, `sizes[i] ?? child.size` uses nullish coalescing as a fallback, but the length check on line 104 already guarantees `sizes[i]` exists. The fallback is dead code that obscures intent. Consider using `sizes[i]!` (non-null assertion) or just `sizes[i] as number` to make it clear this is a guaranteed index.

- `layout-tree.ts:120-122` — `updateSizesAtPath` maps over all children to find the one at index `head`, rebuilding the children array even for unchanged siblings. Since only one child changes, you could slice-and-splice or spread with a targeted replacement to avoid mapping the entire array, though with typical child counts of 2-3 this has near-zero impact.

- `layout-presets.ts:139-146` — `LAYOUT_PRESETS` duplicates the keys of `PRESET_FACTORIES`. Consider deriving it: `Object.keys(PRESET_FACTORIES) as LayoutPreset[]`. This avoids the maintenance risk of the two lists drifting, though it trades off guaranteed ordering (object key order is insertion-order for string keys in modern JS, so this is safe in practice).
