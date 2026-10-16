/** 可解释的自动归档匹配；不将文件名匹配伪装成 OCR。 */
(function (root) {
  const aliases = {
    application: ['入党申请书', '入党申请'],
    thought: ['思想汇报', '思想报告'],
    cultivation: ['培养教育考察写实簿', '培养考察写实簿', '培养考察记录', '写实簿'],
    autobiography: ['自传'],
    volunteer: ['入党志愿书'],
    regularization: ['转正申请书', '转正申请'],
  };
  function classify(filename, text, students) {
    const evidence = [], warnings = [], signals = [];
    const name = filename.normalize('NFKC');
    const header = (text || '').normalize('NFKC').slice(0, 4000);
    const known = new Set(students.map(s => s.number));
    const numbers = [...new Set(name.match(/\d{6,20}/g) || [])];
    for (const number of numbers) {
      if (known.has(number)) {
        signals.push(students.filter(s => s.number === number).map(s => s.id));
        evidence.push('文件名学号：' + number);
      }
    }
    const leadingNumber = name.match(/^(\d{6,20})[_\-\s]/);
    if (leadingNumber && !known.has(leadingNumber[1])) {
      signals.push([]);
      warnings.push('文件名前缀编号不在学生名册，请人工确认');
      evidence.push('未匹配编号：' + leadingNumber[1]);
    }
    const names = students.filter(s => name.includes(s.name));
    if (names.length) { signals.push(names.map(s => s.id)); evidence.push('文件名姓名：' + [...new Set(names.map(s => s.name))].join('、')); }
    let unknownId = false;
    for (const match of header.matchAll(/^\s*(?:学号|学生学号)\s*[:：]\s*(\d{6,20})\s*$/gm)) {
      const found = students.filter(s => s.number === match[1]);
      if (!found.length) { unknownId = true; warnings.push('正文中的学号不在当前学生名册'); }
      signals.push(found.map(s => s.id)); evidence.push('正文明确学号：' + match[1]);
    }
    for (const match of header.matchAll(/^\s*姓名\s*[:：]\s*([^\n\r]{1,30})\s*$/gm)) {
      const found = students.filter(s => s.name === match[1].trim());
      signals.push(found.map(s => s.id)); evidence.push('正文明确姓名：' + match[1].trim());
    }
    let candidates = signals.length ? [...new Set(signals[0])] : [];
    for (const signal of signals.slice(1)) candidates = candidates.filter(id => signal.includes(id));
    const studentId = candidates.length === 1 && !unknownId ? candidates[0] : '';
    if (!studentId) warnings.push(signals.length ? '身份线索冲突、重名或不在名册，请人工选择学生' : '未找到学生线索，请人工选择学生');
    const titles = header.split(/\r?\n/).slice(0, 8).map(s => s.trim()).filter(s => s && s.length < 65 && !/^(姓名|学号|学生学号|日期|落款日期)\s*[:：]/.test(s));
    // 只将独立材料标题当作正文分类线索，正文中提及其他材料不作为标题。
    const types = new Set();
    for (const [type, words] of Object.entries(aliases)) {
      if (words.some(w => name.includes(w))) { types.add(type); evidence.push('文件名类型：' + root.Qinghe.TYPES[type]); }
      if (titles.some(t => words.some(w => t === w || t === '材料名称：' + w || t === '材料名称:' + w || t === '《' + w + '》'))) {
        types.add(type); evidence.push('正文标题：' + root.Qinghe.TYPES[type]);
      }
    }
    const type = types.size === 1 ? [...types][0] : '';
    if (!type) warnings.push(types.size > 1 ? '材料类型线索冲突，请人工确认' : '未识别材料类型，请人工选择');
    const dateMatch = header.match(/(?:落款日期|提交日期|日期)\s*[:：]\s*(\d{4})[年\/-](\d{1,2})[月\/-](\d{1,2})日?/) || name.match(/(\d{4})-(\d{2})-(\d{2})/);
    const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}` : '';
    return { studentId, type, date: root.Qinghe.validDate(date) ? date : '', evidence, warnings };
  }
  root.ArchiveMatcher = { classify, aliases };
  if (typeof module !== 'undefined') module.exports = root.ArchiveMatcher;
})(globalThis);
