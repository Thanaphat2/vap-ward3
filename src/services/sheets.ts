import type { Patient } from '../types';
import { migratePatient, sortPatients } from '../utils';

export async function fetchPatients(url: string, signal?: AbortSignal): Promise<Patient[]> {
  const res = await fetch(url.trim(), { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error('Unexpected response shape');
  return sortPatients(data.map(migratePatient));
}

/**
 * Apps Script ไม่ตอบ CORS จึงต้องใช้ no-cors (อ่านผลลัพธ์ไม่ได้ — error จะเกิดเฉพาะเครือข่ายล่ม)
 * keepalive ใช้ตอนปิดแท็บ เพื่อให้คำขอที่ค้างอยู่ยังถูกส่งออกไป
 */
export async function pushPatient(
  url: string,
  action: 'upsert' | 'delete',
  patient?: Patient,
  patientId?: string,
  keepalive = false
): Promise<void> {
  await fetch(url.trim(), {
    method: 'POST',
    mode: 'no-cors',
    keepalive,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, patient, patientId: patientId || patient?.id })
  });
}
