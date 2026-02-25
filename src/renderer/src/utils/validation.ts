/** Accept empty (inherits default cwd), absolute Unix paths, or Windows absolute paths.
 *  Tilde paths are not accepted — callers should resolve ~ to homeDir before validating. */
export function isValidCwd(value: string): boolean {
	if (value === '') return true
	if (value.startsWith('/')) return true
	if (/^[A-Za-z]:[/\\]/.test(value)) return true
	return false
}
