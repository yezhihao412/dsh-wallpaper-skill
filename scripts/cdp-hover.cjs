/**
 * 把鼠标移到指定坐标（触发 :hover），然后截图。
 * 用法：node cdp-hover.cjs <x> <y> <输出png>
 */
'use strict';

const fs = require('fs');

async function main() {
  const x = Number(process.argv[2]);
  const y = Number(process.argv[3]);
  const out = process.argv[4];
  const port = process.argv[5] || '9222';

  const list = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json());
  const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!page) throw new Error('no page');

  const png = await new Promise((resolve, reject) => {
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 0;
    const pending = new Map();
    const send = (method, params) =>
      new Promise((res) => {
        id += 1;
        pending.set(id, res);
        ws.send(JSON.stringify({ id, method, params: params || {} }));
      });
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        pending.get(m.id)(m);
        pending.delete(m.id);
      }
    };
    ws.onerror = () => reject(new Error('ws error'));
    ws.onopen = async () => {
      try {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', clickCount: 0 });
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 1, y: y + 1, button: 'none', clickCount: 0 });
        await new Promise((r) => setTimeout(r, 600));
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        ws.close();
        resolve(shot.result.data);
      } catch (e) {
        reject(e);
      }
    };
  });

  fs.writeFileSync(out, Buffer.from(png, 'base64'));
  console.log('saved ' + out);
}

main().catch((e) => console.log('FAIL ' + String(e && e.message || e)));
