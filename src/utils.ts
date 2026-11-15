import {
  DEFAULT_WEANING_SURVEY,
  DEFAULT_WHAPOS_CHECKLIST,
  GROUP_META,
  GROUP_ORDER,
  LABEL_BY_SHIFT,
  RISK_TIERS
} from './constants';
import type {
  Assessor,
  ChecklistItem,
  GroupKey,
  ItemStatus,
  NewPatientInput,
  Patient,
  RiskTier,
  Shift,
  WeaningSurveyItem
} from './types';

/** แปลง HTML entities ที่อาจติดมาจาก Google Sheets (ใช้ครั้งเดียวตอน migrate ไม่ใช่ตอน render) */
export const decodeSymbols = (str: string): string =>
  str ? str.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&') : '';

export const createChecklist = (): ChecklistItem[] => DEFAULT_WHAPOS_CHECKLIST.map(i => ({ ...i }));
export const createSurvey = (): WeaningSurveyItem[] => DEFAULT_WEANING_SURVEY.map(i => ({ ...i }));

export const calculateProgress = (items: ReadonlyArray<ChecklistItem>): number => {
  if (items.length === 0) return 0;
  const complied = items.reduce((n, i) => n + (i.status === 'complied' ? 1 : 0), 0);
  return Math.round((complied / items.length) * 100);
};

export const getRiskTier = (progress: number): RiskTier =>
  RISK_TIERS.find(t => progress >= t.min) ?? RISK_TIERS[RISK_TIERS.length - 1];

export const formatTime = (): string =>
  new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

/** เรียงเตียงแบบตัวเลข: B2 มาก่อน B10 */
export const sortPatients = (list: ReadonlyArray<Patient>): Patient[] =>
  [...list].sort((a, b) => a.bed.localeCompare(b.bed, 'th', { numeric: true }));

/** crypto.randomUUID ใช้ไม่ได้บน http (เช่นเปิดผ่าน IP ในวง LAN) จึงมี fallback */
export const makeId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

const toStatus = (status: unknown, legacyChecked?: unknown): ItemStatus =>
  status === 'complied' || status === 'not_complied' || status === 'pending'
    ? status
    : legacyChecked
      ? 'complied'
      : 'pending';

const migrateList = (list: any): ChecklistItem[] =>
  Array.isArray(list)
    ? list.map((i, idx) => {
        const groupKey: GroupKey = GROUP_ORDER.includes(i?.groupKey) ? i.groupKey : 'W';
        return {
          id: i?.id || `item-${idx}`,
          groupKey,
          groupTitle: decodeSymbols(i?.groupTitle || GROUP_META[groupKey].title),
          text: decodeSymbols(i?.text || ''),
          status: toStatus(i?.status, i?.checked)
        };
      })
    : createChecklist();

const migrateSurvey = (list: any): WeaningSurveyItem[] =>
  Array.isArray(list)
    ? list.map((i, idx) => ({
        id: i?.id || `ws-${idx}`,
        category: Number(i?.category) || 1,
        categoryTitle: decodeSymbols(i?.categoryTitle || 'หมวดที่ 1'),
        text: decodeSymbols(i?.text || ''),
        status: toStatus(i?.status),
        note: i?.note || ''
      }))
    : createSurvey();

/** แปลงข้อมูลดิบ (จาก Sheets / localStorage รุ่นเก่า) ให้เป็น Patient ที่ครบถ้วน */
export const migratePatient = (p: any): Patient => {
  const checklists = {
    morning: migrateList(p.checklists?.morning ?? p.checklist),
    afternoon: migrateList(p.checklists?.afternoon ?? p.checklist),
    night: migrateList(p.checklists?.night ?? p.checklist)
  };

  return {
    ...p,
    // Sheets อาจคืนค่าตัวเลข (เช่น HN) มาเป็น number
    id: String(p.id),
    bed: String(p.bed ?? ''),
    hn: String(p.hn ?? ''),
    name: String(p.name ?? ''),
    gender: p.gender || 'หญิง',
    age: Number(p.age) || 0,
    ventDay: Number(p.ventDay) || 0,
    checklists,
    weaningSurveys: {
      morning: migrateSurvey(p.weaningSurveys?.morning),
      afternoon: migrateSurvey(p.weaningSurveys?.afternoon),
      night: migrateSurvey(p.weaningSurveys?.night)
    },
    // คำนวณจาก checklist เสมอ เพื่อไม่ให้ % ไม่ตรงกับรายการจริง
    progresses: {
      morning: calculateProgress(checklists.morning),
      afternoon: calculateProgress(checklists.afternoon),
      night: calculateProgress(checklists.night)
    }
  };
};

