/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Users,
  BookOpen,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Plus,
  Copy,
  Check,
  Trash2,
  ShieldAlert,
  X,
  ArrowLeft,
  AlertTriangle,
  Cloud,
  CloudOff,
  RefreshCcw,
  CheckCircle,
  User,
  Sun,
  Sunset,
  Moon,
  FileText,
  FileSpreadsheet,
  ExternalLink,
  BellRing,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';

const DEFAULT_GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwwlA5tmUzfQ1P4JSgjR_GGGjTQdoQ5VoAtdvmy79o6tDESucuTCLsb26Az4RVvkj5Tiw/exec";
const DEFAULT_SHEET_VIEW_URL = "https://docs.google.com/spreadsheets/d/1z0_IuHZn-_joeSk_RlCQ_2l9gbuw8QF3QI8vcj2GWag/edit?usp=sharing";

const decodeSymbols = (str: string) => {
  if (!str) return '';
  return str.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
};

interface ChecklistItem {
  id: string;
  groupKey: 'W' | 'H' | 'A' | 'P' | 'O' | 'S';
  groupTitle: string;
  text: string;
  status: 'complied' | 'not_complied' | 'pending';
}

interface WeaningSurveyItem {
  id: string;
  category: number;
  categoryTitle: string;
  text: string;
  status: 'complied' | 'not_complied' | 'pending';
  note: string;
}

interface Patient {
  id: string;
  bed: string;
  hn: string;
  name: string;
  gender: string;
  age: number;
  ventDay: number;
  risk?: 'ต่ำ' | 'ปานกลาง' | 'สูง';
  checklists: {
    morning: ChecklistItem[];
    afternoon: ChecklistItem[];
    night: ChecklistItem[];
  };
  weaningSurveys: {
    morning: WeaningSurveyItem[];
    afternoon: WeaningSurveyItem[];
    night: WeaningSurveyItem[];
  };
  progresses: {
    morning: number;
    afternoon: number;
    night: number;
  };
  lastAssessedBy?: string;
  lastAssessedShift?: string;
  lastAssessedTime?: string;
}

const DEFAULT_WHAPOS_CHECKLIST: ChecklistItem[] = [
  { id: 'w-1', groupKey: 'W', groupTitle: 'W - WEAN การหย่าเครื่องช่วยหายใจ', text: 'ประเมินความพร้อมในการถอดท่อช่วยหายใจทุกวัน', status: 'pending' },
  { id: 'w-2', groupKey: 'W', groupTitle: 'W - WEAN การหย่าเครื่องช่วยหายใจ', text: 'ใช้ weaning protocol', status: 'pending' },
  { id: 'h-1', groupKey: 'H', groupTitle: 'H - HAND HYGIENE การทำความสะอาดมือ', text: 'ล้างมือ 7 ขั้นตอน', status: 'pending' },
  { id: 'h-2', groupKey: 'H', groupTitle: 'H - HAND HYGIENE การทำความสะอาดมือ', text: 'ล้างมือ 5 moments', status: 'pending' },
  { id: 'a-1', groupKey: 'A', groupTitle: 'A - ASPIRATE PRECAUTIONS การป้องกันการสำลัก', text: 'ยกหัวเตียงสูง 30-45 องศา', status: 'pending' },
  { id: 'a-2', groupKey: 'A', groupTitle: 'A - ASPIRATE PRECAUTIONS การป้องกันการสำลัก', text: 'วัด cuff pressure 30-35 cmH2O ทุกเวร', status: 'pending' },
  { id: 'a-3', groupKey: 'A', groupTitle: 'A - ASPIRATE PRECAUTIONS การป้องกันการสำลัก', text: 'ประเมิน NG ก่อน feeds', status: 'pending' },
  { id: 'a-4', groupKey: 'A', groupTitle: 'A - ASPIRATE PRECAUTIONS การป้องกันการสำลัก', text: 'ใช้ชุดหยดอาหารทางสายยาง ใช้เวลา 2-4 ชม.', status: 'pending' },
  { id: 'p-1', groupKey: 'P', groupTitle: 'P - PREVENTION CONTAMINATION การป้องกันการปนเปื้อน', text: 'เปลี่ยน ventilator circuit เมื่อเปื้อนสกปรก หรือเมื่อเปลี่ยนผู้ป่วย', status: 'pending' },
  { id: 'p-2', groupKey: 'P', groupTitle: 'P - PREVENTION CONTAMINATION การป้องกันการปนเปื้อน', text: 'เทน้ำทิ้งสาย circuit ด้วย aseptic technique', status: 'pending' },
  { id: 'p-3', groupKey: 'P', groupTitle: 'P - PREVENTION CONTAMINATION การป้องกันการปนเปื้อน', text: 'ดูดเสมหะเท่าที่จำเป็น', status: 'pending' },
  { id: 'o-1', groupKey: 'O', groupTitle: 'O - ORAL CARE การทำความสะอาดช่องปาก', text: 'ประเมินสุขภาพช่องปากด้วย OAG วันละ 1 ครั้ง', status: 'pending' },
  { id: 'o-2', groupKey: 'O', groupTitle: 'O - ORAL CARE การทำความสะอาดช่องปาก', text: 'ใช้แปรงสีฟันที่มีขนแปรงอ่อนนุ่ม และยาสีฟันที่มีฟลูออไรด์ >1,500 ppm', status: 'pending' },
  { id: 'o-3', groupKey: 'O', groupTitle: 'O - ORAL CARE การทำความสะอาดช่องปาก', text: 'เช็ดช่องปากด้วย 0.9% NSS สลับกับการแปรงฟัน', status: 'pending' },
  { id: 's-1', groupKey: 'S', groupTitle: 'S - SEDATION VACATION การหยุดยานอนหลับชั่วคราว+เฝ้าระวัง', text: 'ประเมินการหยุดยานอนหลับ วันละครั้ง ช่วงเช้า', status: 'pending' },
  { id: 's-2', groupKey: 'S', groupTitle: 'S - SEDATION VACATION การหยุดยานอนหลับชั่วคราว+เฝ้าระวัง', text: 'ลดปริมาณการใช้ และหยุดยานอนหลับ', status: 'pending' },
  { id: 's-3', groupKey: 'S', groupTitle: 'S - SEDATION VACATION การหยุดยานอนหลับชั่วคราว+เฝ้าระวัง', text: '(ปฏิบัติร่วมกับการรักษากับแพทย์เจ้าของไข้)', status: 'pending' }
];

