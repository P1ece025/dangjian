import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ArchiveStore } from '../archive-store.mjs';
test('磁盘原件、索引、并发去重与重启恢复',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'qinghe-test-'));
 try {
  const store=new ArchiveStore(dir);
  const input={studentId:'DEMO-001',studentName:'林沐',studentNumber:'20231001',type:'thought',filename:'林沐_思想汇报.txt',base64:Buffer.from('思想汇报\n姓名：林沐\n此为测试。').toString('base64')};
  const [a,b]=await Promise.all([store.add(input),store.add(input)]);
  assert.equal(a.duplicate,false);assert.equal(b.duplicate,true);assert.equal(a.entry.id,b.entry.id);
  assert.equal((await store.list()).length,1);
  const original=await store.file(a.entry.id);assert.equal(original.bytes.toString('base64'),input.base64);
  const restarted=new ArchiveStore(dir);assert.equal((await restarted.list()).length,1);
  const other=await store.add({...input,studentId:'DEMO-002'});assert.equal(other.duplicate,false);
  const version=await store.add({...input,base64:Buffer.from('修改后的正文').toString('base64')});assert.equal(version.duplicate,false);
  assert.notEqual(version.entry.relativePath,a.entry.relativePath);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('拒绝无效归档身份、类型、编码和空文件',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'qinghe-validation-'));
 try{
  const store=new ArchiveStore(dir);
  const input={studentId:'DEMO-001',type:'thought',filename:'a.txt',base64:Buffer.from('a').toString('base64')};
  for(const extra of [{studentId:'../escape'},{type:'__proto__'},{base64:'!bad'},{base64:''},{filename:'a.exe'}])await assert.rejects(store.add({...input,...extra}));
  assert.equal((await store.list()).length,0);
 }finally{await rm(dir,{recursive:true,force:true});}
});
