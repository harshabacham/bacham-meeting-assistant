import { execSync } from 'child_process';

try {
  if (process.platform === 'win32') {
    // Force kill appsdesktop.exe to unlock compilation
    execSync('taskkill /F /IM appsdesktop.exe', { stdio: 'ignore' });
  } else {
    execSync('killall -9 appsdesktop', { stdio: 'ignore' });
  }
} catch (e) {
  // Ignore error if process is not running
}