export const createPatient = (input: NewPatientInput, assessor: Assessor): Patient => ({
  id: 'p-' + makeId(),
  bed: input.bed,
  hn: input.hn,
  name: input.name,
  gender: 'หญิง',
  age: input.age,
  ventDay: input.ventDay,
  checklists: { morning: createChecklist(), afternoon: createChecklist(), night: createChecklist() },
  weaningSurveys: { morning: createSurvey(), afternoon: createSurvey(), night: createSurvey() },
  progresses: { morning: 0, afternoon: 0, night: 0 },
  lastAssessedBy: assessor.name,
  lastAssessedShift: assessor.shiftLabel,
  lastAssessedTime: formatTime()
});

const section = (lines: string[]): string => (lines.length > 0 ? lines.join('\n') : '  (ไม่มี)');

export const generateHandoverNote = (pt: Patient, shift: Shift, nurseName: string): string => {
  const shiftName = LABEL_BY_SHIFT[shift];
  const items = pt.checklists[shift];
  const surveyItems = pt.weaningSurveys[shift];
  const progress = pt.progresses[shift] ?? 0;
  const risk = getRiskTier(progress);

  const pick = (status: ItemStatus, prefix: string) =>
    items.filter(i => i.status === status).map(i => `  ${prefix} ${i.text}`);
  const pickSurvey = (status: ItemStatus, mark: string) =>
    surveyItems
      .filter(i => i.status === status)
      .map(i => `  ${mark} ${i.text}${i.note ? ` (หมายเหตุ: ${i.note})` : ''}`);

  const complied = pick('complied', '✓ [ปฏิบัติ]');
  const notComplied = pick('not_complied', '✗ [ไม่ปฏิบัติ]');
  const pending = pick('pending', '- [รอดำเนินการ]');
  const sComplied = pickSurvey('complied', '✓');
  const sNotComplied = pickSurvey('not_complied', '✗');
  const assessor = pt.lastAssessedBy || nurseName;

  return `[สรุปส่งเวร หอผู้ป่วยอายุรกรรมหญิง 3 (อญ.3)]
ผู้ประเมิน: ${assessor} (${pt.lastAssessedShift || shiftName}) เวลา ${pt.lastAssessedTime || '-'}
เตียง: ${pt.bed} | HN: ${pt.hn} | ${pt.name} (${pt.gender} ${pt.age} ปี)
Ventilator Day: ${pt.ventDay} | Compliance (${shiftName}): ${progress}%
ประเมินความเสี่ยง VAP: [${risk.label}] - ${risk.evalLevel}

รายการประเมิน WHAPO + S (${shiftName}):
[ปฏิบัติ (${complied.length})]:
${section(complied)}

[ไม่ปฏิบัติ (${notComplied.length})]:
${section(notComplied)}

[รอดำเนินการ (${pending.length})]:
${section(pending)}

--- แบบสำรวจ Weaning Protocol สำหรับพยาบาลวิชาชีพ ---
[ปฏิบัติ (${sComplied.length})]:
${section(sComplied)}

[ไม่ปฏิบัติ/ยังไม่ประเมิน (${sNotComplied.length})]:
${section(sNotComplied)}

ผู้บันทึก: ${assessor}`;
};

/** คัดลอกข้อความ — navigator.clipboard ใช้ไม่ได้บน http จึงมี fallback */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* ไปใช้ fallback */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};
