/** Default-background cells stay transparent on the normal screen so pane
 *  effects remain visible, but must be painted opaquely on the alternate
 *  screen where TUIs expect a fully owned framebuffer. */
export function shouldPaintTerminalCellBackground(
	cellBg: string,
	defaultBg: string,
	isAltScreen: boolean,
): boolean {
	return isAltScreen || cellBg !== defaultBg;
}
