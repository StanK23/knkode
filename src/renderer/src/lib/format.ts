/** Format a token count for compact display.
 *  9999 → "9,999", 12345 → "12.3k", 123456 → "123k" */
export function formatTokens(n: number): string {
	if (n < 10_000) return n.toLocaleString()
	if (n < 100_000) return `${(n / 1000).toFixed(1)}k`
	return `${Math.round(n / 1000)}k`
}
