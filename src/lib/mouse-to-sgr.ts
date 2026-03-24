/** SGR mouse event encoder — converts DOM mouse/wheel events into SGR 1006
 *  escape sequences for forwarding to the PTY when the running program has
 *  enabled mouse reporting.
 *
 *  SGR format: `\x1b[<button;col;row{M|m}`
 *    - M = press/motion, m = release
 *    - col and row are 1-based
 *    - button encodes the action + modifiers */

/** SGR button codes for mouse actions. */
const BTN_LEFT = 0;
const BTN_MIDDLE = 1;
const BTN_RIGHT = 2;
const BTN_WHEEL_UP = 64;
const BTN_WHEEL_DOWN = 65;
const BTN_MOTION = 32;

/** Modifier flag bits ORed into the button code. */
const MOD_SHIFT = 4;
const MOD_META = 8;
const MOD_CTRL = 16;

/** Build the modifier bits from a DOM event. */
function modifierBits(e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }): number {
	let bits = 0;
	if (e.shiftKey) bits |= MOD_SHIFT;
	if (e.metaKey) bits |= MOD_META;
	if (e.ctrlKey) bits |= MOD_CTRL;
	return bits;
}

/** Map DOM MouseEvent.button to SGR button code. */
function domButtonToSgr(button: number): number {
	switch (button) {
		case 0:
			return BTN_LEFT;
		case 1:
			return BTN_MIDDLE;
		case 2:
			return BTN_RIGHT;
		default:
			return BTN_LEFT;
	}
}

/** Encode a mouse press as an SGR sequence. Col/row are 1-based terminal coordinates. */
export function sgrMousePress(
	button: number,
	col: number,
	row: number,
	e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
): string {
	const code = domButtonToSgr(button) | modifierBits(e);
	return `\x1b[<${code};${col};${row}M`;
}

/** Encode a mouse release as an SGR sequence. */
export function sgrMouseRelease(
	button: number,
	col: number,
	row: number,
	e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
): string {
	const code = domButtonToSgr(button) | modifierBits(e);
	return `\x1b[<${code};${col};${row}m`;
}

/** Encode a mouse motion (with button held) as an SGR sequence. */
export function sgrMouseMotion(
	button: number,
	col: number,
	row: number,
	e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
): string {
	const code = domButtonToSgr(button) | BTN_MOTION | modifierBits(e);
	return `\x1b[<${code};${col};${row}M`;
}

/** Encode a wheel scroll as an SGR sequence.
 *  @param deltaLines - positive = scroll up, negative = scroll down */
export function sgrWheelScroll(
	deltaLines: number,
	col: number,
	row: number,
	e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean },
): string {
	const btn = deltaLines > 0 ? BTN_WHEEL_UP : BTN_WHEEL_DOWN;
	const code = btn | modifierBits(e);
	return `\x1b[<${code};${col};${row}M`;
}
