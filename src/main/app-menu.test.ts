import { describe, expect, it } from 'vitest'
import { buildAppMenuTemplate } from './app-menu'

function getEditSubmenu(platform: NodeJS.Platform): Electron.MenuItemConstructorOptions[] {
	const template = buildAppMenuTemplate(platform, 'knkode')
	const editMenu = template.find((item) => item.label === 'Edit')

	if (!editMenu || !Array.isArray(editMenu.submenu)) {
		throw new Error('Edit menu not found')
	}

	return editMenu.submenu
}

describe('buildAppMenuTemplate', () => {
	it('uses the native paste role on macOS', () => {
		const editSubmenu = getEditSubmenu('darwin')
		const pasteItem = editSubmenu.find((item) => 'role' in item && item.role === 'paste')

		expect(pasteItem).toBeDefined()
		expect(
			editSubmenu.some((item) => 'label' in item && item.label === 'Paste' && 'click' in item),
		).toBe(false)
	})

	it('keeps the custom paste item without a role on non-mac platforms', () => {
		const editSubmenu = getEditSubmenu('win32')
		const pasteItem = editSubmenu.find((item) => 'label' in item && item.label === 'Paste')

		expect(pasteItem).toBeDefined()
		expect(pasteItem && 'role' in pasteItem ? pasteItem.role : undefined).toBeUndefined()
		expect(typeof (pasteItem && 'click' in pasteItem ? pasteItem.click : undefined)).toBe(
			'function',
		)
	})
})
