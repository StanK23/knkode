const INTERACTIVE_TARGET_SELECTOR = [
	"button",
	"input",
	"select",
	"textarea",
	"a[href]",
	"[role='button']",
	"[role='menuitem']",
	"[contenteditable='true']",
].join(", ");

export function isInteractiveTarget(target: EventTarget | null): boolean {
	return target instanceof Element && target.closest(INTERACTIVE_TARGET_SELECTOR) !== null;
}
