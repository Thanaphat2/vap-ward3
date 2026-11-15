/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';

const DEFAULT_GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxgFwo8v3SsWJPcIpSM-3_WVjMuLecc5RuUNwWVQPpUscTPHm_DO5raBJ22YIddIjgfKw/exec";

// Helper to clean any HTML entities (&gt;, &lt;)
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
  // W - WEAN การหย่าเครื่องช่วยหายใจ
  { id: 'w-1', groupKey: 'W', groupTitle: 'W - WEAN การหย่าเครื่องช่วยหายใจ', text: 'ประเมินความพร้อมในการถอดท่อช่วยหายใจทุกวัน', status: 'pending' },
  { id: 'w-2', groupKey: 'W', groupTitle: 'W - WEAN การหย่าเครื่องช่วยหายใจ', text: 'ใช้ weaning protocol', status: 'pending' },

  // H - HAND HYGIENE การทำความสะอาดมือ
  { id: 'h-1', groupKey: 'H', groupTitle: 'H - HAND HYGIENE การทำความสะอาดมือ', text: 'ล้างมือ 7 ขั้นตอน', status: 'pending' },
  { id: 'h-2', groupKey: 'H', groupTitle: 'H - HAND HYGIENE การทำความสะอาดมือ', text: 'ล้างมือ 5 moments', status: 'pending' },

  // A - ASPIRATE PRECAUTIONS การป้องกันการสำลัก
  { id: 'a-1', groupKey: 'A', groupTitle: 'A - ASPIRATE PRECAUTIONS การป้องกันการสำลัก', text: 'ยกหัวเตียงสูง 30-45 องศา', status: 'pending' },
  { id: 'a-2', groupKey: 'A', groupTitle: 'A - ASPIRATE PRECAUTIONS การป้องกันการสำลัก', text: 'วัด cuff pressure 30-35 cmH2O ทุกเวร', status: 'pending' },
  { id: 'a-3', groupKey: 'A', groupTitle: 'A - ASPIRATE PRECAUTIONS การป้องกันการสำลัก', text: 'ประเมิน NG ก่อน feeds', status: 'pending' },
  { id: 'a-4', groupKey: 'A', groupTitle: 'A - ASPIRATE PRECAUTIONS การป้องกันการสำลัก', text: 'ใช้ชุดหยดอาหารทางสายยาง ใช้เวลา 2-4 ชม.', status: 'pending' },

  // P - PREVENTION CONTAMINATION การป้องกันการปนเปื้อน
  { id: 'p-1', groupKey: 'P', groupTitle: 'P - PREVENTION CONTAMINATION การป้องกันการปนเปื้อน', text: 'เปลี่ยน ventilator circuit เมื่อเปื้อนสกปรก หรือเมื่อเปลี่ยนผู้ป่วย', status: 'pending' },
  { id: 'p-2', groupKey: 'P', groupTitle: 'P - PREVENTION CONTAMINATION การป้องกันการปนเปื้อน', text: 'เทน้ำทิ้งสาย circuit ด้วย aseptic technique', status: 'pending' },
  { id: 'p-3', groupKey: 'P', groupTitle: 'P - PREVENTION CONTAMINATION การป้องกันการปนเปื้อน', text: 'ดูดเสมหะเท่าที่จำเป็น', status: 'pending' },

  // O - ORAL CARE การทำความสะอาดช่องปาก
  { id: 'o-1', groupKey: 'O', groupTitle: 'O - ORAL CARE การทำความสะอาดช่องปาก', text: 'ประเมินสุขภาพช่องปากด้วย OAG วันละ 1 ครั้ง', status: 'pending' },
  { id: 'o-2', groupKey: 'O', groupTitle: 'O - ORAL CARE การทำความสะอาดช่องปาก', text: 'ใช้แปรงสีฟันที่มีขนแปรงอ่อนนุ่ม และยาสีฟันที่มีฟลูออไรด์ >1,500 ppm', status: 'pending' },
  { id: 'o-3', groupKey: 'O', groupTitle: 'O - ORAL CARE การทำความสะอาดช่องปาก', text: 'เช็ดช่องปากด้วย 0.9% NSS สลับกับการแปรงฟัน', status: 'pending' },

  // S - SEDATION VACATION การหยุดยานอนหลับชั่วคราว+เฝ้าระวัง
  { id: 's-1', groupKey: 'S', groupTitle: 'S - SEDATION VACATION การหยุดยานอนหลับชั่วคราว+เฝ้าระวัง', text: 'ประเมินการหยุดยานอนหลับ วันละครั้ง ช่วงเช้า', status: 'pending' },
  { id: 's-2', groupKey: 'S', groupTitle: 'S - SEDATION VACATION การหยุดยานอนหลับชั่วคราว+เฝ้าระวัง', text: 'ลดปริมาณการใช้ และหยุดยานอนหลับ', status: 'pending' },
  { id: 's-3', groupKey: 'S', groupTitle: 'S - SEDATION VACATION การหยุดยานอนหลับชั่วคราว+เฝ้าระวัง', text: '(ปฏิบัติร่วมกับการรักษากับแพทย์เจ้าของไข้)', status: 'pending' }
];

