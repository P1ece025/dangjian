import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

const folders = {application:'入党申请书',thought:'思想汇报',cultivation:'培养教育考察写实簿',autobiography:'自传',volunteer:'入党志愿书',regularization:'转正申请书'};
const MAX = 10 * 1024 * 1024;
export class ArchiveStore {
  constructor(root) { this.root = root; this.indexFile = path.join(root, 'index.json'); this.queue = Promise.resolve(); }
  async list() {
    try { return JSON.parse(await readFile(this.indexFile, 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  }
  add(input) {
    const run = this.queue.then(() => this.save(input));
    this.queue = run.catch(() => {});
    return run;
  }
  async save(v) {
    if (!v || !/^[A-Za-z0-9_-]{1,80}$/.test(v.studentId) || !Object.hasOwn(folders, v.type) || typeof v.filename !== 'string' || v.filename.length > 180 || !/\.(txt|pdf|docx?|png|jpe?g)$/i.test(v.filename)) throw new Error('归档身份、材料类型或文件名无效');
    if (typeof v.base64 !== 'string' || v.base64.length > Math.ceil(MAX / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v.base64)) throw new Error('文件编码无效或超过10 MB');
    const bytes = Buffer.from(v.base64, 'base64');
    if (!bytes.length || bytes.length > MAX) throw new Error('文件为空或超过10 MB');
    const hash = createHash('sha256').update(bytes).digest('hex');
    const entries = await this.list();
    const existing = entries.find(e => e.hash === hash && e.studentId === v.studentId && e.type === v.type);
    if (existing) return { duplicate: true, entry: existing };
    const filename = v.filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').slice(0, 160);
    const id = randomUUID();
    const relativePath = [v.studentId, folders[v.type], hash.slice(0, 12) + '-' + filename].join('/');
    const file = path.join(this.root, relativePath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes, { flag: 'wx' }).catch(e => { if (e.code !== 'EEXIST') throw e; });
    const text = /\.txt$/i.test(filename) ? bytes.toString('utf8').replace(/^\uFEFF/, '').slice(0, 100000) : '';
    const entry = { id, studentId: v.studentId, studentName: String(v.studentName || '').slice(0, 50), studentNumber: String(v.studentNumber || '').slice(0, 30), type: v.type, filename, relativePath, hash, size: bytes.length, date: /^\d{4}-\d{2}-\d{2}$/.test(v.date || '') ? v.date : '', text, source: /\.txt$/i.test(filename) ? 'text' : 'registered', archivedAt: new Date().toISOString(), evidence: Array.isArray(v.evidence) ? v.evidence.map(x => String(x).slice(0, 200)).slice(0, 20) : [] };
    entries.push(entry);
    const temp = this.indexFile + '.tmp';
    await writeFile(temp, JSON.stringify(entries, null, 2));
    await rename(temp, this.indexFile);
    return { duplicate: false, entry };
  }
  async file(id) {
    const entry = (await this.list()).find(e => e.id === id);
    if (!entry) return null;
    const full = path.resolve(this.root, entry.relativePath);
    const rel = path.relative(this.root, full);
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('归档路径无效');
    return { entry, bytes: await readFile(full) };
  }
}
