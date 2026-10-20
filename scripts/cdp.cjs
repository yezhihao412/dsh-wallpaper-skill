/**
 * 极简 CDP 客户端：连上 Electron 的调试端口，执行一段 JS，把结果打成 JSON。
 * 用法：node cdp.js <包含表达式的文件路径> [ws 端口，默认 9222]
 */
'use strict';

const fs = require('fs');

async function main() {
  const exprFile = process.argv[2];
  const port = process.argv[3] || '9222';
  const expression = fs.readFileSync(exprFile, 'utf8');

  const list = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json());
  const pages = list.filter((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!pages.length) {
    console.log(JSON.stringify({ ok: false, error: 'no page target', targets: list.map((t) => t.type + ' ' + t.url) }));
    return;
  }
  const page = pages[0];

  const result = await new Promise((resolve, reject) => {
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    const timer = setTimeout(() => reject(new Error('timeout')), 20000);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true, awaitPromise: true, userGesture: true },
      }));
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== 1) return;
      clearTimeout(timer);
      ws.close();
      if (msg.error) return reject(new Error(JSON.stringify(msg.error)));
      const r = msg.result || {};
      resolve(r.result ? r.result.value : r);
    };
    ws.onerror = (e) => {
      clearTimeout(timer);
      reject(new Error('ws error: ' + (e.message || 'unknown')));
    };
  });

  console.log(JSON.stringify({ ok: true, url: page.url, value: result }, null, 2));
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: String(e && e.message || e) }));
});
