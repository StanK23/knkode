/** Strip ANSI escape sequences from a string, returning plain text. */
export function stripAnsi(s: string): string {
	// Matches: CSI sequences (incl. private-mode ?), OSC sequences (BEL or ST terminated),
	// charset designations (ESC(B), keypad modes (ESC= ESC>)
	// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional ANSI matching
	return s.replace(
		/\x1b\[[?]?[0-9;]*[A-Za-z]|\x1b\](?:[^\x07\x1b]*(?:\x07|\x1b\\))|\x1b[()][A-Z0-9]|\x1b[=>]/g,
		'',
	)
}
