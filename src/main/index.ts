import { BrowserWindow, app, shell } from 'electron'
import path from 'node:path'
import { getAppState, saveAppState } from './config-store'
import { setCwdTrackerWindow, startCwdTracking, stopCwdTracking } from './cwd-tracker'
import { registerIpcHandlers } from './ipc'
import { killAllPtys, setPtyWindow } from './pty-manager'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
	const appState = getAppState()
	const { windowBounds } = appState

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
			sandbox: false,
		},
	})

	setPtyWindow(mainWindow)
	setCwdTrackerWindow(mainWindow)

	// Save window bounds on move/resize
	const saveBounds = () => {
		if (!mainWindow) return
		const bounds = mainWindow.getBounds()
		const state = getAppState()
		state.windowBounds = bounds
		saveAppState(state)
	}

	mainWindow.on('resize', saveBounds)
	mainWindow.on('move', saveBounds)

	// Open external links in browser
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url)
		return { action: 'deny' }
	})

	// Load the renderer
	if (process.env.ELECTRON_RENDERER_URL) {
		mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
	} else {
		mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
	}
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
	stopCwdTracking()
	killAllPtys()
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('before-quit', () => {
	stopCwdTracking()
	killAllPtys()
})
