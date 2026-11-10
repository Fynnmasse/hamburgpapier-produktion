// Kleiner lokaler Server für die Vorschau (liefert den Projektordner aus).
//
//   node shopware/vorschau-server.mjs
//   → http://localhost:8765/shopware/vorschau.html   (Block im Shop-Rahmen)
//   → http://localhost:8765/                         (bisherige Einzelseite)

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT) || 8765;
const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.avif': 'image/avif',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.ttf': 'font/ttf'
};

createServer((request, response) => {
    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Private-Network': 'true',
        'Cache-Control': 'no-store'
    };
    if (request.method === 'OPTIONS') {
        response.writeHead(204, cors);
        response.end();
        return;
    }

    let path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(root, path));
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) {
        response.writeHead(403, cors);
        response.end('Forbidden');
        return;
    }

    let stat;
    try {
        stat = statSync(file);
    } catch {
        response.writeHead(404, cors);
        response.end('Not found');
        return;
    }
    if (!stat.isFile()) {
        response.writeHead(404, cors);
        response.end('Not found');
        return;
    }

    const headers = { ...cors, 'Content-Type': types[extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range || '');
    if (range) {
        const start = range[1] ? Number(range[1]) : 0;
        const end = range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
        if (start > end || start >= stat.size) {
            response.writeHead(416, { ...headers, 'Content-Range': `bytes */${stat.size}` });
            response.end();
            return;
        }
        response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
        createReadStream(file, { start, end }).pipe(response);
        return;
    }
    response.writeHead(200, { ...headers, 'Content-Length': stat.size });
    createReadStream(file).pipe(response);
}).listen(port, () => {
    console.log(`Vorschau läuft: http://localhost:${port}/shopware/vorschau.html`);
});
