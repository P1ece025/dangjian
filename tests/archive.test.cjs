const test=require('node:test');
const assert=require('node:assert/strict');
const Q=require('../public/model.js');
const A=require('../public/archive.js');
const students=Q.seed().students;
test('文件名识别学生、类型和落款日期',()=>{
 const a=A.classify('20231001_林沐_思想汇报_2026-10-13.txt','',students);
 assert.equal(a.studentId,'DEMO-001');assert.equal(a.type,'thought');assert.equal(a.date,'2026-10-13');
});
test('TXT明确身份字段和独立标题可完成归档',()=>{
 const a=A.classify('scan.txt','自传\n姓名：陈知远\n学号：20231002\n日期：2026年10月13日',students);
 assert.equal(a.studentId,'DEMO-002');assert.equal(a.type,'autobiography');assert.equal(a.date,'2026-10-13');
});
test('姓名与学号冲突、未知身份和多种材料均留待确认',()=>{
 assert.equal(A.classify('20231001_陈知远_自传.txt','',students).studentId,'');
 assert.equal(A.classify('林沐_自传.txt','学号：99999999',students).studentId,'');
 assert.equal(A.classify('扫描件.pdf','',students).studentId,'');
 assert.equal(A.classify('99999999_林沐_自传.txt','',students).studentId,'');
 assert.equal(A.classify('林沐_自传_思想汇报.txt','',students).type,'');
 assert.equal(A.classify('林沐_入党申请书.txt','转正申请书',students).type,'');
});
test('只从明确字段读取正文身份，不根据正文提到的他人归档',()=>{
 const a=A.classify('自传.txt','自传\n我与林沐一起参加了活动。',students);
 assert.equal(a.studentId,'');assert.equal(a.type,'autobiography');
});
test('同名学生需要学号消歧',()=>{
 const list=[students[0],{...students[1],name:students[0].name}];
 assert.equal(A.classify('林沐_自传.txt','',list).studentId,'');
 assert.equal(A.classify('20231001_林沐_自传.txt','',list).studentId,'DEMO-001');
});
