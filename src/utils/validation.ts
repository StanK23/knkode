/** Normalize renderer-facing cwd strings before validation/persistence.
 *  Windows process APIs may return device-prefixed absolute paths like
 *  `\\?\C:\repo` or `\??\C:\repo`; convert them back to standard absolute paths. */
export function normalizeCwd(value: string): string {
	let normalized = value.trim();
	if (!normalized) return normalized;

	if (normalized.startsWith("\\\\?\\UNC\\")) {
		normalized = `\\\\${normalized.slice(8)}`;
	} else if (normalized.startsWith("\\??\\UNC\\")) {
		normalized = `\\\\${normalized.slice(8)}`;
	} else if (normalized.startsWith("\\\\?\\")) {
		normalized = normalized.slice(4);
	} else if (normalized.startsWith("\\??\\")) {
		normalized = normalized.slice(4);
	}

	if (/^[A-Za-z]:[/\\]/.test(normalized) || normalized.startsWith("\\\\")) {
		normalized = normalized.replaceAll("/", "\\");
	}

	return normalized;
}

export function isValidCwd(value: string): boolean {
	const normalized = normalizeCwd(value);
	if (normalized === "") return true;
	if (normalized.startsWith("/")) return true;
	if (/^[A-Za-z]:[/\\]/.test(normalized)) return true;
	if (/^\\\\[^\\/]+\\[^\\/]+(?:[\\/].*)?$/.test(normalized)) return true;
	return false;
}
