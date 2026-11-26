// Keyframe-Screenshots der Journey-Stationen für Higgsfield (headless Chrome über DevTools-Protokoll).
// Dev-Server muss laufen (npm run dev). Aufruf: node scripts/keyframes.mjs docs/scroll-experience/keyframes 1920 1080 [suffix]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const [outDir, W = '1920', H = '1080', suffix = ''] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const PORT = 9333;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${outDir}/.chrome`,
  `--window-size=${W},${H}`, '--hide-scrollbars', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
}
if (!target) throw new Error('Chrome nicht erreichbar');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id;
  pending.set(i, (m) => (m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)));
  ws.send(JSON.stringify({ id: i, method, params }));
});
const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;

await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: +W < 768 });
await send('Page.enable');
await send('Page.navigate', { url: 'http://localhost:4321/' });
await sleep(6000);

const HIDE = (keepWaves) => `document.querySelectorAll('[data-scene], [data-progress], header, .journey-label, .journey-person, [data-chat], #chat-widget${keepWaves ? '' : ', [data-waves]'}').forEach(e => e.style.visibility = 'hidden'); document.querySelectorAll('body > *:not(main)').forEach(e => e.style.visibility = 'hidden'); true`;
const STATIONS = ['hero', 'flood', 'sort', 'graph', 'zoom-project', 'result'];
const info = await js(`!!document.querySelector('canvas[data-canvas]') && !!document.createElement('canvas').getContext('webgl2')`);
console.log('WebGL2 + Canvas:', info);

for (const s of STATIONS) {
  // Mitte des Plateaus; Hero etwas früher, solange Stern und Wellen voll stehen
  const t = s === 'hero' ? 0.05 : 0.5;
  await js(`(() => { const el = document.querySelector('[data-seg="${s}"]'); const r = el.getBoundingClientRect(); window.scrollTo(0, scrollY + r.top + ${t} * r.height); return true; })()`);
  await sleep(7000);
  await js(HIDE(s === 'hero'));
  await sleep(400);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const f = `${outDir}/kf-${s}${suffix}.png`;
  writeFileSync(f, Buffer.from(data, 'base64'));
  console.log('gespeichert', f);
  await js(`document.querySelectorAll('[style*="visibility"]').forEach(e => e.style.visibility = ''); true`);
}
ws.close();
chrome.kill();
await sleep(500);
rmSync(`${outDir}/.chrome`, { recursive: true, force: true });
