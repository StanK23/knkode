import type { KnkodeApi } from '../preload/index'

declare global {
	interface Window {
		api: KnkodeApi
	}
}

export {}
