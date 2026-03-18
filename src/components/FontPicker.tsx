import { TERMINAL_FONTS } from "../data/theme-presets";

interface FontPickerProps {
	value: string;
	onChange: (font: string) => void;
	size?: "sm" | "md";
}

const SIZES = {
	sm: { grid: "gap-1", btn: "py-1 px-1.5 rounded-sm text-[10px]" },
	md: { grid: "gap-1.5", btn: "py-1.5 px-2 rounded-md text-xs" },
} as const;

const ACTIVE_CLASS = "border-accent bg-accent/15";
const INACTIVE_CLASS = "border-edge bg-sunken hover:border-content-muted";
const FOCUS_CLASS = "focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none";

export function FontPicker({ value, onChange, size = "md" }: FontPickerProps) {
	const s = SIZES[size];

	return (
		<div className={`grid grid-cols-3 ${s.grid}`}>
			<button
				type="button"
				onClick={() => onChange("")}
				aria-label="Default font"
				aria-pressed={value === ""}
				className={`cursor-pointer border ${s.btn} ${FOCUS_CLASS} ${
					value === "" ? ACTIVE_CLASS : INACTIVE_CLASS
				}`}
			>
				Default
			</button>
			{TERMINAL_FONTS.map((font) => (
				<button
					type="button"
					key={font}
					onClick={() => onChange(font)}
					aria-pressed={value === font}
					className={`cursor-pointer border truncate ${s.btn} ${FOCUS_CLASS} ${
						value === font ? ACTIVE_CLASS : INACTIVE_CLASS
					}`}
					style={{ fontFamily: font }}
				>
					{font}
				</button>
			))}
		</div>
	);
}
