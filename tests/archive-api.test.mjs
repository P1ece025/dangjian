import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import net from 'node:net';
async function freePort() {
  const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));
  const port=s.address().port;await new Promise(r=>s.close(r));return port;
}
test('归档页面逻辑与真实HTTP接口：匹配、重复、原件下载和同步', async () => {
 const dir=await mkdtemp(path.join(os.tmpdir(),'qinghe-http-'));
 const port=await freePort();
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),QINGHE_ARCHIVE_DIR:dir},stdio:['ignore','pipe','pipe']});
 try {
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('启动超时')),5000);child.stdout.on('data',b=>{if(b.toString().includes('http://')){clearTimeout(t);resolve();}});child.on('error',reject);child.on('exit',c=>{clearTimeout(t);reject(new Error('Server exited '+c));});});
  const base='http://127.0.0.1:'+port;
  for(const p of ['/','/archive.js','/app.js','/styles.css'])assert.equal((await fetch(base+p)).status,200);
  assert.equal((await fetch(base+'/api/archive',{headers:{Origin:'https://example.com'}})).status,403);
  const elements=new Map();const element=()=>({innerHTML:'',style:{},classList:{add(){},remove(){}},focus(){},click(){},value:'',checked:false});
  for(const name of ['app','modal-root','toast','upload-list','archive-service','upload-summary','dropzone','upload-files'])elements.set('#'+name,element());
  elements.set('[data-action="confirm-upload"]',element());
  const context=vm.createContext({console,setTimeout,clearTimeout,Date,Math,Blob,URL,crypto:webcrypto,TextDecoder,btoa:s=>Buffer.from(s,'binary').toString('base64'),fetch:(url,opts)=>fetch(base+url,opts),localStorage:{getItem(){return null},setItem(){}},document:{activeElement:element(),querySelector:s=>elements.get(s)||null,querySelectorAll:()=>[],addEventListener(){},getElementById:()=>null},window:{scrollTo(){}},navigator:{}});
  for(const file of ['model.js','archive.js','app.js'])vm.runInContext(await readFile('public/'+file,'utf8'),context);
  vm.runInContext('uploadModal()',context);await vm.runInContext('refreshArchiveConnection()',context);
  const bytes=Buffer.from('思想汇报\n姓名：林沐\n学号：20231001\n落款日期：2026-10-13\n虚拟材料');
  context.file={name:'20231001_林沐_思想汇报.txt',size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
  await vm.runInContext('addFiles([file,file])',context);
  assert.equal(vm.runInContext('uploads[0].studentId',context),'DEMO-001');
  assert.equal(vm.runInContext('uploads[1].duplicate',context),true);
  const before=vm.runInContext('state.students[0].docs.length',context);
  await vm.runInContext('confirmUpload()',context);
  assert.equal(vm.runInContext('state.students[0].docs.length',context),before+1);
  const entries=(await (await fetch(base+'/api/archive')).json()).entries;assert.equal(entries.length,1);
  const r=await fetch(base+'/api/archive/'+entries[0].id+'/file');assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);
  vm.runInContext("selected=state.students[0].id;docId=student().docs.at(-1).id;page='detail';detailTab='materials';render()",context);
  assert(elements.get('#app').innerHTML.includes('下载原件'));
  vm.runInContext('state.students[0].docs.pop()',context);await vm.runInContext('syncArchiveRecords()',context);
  assert.equal(vm.runInContext('state.students[0].docs.length',context),before+1);
  assert.equal((await fetch(base+'/data/archive/index.json')).status,404);
  vm.runInContext('clearTimeout(toast.timer)',context);
 } finally {
  if(child.exitCode===null)await new Promise(r=>{child.once('exit',r);child.kill();});
  await rm(dir,{recursive:true,force:true});
 }
});
