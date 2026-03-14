import type { BrowserWindow } from 'electron'

export function buildAppMenuTemplate(
	platform: NodeJS.Platform,
	appName: string,
): Electron.MenuItemConstructorOptions[] {
	const isMac = platform === 'darwin'
	const template: Electron.MenuItemConstructorOptions[] = []

	if (isMac) {
		template.push({
			label: appName,
			submenu: [
				{ role: 'about' },
				{ type: 'separator' },
				{ role: 'services' },
				{ type: 'separator' },
				{ role: 'hide' },
				{ role: 'hideOthers' },
				{ role: 'unhide' },
				{ type: 'separator' },
				{ role: 'quit' },
			],
		})
	}

	template.push({
		label: 'Edit',
		submenu: [
			{ role: 'undo' },
			{ role: 'redo' },
			{ type: 'separator' },
			{ role: 'cut' },
			{ role: 'copy' },
			isMac
				? { role: 'paste' }
				: {
						label: 'Paste',
						click: (_menuItem, win) => (win as BrowserWindow | undefined)?.webContents.paste(),
					},
			{ type: 'separator' },
			{ role: 'selectAll' },
		],
	})

	template.push({
		label: 'View',
		submenu: [
			{ role: 'reload' },
			{ role: 'forceReload' },
			{ role: 'toggleDevTools' },
			{ type: 'separator' },
			{ role: 'resetZoom' },
			{ role: 'zoomIn' },
			{ role: 'zoomOut' },
			{ type: 'separator' },
			{ role: 'togglefullscreen' },
		],
	})

	template.push({
		label: 'Window',
		submenu: isMac
			? [
					{ role: 'minimize' as const },
					{ role: 'zoom' as const },
					{ type: 'separator' as const },
					{ role: 'front' as const },
				]
			: [{ role: 'minimize' as const }, { role: 'close' as const }],
	})

	return template
}
