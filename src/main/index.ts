import path from 'node:path'
import { BrowserWindow, Menu, app, nativeImage, shell } from 'electron'
import { buildAppMenuTemplate } from './app-menu'
import { getAppState, saveAppState } from './config-store'
import { startCwdTracking, stopCwdTracking } from './cwd-tracker'
import { registerIpcHandlers } from './ipc'
import { getMainWindow, setMainWindow } from './main-window'
import { killAllPtys } from './pty-manager'
import { flushScrollDebugLog } from './scroll-debug-log'

// Override the default "Electron" app name (visible in macOS dock tooltip and Windows taskbar)
app.setName('knkode')

// __dirname resolves to out/main/ at runtime; in packaged builds, resources are in process.resourcesPath
const APP_ICON_PATH = app.isPackaged
	? path.join(process.resourcesPath, 'icon.png')
	: path.join(__dirname, '../../resources/icon.png')

const isMac = process.platform === 'darwin'

// Custom application menu:
// - macOS keeps the native Paste accelerator so Cmd+V continues to work
// - Windows/Linux use a custom Paste item without an accelerator to avoid the
//   double-paste path triggered by Electron + browser paste handling together
function buildAppMenu(): void {
	Menu.setApplicationMenu(Menu.buildFromTemplate(buildAppMenuTemplate(process.platform, app.name)))
}

function createWindow(): void {
	const { windowBounds } = getAppState()

	const appIcon = nativeImage.createFromPath(APP_ICON_PATH)
	if (appIcon.isEmpty()) {
		console.warn('[main] App icon not found at', APP_ICON_PATH)
	}

	const isWindows = process.platform === 'win32'

	const win = new BrowserWindow({
		x: windowBounds.x,
		y: windowBounds.y,
		width: windowBounds.width,
		height: windowBounds.height,
		minWidth: 600,
		minHeight: 400,
		icon: appIcon,
		title: 'knkode',
		// transparent: true is required on macOS for vibrancy but causes issues on
		// Windows without frame: false and has no blur equivalent on Linux.
		...(isMac && {
			transparent: true,
			titleBarStyle: 'hiddenInset' as const,
			trafficLightPosition: { x: 12, y: 12 },
			vibrancy: 'under-window' as const,
			hasShadow: true,
		}),
		// Windows: backgroundMaterial works independently of transparent flag;
		// autoHideMenuBar hides the native File/Edit/View bar (Alt to reveal);
		// maximizable ensures the maximize button is not grayed out.
		...(isWindows && {
			backgroundMaterial: 'acrylic' as const,
			autoHideMenuBar: true,
			maximizable: true,
		}),
		// Linux: no platform-native blur API in Electron — opaque window
		...(!isMac && !isWindows && { backgroundColor: '#1a1a2e' }),
		webPreferences: {
			preload: path.join(__dirname, '../preload/index.js'),
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true,
			webSecurity: true,
		},
	})

	// Set dock icon on macOS (ensures custom icon during development; production uses bundled .icns)
	if (isMac && app.dock) {
		app.dock.setIcon(appIcon)
	}

	// Windows + backgroundMaterial: 'acrylic' can gray out the maximize button
	// even with maximizable: true in the constructor. Force it after creation.
	if (isWindows) {
		win.setMaximizable(true)
		win.setResizable(true)
	}

	// Windows + backgroundMaterial: 'acrylic' can lose keyboard focus to the
	// native frame after minimize/restore, alt-menu, or taskbar interactions.
	// Force web contents focus when the window regains focus.
	if (isWindows) {
		win.on('focus', () => {
			try {
				if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
					win.webContents.focus()
				}
			} catch (err) {
				console.warn('[main] webContents.focus() failed:', err)
			}
		})
	}

	setMainWindow(win)

	let saveBoundsTimer: ReturnType<typeof setTimeout> | null = null
	function saveBounds(): void {
		if (saveBoundsTimer) clearTimeout(saveBoundsTimer)
		saveBoundsTimer = setTimeout(() => {
			const mw = getMainWindow()
			if (!mw) return
			try {
				const bounds = mw.getBounds()
				const state = getAppState()
				state.windowBounds = bounds
				saveAppState(state)
			} catch (err) {
				console.error('[main] Failed to save window bounds:', err)
			}
		}, 500)
	}

	win.on('resize', saveBounds)
	win.on('move', saveBounds)

	win.webContents.setWindowOpenHandler(({ url }) => {
		try {
			const parsed = new URL(url)
			if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
				shell.openExternal(url).catch((err) => {
					console.error('[main] Failed to open external URL:', err)
				})
			}
		} catch {
			/* invalid URL — ignore */
		}
		return { action: 'deny' }
	})

	// Prevent the main window from navigating away from the renderer
	win.webContents.on('will-navigate', (e) => {
		e.preventDefault()
	})

	if (process.env.ELECTRON_RENDERER_URL) {
		win.loadURL(process.env.ELECTRON_RENDERER_URL)
	} else {
		win.loadFile(path.join(__dirname, '../renderer/index.html'))
	}
}

let cleanedUp = false
function cleanup(): void {
	if (cleanedUp) return
	cleanedUp = true
	stopCwdTracking()
	killAllPtys()
	void flushScrollDebugLog()
}

app
	.whenReady()
	.then(() => {
		buildAppMenu()
		registerIpcHandlers()
		createWindow()
		startCwdTracking()

		app.on('activate', () => {
			if (BrowserWindow.getAllWindows().length === 0) {
				createWindow()
			}
		})
	})
	.catch((err) => {
		console.error('[main] app.whenReady() failed:', err)
	})

app.on('window-all-closed', () => {
	cleanup()
	if (!isMac) {
		app.quit()
	}
})

app.on('before-quit', cleanup)
