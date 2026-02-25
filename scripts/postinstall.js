const { execFileSync } = require('child_process')
const path = require('path')

if (process.platform === 'darwin') {
	try {
		execFileSync('bash', [path.join(__dirname, 'patch-electron-name.sh')], { stdio: 'inherit' })
	} catch {
		/* non-fatal — cosmetic dev-only patch */
	}
}