const DEFAULT_WEANING_SURVEY: WeaningSurveyItem[] = [
  { id: 'w1-1', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.1 มีการประเมินภาวะที่ทำให้เกิดระบบหายใจล้มเหลวดีขึ้น', status: 'pending', note: '' },
  { id: 'w1-2', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.2 ตรวจไม่มีภาวะขาดออกซิเจนครบ 3 ข้อ (PaO2/FiO2 ratio > 150 หรือ O2 sat > 92% ขณะใช้ FiO2 < 0.4, PEEP < 5 cmH2O, FiO2 < 0.4)', status: 'pending', note: '' },
  { id: 'w1-3', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.3 ประเมินระบบไหลเวียนเลือดปกติ 2 ข้อ (ไม่มี active Myocardial Ischemia, BP > 90/60 ไม่ต้องใช้ Vasopressor drug หรือให้ Dopamine < 5 mcg/kg/min)', status: 'pending', note: '' },
  { id: 'w1-4', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.4 ประเมินผู้ป่วยสามารถหายใจเองได้', status: 'pending', note: '' },
  { id: 'w1-5', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.5 ประเมินภาวะ Electrolyte ปกติ', status: 'pending', note: '' },
  { id: 'w1-6', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.6 ไม่มีไข้ > 38 °C', status: 'pending', note: '' },
  { id: 'w1-7', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.7 การ Monitor P peak < 20 cmH2O', status: 'pending', note: '' },
  { id: 'w1-8', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.8 ผู้ป่วยควรมี Hb > 7 gm%', status: 'pending', note: '' },
  { id: 'w2-1', category: 2, categoryTitle: 'หมวดที่ 2: มีการประเมินการหายใจแบบ Short period SBT (5min)', text: '2.1 อธิบายผู้ป่วยให้ฝึกหายใจ และดูแลอย่างใกล้ชิด', status: 'pending', note: '' },
  { id: 'w2-2', category: 2, categoryTitle: 'หมวดที่ 2: มีการประเมินการหายใจแบบ Short period SBT (5min)', text: '2.2 จัดท่านั่ง หรือ ศีรษะสูง 70-90 °', status: 'pending', note: '' },
  { id: 'w2-3', category: 2, categoryTitle: 'หมวดที่ 2: มีการประเมินการหายใจแบบ Short period SBT (5min)', text: '2.3 บันทึก BP, HR, RR, O2 sat. ก่อนทำ Short period SBT', status: 'pending', note: '' },
  { id: 'w2-4', category: 2, categoryTitle: 'หมวดที่ 2: มีการประเมินการหายใจแบบ Short period SBT (5min)', text: '2.4 เปลี่ยน Mode Spontaneous โดยใช้ PEEP 5 cmH2O (CPAP 5 cmH2O) ไม่ต้องใช้ PS กรณีเป็น Bird Ventilator ให้ on T-piece 8l/m FiO2 0.4', status: 'pending', note: '' },
  { id: 'w2-5', category: 2, categoryTitle: 'หมวดที่ 2: มีการประเมินการหายใจแบบ Short period SBT (5min)', text: '2.5 ประเมิน BP, HR, RR, O2 sat ลักษณะการหายใจ 5 นาที หลังเปลี่ยน Mode โดยยืนเฝ้าผู้ป่วยตลอดเวลา', status: 'pending', note: '' },
  { id: 'w2-6', category: 2, categoryTitle: 'หมวดที่ 2: มีการประเมินการหายใจแบบ Short period SBT (5min)', text: '2.6 หยุด wean เมื่อพบว่า RR > 35/min or RR < 10/min, HR > 140/min or HR < 50/min, BP > 180/90 mmHg or BP < 90/60 mmHg, Oxygen saturation < 90% ผู้ป่วยกระสับกระส่าย ผู้ป่วยบอกให้ทราบว่าทนไม่ไหว', status: 'pending', note: '' },
  { id: 'w3-1', category: 3, categoryTitle: 'หมวดที่ 3: มีการประเมินการหายใจแบบ Long period SBT (120 min)', text: '3.1 มีการต่อ T-piece 8L/M FiO2 0.4 (ถ้าเป็น T-piece ให้ทำต่อได้)', status: 'pending', note: '' },
  { id: 'w3-2', category: 3, categoryTitle: 'หมวดที่ 3: มีการประเมินการหายใจแบบ Long period SBT (120 min)', text: '3.2 มีการติดตามอาการทุก 15-30 นาที ตามเกณฑ์เฝ้าระวังข้อ 2', status: 'pending', note: '' },
  { id: 'w3-3', category: 3, categoryTitle: 'หมวดที่ 3: มีการประเมินการหายใจแบบ Long period SBT (120 min)', text: '3.3 หยุดการ wean เมื่อพบผิดปกติตามเกณฑ์ข้อ 2 แล้ว Back up setting เดิม', status: 'pending', note: '' },
  { id: 'w3-4', category: 3, categoryTitle: 'หมวดที่ 3: มีการประเมินการหายใจแบบ Long period SBT (120 min)', text: '3.4 ประเมินผู้ป่วยสามารถหายใจเองได้ครบ 120 นาที แล้วทดสอบว่าสามารถ Extubation ได้', status: 'pending', note: '' },
  { id: 'w4-1', category: 4, categoryTitle: 'หมวดที่ 4: มีการประเมินผู้ป่วยกรณีไม่สามารถ Extubation ให้ Intubation ไว้ก่อน', text: '4.1 GCS < 8 หรือผู้ป่วยไม่รู้สึกตัว และซึมมาก', status: 'pending', note: '' },
  { id: 'w4-2', category: 4, categoryTitle: 'หมวดที่ 4: มีการประเมินผู้ป่วยกรณีไม่สามารถ Extubation ให้ Intubation ไว้ก่อน', text: '4.2 ผู้ป่วยมีเสมหะปริมาณมาก และไม่มีแรงไอขณะ suction', status: 'pending', note: '' },
  { id: 'w4-3', category: 4, categoryTitle: 'หมวดที่ 4: มีการประเมินผู้ป่วยกรณีไม่สามารถ Extubation ให้ Intubation ไว้ก่อน', text: '4.3 เคยมีประวัติ secretion obstruction', status: 'pending', note: '' },
  { id: 'w4-4', category: 4, categoryTitle: 'หมวดที่ 4: มีการประเมินผู้ป่วยกรณีไม่สามารถ Extubation ให้ Intubation ไว้ก่อน', text: '4.4 เคย Re intubation ภายใน 48 ชั่วโมงหลัง Extubation', status: 'pending', note: '' },
  { id: 'w4-5', category: 4, categoryTitle: 'หมวดที่ 4: มีการประเมินผู้ป่วยกรณีไม่สามารถ Extubation ให้ Intubation ไว้ก่อน', text: '4.5 มีการแจ้งแพทย์ก่อน off tube', status: 'pending', note: '' }
];

const calculateProgress = (items: ChecklistItem[]) => {
  if (!items || items.length === 0) return 0;
  const compliedCount = items.filter(i => i.status === 'complied').length;
  return Math.round((compliedCount / items.length) * 100);
};

const getRiskTier = (progress: number) => {
  if (progress >= 80) {
    return {
      label: 'เสี่ยงน้อย',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      evalLevel: 'ระดับสูง / ดี / มาก (ผ่านเกณฑ์ระดับยอดเยี่ยม)',
      isHighRisk: false
    };
  } else if (progress >= 60) {
    return {
      label: 'เสี่ยงปานกลาง',
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
      evalLevel: 'ระดับปานกลาง (ผ่านเกณฑ์พื้นฐาน)',
      isHighRisk: false
    };
  } else {
    return {
      label: 'เสี่ยงมาก',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200',
      evalLevel: 'ระดับต่ำ / ไม่ผ่านเกณฑ์ (ต้องได้รับการซ่อมเสริมหรือพัฒนาเพิ่ม)',
      isHighRisk: true
    };
  }
};

const migratePatient = (p: any): Patient => {
  const migrateList = (list: any[]) => {
    if (!list) return DEFAULT_WHAPOS_CHECKLIST.map(i => ({ ...i }));
    return list.map(i => {
      let status = i.status;
      if (!status) {
        status = i.checked ? 'complied' : 'pending';
      }
      return {
        id: i.id || ('item-' + Math.random()),
        groupKey: i.groupKey || 'W',
        groupTitle: decodeSymbols(i.groupTitle || 'W - WEAN การหย่าเครื่องช่วยหายใจ'),
        text: decodeSymbols(i.text || ''),
        status: (status as 'complied' | 'not_complied' | 'pending') || 'pending'
      };
    });
  };

  const migrateSurvey = (list: any[]) => {
    if (!list) return DEFAULT_WEANING_SURVEY.map(i => ({ ...i }));
    return list.map(i => ({
      id: i.id || ('ws-' + Math.random()),
      category: i.category || 1,
      categoryTitle: decodeSymbols(i.categoryTitle || 'หมวดที่ 1'),
      text: decodeSymbols(i.text || ''),
      status: (i.status as 'complied' | 'not_complied' | 'pending') || 'pending',
      note: i.note || ''
    }));
  };

  const checklists = p.checklists ? {
    morning: migrateList(p.checklists.morning),
    afternoon: migrateList(p.checklists.afternoon),
    night: migrateList(p.checklists.night)
  } : {
    morning: migrateList(p.checklist),
    afternoon: migrateList(p.checklist),
    night: migrateList(p.checklist)
  };

  const weaningSurveys = p.weaningSurveys ? {
    morning: migrateSurvey(p.weaningSurveys.morning),
    afternoon: migrateSurvey(p.weaningSurveys.afternoon),
    night: migrateSurvey(p.weaningSurveys.night)
  } : {
    morning: DEFAULT_WEANING_SURVEY.map(i => ({ ...i })),
    afternoon: DEFAULT_WEANING_SURVEY.map(i => ({ ...i })),
    night: DEFAULT_WEANING_SURVEY.map(i => ({ ...i }))
  };

  const progresses = p.progresses || {
    morning: calculateProgress(checklists.morning),
    afternoon: calculateProgress(checklists.afternoon),
    night: calculateProgress(checklists.night)
  };

  return {
    ...p,
    checklists,
    weaningSurveys,
    progresses,
    lastAssessedBy: p.lastAssessedBy || 'พว.กานดา',
    lastAssessedShift: p.lastAssessedShift || 'เวรเช้า',
    lastAssessedTime: p.lastAssessedTime || '08:30 น.'
  };
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'beds' | 'guide'>('home');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [bedFilter, setBedFilter] = useState<'all' | 'vent' | 'high_risk'>('all');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showNurseModal, setShowNurseModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'bundle' | 'notes'>('bundle');
  const [activeChecklistShift, setActiveChecklistShift] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [copiedNote, setCopiedNote] = useState(false);
  const [showWeaningProtocolSurvey, setShowWeaningProtocolSurvey] = useState(false);
  const [expandedAlertBeds, setExpandedAlertBeds] = useState<Record<string, boolean>>({});
  const [isSavingNewBed, setIsSavingNewBed] = useState(false);

  const [activeShift, setActiveShift] = useState<'เวรเช้า' | 'เวรบ่าย' | 'เวรดึก'>(() => {
    try {
      return (localStorage.getItem('vap_active_shift') as any) || 'เวรเช้า';
    } catch {
      return 'เวรเช้า';
    }
  });

  const [nurseName, setNurseName] = useState<string>(() => {
    try {
      return localStorage.getItem('vap_nurse_name') || 'พว.กานดา';
    } catch {
      return 'พว.กานดา';
    }
  });

  useEffect(() => {
    if (activeShift === 'เวรเช้า') setActiveChecklistShift('morning');
    else if (activeShift === 'เวรบ่าย') setActiveChecklistShift('afternoon');
    else setActiveChecklistShift('night');
  }, [activeShift]);

  useEffect(() => {
    try {
      localStorage.setItem('vap_active_shift', activeShift);
      localStorage.setItem('vap_nurse_name', nurseName);
    } catch {}
  }, [activeShift, nurseName]);

  const [sheetUrlInput, setSheetUrlInput] = useState<string>(() => {
    try {
      return localStorage.getItem('vap_google_sheet_url') || DEFAULT_GOOGLE_SHEET_URL;
    } catch {
      return DEFAULT_GOOGLE_SHEET_URL;
    }
  });
  const [sheetViewLink, setSheetViewLink] = useState<string>(() => {
    try {
      return localStorage.getItem('vap_google_sheet_view_link') || DEFAULT_SHEET_VIEW_URL;
    } catch {
      return DEFAULT_SHEET_VIEW_URL;
    }
  });
  const [isSheetConnected, setIsSheetConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cloudStatusMsg, setCloudStatusMsg] = useState<string>('เชื่อมต่อ Google Sheets แล้ว');

  // โหลดข้อมูลสำรองในเครื่องมาก่อนทันทีระหว่างรอ Sheets โหลด
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem('vap_ward_patients_f3');
      if (saved) return JSON.parse(saved).map(migratePatient);
    } catch {}
    return [];
  });

  // แก้ไข Syntax Error ของ useRef และเพิ่มตัวล็อกเวลาซิงค์ไม่ให้ข้อมูลเก่าทับ
  const pendingSyncRef = useRef>(new Map());
  const lastWriteTimeRef = useRef<number>(0);

  const sendUpsertToSheet = async (patient: Patient, targetUrl = sheetUrlInput) => {
    if (!targetUrl.trim()) return;
    lastWriteTimeRef.current = Date.now();
    setIsSyncing(true);
    setCloudStatusMsg('กำลังบันทึกลง Sheets...');
    try {
      await fetch(targetUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'upsert', patient })
      });
      lastWriteTimeRef.current = Date.now();
      setIsSheetConnected(true);
      setCloudStatusMsg('บันทึกลง Google Sheets แล้ว');
    } catch (e) {
      console.error('Sync error:', e);
      setCloudStatusMsg('ส่งข้อมูลไป Sheets ขัดข้อง');
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchFromGoogleSheets = async (targetUrl = sheetUrlInput) => {
    if (!targetUrl.trim()) {
      setIsSheetConnected(false);
      setCloudStatusMsg('ยังไม่ได้ใส่ URL (ใช้ Local)');
      return;
    }

    setIsSyncing(true);
    setCloudStatusMsg('กำลังดึงข้อมูลล่าสุดจาก Sheets...');
    try {
      // เติม ?t= เพื่อบังคับไม่ให้เบราว์เซอร์จำค่าเก่า (Bypass Cache) ทำให้เปิดเครื่องอื่นเห็นข้อมูลล่าสุดทันที
      const separator = targetUrl.includes('?') ? '&' : '?';
      const freshUrl = `${targetUrl.trim()}${separator}t=${Date.now()}`;

      const response = await fetch(freshUrl, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      if (Array.isArray(data)) {
        const migrated = data.map(migratePatient);
        migrated.sort((a, b) => a.bed.localeCompare(b.bed, 'th', { numeric: true }));
        setPatients(migrated);
        localStorage.setItem('vap_ward_patients_f3', JSON.stringify(migrated));
        setIsSheetConnected(true);
        setCloudStatusMsg('ซิงค์ข้อมูลตรงกันทุกเครื่องแล้ว');
      }
    } catch (err) {
      console.error('Error fetching from Google Sheets:', err);
      setIsSheetConnected(false);
      setCloudStatusMsg('เชื่อมต่อ Sheets ไม่สำเร็จ (ใช้ข้อมูลสำรอง)');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('vap_google_sheet_url', sheetUrlInput);
    fetchFromGoogleSheets(sheetUrlInput);

    // ซิงค์ข้อมูลระหว่างเครื่องอัตโนมัติทุกๆ 10 วินาที
    const interval = setInterval(() => {
      // ป้องกันการดึงข้อมูลเก่ามาทับหากเพิ่งมีการบันทึกภายใน 6 วินาทีที่ผ่านมา หรือยังมีคิวค้างส่ง
      const isRecentlyWritten = Date.now() - lastWriteTimeRef.current < 6000;
      if (sheetUrlInput.trim() && pendingSyncRef.current.size === 0 && !isRecentlyWritten) {
        const separator = sheetUrlInput.includes('?') ? '&' : '?';
        const freshUrl = `${sheetUrlInput.trim()}${separator}t=${Date.now()}`;

        fetch(freshUrl, { method: 'GET', redirect: 'follow', cache: 'no-store' })
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data) && pendingSyncRef.current.size === 0 && (Date.now() - lastWriteTimeRef.current >= 6000)) {
              const migrated = data.map(migratePatient);
              migrated.sort((a, b) => a.bed.localeCompare(b.bed, 'th', { numeric: true }));
              setPatients(migrated);
              localStorage.setItem('vap_ward_patients_f3', JSON.stringify(migrated));
              setIsSheetConnected(true);
              setCloudStatusMsg('ซิงค์ข้อมูลตรงกันทุกเครื่องแล้ว');
            }
          })
          .catch(() => {});
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [sheetUrlInput]);

  // Debounced Sync สำหรับการติ๊กเช็กลิสต์รัวๆ
  useEffect(() => {
    if (!sheetUrlInput.trim()) return;
    const timer = setTimeout(async () => {
      const entries = Array.from(pendingSyncRef.current.entries());
      if (entries.length === 0) return;

      lastWriteTimeRef.current = Date.now();
      setIsSyncing(true);
      setCloudStatusMsg('กำลังบันทึกลง Sheets...');
      try {
        for (const [, patient] of entries) {
          await fetch(sheetUrlInput.trim(), {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'upsert', patient })
          });
        }
        pendingSyncRef.current.clear();
        lastWriteTimeRef.current = Date.now();
        setIsSheetConnected(true);
        setCloudStatusMsg('บันทึกลง Google Sheets แล้ว');
      } catch (e) {
        console.error('Sync error:', e);
        setCloudStatusMsg('ส่งข้อมูลไป Sheets ขัดข้อง');
      } finally {
        setIsSyncing(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [patients]);

  const queueSyncPatient = (patient: Patient) => {
    lastWriteTimeRef.current = Date.now();
    pendingSyncRef.current.set(patient.id, patient);
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const updateItemStatus = (patientId: string, shiftKey: 'morning' | 'afternoon' | 'night', itemId: string, newStatus: 'complied' | 'not_complied') => {
    const timeNow = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    let updatedTarget: Patient | undefined;

    const updated = patients.map(p => {
      if (p.id !== patientId) return p;
      const shiftItems = p.checklists[shiftKey].map(item => {
        if (item.id === itemId) {
          const toggled: 'complied' | 'not_complied' | 'pending' = item.status === newStatus ? 'pending' : newStatus;
          return { ...item, status: toggled };
        }
        return item;
      });

      const newProg = calculateProgress(shiftItems);
      if (newProg === 100) {
        try { confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } }); } catch {}
      }

      updatedTarget = {
        ...p,
        checklists: { ...p.checklists, [shiftKey]: shiftItems },
        progresses: { ...p.progresses, [shiftKey]: newProg },
        lastAssessedBy: nurseName,
        lastAssessedShift: activeShift,
        lastAssessedTime: timeNow
      };
      return updatedTarget;
    });

    setPatients(updated);
    try { localStorage.setItem('vap_ward_patients_f3', JSON.stringify(updated)); } catch {}
    if (updatedTarget) {
      queueSyncPatient(updatedTarget);
    }
  };

  const updateWeaningItemStatus = (patientId: string, shiftKey: 'morning' | 'afternoon' | 'night', itemId: string, newStatus: 'complied' | 'not_complied') => {
    const timeNow = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    let updatedTarget: Patient | undefined;

    const updated = patients.map(p => {
      if (p.id !== patientId) return p;
      const surveyItems = (p.weaningSurveys?.[shiftKey] || DEFAULT_WEANING_SURVEY).map(item => {
        if (item.id === itemId) {
          const toggled: 'complied' | 'not_complied' | 'pending' = item.status === newStatus ? 'pending' : newStatus;
          return { ...item, status: toggled };
        }
        return item;
      });

      updatedTarget = {
        ...p,
        weaningSurveys: { ...p.weaningSurveys, [shiftKey]: surveyItems },
        lastAssessedBy: nurseName,
        lastAssessedShift: activeShift,
        lastAssessedTime: timeNow
      };
      return updatedTarget;
    });

    setPatients(updated);
    try { localStorage.setItem('vap_ward_patients_f3', JSON.stringify(updated)); } catch {}
    if (updatedTarget) {
      queueSyncPatient(updatedTarget);
    }
  };

  const updateWeaningItemNote = (patientId: string, shiftKey: 'morning' | 'afternoon' | 'night', itemId: string, noteText: string) => {
    let updatedTarget: Patient | undefined;

    const updated = patients.map(p => {
      if (p.id !== patientId) return p;
      const surveyItems = (p.weaningSurveys?.[shiftKey] || DEFAULT_WEANING_SURVEY).map(item => {
        if (item.id === itemId) {
          return { ...item, note: noteText };
        }
        return item;
      });

      updatedTarget = {
        ...p,
        weaningSurveys: { ...p.weaningSurveys, [shiftKey]: surveyItems }
      };
      return updatedTarget;
    });

    setPatients(updated);
    try { localStorage.setItem('vap_ward_patients_f3', JSON.stringify(updated)); } catch {}
    if (updatedTarget) {
      queueSyncPatient(updatedTarget);
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    lastWriteTimeRef.current = Date.now();
    pendingSyncRef.current.delete(patientId);
    const updated = patients.filter(p => p.id !== patientId);
    setPatients(updated);
    setDeleteConfirmId(null);
    if (selectedPatientId === patientId) setSelectedPatientId(null);
    try { localStorage.setItem('vap_ward_patients_f3', JSON.stringify(updated)); } catch {}
    
    if (sheetUrlInput.trim()) {
      setIsSyncing(true);
      try {
        await fetch(sheetUrlInput.trim(), {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'delete', patientId })
        });
        lastWriteTimeRef.current = Date.now();
      } catch {} finally {
        setIsSyncing(false);
      }
    }
  };

  const [newBed, setNewBed] = useState('B01');
  const [newName, setNewName] = useState('');
  const [newHn, setNewHn] = useState('');
  const [newAge, setNewAge] = useState('60');
  const [newVentDay, setNewVentDay] = useState('1');

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newHn.trim()) {
      alert('กรุณากรอกชื่อและเลข HN ให้ครบถ้วน');
      return;
    }

    setIsSavingNewBed(true);
    const timeNow = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    const newPt: Patient = {
      id: 'p-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      bed: newBed.trim().toUpperCase(),
      hn: newHn.trim(),
      name: newName.trim(),
      gender: 'หญิง',
      age: parseInt(newAge) || 60,
      ventDay: parseInt(newVentDay) || 1,
      checklists: {
        morning: DEFAULT_WHAPOS_CHECKLIST.map(i => ({ ...i, status: 'pending' })),
        afternoon: DEFAULT_WHAPOS_CHECKLIST.map(i => ({ ...i, status: 'pending' })),
        night: DEFAULT_WHAPOS_CHECKLIST.map(i => ({ ...i, status: 'pending' }))
      },
      weaningSurveys: {
        morning: DEFAULT_WEANING_SURVEY.map(i => ({ ...i, status: 'pending' })),
        afternoon: DEFAULT_WEANING_SURVEY.map(i => ({ ...i, status: 'pending' })),
        night: DEFAULT_WEANING_SURVEY.map(i => ({ ...i, status: 'pending' }))
      },
      progresses: { morning: 0, afternoon: 0, night: 0 },
      lastAssessedBy: nurseName,
      lastAssessedShift: activeShift,
      lastAssessedTime: timeNow
    };

    const updated = [newPt, ...patients].sort((a, b) => a.bed.localeCompare(b.bed, 'th', { numeric: true }));
    setPatients(updated);
    try { localStorage.setItem('vap_ward_patients_f3', JSON.stringify(updated)); } catch {}

    // บันทึกขึ้น Google Sheets ทันที ไม่ต้องรอ Debounce
    await sendUpsertToSheet(newPt);

    setIsSavingNewBed(false);
    setShowAddModal(false);
    setNewName('');
    setNewHn('');
  };

  const handleCopyNotes = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  const generateHandoverNote = (pt: Patient) => {
    const shiftKey = activeChecklistShift;
    const shiftName = shiftKey === 'morning' ? 'เวรเช้า' : shiftKey === 'afternoon' ? 'เวรบ่าย' : 'เวรดึก';
    const shiftItems = pt.checklists[shiftKey] || DEFAULT_WHAPOS_CHECKLIST;
    const shiftProg = pt.progresses[shiftKey] || 0;
    const riskInfo = getRiskTier(shiftProg);
    const surveyItems = pt.weaningSurveys?.[shiftKey] || DEFAULT_WEANING_SURVEY;

    const compliedItems = shiftItems.filter(i => i.status === 'complied').map(i => `  ✓ [ปฏิบัติ] ${decodeSymbols(i.text)}`);
    const notCompliedItems = shiftItems.filter(i => i.status === 'not_complied').map(i => `  ✗ [ไม่ปฏิบัติ] ${decodeSymbols(i.text)}`);
    const pendingItems = shiftItems.filter(i => i.status === 'pending').map(i => `  - [รอดำเนินการ] ${decodeSymbols(i.text)}`);

    const surveyComplied = surveyItems.filter(i => i.status === 'complied').map(i => `  ✓ ${decodeSymbols(i.text)}${i.note ? ` (หมายเหตุ: ${i.note})` : ''}`);
    const surveyNotComplied = surveyItems.filter(i => i.status === 'not_complied').map(i => `  ✗ ${decodeSymbols(i.text)}${i.note ? ` (หมายเหตุ: ${i.note})` : ''}`);

    return `[สรุปส่งเวร หอผู้ป่วยอายุรกรรมหญิง 3 (อญ.3)]
ผู้ประเมิน: ${pt.lastAssessedBy || nurseName} (${pt.lastAssessedShift || shiftName}) เวลา ${pt.lastAssessedTime || '09:00 น.'}
เตียง: ${pt.bed} | HN: ${pt.hn} | ${pt.name} (${pt.gender} ${pt.age} ปี)
Ventilator Day: ${pt.ventDay} | Compliance (${shiftName}): ${shiftProg}%
ประเมินความเสี่ยง VAP: [${riskInfo.label}] - ${riskInfo.evalLevel}

รายการประเมิน WHAPO + S (${shiftName}):
[ปฏิบัติ (${compliedItems.length})]:
${compliedItems.length > 0 ? compliedItems.join('\n') : '  (ไม่มี)'}

[ไม่ปฏิบัติ (${notCompliedItems.length})]:
${notCompliedItems.length > 0 ? notCompliedItems.join('\n') : '  (ไม่มี)'}

[รอดำเนินการ (${pendingItems.length})]:
${pendingItems.length > 0 ? pendingItems.join('\n') : '  (ไม่มี)'}

--- แบบสำรวจ Weaning Protocol สำหรับพยาบาลวิชาชีพ ---
[ปฏิบัติ (${surveyComplied.length})]:
${surveyComplied.length > 0 ? surveyComplied.join('\n') : '  (ไม่มี)'}

[ไม่ปฏิบัติ/ยังไม่ประเมิน (${surveyNotComplied.length})]:
${surveyNotComplied.length > 0 ? surveyNotComplied.join('\n') : '  (ไม่มี)'}

ผู้บันทึก: ${pt.lastAssessedBy || nurseName}`;
  };

  const totalCount = patients.length;
  const ventCount = patients.length;
  const highRiskCount = patients.filter(p => {
    const prog = p.progresses?.[activeChecklistShift] ?? 0;
    return getRiskTier(prog).isHighRisk;
  }).length;

  const bedAlerts = patients
    .map(p => {
      const items = p.checklists?.[activeChecklistShift] || DEFAULT_WHAPOS_CHECKLIST;
      const pendingItems = items.filter(i => i.status === 'pending');
      const notCompliedItems = items.filter(i => i.status === 'not_complied');
      return {
        patient: p,
        pendingItems,
        notCompliedItems,
        totalMissed: pendingItems.length + notCompliedItems.length
      };
    })
    .filter(a => a.totalMissed > 0);

  const filteredPatients = patients.filter(p => {
    const prog = p.progresses?.[activeChecklistShift] ?? 0;
    const tier = getRiskTier(prog);
    if (bedFilter === 'vent') return true;
    if (bedFilter === 'high_risk') return tier.isHighRisk;
    return true;
  });

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-300 p-0 sm:py-6 sm:px-4 font-sans">
      <div className="w-full sm:max-w-[430px] h-[100vh] sm:h-[880px] bg-[#F0FDFA] shadow-2xl sm:rounded-[40px] flex flex-col overflow-hidden relative border border-slate-300">
        
        {/* Top Header */}
        <header className="bg-teal-700 text-white px-5 pt-3 pb-2.5 flex flex-col gap-2 shadow-md flex-shrink-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-600 border border-teal-500 flex items-center justify-center shadow-inner">
                <Activity className="w-5 h-5 text-teal-100 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold font-prompt tracking-wide">VAP BUNDLE CASE</h1>
                  <span className="text-[10px] bg-teal-800 text-teal-200 px-1.5 py-0.5 rounded font-semibold">อญ.3</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchFromGoogleSheets(sheetUrlInput)}
                disabled={isSyncing}
                className="p-1 rounded-full bg-teal-800 hover:bg-teal-600 text-teal-100 transition-colors"
                title="รีเฟรชข้อมูลจาก Google Sheets"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={() => setShowCloudModal(true)}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-prompt font-semibold transition-all shadow-sm ${
                  isSheetConnected 
                    ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white border border-emerald-400' 
                    : 'bg-amber-500/90 hover:bg-amber-500 text-white border border-amber-300'
                }`}
                title="ตั้งค่า Google Sheets"
              >
                {isSheetConnected ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                <span>{isSyncing ? 'กำลังซิงค์...' : (isSheetConnected ? 'Sheets' : 'Local')}</span>
              </button>
            </div>
          </div>

          <div 
            onClick={() => setShowNurseModal(true)}
            className="bg-teal-800/90 hover:bg-teal-800 border border-teal-600/60 rounded-xl px-3 py-1.5 flex items-center justify-between cursor-pointer transition-colors shadow-inner"
            title="คลิกเพื่อเปลี่ยนชื่อพยาบาลหรือเวร"
          >
            <div className="flex items-center gap-2 text-xs font-sarabun text-teal-100 truncate">
              <User className="w-3.5 h-3.5 text-teal-300 flex-shrink-0" />
              <span className="truncate">ผู้ประเมิน: <strong className="text-white">{nurseName}</strong></span>
              <span className="text-teal-400">|</span>
              <span className="bg-teal-700 text-teal-100 px-1.5 py-0.2 rounded text-[11px] font-semibold">{activeShift}</span>
            </div>
            <div className="text-[10px] text-teal-300 underline flex-shrink-0 font-prompt">เปลี่ยน</div>
          </div>
        </header>

        {/* Main Body View */}
        <div className="flex-1 overflow-y-auto pb-24 pt-4 px-4 bg-[#F0FDFA]">
          
          {currentTab === 'home' && !selectedPatientId && (
            <div className="space-y-4 font-sarabun">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-teal-100 shadow-sm">
                  <div className="flex items-center justify-between text-teal-700 mb-2">
                    <span className="text-xs font-bold font-prompt">ผู้ป่วย Vent (อญ.3)</span>
                    <Users className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-2xl font-extrabold font-prompt text-slate-800">{totalCount} <span className="text-xs font-normal text-slate-500">ราย</span></div>
                  <div className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> หอผู้ป่วยหญิง 3
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-teal-100 shadow-sm">
                  <div className="flex items-center justify-between text-teal-700 mb-2">
                    <span className="text-xs font-bold font-prompt">เสี่ยงมาก (&lt;60%)</span>
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-2xl font-extrabold font-prompt text-rose-600">{highRiskCount} <span className="text-xs font-normal text-slate-500">ราย</span></div>
                  <div className="text-[11px] text-slate-500 mt-1">ต้องซ่อมเสริม/พัฒนา</div>
                </div>
              </div>

              {patients.length > 0 && (
                <div className={`rounded-2xl p-3.5 border shadow-sm space-y-2.5 ${
                  bedAlerts.length > 0 
                    ? 'bg-amber-50/90 border-amber-300' 
                    : 'bg-emerald-50/90 border-emerald-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        bedAlerts.length > 0 ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                      }`}>
                        {bedAlerts.length > 0 ? <BellRing className="w-4 h-4 animate-bounce" /> : <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className={`text-xs font-bold font-prompt ${
                          bedAlerts.length > 0 ? 'text-amber-950' : 'text-emerald-900'
                        }`}>
                          {bedAlerts.length > 0 
                            ? `แจ้งเตือนรายการที่ยังไม่ได้ทำ (${activeShift})` 
                            : `ทำครบทุกรายการแล้ว (${activeShift})`}
                        </h3>
                        <p className="text-[10px] text-slate-600">
                          {bedAlerts.length > 0 
                            ? `พบ ${bedAlerts.length} เตียงที่ยังมีรายการค้างทำ/ไม่ปฏิบัติ (แตะที่เตียงเพื่อเข้าไปประเมิน)` 
                            : 'เยี่ยมมาก! ผู้ป่วยทุกรายได้รับการประเมิน WHAPO + S ครบ 100%'}
                        </p>
                      </div>
                    </div>
                    {bedAlerts.length > 0 && (
                      <span className="text-[10px] font-bold font-prompt bg-rose-600 text-white px-2 py-0.5 rounded-full">
                        {bedAlerts.length} เตียง
                      </span>
                    )}
                  </div>

                  {bedAlerts.length > 0 && (
                    <div className="space-y-2 pt-1 max-h-60 overflow-y-auto pr-0.5">
                      {bedAlerts.map(({ patient, pendingItems, notCompliedItems, totalMissed }) => {
                        const isExpanded = !!expandedAlertBeds[patient.id];
                        const allMissed = [
                          ...notCompliedItems.map(i => ({ ...i, alertType: 'not_complied' as const })),
                          ...pendingItems.map(i => ({ ...i, alertType: 'pending' as const }))
                        ];
                        const displayItems = isExpanded ? allMissed : allMissed.slice(0, 3);

                        return (
                          <div 
                            key={patient.id}
                            onClick={() => setSelectedPatientId(patient.id)}
                            className="bg-white rounded-xl p-2.5 border border-amber-200 hover:border-teal-500 shadow-xs cursor-pointer transition-all group"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold font-prompt bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                                  เตียง {patient.bed}
                                </span>
                                <span className="text-xs font-bold font-prompt text-slate-800 truncate max-w-[140px]">
                                  {patient.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-prompt font-semibold text-teal-700 group-hover:translate-x-0.5 transition-transform">
                                <span>ค้าง {totalMissed} ข้อ</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </div>
                            </div>

                            <ul className="space-y-1 pl-1">
                              {displayItems.map(item => (
                                <li key={item.id} className="flex items-start gap-1.5 text-[11px] leading-snug">
                                  {item.alertType === 'not_complied' ? (
                                    <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded flex-shrink-0 mt-0.5">
                                      ไม่ปฏิบัติ
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded flex-shrink-0 mt-0.5 flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5" /> ลืมทำ
                                    </span>
                                  )}
                                  <span className="text-slate-700">
                                    <strong className="text-teal-800">[{item.groupKey}]</strong> {decodeSymbols(item.text)}
                                  </span>
                                </li>
                              ))}
                            </ul>

                            {allMissed.length > 3 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedAlertBeds(prev => ({ ...prev, [patient.id]: !isExpanded }));
                                }}
                                className="mt-1.5 text-[10px] font-prompt font-semibold text-amber-800 hover:text-amber-950 underline pl-1"
                              >
                                {isExpanded ? 'ย่อรายการ ▲' : `ดูเพิ่มอีก ${allMissed.length - 3} รายการที่ยังไม่ได้ทำ ▼`}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-prompt mb-3 px-1">
                  เมนูด่วน (Smart Ward อญ.3 Menu)
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => setCurrentTab('beds')}
                    className="bg-white p-4 rounded-2xl border border-teal-100 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold font-prompt text-slate-800">รายเตียง (Bed List - อญ.3)</div>
                        <div className="text-xs text-slate-500">ประเมิน WHAPO + S คำนวณความเสี่ยงอัตโนมัติ</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button 
                    onClick={() => setCurrentTab('guide')}
                    className="bg-white p-4 rounded-2xl border border-teal-100 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold font-prompt text-slate-800">คู่มือ/แนวทาง WHAPOS Reference</div>
                        <div className="text-xs text-slate-500">เกณฑ์การให้คะแนนและความเสี่ยงอัตโนมัติ</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <a 
                    href={sheetViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold font-prompt text-slate-800 flex items-center gap-1.5">
                          เปิดดูตารางสรุป (Google Sheets)
                        </div>
                        <div className="text-xs text-slate-500">ดูรายงานคะแนนรายเตียงและดาวน์โหลด Excel</div>
                      </div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </div>
              </div>

            </div>
          )}

          {currentTab === 'beds' && !selectedPatientId && (
            <div className="space-y-4 font-sarabun">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold font-prompt text-slate-800">รายเตียง (อญ.3)</h2>
                  <p className="text-xs text-slate-500">หอผู้ป่วยอายุรกรรมหญิง 3 (ผู้ป่วยหญิงทั้งหมด)</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-prompt px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" /> เพิ่มผู้ป่วย
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button 
                  onClick={() => setBedFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-prompt transition-colors whitespace-nowrap ${
                    bedFilter === 'all' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-teal-100'
                  }`}
                >
                  ทั้งหมด ({totalCount})
                </button>
                <button 
                  onClick={() => setBedFilter('vent')}
                  className={`px-3 py-1.5 rounded-full text-xs font-prompt transition-colors whitespace-nowrap ${
                    bedFilter === 'vent' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-teal-100'
                  }`}
                >
                  ใช้เครื่องช่วยหายใจ ({ventCount})
                </button>
                <button 
                  onClick={() => setBedFilter('high_risk')}
                  className={`px-3 py-1.5 rounded-full text-xs font-prompt transition-colors whitespace-nowrap ${
                    bedFilter === 'high_risk' ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-teal-100'
                  }`}
                >
                  เสี่ยงมาก (&lt;60%) ({highRiskCount})
                </button>
              </div>

              <div className="space-y-3">
                {filteredPatients.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs bg-white rounded-2xl border border-teal-100 p-6">
                    {isSyncing ? 'กำลังโหลดข้อมูลจาก Google Sheets...' : 'ยังไม่มีข้อมูลผู้ป่วยในขณะนี้ (สามารถกดปุ่ม "+ เพิ่มผู้ป่วย" ด้านบนได้ทันที)'}
                  </div>
                ) : (
                  filteredPatients.map((patient) => {
                    const shiftProgKey = activeChecklistShift;
                    const currentProg = patient.progresses?.[shiftProgKey] ?? 0;
                    const riskTier = getRiskTier(currentProg);
                    const shiftItems = patient.checklists?.[shiftProgKey] || DEFAULT_WHAPOS_CHECKLIST;
                    const missedCount = shiftItems.filter(i => i.status !== 'complied').length;
                    
                    return (
                      <div 
                        key={patient.id}
                        onClick={() => setSelectedPatientId(patient.id)}
                        className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden ${
                          riskTier.isHighRisk ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/30' : 'border-teal-100'
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(patient.id);
                          }}
                          className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors z-10"
                          title="ลบเตียง"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="flex items-start justify-between pr-8">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm font-prompt ${
                              riskTier.isHighRisk ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700'
                            }`}>
                              {patient.bed}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold font-prompt text-slate-800">{patient.name}</h3>
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${riskTier.badgeClass}`}>
                                  {riskTier.label} ({currentProg}%)
                                </span>
                                {missedCount > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    ค้าง {missedCount} ข้อ
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                HN: {patient.hn} | {patient.gender} {patient.age} ปี | <span className="font-semibold text-teal-700">Ventilator Day {patient.ventDay}</span>
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                              <span>WHAPO + S Score ({activeShift})</span>
                              <span className={currentProg >= 80 ? 'text-emerald-600' : currentProg >= 60 ? 'text-amber-600' : 'text-rose-600'}>
                                {currentProg}% ({riskTier.evalLevel.split(' ')[0]})
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  currentProg >= 80 ? 'bg-emerald-500' : currentProg >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${currentProg}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-[10px] text-teal-800 font-semibold block">{patient.lastAssessedBy || 'พว.กานดา'} ({patient.lastAssessedShift || 'เวรเช้า'})</span>
                            <span className="text-[10px] text-slate-500">เวลา {patient.lastAssessedTime || '08:30 น.'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {selectedPatientId && selectedPatient && (() => {
            const currentProg = selectedPatient.progresses?.[activeChecklistShift] ?? 0;
            const riskTier = getRiskTier(currentProg);

            return (
              <div className="space-y-4 font-sarabun">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setSelectedPatientId(null)}
                    className="flex items-center gap-1.5 text-xs font-prompt font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200"
                  >
                    <ArrowLeft className="w-4 h-4" /> กลับ
                  </button>
                  <button 
                    onClick={() => setDeleteConfirmId(selectedPatient.id)}
                    className="flex items-center gap-1.5 text-xs font-prompt font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> ลบเตียงนี้
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-prompt bg-teal-700 text-white px-2 py-0.5 rounded-md">
                          {selectedPatient.bed} (อญ.3)
                        </span>
                        <span className="text-xs text-slate-500">HN: {selectedPatient.hn}</span>
                      </div>
                      <h2 className="text-base font-bold font-prompt text-slate-800 mt-1">{selectedPatient.name}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedPatient.gender} {selectedPatient.age} ปี | Ventilator Day {selectedPatient.ventDay}
                      </p>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    currentProg >= 80 ? 'bg-emerald-50 border-emerald-300 text-emerald-950' :
                    currentProg >= 60 ? 'bg-amber-50 border-amber-300 text-amber-950' :
                    'bg-rose-50 border-rose-300 text-rose-950'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm font-prompt flex-shrink-0 ${
                        currentProg >= 80 ? 'bg-emerald-200 text-emerald-800' :
                        currentProg >= 60 ? 'bg-amber-200 text-amber-800' :
                        'bg-rose-200 text-rose-800'
                      }`}>
                        {currentProg}%
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold font-prompt">ประเมินความเสี่ยง VAP:</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${riskTier.badgeClass}`}>
                            {riskTier.label}
                          </span>
                        </div>
                        <p className="text-[11px] font-sarabun mt-1 font-semibold opacity-90">
                          {riskTier.evalLevel}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex bg-teal-100/60 p-1 rounded-2xl">
                  <button
                    onClick={() => setSubTab('bundle')}
                    className={`flex-1 py-2 text-xs font-prompt font-semibold rounded-xl transition-all ${
                      subTab === 'bundle' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    ประเมิน WHAPO + S ({currentProg}%)
                  </button>
                  <button
                    onClick={() => setSubTab('notes')}
                    className={`flex-1 py-2 text-xs font-prompt font-semibold rounded-xl transition-all ${
                      subTab === 'notes' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    สรุปส่งเวร
                  </button>
                </div>

                {subTab === 'bundle' && (
                  <div className="space-y-4">
                    <div className="flex bg-white p-1.5 rounded-2xl border border-teal-200 shadow-xs gap-1">
                      <button
                        onClick={() => setActiveChecklistShift('morning')}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-prompt font-semibold flex items-center justify-center gap-1 transition-all ${
                          activeChecklistShift === 'morning' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-teal-50'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" /> เวรเช้า ({selectedPatient.progresses?.morning ?? 0}%)
                      </button>
                      <button
                        onClick={() => setActiveChecklistShift('afternoon')}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-prompt font-semibold flex items-center justify-center gap-1 transition-all ${
                          activeChecklistShift === 'afternoon' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-teal-50'
                        }`}
                      >
                        <Sunset className="w-3.5 h-3.5" /> เวรบ่าย ({selectedPatient.progresses?.afternoon ?? 0}%)
                      </button>
                      <button
                        onClick={() => setActiveChecklistShift('night')}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-prompt font-semibold flex items-center justify-center gap-1 transition-all ${
                          activeChecklistShift === 'night' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-teal-50'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" /> เวรดึก ({selectedPatient.progresses?.night ?? 0}%)
                      </button>
                    </div>

                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-prompt">
                        WHAPO + S Bundle ({activeChecklistShift === 'morning' ? 'เวรเช้า' : activeChecklistShift === 'afternoon' ? 'เวรบ่าย' : 'เวรดึก'})
                      </h3>
                      <span className="text-xs font-semibold text-teal-700">
                        ผู้ประเมิน: {selectedPatient.lastAssessedBy || nurseName}
                      </span>
                    </div>

                    {(['W', 'H', 'A', 'P', 'O', 'S'] as const).map(groupKey => {
                      const shiftItems = selectedPatient.checklists?.[activeChecklistShift] || DEFAULT_WHAPOS_CHECKLIST;
                      const groupItems = shiftItems.filter(i => i.groupKey === groupKey);
                      if (groupItems.length === 0) return null;
                      const groupTitle = decodeSymbols(groupItems[0].groupTitle);
                      const groupCompliedCount = groupItems.filter(i => i.status === 'complied').length;

                      return (
                        <div key={groupKey} className="bg-white rounded-2xl p-3.5 border border-teal-100 shadow-sm space-y-2.5">
                          <div className="flex items-center justify-between border-b border-teal-50 pb-2">
                            <h4 className="text-xs font-bold font-prompt text-teal-800 flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-extrabold">
                                {groupKey}
                              </span>
                              {groupTitle}
                            </h4>
                            <span className="text-[11px] text-slate-500">
                              ปฏิบัติแล้ว {groupCompliedCount}/{groupItems.length}
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {groupItems.map(item => {
                              const isComplied = item.status === 'complied';
                              const isNotComplied = item.status === 'not_complied';
                              const cleanText = decodeSymbols(item.text);

                              return (
                                <React.Fragment key={item.id}>
                                  <div 
                                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                      isComplied ? 'bg-emerald-50/40 border-emerald-300' :
                                      isNotComplied ? 'bg-rose-50/40 border-rose-300' :
                                      'bg-slate-50/60 border-slate-200'
                                    }`}
                                  >
                                    <div className="flex-1">
                                      <p className="text-xs font-sarabun font-medium text-slate-800 leading-relaxed">
                                        {cleanText}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <button
                                        onClick={() => updateItemStatus(selectedPatient.id, activeChecklistShift, item.id, 'complied')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-prompt font-semibold transition-all flex items-center gap-1 shadow-xs ${
                                          isComplied 
                                            ? 'bg-[#10B981] text-white shadow-sm ring-2 ring-emerald-200' 
                                            : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50'
                                        }`}
                                      >
                                        <Check className="w-3.5 h-3.5" /> ปฏิบัติ
                                      </button>

                                      <button
                                        onClick={() => updateItemStatus(selectedPatient.id, activeChecklistShift, item.id, 'not_complied')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-prompt font-semibold transition-all flex items-center gap-1 shadow-xs ${
                                          isNotComplied 
                                            ? 'bg-[#EF4444] text-white shadow-sm ring-2 ring-rose-200' 
                                            : 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50'
                                        }`}
                                      >
                                        <X className="w-3.5 h-3.5" /> ไม่ปฏิบัติ
                                      </button>
                                    </div>
                                  </div>

                                  {cleanText === 'ใช้ weaning protocol' && (
                                    <div className="mt-2 ml-2 sm:ml-4 border-l-2 border-teal-500 pl-3 space-y-2">
                                      <button
                                        onClick={() => setShowWeaningProtocolSurvey(prev => !prev)}
                                        className="w-full bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-prompt font-semibold py-2.5 px-3 rounded-xl flex items-center justify-between transition-colors shadow-xs"
                                      >
                                        <span className="flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-teal-600" />
                                          📋 แบบสำรวจการใช้ Weaning Protocol สำหรับพยาบาลวิชาชีพ
                                        </span>
                                        {showWeaningProtocolSurvey ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                      </button>

                                      {showWeaningProtocolSurvey && (
                                        <div className="bg-slate-50 border border-teal-200 rounded-2xl p-3.5 space-y-4 animate-in fade-in duration-200">
                                          <div className="text-xs font-bold text-teal-900 font-prompt border-b border-teal-100 pb-1.5">
                                            แบบสำรวจการใช้ Weaning Protocol (4 หมวด)
                                          </div>

                                          {[1, 2, 3, 4].map(catNum => {
                                            const surveyList = selectedPatient.weaningSurveys?.[activeChecklistShift] || DEFAULT_WEANING_SURVEY;
                                            const catItems = surveyList.filter(s => s.category === catNum);
                                            if (catItems.length === 0) return null;
                                            const catTitle = decodeSymbols(catItems[0].categoryTitle);

                                            return (
                                              <div key={catNum} className="space-y-2 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                                                <h5 className="text-[11px] font-bold font-prompt text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg">
                                                  {catTitle}
                                                </h5>

                                                <div className="space-y-3 pt-1">
                                                  {catItems.map(surveyItem => {
                                                    const sComplied = surveyItem.status === 'complied';
                                                    const sNotComplied = surveyItem.status === 'not_complied';
                                                    const cleanSurveyText = decodeSymbols(surveyItem.text);

                                                    return (
                                                      <div key={surveyItem.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                          <p className="text-[11px] font-sarabun font-medium text-slate-800 flex-1 leading-relaxed">
                                                            {cleanSurveyText}
                                                          </p>
                                                          <div className="flex items-center gap-1 flex-shrink-0">
                                                            <button
                                                              onClick={() => updateWeaningItemStatus(selectedPatient.id, activeChecklistShift, surveyItem.id, 'complied')}
                                                              className={`px-2.5 py-1 rounded-lg text-[10px] font-prompt font-semibold transition-all flex items-center gap-0.5 ${
                                                                sComplied ? 'bg-[#10B981] text-white shadow-xs' : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50'
                                                              }`}
                                                            >
                                                              <Check className="w-3 h-3" /> ปฏิบัติ
                                                            </button>
                                                            <button
                                                              onClick={() => updateWeaningItemStatus(selectedPatient.id, activeChecklistShift, surveyItem.id, 'not_complied')}
                                                              className={`px-2.5 py-1 rounded-lg text-[10px] font-prompt font-semibold transition-all flex items-center gap-0.5 ${
                                                                sNotComplied ? 'bg-[#EF4444] text-white shadow-xs' : 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50'
                                                              }`}
                                                            >
                                                              <X className="w-3 h-3" /> ไม่ปฏิบัติ
                                                            </button>
                                                          </div>
                                                        </div>

                                                        <div>
                                                          <input 
                                                            type="text"
                                                            value={surveyItem.note}
                                                            onChange={e => updateWeaningItemNote(selectedPatient.id, activeChecklistShift, surveyItem.id, e.target.value)}
                                                            placeholder="หมายเหตุ (ถ้ามี)..."
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 focus:outline-none focus:border-teal-500 font-sarabun"
                                                          />
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {subTab === 'notes' && (
                  <div className="bg-white rounded-2xl p-4 border border-teal-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold font-prompt text-slate-800">สรุปส่งเวรตาม WHAPO + S & Weaning Protocol (อญ.3)</h3>
                      <button
                        onClick={() => handleCopyNotes(generateHandoverNote(selectedPatient))}
                        className="bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-prompt px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 border border-teal-200 transition-colors"
                      >
                        {copiedNote ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedNote ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความส่งเวร'}
                      </button>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-sarabun whitespace-pre-line leading-relaxed">
                      {generateHandoverNote(selectedPatient)}
                    </div>
                    <p className="text-[11px] text-slate-400">ข้อความสรุปส่งเวรแสดงคะแนน % ความเสี่ยงอัตโนมัติ และรายการ ปฏิบัติ / ไม่ปฏิบัติ ครบถ้วน</p>
                  </div>
                )}

              </div>
            );
          })()}

          {currentTab === 'guide' && (
            <div className="space-y-4 font-sarabun">
              <div>
                <h2 className="text-base font-bold font-prompt text-slate-800">คู่มือ/แนวทาง WHAPO + S & Risk Tiers</h2>
                <p className="text-xs text-slate-500">เกณฑ์การคำนวณระดับความเสี่ยงอัตโนมัติจากคะแนน % การปฏิบัติ</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-sm space-y-3">
                <h3 className="text-xs font-bold font-prompt text-teal-800">📋 เกณฑ์การประเมินระดับความเสี่ยง VAP อัตโนมัติ</h3>
                <div className="space-y-2 text-xs text-slate-700 font-sarabun">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <strong className="text-emerald-800 font-prompt">คะแนน ≥ 80% (เสี่ยงน้อย):</strong>
                      <div className="text-[11px] text-emerald-700">ระดับสูง / ดี / มาก (ผ่านเกณฑ์ระดับยอดเยี่ยม)</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">เสี่ยงน้อย</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                    <div>
                      <strong className="text-amber-800 font-prompt">คะแนน 60 - 79% (เสี่ยงปานกลาง):</strong>
                      <div className="text-[11px] text-amber-700">ระดับปานกลาง (ผ่านเกณฑ์พื้นฐาน)</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">เสี่ยงปานกลาง</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                    <div>
                      <strong className="text-rose-800 font-prompt">คะแนน &lt; 60% (เสี่ยงมาก):</strong>
                      <div className="text-[11px] text-rose-700">ระดับต่ำ / ไม่ผ่านเกณฑ์ (ต้องได้รับการซ่อมเสริมหรือพัฒนาเพิ่ม)</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">เสี่ยงมาก</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-sm space-y-2">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center font-prompt text-base">W</div>
                    <div>
                      <h4 className="text-xs font-bold font-prompt text-slate-800">W - WEAN การหย่าเครื่องช่วยหายใจ</h4>
                      <p className="text-[11px] text-slate-500">รวมแบบสำรวจ 4 หมวดสำหรับพยาบาลวิชาชีพ</p>
                    </div>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5 pl-4 list-disc marker:text-cyan-600 font-sarabun">
                    <li>ประเมินความพร้อมในการถอดท่อช่วยหายใจทุกวัน</li>
                    <li>ใช้ weaning protocol (มีแบบสำรวจละเอียด 4 หมวด)</li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center font-prompt text-base">H</div>
                    <div>
                      <h4 className="text-xs font-bold font-prompt text-slate-800">H - HAND HYGIENE การทำความสะอาดมือ</h4>
                      <p className="text-[11px] text-slate-500">สุขอนามัยมือเคร่งครัด</p>
                    </div>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5 pl-4 list-disc marker:text-emerald-600 font-sarabun">
                    <li>ล้างมือ 7 ขั้นตอน</li>
                    <li>ล้างมือ 5 moments</li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center font-prompt text-base">A</div>
                    <div>
                      <h4 className="text-xs font-bold font-prompt text-slate-800">A - ASPIRATE PRECAUTIONS การป้องกันการสำลัก</h4>
                      <p className="text-[11px] text-slate-500">ลดความเสี่ยงการสำลักน้ำย่อย</p>
                    </div>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5 pl-4 list-disc marker:text-amber-600 font-sarabun">
                    <li>ยกหัวเตียงสูง 30-45 องศา</li>
                    <li>วัด cuff pressure 30-35 cmH2O ทุกเวร</li>
                    <li>ประเมิน NG ก่อน feeds</li>
                    <li>ใช้ชุดหยดอาหารทางสายยาง ใช้เวลา 2-4 ชม.</li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-800 font-bold flex items-center justify-center font-prompt text-base">P</div>
                    <div>
                      <h4 className="text-xs font-bold font-prompt text-slate-800">P - PREVENTION CONTAMINATION การป้องกันการปนเปื้อน</h4>
                      <p className="text-[11px] text-slate-500">จัดการสาย circuit และอุปกรณ์</p>
                    </div>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5 pl-4 list-disc marker:text-violet-600 font-sarabun">
                    <li>เปลี่ยน ventilator circuit เมื่อเปื้อนสกปรก หรือเมื่อเปลี่ยนผู้ป่วย</li>
                    <li>เทน้ำทิ้งสาย circuit ด้วย aseptic technique</li>
                    <li>ดูดเสมหะเท่าที่จำเป็น</li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-800 font-bold flex items-center justify-center font-prompt text-base">O</div>
                    <div>
                      <h4 className="text-xs font-bold font-prompt text-slate-800">O - ORAL CARE การทำความสะอาดช่องปาก</h4>
                      <p className="text-[11px] text-slate-500">ลดแบคทีเรียและ Biofilm ในช่องปาก</p>
                    </div>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5 pl-4 list-disc marker:text-pink-600 font-sarabun">
                    <li>ประเมินสุขภาพช่องปากด้วย OAG วันละ 1 ครั้ง</li>
                    <li>ใช้แปรงสีฟันที่มีขนแปรงอ่อนนุ่ม และยาสีฟันที่มีฟลูออไรด์ &gt;1,500 ppm</li>
                    <li>เช็ดช่องปากด้วย 0.9% NSS สลับกับการแปรงฟัน</li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center font-prompt text-base">S</div>
                    <div>
                      <h4 className="text-xs font-bold font-prompt text-slate-800">S - SEDATION VACATION การหยุดยานอนหลับชั่วคราว+เฝ้าระวัง</h4>
                      <p className="text-[11px] text-slate-500">ประเมินความตื่นตัวและลดขนาดยา</p>
                    </div>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5 pl-4 list-disc marker:text-indigo-600 font-sarabun">
                    <li>ประเมินการหยุดยานอนหลับ วันละครั้ง ช่วงเช้า</li>
                    <li>ลดปริมาณการใช้ และหยุดยานอนหลับ</li>
                    <li>(ปฏิบัติร่วมกับการรักษากับแพทย์เจ้าของไข้)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>

        <nav className="absolute bottom-0 inset-x-0 bg-white border-t border-teal-100 px-2 py-2 flex items-center justify-around shadow-lg z-30">
          <button 
            onClick={() => { setCurrentTab('home'); setSelectedPatientId(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-6 rounded-xl transition-colors ${
              currentTab === 'home' && !selectedPatientId ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-[10px] font-prompt">หน้าหลัก</span>
          </button>

          <button 
            onClick={() => { setCurrentTab('beds'); setSelectedPatientId(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-6 rounded-xl transition-colors relative ${
              currentTab === 'beds' ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className="w-5 h-5" />
            {bedAlerts.length > 0 && (
              <span className="absolute top-0.5 right-4 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                {bedAlerts.length}
              </span>
            )}
            <span className="text-[10px] font-prompt">ผู้ป่วย</span>
          </button>

          <button 
            onClick={() => { setCurrentTab('guide'); setSelectedPatientId(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-6 rounded-xl transition-colors ${
              currentTab === 'guide' ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-prompt">คู่มือ</span>
          </button>
        </nav>

        {showAddModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 font-sarabun">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold font-prompt text-slate-800">เพิ่มผู้ป่วยใหม่ (หอผู้ป่วย อญ.3)</h3>
                <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddPatient} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">เลขเตียง (เช่น B01)</label>
                  <input 
                    type="text" 
                    value={newBed}
                    onChange={e => setNewBed(e.target.value)}
                    required
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-500" 
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">ชื่อ-นามสกุลผู้ป่วย (หญิง)</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="เช่น นางสมใจ รักษาดี"
                    required
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-500" 
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">เลข HN</label>
                  <input 
                    type="text" 
                    value={newHn}
                    onChange={e => setNewHn(e.target.value)}
                    placeholder="เช่น 6701350"
                    required
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-500" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">อายุ (ปี)</label>
                    <input 
                      type="number" 
                      value={newAge}
                      onChange={e => setNewAge(e.target.value)}
                      required
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Ventilator Day</label>
                    <input 
                      type="number" 
                      value={newVentDay}
                      onChange={e => setNewVentDay(e.target.value)}
                      required
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-500" 
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-sarabun leading-relaxed">
                  ℹ️ <strong>ระดับความเสี่ยง:</strong> จะคำนวณและอัปเดตอัตโนมัติจากผลการประเมินคะแนน WHAPO+S Bundle ในระบบ
                </div>

                <button
                  type="submit"
                  disabled={isSavingNewBed}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-prompt text-xs py-3 rounded-xl shadow-md transition-colors mt-2"
                >
                  {isSavingNewBed ? 'กำลังบันทึกข้อมูลลง Sheets...' : 'บันทึกข้อมูลผู้ป่วยลง Sheets'}
                </button>
              </form>
            </div>
          </div>
        )}

        {showNurseModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 font-sarabun">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold font-prompt text-slate-800">ตั้งค่าผู้ประเมินและเวรปฏิบัติงาน</h3>
                <button onClick={() => setShowNurseModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1 font-prompt">ชื่อพยาบาลผู้ประเมิน (Nurse Assessor):</label>
                  <input 
                    type="text"
                    value={nurseName}
                    onChange={e => setNurseName(e.target.value)}
                    placeholder="เช่น พว.กานดา ใจดี"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-500 font-sarabun"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1.5 font-prompt">เลือกเวรปฏิบัติงาน:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveShift('เวรเช้า')}
                      className={`py-2 px-3 rounded-xl font-prompt text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                        activeShift === 'เวรเช้า' ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50'
                      }`}
                    >
                      <Sun className="w-4 h-4" /> เวรเช้า
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveShift('เวรบ่าย')}
                      className={`py-2 px-3 rounded-xl font-prompt text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                        activeShift === 'เวรบ่าย' ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50'
                      }`}
                    >
                      <Sunset className="w-4 h-4" /> เวรบ่าย
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveShift('เวรดึก')}
                      className={`py-2 px-3 rounded-xl font-prompt text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                        activeShift === 'เวรดึก' ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50'
                      }`}
                    >
                      <Moon className="w-4 h-4" /> เวรดึก
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowNurseModal(false)}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-prompt text-xs py-2.5 rounded-xl shadow-md transition-colors mt-2"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </div>
          </div>
        )}

        {showCloudModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 font-sarabun">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold font-prompt text-slate-800">เชื่อมต่อฐานข้อมูล Google Sheets</h3>
                <button onClick={() => setShowCloudModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-semibold font-prompt">ลิงก์เปิดไฟล์ Google Sheets (สำหรับกดเปิดดูตาราง):</label>
                  <input 
                    type="url"
                    value={sheetViewLink}
                    onChange={e => setSheetViewLink(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-semibold font-prompt">Google Apps Script Web App URL (สำหรับส่งข้อมูล):</label>
                  <textarea 
                    rows={2}
                    value={sheetUrlInput}
                    onChange={e => setSheetUrlInput(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2 text-[11px] font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className={`p-2.5 rounded-xl text-[11px] font-semibold flex items-center gap-2 ${
                  isSheetConnected ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {isSheetConnected ? <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                  <span>สถานะ: {cloudStatusMsg}</span>
                </div>

                <div className="pt-1 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      localStorage.setItem('vap_google_sheet_url', sheetUrlInput);
                      localStorage.setItem('vap_google_sheet_view_link', sheetViewLink);
                      fetchFromGoogleSheets(sheetUrlInput);
                      setShowCloudModal(false);
                    }}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-prompt text-xs py-2.5 rounded-xl shadow-md transition-colors"
                  >
                    บันทึกการตั้งค่าและซิงค์ข้อมูล
                  </button>
                  <a
                    href={sheetViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-prompt font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> เปิดไฟล์ Google Sheets ตอนนี้
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {deleteConfirmId && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200 font-sarabun">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold font-prompt text-slate-800">ยืนยันการลบเตียง / จำหน่ายผู้ป่วย?</h3>
              <p
