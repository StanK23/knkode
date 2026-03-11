import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './components/pane-chrome/all-variants'
import './styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
)
