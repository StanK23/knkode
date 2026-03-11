import { createAndRegisterVariant } from './createVariant'

createAndRegisterVariant('Solarized Light', {
	statusBar: {
		height: 30,
		className: 'gap-2 px-3 text-[11px]',
		style: (theme, isFocused) => ({
			color: theme.foreground,
			borderBottom: `1px solid ${isFocused ? theme.accent : `${theme.foreground}22`}`,
		}),
		separator: '│',
		separatorOpacity: 'opacity-20',
		separatorStyle: (theme) => ({ color: theme.foreground }),
		showSeparatorAfterLabel: false,
		editInput: {
			className: 'border rounded-sm text-[11px] py-px px-1 w-20',
			style: (theme) => ({ borderColor: theme.accent, color: theme.foreground }),
		},
		cwd: {
			className: 'opacity-50 flex items-center gap-1 text-[10px]',
			icon: 'folder',
			iconClassName: 'opacity-50',
		},
		branch: {
			className: 'text-[10px] font-medium px-2 py-px rounded-sm',
			style: (theme) => ({ backgroundColor: `${theme.accent}18`, color: theme.accent }),
		},
		pr: {
			className: 'text-[10px] font-medium px-2 py-px rounded-sm opacity-40 hover:opacity-80',
			style: (theme) => ({ backgroundColor: `${theme.accent}18`, color: theme.accent }),
		},
		action: {
			className: 'text-[11px] px-0.5 opacity-40 hover:opacity-80',
			style: (theme) => ({ color: theme.foreground }),
		},
		snippet: { label: '>_' },
	},
	scrollButton: {
		className: 'bottom-3 left-1/4 right-1/4 h-8 rounded-md text-xs hover:brightness-110',
		style: (theme) => ({
			backgroundColor: `${theme.background}ee`,
			color: theme.foreground,
			border: `1px solid ${theme.accent}44`,
			boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
		}),
		text: '↓ bottom',
	},
})
