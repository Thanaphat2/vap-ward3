import type {
  ChecklistItem,
  GroupKey,
  RiskTier,
  Shift,
  ShiftLabel,
  WeaningSurveyItem
} from './types';

/**
 * URL ของ Google Apps Script Web App
 * ตั้งค่าผ่าน .env.local → VITE_GOOGLE_SHEET_URL (แนะนำ) หรือแก้ในหน้า "ตั้งค่า Sheets"
 */
export const DEFAULT_GOOGLE_SHEET_URL: string =
  import.meta.env.VITE_GOOGLE_SHEET_URL ||
  'https://script.google.com/macros/s/AKfycbxgFwo8v3SsWJPcIpSM-3_WVjMuLecc5RuUNwWVQPpUscTPHm_DO5raBJ22YIddIjgfKw/exec';

export const DEFAULT_NURSE_NAME = 'พว.กานดา';

export const STORAGE_KEYS = {
  patients: 'vap_ward_patients_f3',
  shift: 'vap_active_shift',
  nurse: 'vap_nurse_name',
  sheetUrl: 'vap_google_sheet_url'
} as const;

/** ดึงข้อมูลจาก Sheets ทุกกี่ ms (หยุดเมื่อแท็บถูกซ่อน) */
export const POLL_INTERVAL_MS = 15_000;
/** รอรวมการแก้ไขติดๆ กันก่อนส่งขึ้น Sheets */
export const SYNC_DEBOUNCE_MS = 500;
/** id ของรายการ "ใช้ weaning protocol" ที่มีแบบสำรวจย่อย */
export const WEANING_ITEM_ID = 'w-2';

export const SHIFTS: ReadonlyArray<{ key: Shift; label: ShiftLabel }> = [
  { key: 'morning', label: 'เวรเช้า' },
  { key: 'afternoon', label: 'เวรบ่าย' },
  { key: 'night', label: 'เวรดึก' }
];

export const SHIFT_BY_LABEL: Record<ShiftLabel, Shift> = {
  เวรเช้า: 'morning',
  เวรบ่าย: 'afternoon',
  เวรดึก: 'night'
};

export const LABEL_BY_SHIFT: Record<Shift, ShiftLabel> = {
  morning: 'เวรเช้า',
  afternoon: 'เวรบ่าย',
  night: 'เวรดึก'
};

export const GROUP_ORDER: ReadonlyArray<GroupKey> = ['W', 'H', 'A', 'P', 'O', 'S'];

export const GROUP_META: Record<
  GroupKey,
  { title: string; subtitle: string; badgeClass: string; markerClass: string }
> = {
  W: {
    title: 'W - WEAN การหย่าเครื่องช่วยหายใจ',
    subtitle: 'รวมแบบสำรวจ 4 หมวดสำหรับพยาบาลวิชาชีพ',
    badgeClass: 'bg-cyan-100 text-cyan-800',
    markerClass: 'marker:text-cyan-600'
  },
  H: {
    title: 'H - HAND HYGIENE การทำความสะอาดมือ',
    subtitle: 'สุขอนามัยมือเคร่งครัด',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    markerClass: 'marker:text-emerald-600'
  },
  A: {
    title: 'A - ASPIRATE PRECAUTIONS การป้องกันการสำลัก',
    subtitle: 'ลดความเสี่ยงการสำลักน้ำย่อย',
    badgeClass: 'bg-amber-100 text-amber-800',
    markerClass: 'marker:text-amber-600'
  },
  P: {
    title: 'P - PREVENTION CONTAMINATION การป้องกันการปนเปื้อน',
    subtitle: 'จัดการสาย circuit และอุปกรณ์',
    badgeClass: 'bg-violet-100 text-violet-800',
    markerClass: 'marker:text-violet-600'
  },
  O: {
    title: 'O - ORAL CARE การทำความสะอาดช่องปาก',
    subtitle: 'ลดแบคทีเรียและ Biofilm ในช่องปาก',
    badgeClass: 'bg-pink-100 text-pink-800',
    markerClass: 'marker:text-pink-600'
  },
  S: {
    title: 'S - SEDATION VACATION การหยุดยานอนหลับชั่วคราว+เฝ้าระวัง',
    subtitle: 'ประเมินความตื่นตัวและลดขนาดยา',
    badgeClass: 'bg-indigo-100 text-indigo-800',
    markerClass: 'marker:text-indigo-600'
  }
};

