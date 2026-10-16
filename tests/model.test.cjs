const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../public/model.js');

test('样本为12名虚拟学生、53份材料', () => {
  const state = Q.seed();
  assert.equal(state.students.length, 12);
  assert.equal(state.students.reduce((n, s) => n + s.docs.length, 0), 53);
});
test('日期有效性、闰年与月末日历月边界', () => {
  assert.equal(Q.validDate('2025-02-29'), false);
  assert.equal(Q.validDate('2024-02-29'), true);
  assert.equal(Q.addMonths('2024-01-31', 1), '2024-02-29');
  assert.equal(Q.addMonths('2024-02-29', 12), '2025-02-28');
});
test('预置异常：周期、签字、名称错字、缺项与节点颠倒', () => {
  const state = Q.seed();
  const a = Q.analyze(state.students[0], state.rules);
  for (const id of ['active-cycle', 'sign-thought-0', 'term-autobiography-0']) {
    assert(a.some(i => i.id === id));
  }
  assert(Q.analyze(state.students[1], state.rules).some(i => i.id === 'missing-autobiography'));
  assert(Q.analyze(state.students[7], state.rules).some(i => i.id === 'order-development'));
});
test('更正输入消除异常，少一天仍提示周期不足', () => {
  const state = Q.seed();
  const s = state.students[0];
  s.dates.active = '2025-08-20';
  for (const d of s.docs) {
    d.signed = true;
    d.text = d.text.replaceAll('中国共产档', '中国共产党');
  }
  assert.equal(Q.analyze(s, state.rules).length, 0);
  s.dates.development = '2026-08-19';
  assert(Q.analyze(s, state.rules).some(i => i.id === 'active-cycle'));
});
test('仅登记的文件保持未识别，不伪造签字识别结论', () => {
  const state = Q.seed();
  const s = state.students[0];
  s.docs[0].source = 'registered';
  s.docs[0].signed = null;
  const a = Q.analyze(s, state.rules);
  assert(a.some(i => i.id === 'unread-application-0'));
  assert(!a.some(i => i.id === 'sign-application-0'));
});
