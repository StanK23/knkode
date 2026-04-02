import { type RefObject, useEffect } from "react";

export const FOCUSABLE_SELECTOR =
	'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface UseModalFocusTrapOptions {
	initialFocus?: "dialog" | "first";
}

export function useModalFocusTrap(
	dialogRef: RefObject<HTMLElement | null>,
	enabled = true,
	options: UseModalFocusTrapOptions = {},
): void {
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!enabled || !dialog) return;

		const handler = (e: KeyboardEvent) => {
			if (e.key !== "Tab") return;
			const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (!first || !last) return;
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		};

		dialog.addEventListener("keydown", handler);
		if (options.initialFocus === "dialog") {
			dialog.focus();
		} else {
			dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
		}

		return () => dialog.removeEventListener("keydown", handler);
	}, [dialogRef, enabled, options.initialFocus]);
}