/** เรียงจากเกณฑ์สูงไปต่ำ — getRiskTier จะคืนรายการแรกที่ progress >= min */
export const RISK_TIERS: ReadonlyArray<RiskTier> = [
  {
    key: 'low',
    min: 80,
    label: 'เสี่ยงน้อย',
    rangeLabel: 'คะแนน ≥ 80% (เสี่ยงน้อย):',
    evalLevel: 'ระดับสูง / ดี / มาก (ผ่านเกณฑ์ระดับยอดเยี่ยม)',
    isHighRisk: false,
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    panelClass: 'bg-emerald-50 border-emerald-200',
    titleClass: 'text-emerald-800',
    subClass: 'text-emerald-700',
    bannerClass: 'bg-emerald-50 border-emerald-300 text-emerald-950',
    bubbleClass: 'bg-emerald-200 text-emerald-800',
    barClass: 'bg-emerald-500',
    textClass: 'text-emerald-600'
  },
  {
    key: 'medium',
    min: 60,
    label: 'เสี่ยงปานกลาง',
    rangeLabel: 'คะแนน 60 - 79% (เสี่ยงปานกลาง):',
    evalLevel: 'ระดับปานกลาง (ผ่านเกณฑ์พื้นฐาน)',
    isHighRisk: false,
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
    panelClass: 'bg-amber-50 border-amber-200',
    titleClass: 'text-amber-800',
    subClass: 'text-amber-700',
    bannerClass: 'bg-amber-50 border-amber-300 text-amber-950',
    bubbleClass: 'bg-amber-200 text-amber-800',
    barClass: 'bg-amber-500',
    textClass: 'text-amber-600'
  },
  {
    key: 'high',
    min: 0,
    label: 'เสี่ยงมาก',
    rangeLabel: 'คะแนน < 60% (เสี่ยงมาก):',
    evalLevel: 'ระดับต่ำ / ไม่ผ่านเกณฑ์ (ต้องได้รับการซ่อมเสริมหรือพัฒนาเพิ่ม)',
    isHighRisk: true,
    badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200',
    panelClass: 'bg-rose-50 border-rose-200',
    titleClass: 'text-rose-800',
    subClass: 'text-rose-700',
    bannerClass: 'bg-rose-50 border-rose-300 text-rose-950',
    bubbleClass: 'bg-rose-200 text-rose-800',
    barClass: 'bg-rose-500',
    textClass: 'text-rose-600'
  }
];

const item = (id: string, groupKey: GroupKey, text: string): ChecklistItem => ({
  id,
  groupKey,
  groupTitle: GROUP_META[groupKey].title,
  text,
  status: 'pending'
});

export const DEFAULT_WHAPOS_CHECKLIST: ReadonlyArray<ChecklistItem> = [
  item('w-1', 'W', 'ประเมินความพร้อมในการถอดท่อช่วยหายใจทุกวัน'),
  item('w-2', 'W', 'ใช้ weaning protocol'),

  item('h-1', 'H', 'ล้างมือ 7 ขั้นตอน'),
  item('h-2', 'H', 'ล้างมือ 5 moments'),

  item('a-1', 'A', 'ยกหัวเตียงสูง 30-45 องศา'),
  item('a-2', 'A', 'วัด cuff pressure 30-35 cmH2O ทุกเวร'),
  item('a-3', 'A', 'ประเมิน NG ก่อน feeds'),
  item('a-4', 'A', 'ใช้ชุดหยดอาหารทางสายยาง ใช้เวลา 2-4 ชม.'),

  item('p-1', 'P', 'เปลี่ยน ventilator circuit เมื่อเปื้อนสกปรก หรือเมื่อเปลี่ยนผู้ป่วย'),
  item('p-2', 'P', 'เทน้ำทิ้งสาย circuit ด้วย aseptic technique'),
  item('p-3', 'P', 'ดูดเสมหะเท่าที่จำเป็น'),

  item('o-1', 'O', 'ประเมินสุขภาพช่องปากด้วย OAG วันละ 1 ครั้ง'),
  item('o-2', 'O', 'ใช้แปรงสีฟันที่มีขนแปรงอ่อนนุ่ม และยาสีฟันที่มีฟลูออไรด์ >1,500 ppm'),
  item('o-3', 'O', 'เช็ดช่องปากด้วย 0.9% NSS สลับกับการแปรงฟัน'),

  item('s-1', 'S', 'ประเมินการหยุดยานอนหลับ วันละครั้ง ช่วงเช้า'),
  item('s-2', 'S', 'ลดปริมาณการใช้ และหยุดยานอนหลับ'),
  item('s-3', 'S', '(ปฏิบัติร่วมกับการรักษากับแพทย์เจ้าของไข้)'),
];

