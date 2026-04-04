import { useCallback } from "react";
import type { Workspace } from "../shared/types";
import { useStore } from "../store";

interface CreateWorkspaceActionOptions {
	source: string;
	onSuccess?: (workspace: Workspace) => void;
	onError?: () => void;
}

/** Shared create-workspace flow so all entry points use the same store action and error handling shape. */
export function useCreateWorkspaceAction({
	source,
	onSuccess,
	onError,
}: CreateWorkspaceActionOptions) {
	const createDefaultWorkspace = useStore((s) => s.createDefaultWorkspace);

	return useCallback(async () => {
		try {
			const workspace = await createDefaultWorkspace();
			onSuccess?.(workspace);
			return workspace;
		} catch (err) {
			console.error(`[${source}] Failed to create workspace:`, err);
			onError?.();
			return null;
		}
	}, [createDefaultWorkspace, onError, onSuccess, source]);
}
