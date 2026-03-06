/** Strip ANSI escape sequences from a string, returning plain text. */
export function stripAnsi(s: string): string {
	// Matches: CSI sequences, OSC sequences, single-char escapes (e.g. ESC[?25h)
	// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional ANSI matching
	return s.replace(/\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*\x07|\x1b[()][A-Z0-9]|\x1b[=>]/g, '')
}