const CATEGORY_TITLES: Record<number, string> = {
  1: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ',
  2: 'หมวดที่ 2: มีการประเมินการหายใจแบบ Short period SBT (5min)',
  3: 'หมวดที่ 3: มีการประเมินการหายใจแบบ Long period SBT (120 min)',
  4: 'หมวดที่ 4: มีการประเมินผู้ป่วยกรณีไม่สามารถ Extubation ให้ Intubation ไว้ก่อน',
};

const survey = (id: string, category: number, text: string): WeaningSurveyItem => ({
  id,
  category,
  categoryTitle: CATEGORY_TITLES[category],
  text,
  status: 'pending',
  note: ''
});

export const DEFAULT_WEANING_SURVEY: ReadonlyArray<WeaningSurveyItem> = [
  survey('w1-1', 1, '1.1 มีการประเมินภาวะที่ทำให้เกิดระบบหายใจล้มเหลวดีขึ้น'),
  survey('w1-2', 1, '1.2 ตรวจไม่มีภาวะขาดออกซิเจนครบ 3 ข้อ (PaO2/FiO2 ratio > 150 หรือ O2 sat > 92% ขณะใช้ FiO2 < 0.4, PEEP < 5 cmH2O, FiO2 < 0.4)'),
  survey('w1-3', 1, '1.3 ประเมินระบบไหลเวียนเลือดปกติ 2 ข้อ (ไม่มี active Myocardial Ischemia, BP > 90/60 ไม่ต้องใช้ Vasopressor drug หรือให้ Dopamine < 5 mcg/kg/min)'),
  survey('w1-4', 1, '1.4 ประเมินผู้ป่วยสามารถหายใจเองได้'),
  survey('w1-5', 1, '1.5 ประเมินภาวะ Electrolyte ปกติ'),
  survey('w1-6', 1, '1.6 ไม่มีไข้ > 38 °C'),
  survey('w1-7', 1, '1.7 การ Monitor P peak < 20 cmH2O'),
  survey('w1-8', 1, '1.8 ผู้ป่วยควรมี Hb > 7 gm%'),

  survey('w2-1', 2, '2.1 อธิบายผู้ป่วยให้ฝึกหายใจ และดูแลอย่างใกล้ชิด'),
  survey('w2-2', 2, '2.2 จัดท่านั่ง หรือ ศีรษะสูง 70-90 °'),
  survey('w2-3', 2, '2.3 บันทึก BP, HR, RR, O2 sat. ก่อนทำ Short period SBT'),
  survey('w2-4', 2, '2.4 เปลี่ยน Mode Spontaneous โดยใช้ PEEP 5 cmH2O (CPAP 5 cmH2O) ไม่ต้องใช้ PS กรณีเป็น Bird Ventilator ให้ on T-piece 8l/m FiO2 0.4'),
  survey('w2-5', 2, '2.5 ประเมิน BP, HR, RR, O2 sat ลักษณะการหายใจ 5 นาที หลังเปลี่ยน Mode โดยยืนเฝ้าผู้ป่วยตลอดเวลา'),
  survey('w2-6', 2, '2.6 หยุด wean เมื่อพบว่า RR > 35/min or RR < 10/min, HR > 140/min or HR < 50/min, BP > 180/90 mmHg or BP < 90/60 mmHg, Oxygen saturation < 90% ผู้ป่วยกระสับกระส่าย ผู้ป่วยบอกให้ทราบว่าทนไม่ไหว'),

  survey('w3-1', 3, '3.1 มีการต่อ T-piece 8L/M FiO2 0.4 (ถ้าเป็น T-piece ให้ทำต่อได้)'),
  survey('w3-2', 3, '3.2 มีการติดตามอาการทุก 15-30 นาที ตามเกณฑ์เฝ้าระวังข้อ 2'),
  survey('w3-3', 3, '3.3 หยุดการ wean เมื่อพบผิดปกติตามเกณฑ์ข้อ 2 แล้ว Back up setting เดิม'),
  survey('w3-4', 3, '3.4 ประเมินผู้ป่วยสามารถหายใจเองได้ครบ 120 นาที แล้วทดสอบว่าสามารถ Extubation ได้'),

  survey('w4-1', 4, '4.1 GCS < 8 หรือผู้ป่วยไม่รู้สึกตัว และซึมมาก'),
  survey('w4-2', 4, '4.2 ผู้ป่วยมีเสมหะปริมาณมาก และไม่มีแรงไอขณะ suction'),
  survey('w4-3', 4, '4.3 เคยมีประวัติ secretion obstruction'),
  survey('w4-4', 4, '4.4 เคย Re intubation ภายใน 48 ชั่วโมงหลัง Extubation'),
  survey('w4-5', 4, '4.5 มีการแจ้งแพทย์ก่อน off tube'),
];
