/** Format a token count for compact display.
 *  999 → "999", 1234 → "1.2k", 12345 → "12k" */
export function formatTokens(n: number): string {
	if (n < 1000) return String(n)
	if (n < 10_000) return `${(n / 1000).toFixed(1)}k`
	return `${Math.round(n / 1000)}k`
}
