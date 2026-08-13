import { execSync, spawnSync } from 'child_process';

// ── Step 1: Kill zombies ─────────────────────────────────────────────────────
function killPort(port) {
  try {
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of result.trim().split('\n')) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0' && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try { execSync(`taskkill /F /PID ${pid} /T`, { stdio: 'ignore' }); } catch (_) {}
    }
  } catch (_) {}
}

if (process.platform === 'win32') {
  try { execSync('taskkill /F /IM appsdesktop.exe /T', { stdio: 'ignore' }); } catch (_) {}
  killPort(1420);
  killPort(1421);
  spawnSync('cmd', ['/c', 'ping -n 3 127.0.0.1 > nul'], { stdio: 'ignore' });
} else {
  try { execSync('pkill -9 appsdesktop', { stdio: 'ignore' }); } catch (_) {}
  try { execSync('fuser -k 1420/tcp 1421/tcp', { stdio: 'ignore' }); } catch (_) {}
}

// ── Step 2: Launch Vite ──────────────────────────────────────────────────────
const result = spawnSync('npx', ['vite'], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 0);
