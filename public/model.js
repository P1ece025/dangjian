(function(root){
'use strict';
const STAGES=['申请入党','确定积极分子','确定发展对象','接收预备党员','预备党员转正'];
const FLOW=['学生自查','党支部初审','支部交叉互查','学院党委复审','学校组织部备案'];
const TYPES={application:'入党申请书',thought:'思想汇报',cultivation:'培养教育考察写实簿',autobiography:'自传',volunteer:'入党志愿书',regularization:'转正申请书'};
const DATE_KEYS=['application','active','development','admitted','regularized'];
const DEFAULT_RULES={activeMonths:12,probationMonths:12,checkSignature:true,checkTerms:true};
function required(stage){return [{type:'application',count:1},...(stage>=1?[{type:'thought',count:2},{type:'cultivation',count:1}]:[]),...(stage>=2?[{type:'autobiography',count:1}]:[]),...(stage>=3?[{type:'volunteer',count:1}]:[]),...(stage>=4?[{type:'regularization',count:1}]:[])];}
function createDoc(type,i,name,date){return {id:type+'-'+i,type,title:TYPES[type]+(type==='thought'?'（第'+(i+1)+'篇）':''),date,signed:true,stamped:true,source:'sample',text: TYPES[type]+'\n\n'+(type==='thought'?'敬爱的党组织：\n\n本阶段，我参加了理论学习与志愿服务。在学习和实践中，我对自身的责任有了更具体的认识。\n\n学习情况：认真完成课程学习，主动参与学习交流。\n实践情况：参与校园志愿活动，协助同学解决实际问题。\n不足与改进：今后将进一步提升学习计划的执行力。':type==='autobiography'?'姓名：'+name+'\n学习经历：2023年9月至今，就读于示范大学。\n个人经历：参与班级服务和校园实践活动。\n自我总结：结合学习与实践，持续反思并改进自身不足。':'姓名：'+name+'\n材料内容：此处为用于演示审核流程的虚拟材料摘要。\n有关经历、记录和日期均为虚构，用于展示材料完整性与流程校验。\n规范用语示例：中国共产党。')+'\n\n（本页为虚拟材料，不构成真实证明文件）'};}
function seed(){
 const names=['林沐','陈知远','许嘉宁','周予安','沈一禾','宋可欣','陆景行','顾思齐','苏星澜','江书言','唐亦可','程新语'];
 const stages=[2,3,1,4,2,0,1,3,4,2,0,1];
 const students=names.map((name,i)=>{const stage=stages[i],dates={application:'2023-09-10',active:'2023-10-20',development:'2024-11-22',admitted:'2024-12-12',regularized:'2025-12-15'};for(let j=stage+1;j<5;j++)dates[DATE_KEYS[j]]='';return {id:'DEMO-'+String(i+1).padStart(3,'0'),name,number:'2023'+String(1001+i),college:i%3===0?'计算机学院':i%3===1?'信息管理学院':'文学院',branch:'本科生第'+(i%3+1)+'党支部',stage,dates,flow:i%4+1,status:i>8?'待审核':i%3===0?'需补正':'待复核',checked:i<9,docs:required(stage).flatMap(r=>Array.from({length:r.count},(_,n)=>createDoc(r.type,n,name,dates[r.type==='application'?'application':r.type==='volunteer'?'admitted':r.type==='regularization'?'regularized':'active']||dates.application))),overrides:{},feedback:'',revision:1};});
 students[0].dates.active='2025-12-15';students[0].dates.development='2026-08-20';students[0].docs.find(d=>d.type==='cultivation').date='2025-12-15';students[0].docs.find(d=>d.type==='thought').signed=false;students[0].docs.find(d=>d.type==='autobiography').text+='\n组织名称：中国共产档。';
 students[1].docs=students[1].docs.filter(d=>d.type!=='autobiography');students[1].docs.find(d=>d.type==='volunteer').stamped=false;
 students[2].docs=students[2].docs.filter(d=>d.id!=='thought-1');
 students[3].dates.regularized='2025-10-12';students[3].docs.find(d=>d.type==='regularization').date='2025-10-12';
 students[4].docs.find(d=>d.type==='cultivation').signed=false;
 students[6].docs.find(d=>d.type==='thought').text+='\n实践情况补充：请填写。';
 students[7].dates.development='2023-09-01';
 students[8].status='材料已确认';students[8].flow=4;
 return {version:1,rules:{...DEFAULT_RULES},students,logs:[{at:'2026-10-13 09:20',who:'演示审核员',action:'载入虚拟材料批次',detail:'12名虚拟学生 · 2026年秋季批次'}]};
}
function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const d=new Date(s+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s;}
function addMonths(s,n){const d=new Date(s+'T00:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);}
function analyze(s,r=DEFAULT_RULES){const issues=[];const add=(id,category,severity,title,detail,suggestion,docId=null,rule='DEMO-01')=>{const ov=s.overrides?.[id];issues.push({id,studentId:s.id,category,severity,title,detail,suggestion,docId,rule,handled:!!ov,note:ov||''});};
 required(s.stage).forEach(req=>{const count=s.docs.filter(d=>d.type===req.type).length;if(count<req.count)add('missing-'+req.type,'材料缺项','重点核对',TYPES[req.type]+'缺少'+(req.count-count)+'份','演示清单要求'+req.count+'份，当前登记'+count+'份。','核对归档目录，补充对应材料后重新校验。',null,'M-01');});
 for(let i=0;i<=s.stage;i++){const k=DATE_KEYS[i];if(!validDate(s.dates[k]))add('date-'+k,'时间逻辑','待确认',STAGES[i]+'日期待核对','未录入有效的 YYYY-MM-DD 日期。','请对照原始记录校对提取日期，保留原始材料。',null,'T-01');else if(i>0&&validDate(s.dates[DATE_KEYS[i-1]])&&s.dates[k]<s.dates[DATE_KEYS[i-1]])add('order-'+k,'时间逻辑','重点核对','关键节点先后顺序异常',STAGES[i]+'日期 '+s.dates[k]+' 早于上一阶段 '+s.dates[DATE_KEYS[i-1]]+'。','由经办人员核实原始记录及实际程序，不应仅为满足校验而改写日期。',null,'T-02');}
 [['active','development',r.activeMonths,'积极分子培养周期','active-cycle'],['admitted','regularized',r.probationMonths,'预备期','probation-cycle']].forEach(([a,b,n,label,id])=>{if(validDate(s.dates[a])&&validDate(s.dates[b])&&s.dates[b]<addMonths(s.dates[a],n))add(id,'时间逻辑','重点核对',label+'未达到演示阈值','从 '+s.dates[a]+' 至 '+s.dates[b]+'；按演示设定 '+n+' 个月，应达到 '+addMonths(s.dates[a],n)+'。','核实起止日期与适用规定，由审核人员判断程序及后续处理。',null,'T-03');});
 s.docs.forEach(d=>{
  if(d.source==='registered'){add('unread-'+d.id,'内容待核','待确认','材料内容待识别',d.title+' 已登记，尚未读取扫描件或文档正文。','接入 OCR 后再校验；本小样可手工校对提取内容。',d.id,'F-00');return;}
  if(r.checkSignature&&d.signed!==true)add('sign-'+d.id,'形式规范','需补正','落款签字'+(d.signed===false?'缺失':'待确认'),d.title+'：'+(d.signed===false?'演示提取字段显示未签字。':'尚未人工确认签字字段。'),'核对原件，按适用要求补齐本人或相关责任人签字，再上传清晰材料。',d.id,'F-01');
  if(['cultivation','volunteer'].includes(d.type)&&d.stamped!==true)add('stamp-'+d.id,'形式规范','待确认','盖章字段待核对',d.title+'：未确认印章完整。','由审核人员核验应盖章栏位、印章完整性和原件。',d.id,'F-02');
  if(!d.text?.trim())add('empty-'+d.id,'内容待核','需补正','材料正文为空','当前提取结果未包含正文。','补充可读取的材料内容或校对提取结果。',d.id,'C-01');
  if(r.checkTerms&&d.text?.includes('中国共产档'))add('term-'+d.id,'表述校对','需补正','组织名称存在疑似错字','识别片段：“中国共产档”。','对照原件，确认是否应为“中国共产党”；由人工确认后修改。',d.id,'C-02');
  if(d.text?.includes('请填写'))add('placeholder-'+d.id,'内容待核','需补正','发现未填写的模板占位内容','识别片段：“请填写”。','结合本人实际经历补充相应栏目，提交人工复核。',d.id,'C-03');
 });return issues;}
function completeness(s){const req=required(s.stage);return {expected:req.reduce((n,r)=>n+r.count,0),actual:req.reduce((n,r)=>n+Math.min(r.count,s.docs.filter(d=>d.type===r.type).length),0)};}
function allIssues(state){return state.students.flatMap(s=>analyze(s,state.rules));}
root.Qinghe={STAGES,FLOW,TYPES,DATE_KEYS,DEFAULT_RULES,required,seed,validDate,addMonths,analyze,completeness,allIssues,createDoc};
if(typeof module!=='undefined')module.exports=root.Qinghe;
})(typeof globalThis!=='undefined'?globalThis:this);