const DEFAULT_WEANING_SURVEY: WeaningSurveyItem[] = [
  // หมวดที่ 1
  { id: 'w1-1', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.1 มีการประเมินภาวะที่ทำให้เกิดระบบหายใจล้มเหลวดีขึ้น', status: 'pending', note: '' },
  { id: 'w1-2', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.2 ตรวจไม่มีภาวะขาดออกซิเจนครบ 3 ข้อ (PaO2/FiO2 ratio > 150 หรือ O2 sat > 92% ขณะใช้ FiO2 < 0.4, PEEP < 5 cmH2O, FiO2 < 0.4)', status: 'pending', note: '' },
  { id: 'w1-3', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.3 ประเมินระบบไหลเวียนเลือดปกติ 2 ข้อ (ไม่มี active Myocardial Ischemia, BP > 90/60 ไม่ต้องใช้ Vasopressor drug หรือให้ Dopamine < 5 mcg/kg/min)', status: 'pending', note: '' },
  { id: 'w1-4', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.4 ประเมินผู้ป่วยสามารถหายใจเองได้', status: 'pending', note: '' },
  { id: 'w1-5', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.5 ประเมินภาวะ Electrolyte ปกติ', status: 'pending', note: '' },
  { id: 'w1-6', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.6 ไม่มีไข้ > 38 °C', status: 'pending', note: '' },
  { id: 'w1-7', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.7 การ Monitor P peak < 20 cmH2O', status: 'pending', note: '' },
  { id: 'w1-8', category: 1, categoryTitle: 'หมวดที่ 1: มีการประเมินผู้ป่วยก่อนเริ่มหย่าเครื่องช่วยหายใจ', text: '1.8 ผู้ป่วยควรมี Hb > 7 gm%', status: 'pending', note: '' },

  // หมวดที่ 2
  { id: 'w2-1', category: 2, categoryTitle: 'หมวดที่ 2: มีการประเมินการหายใจแบบ Short period SBT (5min)', text: '2.1 อธิบายผู้ป่วยให้ฝึกหายใจ และดูแลอย่างใกล้ชิด', status: 'pending', note: '' },
  { id: 'w2-2', category: 2, categoryTitle: 'หมวดที่ 2: มีการประเมินการหายใจแบบ Short period SBT (5min)', text: '2.2 จัดท่านั่ง หรือ ศีรษะสูง 70-90 °', status: 'pending', note: '' },
  { id: 'w2-3', category: 2, categoryTitle: 'หมวดที่ 2: มีการประเมินการหายใจแบบ Short period SBT (5min)', text: '2.3 บันทึก BP, HR, RR, O2 sat. ก่อนทำ Short period SBT', status: 'pending', note: '' },
  { id: 'w2-4', category: 2, categoryTitle: 'หมวดที่ 2: มีการประเมินการหายใจแบบ Short period SBT (5min)', text: '2.4 เปลี่ยน Mode Spontaneous โดยใช้ PEEP 5 cmH2O (CPAP 5 cmH2O) ไม่ต้องใช้ PS กรณีเป็น Bird Ventilator ให้ on T-piece 8l/m FiO2 0.4', status: 'pending', note: '' },
  { id: 'w2-5', category: 2, categoryTitle: 'หมวดที่ 2: มีการประเมินการหายใจแบบ Short period SBT (5min)', text: '2.5 ประเมิน BP, HR, RR, O2 sat ลักษณะการหายใจ 5 นาที หลังเปลี่ยน Mode โดยยืนเฝ้าผู้ป่วยตลอดเวลา', status: 'pending', note: '' },
  { id: 'w2-6', category: 2, categoryTitle: 'หมวดที่ 2: มีการประเมินการหายใจแบบ Short period SBT (5min)', text: '2.6 หยุด wean เมื่อพบว่า RR > 35/min or RR < 10/min, HR > 140/min or HR < 50/min, BP > 180/90 mmHg or BP < 90/60 mmHg, Oxygen saturation < 90% ผู้ป่วยกระสับกระส่าย ผู้ป่วยบอกให้ทราบว่าทนไม่ไหว', status: 'pending', note: '' },

  // หมวดที่ 3
  { id: 'w3-1', category: 3, categoryTitle: 'หมวดที่ 3: มีการประเมินการหายใจแบบ Long period SBT (120 min)', text: '3.1 มีการต่อ T-piece 8L/M FiO2 0.4 (ถ้าเป็น T-piece ให้ทำต่อได้)', status: 'pending', note: '' },
  { id: 'w3-2', category: 3, categoryTitle: 'หมวดที่ 3: มีการประเมินการหายใจแบบ Long period SBT (120 min)', text: '3.2 มีการติดตามอาการทุก 15-30 นาที ตามเกณฑ์เฝ้าระวังข้อ 2', status: 'pending', note: '' },
  { id: 'w3-3', category: 3, categoryTitle: 'หมวดที่ 3: มีการประเมินการหายใจแบบ Long period SBT (120 min)', text: '3.3 หยุดการ wean เมื่อพบผิดปกติตามเกณฑ์ข้อ 2 แล้ว Back up setting เดิม', status: 'pending', note: '' },
  { id: 'w3-4', category: 3, categoryTitle: 'หมวดที่ 3: มีการประเมินการหายใจแบบ Long period SBT (120 min)', text: '3.4 ประเมินผู้ป่วยสามารถหายใจเองได้ครบ 120 นาที แล้วทดสอบว่าสามารถ Extubation ได้', status: 'pending', note: '' },

  // หมวดที่ 4
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
  
  // Modals & States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showNurseModal, setShowNurseModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'bundle' | 'notes'>('bundle');
  const [activeChecklistShift, setActiveChecklistShift] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [copiedNote, setCopiedNote] = useState(false);
  const [showWeaningProtocolSurvey, setShowWeaningProtocolSurvey] = useState(false);

  // Active Nurse & Shift States
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

  // Google Sheets Web App URL State
  const [sheetUrlInput, setSheetUrlInput] = useState<string>(() => {
    try {
      return localStorage.getItem('vap_google_sheet_url') || DEFAULT_GOOGLE_SHEET_URL;
    } catch {
      return DEFAULT_GOOGLE_SHEET_URL;
    }
  });
  const [isSheetConnected, setIsSheetConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cloudStatusMsg, setCloudStatusMsg] = useState<string>('เชื่อมต่อ Google Sheets แล้ว');

  // Patients State - initialized strictly as empty array []
  const [patients, setPatients] = useState<Patient[]>([]);

  // Fetch all patients from Google Sheets
  const fetchFromGoogleSheets = async (targetUrl = sheetUrlInput) => {
    if (!targetUrl.trim()) {
      setIsSheetConnected(false);
      setCloudStatusMsg('ยังไม่ได้ใส่ URL (ใช้ Local)');
      return;
    }

    setIsSyncing(true);
    setCloudStatusMsg('กำลังดึงข้อมูลจาก Sheets...');
    try {
      const response = await fetch(targetUrl.trim());
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      if (Array.isArray(data)) {
        const migrated = data.map(migratePatient);
        migrated.sort((a, b) => a.bed.localeCompare(b.bed));
        setPatients(migrated);
        localStorage.setItem('vap_ward_patients_f3', JSON.stringify(migrated));
        setIsSheetConnected(true);
        setCloudStatusMsg('ซิงค์ Google Sheets สำเร็จ');
      }
    } catch (err) {
      console.error('Error fetching from Google Sheets:', err);
      setIsSheetConnected(false);
      setCloudStatusMsg('เชื่อมต่อ Sheets ไม่สำเร็จ (ใช้ข้อมูลสำรอง)');
      try {
        const saved = localStorage.getItem('vap_ward_patients_f3');
        if (saved) setPatients(JSON.parse(saved).map(migratePatient));
      } catch {}
    } finally {
      setIsSyncing(false);
    }
  };

  // Load data on startup & poll every 15 seconds for multi-device sync
  useEffect(() => {
    fetchFromGoogleSheets(sheetUrlInput);
    const interval = setInterval(() => {
      if (sheetUrlInput.trim()) {
        fetch(sheetUrlInput.trim())
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              const migrated = data.map(migratePatient);
              migrated.sort((a, b) => a.bed.localeCompare(b.bed));
              setPatients(migrated);
              setIsSheetConnected(true);
              setCloudStatusMsg('ซิงค์ Google Sheets สำเร็จ');
            }
          })
          .catch(() => {});
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [sheetUrlInput]);

  // Send single patient upsert or delete to Google Sheets
  const syncSinglePatientToSheet = async (action: 'upsert' | 'delete', patient?: Patient, patientId?: string) => {
    if (!sheetUrlInput.trim()) return;
    setIsSyncing(true);
    setCloudStatusMsg('กำลังบันทึกลง Sheets...');
    try {
      await fetch(sheetUrlInput.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action,
          patient,
          patientId: patientId || patient?.id
        })
      });
      setIsSheetConnected(true);
      setCloudStatusMsg('บันทึกลง Google Sheets แล้ว');
    } catch (e) {
      console.error('Error syncing to Google Sheets:', e);
      setCloudStatusMsg('ส่งข้อมูลไป Sheets ขัดข้อง');
    } finally {
      setIsSyncing(false);
    }
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Update WHAPO Checklist Item Status
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
        checklists: {
          ...p.checklists,
          [shiftKey]: shiftItems
        },
        progresses: {
          ...p.progresses,
          [shiftKey]: newProg
        },
        lastAssessedBy: nurseName,
        lastAssessedShift: activeShift,
        lastAssessedTime: timeNow
      };
      return updatedTarget;
    });

    setPatients(updated);
    try { localStorage.setItem('vap_ward_patients_f3', JSON.stringify(updated)); } catch {}
    if (updatedTarget) {
      syncSinglePatientToSheet('upsert', updatedTarget);
    }
  };

  // Update Weaning Protocol Survey Item Status
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
        weaningSurveys: {
          ...p.weaningSurveys,
          [shiftKey]: surveyItems
        },
        lastAssessedBy: nurseName,
        lastAssessedShift: activeShift,
        lastAssessedTime: timeNow
      };
      return updatedTarget;
    });

    setPatients(updated);
    try { localStorage.setItem('vap_ward_patients_f3', JSON.stringify(updated)); } catch {}
    if (updatedTarget) {
      syncSinglePatientToSheet('upsert', updatedTarget);
    }
  };

  // Update Weaning Protocol Survey Item Note
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
        weaningSurveys: {
          ...p.weaningSurveys,
          [shiftKey]: surveyItems
        }
      };
      return updatedTarget;
    });

    setPatients(updated);
    try { localStorage.setItem('vap_ward_patients_f3', JSON.stringify(updated)); } catch {}
    if (updatedTarget) {
      syncSinglePatientToSheet('upsert', updatedTarget);
    }
  };

  // Delete patient
  const handleDeletePatient = async (patientId: string) => {
    const updated = patients.filter(p => p.id !== patientId);
    setPatients(updated);
    setDeleteConfirmId(null);
    if (selectedPatientId === patientId) {
      setSelectedPatientId(null);
    }
    try { localStorage.setItem('vap_ward_patients_f3', JSON.stringify(updated)); } catch {}
    await syncSinglePatientToSheet('delete', undefined, patientId);
  };

  // New patient form state
  const [newBed, setNewBed] = useState('B01');
  const [newName, setNewName] = useState('');
  const [newHn, setNewHn] = useState('');
  const [newAge, setNewAge] = useState('60');
  const [newVentDay, setNewVentDay] = useState('1');

  // Add patient handler
  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newHn.trim()) {
      alert('กรุณากรอกชื่อและเลข HN ให้ครบถ้วน');
      return;
    }
    const timeNow = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    const newPt: Patient = {
      id: 'p-' + Date.now(),
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

    const updated = [newPt, ...patients].sort((a, b) => a.bed.localeCompare(b.bed));
    setPatients(updated);
    setShowAddModal(false);
    setNewName('');
    setNewHn('');

    try { localStorage.setItem('vap_ward_patients_f3', JSON.stringify(updated)); } catch {}
    await syncSinglePatientToSheet('upsert', newPt);
  };

  // Copy Handover Note
  const handleCopyNotes = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  // Generate Handover Summary
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

  // Filter calculations
  const totalCount = patients.length;
  const ventCount = patients.length;
  const highRiskCount = patients.filter(p => {
    const prog = p.progresses?.[activeChecklistShift] ?? 0;
    return getRiskTier(prog).isHighRisk;
  }).length;

  const filteredPatients = patients.filter(p => {
    const prog = p.progresses?.[activeChecklistShift] ?? 0;
    const tier = getRiskTier(prog);
    if (bedFilter === 'vent') return true;
    if (bedFilter === 'high_risk') return tier.isHighRisk;
    return true;
  });

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-300 p-0 sm:py-6 sm:px-4 font-sans">
      {/* Mobile App Container */}
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
                  <h1 className="text-sm font-bold
