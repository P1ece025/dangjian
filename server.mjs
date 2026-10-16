/** 本地开发静态服务器：仅使用 Node.js 内置模块。 */
import http from 'node:http';
import { ArchiveStore } from './archive-store.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const port = Number(process.env.PORT || 3000);
const host = '127.0.0.1';
const store = new ArchiveStore(process.env.QINGHE_ARCHIVE_DIR || fileURLToPath(new URL('./data/archive/', import.meta.url)));
const json = (res, status, value) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(value)); }; 
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer between 1 and 65535.');
  process.exit(1);
}
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};
const server = http.createServer(async (req, res) => {
  const validHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  if (!validHosts.has(req.headers.host)) { json(res, 403, {error:'Host not allowed'}); return; }
  if (req.headers.origin && ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(req.headers.origin)) { json(res, 403, {error:'Origin not allowed'}); return; }
  if (req.url.startsWith('/api/')) {
    try {
      if (req.url === '/api/archive' && req.method === 'GET') { json(res, 200, {entries:await store.list()}); return; }
      if (req.url === '/api/archive' && req.method === 'POST') {
        if (!req.headers['content-type']?.startsWith('application/json')) { json(res,415,{error:'JSON required'}); return; }
        let size=0; const chunks=[];
        for await (const chunk of req) { size += chunk.length; if(size > 15 * 1024 * 1024) { json(res,413,{error:'请求超过大小限制'}); return; } chunks.push(chunk); }
        const result = await store.add(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        json(res, result.duplicate ? 200 : 201, result); return;
      }
      const match = req.url.match(/^\/api\/archive\/([a-f0-9-]{36})\/file$/);
      if (match && req.method === 'GET') {
        const file = await store.file(match[1]);
        if(!file){ json(res,404,{error:'归档不存在'}); return; }
        res.writeHead(200, {'Content-Type':'application/octet-stream', 'Content-Disposition':`attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(file.entry.filename)}`, 'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
        res.end(file.bytes); return;
      }
      json(res,404,{error:'接口不存在'}); return;
    } catch(error) { json(res,400,{error:error.code ? '本地归档读取或写入失败，请检查目录权限和归档索引。' : error.message}); return; }
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end('Method not allowed');
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${host}`).pathname);
  } catch {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative) || pathname.includes('\0')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    const status = ['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code) ? 404 : 500;
    res.writeHead(status);
    res.end(status === 404 ? 'Not found' : 'Unable to read file');
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is in use. Set PORT to another number and try again.`
    : error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  console.log(`\nQinghe local workspace: http://${host}:${port}\n`);
  console.log('Edit files in public/ and refresh your browser. Press Ctrl+C to stop.');
});
