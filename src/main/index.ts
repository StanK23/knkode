import path from 'node:path'
import { BrowserWindow, app, nativeImage, shell } from 'electron'
import { getAppState, saveAppState } from './config-store'
import { startCwdTracking, stopCwdTracking } from './cwd-tracker'
import { registerIpcHandlers } from './ipc'
import { getMainWindow, setMainWindow } from './main-window'
import { killAllPtys } from './pty-manager'

// Override the default "Electron" app name (visible in macOS dock tooltip and Windows taskbar)
app.setName('knkode')

// __dirname resolves to out/main/ at runtime; in packaged builds, resources are in process.resourcesPath
const APP_ICON_PATH = app.isPackaged
	? path.join(process.resourcesPath, 'icon.png')
	: path.join(__dirname, '../../resources/icon.png')

const isMac = process.platform === 'darwin'

function createWindow(): void {
	const { windowBounds } = getAppState()

	const appIcon = nativeImage.createFromPath(APP_ICON_PATH)
	if (appIcon.isEmpty()) {
		console.warn('[main] App icon not found at', APP_ICON_PATH)
	}

	const win = new BrowserWindow({
		x: windowBounds.x,
		y: windowBounds.y,
		width: windowBounds.width,
		height: windowBounds.height,
		minWidth: 600,
		minHeight: 400,
		icon: appIcon,
		title: 'knkode',
		transparent: true,
		...(isMac && {
			titleBarStyle: 'hiddenInset' as const,
			trafficLightPosition: { x: 12, y: 12 },
			vibrancy: 'under-window' as const,
			hasShadow: true,
		}),
		...(!isMac && { backgroundMaterial: 'acrylic' as const }),
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
}

app
	.whenReady()
	.then(() => {
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
