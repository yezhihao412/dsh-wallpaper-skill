/**
 * 通过 CDP 截一张页面渲染图，保存成 PNG。
 * 用法：node cdp-shot.cjs <输出png路径> [端口]
 */
'use strict';

const fs = require('fs');

async function main() {
  const out = process.argv[2];
  const port = process.argv[3] || '9222';

  const list = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json());
  const pages = list.filter((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!pages.length) throw new Error('no page target');
  const page = pages[0];

  const png = await new Promise((resolve, reject) => {
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    const timer = setTimeout(() => reject(new Error('timeout')), 25000);
    let id = 0;
    const pending = new Map();

    const send = (method, params) =>
      new Promise((res) => {
        id += 1;
        pending.set(id, res);
        ws.send(JSON.stringify({ id, method, params: params || {} }));
      });

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    };
    ws.onerror = (e) => {
      clearTimeout(timer);
      reject(new Error('ws error'));
    };
    ws.onopen = async () => {
      try {
        await send('Page.enable');
        const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        clearTimeout(timer);
        ws.close();
        if (!r.result || !r.result.data) return reject(new Error('no screenshot data'));
        resolve(r.result.data);
      } catch (e) {
        clearTimeout(timer);
        reject(e);
      }
    };
  });

  fs.writeFileSync(out, Buffer.from(png, 'base64'));
  console.log('saved ' + out + ' ' + Math.round(fs.statSync(out).size / 1024) + ' KB');
}

main().catch((e) => {
  console.log('FAIL ' + String(e && e.message || e));
});
