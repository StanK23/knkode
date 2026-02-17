import { BrowserWindow, app, shell } from 'electron'
import path from 'node:path'
import { getAppState, saveAppState } from './config-store'
import { startCwdTracking, stopCwdTracking } from './cwd-tracker'
import { registerIpcHandlers } from './ipc'
import { setMainWindow } from './main-window'
import { killAllPtys } from './pty-manager'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
	const { windowBounds } = getAppState()

	mainWindow = new BrowserWindow({
		x: windowBounds.x,
		y: windowBounds.y,
		width: windowBounds.width,
		height: windowBounds.height,
		minWidth: 600,
		minHeight: 400,
		titleBarStyle: 'hiddenInset',
		trafficLightPosition: { x: 12, y: 12 },
		backgroundColor: '#1a1a2e',
		webPreferences: {
			preload: path.join(__dirname, '../preload/index.js'),
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true,
			webSecurity: true,
		},
	})

	setMainWindow(mainWindow)

	// Debounced window bounds save — avoids disk I/O on every resize/move frame
	let saveBoundsTimer: ReturnType<typeof setTimeout> | null = null
	function saveBounds(): void {
		if (saveBoundsTimer) clearTimeout(saveBoundsTimer)
		saveBoundsTimer = setTimeout(() => {
			if (!mainWindow) return
			try {
				const bounds = mainWindow.getBounds()
				const state = getAppState()
				state.windowBounds = bounds
				saveAppState(state)
			} catch (err) {
				console.error('[main] Failed to save window bounds:', err)
			}
		}, 500)
	}

	mainWindow.on('resize', saveBounds)
	mainWindow.on('move', saveBounds)

	// Open external links in browser — only allow http/https
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		try {
			const parsed = new URL(url)
			if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
				shell.openExternal(url)
			}
		} catch {
			// Invalid URL — ignore
		}
		return { action: 'deny' }
	})

	// Load the renderer
	if (process.env.ELECTRON_RENDERER_URL) {
		mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
	} else {
		mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
	}
}

let cleanedUp = false
function cleanup(): void {
	if (cleanedUp) return
	cleanedUp = true
	stopCwdTracking()
	killAllPtys()
}

app.whenReady().then(() => {
	registerIpcHandlers()
	createWindow()
	startCwdTracking()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.on('window-all-closed', () => {
	cleanup()
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('before-quit', cleanup)
