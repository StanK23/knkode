import { useEffect, useState } from "react";
import type { ShellOption } from "../shared/types";
import {
	CUSTOM_SHELL_VALUE,
	DEFAULT_SHELL_VALUE,
	FALLBACK_SHELL_OPTIONS,
	getShellPlaceholder,
	getShellSelectValue,
	loadShellOptions,
} from "../utils/shells";

interface ShellSelectorProps {
	value: string | null;
	onChange: (value: string | null) => void;
	selectClassName: string;
	inputClassName: string;
	ariaLabel: string;
	autoFocusInput?: boolean;
}

export function ShellSelector({
	value,
	onChange,
	selectClassName,
	inputClassName,
	ariaLabel,
	autoFocusInput = false,
}: ShellSelectorProps) {
	const [options, setOptions] = useState<readonly ShellOption[]>(FALLBACK_SHELL_OPTIONS);
	const [mode, setMode] = useState(() => getShellSelectValue(value, FALLBACK_SHELL_OPTIONS));
	const [customValue, setCustomValue] = useState(
		getShellSelectValue(value, FALLBACK_SHELL_OPTIONS) === CUSTOM_SHELL_VALUE ? value ?? "" : "",
	);

	useEffect(() => {
		let cancelled = false;
		loadShellOptions().then((loaded) => {
			if (cancelled) return;
			setOptions(loaded);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		const nextMode = getShellSelectValue(value, options);
		setMode(nextMode);
		if (nextMode === CUSTOM_SHELL_VALUE) {
			setCustomValue(value ?? "");
		}
	}, [options, value]);

	const commitCustom = () => {
		const next = customValue.trim();
		if (!next) {
			setMode(DEFAULT_SHELL_VALUE);
			onChange(null);
			return;
		}
		onChange(next);
	};

	return (
		<>
			<select
				value={mode}
				onChange={(e) => {
					const next = e.target.value;
					setMode(next);
					if (next === DEFAULT_SHELL_VALUE) {
						onChange(null);
						return;
					}
					if (next === CUSTOM_SHELL_VALUE) {
						if (getShellSelectValue(value, options) !== CUSTOM_SHELL_VALUE) {
							setCustomValue("");
						}
						return;
					}
					onChange(next);
				}}
				className={selectClassName}
				aria-label={ariaLabel}
			>
				<option value={DEFAULT_SHELL_VALUE}>Default shell</option>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
				<option value={CUSTOM_SHELL_VALUE}>Custom…</option>
			</select>
			{mode === CUSTOM_SHELL_VALUE && (
				<input
					value={customValue}
					onChange={(e) => setCustomValue(e.target.value)}
					onBlur={commitCustom}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.currentTarget.blur();
						}
						if (e.key === "Escape") {
							setCustomValue(value ?? "");
						}
					}}
					placeholder={getShellPlaceholder()}
					className={inputClassName}
					aria-label={`${ariaLabel} custom value`}
					autoFocus={autoFocusInput}
				/>
			)}
		</>
	);
}
