/** Accept empty (inherits default cwd), or absolute Unix paths.
 *  Tilde paths are not accepted — callers should resolve ~ to homeDir before validating. */
export function isValidCwd(value: string): boolean {
	return value === '' || value.startsWith('/')
}
