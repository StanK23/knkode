const { execFileSync } = require('child_process')
const path = require('path')

if (process.platform === 'darwin') {
	try {
		execFileSync('bash', [path.join(__dirname, 'patch-electron-name.sh')], { stdio: 'inherit' })
	} catch (err) {
		console.warn('[postinstall] patch-electron-name.sh failed (cosmetic, non-fatal):', err.message)
	}
}
