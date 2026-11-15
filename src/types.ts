export type Shift = 'morning' | 'afternoon' | 'night';
export type ShiftLabel = 'เวรเช้า' | 'เวรบ่าย' | 'เวรดึก';
export type ItemStatus = 'complied' | 'not_complied' | 'pending';
export type GroupKey = 'W' | 'H' | 'A' | 'P' | 'O' | 'S';
export type PerShift<T> = Record<Shift, T>;

export interface ChecklistItem {
  id: string;
  groupKey: GroupKey;
  groupTitle: string;
  text: string;
  status: ItemStatus;
}

export interface WeaningSurveyItem {
  id: string;
  category: number;
  categoryTitle: string;
  text: string;
  status: ItemStatus;
  note: string;
}

export interface Patient {
  id: string;
  bed: string;
  hn: string;
  name: string;
  gender: string;
  age: number;
  ventDay: number;
  risk?: 'ต่ำ' | 'ปานกลาง' | 'สูง';
  checklists: PerShift<ChecklistItem[]>;
  weaningSurveys: PerShift<WeaningSurveyItem[]>;
  progresses: PerShift<number>;
  lastAssessedBy?: string;
  lastAssessedShift?: string;
  lastAssessedTime?: string;
}

/** ผู้ประเมิน + เวรที่กำลังปฏิบัติงาน (ใช้บันทึกลงผู้ป่วย) */
export interface Assessor {
  name: string;
  shiftLabel: ShiftLabel;
}

export interface NewPatientInput {
  bed: string;
  name: string;
  hn: string;
  age: number;
  ventDay: number;
}

export interface SyncStatus {
  connected: boolean;
  syncing: boolean;
  message: string;
}

export interface RiskTier {
  key: 'low' | 'medium' | 'high';
  min: number;
  label: string;
  rangeLabel: string;
  evalLevel: string;
  isHighRisk: boolean;
  badgeClass: string;
  panelClass: string;
  titleClass: string;
  subClass: string;
  bannerClass: string;
  bubbleClass: string;
  barClass: string;
  textClass: string;
}
