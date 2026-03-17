/// <reference types="vite/client" />

import type { KnkodeApi } from "./shared/types";

declare global {
	interface Window {
		api: KnkodeApi;
	}
}
