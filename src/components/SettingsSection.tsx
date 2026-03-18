interface SettingsSectionProps {
	label: string;
	gap?: number | undefined;
	children: React.ReactNode;
}

const GAP_CLASS: Record<number, string> = {
	8: "gap-2",
	12: "gap-3",
	16: "gap-4",
};

export function SettingsSection({ label, gap = 12, children }: SettingsSectionProps) {
	const gapClass = GAP_CLASS[gap] ?? "gap-3";
	return (
		<div className="grid grid-cols-[110px_1fr] items-start gap-x-4 gap-y-4">
			<div className="pt-1.5">
				<span className="section-label">{label}</span>
			</div>
			<div className={`flex flex-col min-w-0 ${gapClass}`}>{children}</div>
		</div>
	);
}
