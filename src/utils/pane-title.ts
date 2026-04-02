/** Strip control characters and clamp terminal titles for UI display.
 * Returns an empty string when the incoming title should clear the current label.
 */
export function sanitizePaneTitle(title: string): string {
	const MAX_TITLE = 512;
	// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally stripping C0/C1 control chars from terminal titles
	return title.replace(/[\x00-\x1f\x7f-\x9f]/g, "").slice(0, MAX_TITLE);
}

/** Apply a title update to pane title state.
 * Empty sanitized titles clear the stored title so sidebar labels can fall back.
 */
export function nextPaneTitlesForUpdate(
	paneTitles: Record<string, string>,
	paneId: string,
	title: string,
): Record<string, string> | null {
	const sanitized = sanitizePaneTitle(title);
	if (!sanitized) {
		if (!(paneId in paneTitles)) return null;
		const next = { ...paneTitles };
		delete next[paneId];
		return next;
	}
	if (paneTitles[paneId] === sanitized) return null;
	return { ...paneTitles, [paneId]: sanitized };
}
