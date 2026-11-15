import { useCallback, useEffect, useRef, useState } from 'react';
import { POLL_INTERVAL_MS, STORAGE_KEYS, SYNC_DEBOUNCE_MS } from '../constants';
import { fetchPatients, pushPatient } from '../services/sheets';
import type { Assessor, ItemStatus, NewPatientInput, Patient, Shift, SyncStatus } from '../types';
import { calculateProgress, createPatient, formatTime, migratePatient, sortPatients } from '../utils';

const loadCache = (): Patient[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.patients);
    return raw ? sortPatients(JSON.parse(raw).map(migratePatient)) : [];
  } catch {
    return [];
  }
};

const toggleStatus = (current: ItemStatus, target: 'complied' | 'not_complied'): ItemStatus =>
  current === target ? 'pending' : target;

// โหลด confetti เมื่อจำเป็นเท่านั้น เพื่อลดขนาด bundle เริ่มต้น
const celebrate = () => {
  import('canvas-confetti')
    .then(m => m.default({ particleCount: 60, spread: 60, origin: { y: 0.7 } }))
    .catch(() => {});
};

type Updater = (p: Patient) => Patient;

export function usePatients(sheetUrl: string) {
  // เริ่มจาก cache ทันที → หน้าจอไม่ว่างระหว่างรอ Sheets
  const [patients, setPatients] = useState<Patient[]>(loadCache);
  const [status, setStatus] = useState<SyncStatus>({
    connected: true,
    syncing: false,
    message: 'เชื่อมต่อ Google Sheets แล้ว'
  });

  // refs ทำให้ callback ทุกตัว stable และไม่เจอปัญหา stale closure
  const patientsRef = useRef(patients);
  const urlRef = useRef(sheetUrl);
  urlRef.current = sheetUrl;

  const queuedRef = useRef(new Map<string, Patient>()); // รอส่งขึ้น Sheets (debounce)
  const timersRef = useRef(new Map<string, number>());
  const pendingRef = useRef(0); // จำนวน POST ที่กำลังส่ง
  const lastWriteRef = useRef(0); // เวลาที่แก้ข้อมูลล่าสุด
  const snapshotRef = useRef(''); // ข้อมูลล่าสุดจาก Sheets ที่ apply แล้ว
  const abortRef = useRef<AbortController | null>(null);

  const commit = useCallback((next: Patient[]) => {
    patientsRef.current = next;
    setPatients(next);
  }, []);

  // ---------- เขียนขึ้น Sheets ----------
  const runSync = useCallback(
    async (action: 'upsert' | 'delete', patient?: Patient, patientId?: string, keepalive = false) => {
      const url = urlRef.current.trim();
      if (!url) return;
      pendingRef.current += 1;
      setStatus(s => ({ ...s, syncing: true, message: 'กำลังบันทึกลง Sheets...' }));
      try {
        await pushPatient(url, action, patient, patientId, keepalive);
        setStatus(s => ({ ...s, connected: true, message: 'บันทึกลง Google Sheets แล้ว' }));
      } catch (e) {
        console.error('Error syncing to Google Sheets:', e);
        setStatus(s => ({ ...s, message: 'ส่งข้อมูลไป Sheets ขัดข้อง' }));
      } finally {
        pendingRef.current -= 1;
        lastWriteRef.current = Date.now();
        if (pendingRef.current === 0) setStatus(s => ({ ...s, syncing: false }));
      }
    },
    []
  );

  const flushOne = useCallback(
    (id: string, keepalive = false) => {
      const timer = timersRef.current.get(id);
      if (timer !== undefined) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
      const patient = queuedRef.current.get(id);
      if (!patient) return;
      queuedRef.current.delete(id);
      void runSync('upsert', patient, id, keepalive);
    },
    [runSync]
  );

  const flushAll = useCallback(
    (keepalive = false) => {
      for (const id of [...queuedRef.current.keys()]) flushOne(id, keepalive);
    },
    [flushOne]
  );

  /** รวมการแก้ไขติดๆ กัน (เช่น พิมพ์หมายเหตุ) ให้ส่งเป็นคำขอเดียวต่อผู้ป่วย */
  const queueUpsert = useCallback(
    (patient: Patient, immediate = false) => {
      queuedRef.current.set(patient.id, patient);
      lastWriteRef.current = Date.now();
      const existing = timersRef.current.get(patient.id);
      if (existing !== undefined) clearTimeout(existing);
      if (immediate) {
        flushOne(patient.id);
        return;
      }
      timersRef.current.set(patient.id, window.setTimeout(() => flushOne(patient.id), SYNC_DEBOUNCE_MS));
    },
    [flushOne]
  );

  // ---------- อ่านจาก Sheets ----------
  const refresh = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const url = urlRef.current.trim();
      if (!url) {
        setStatus({ connected: false, syncing: false, message: 'ยังไม่ได้ใส่ URL (ใช้ Local)' });
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const startedAt = Date.now();
      if (!silent) setStatus(s => ({ ...s, syncing: true, message: 'กำลังดึงข้อมูลจาก Sheets...' }));

      try {
        const remote = await fetchPatients(url, controller.signal);
        if (controller.signal.aborted) return;

        // ผู้ใช้แก้ข้อมูลระหว่างรอ → ผลที่ได้ล้าสมัยแล้ว ข้ามไป (รอบหน้าจะ apply เอง)
        const hasLocalChanges =
          queuedRef.current.size > 0 || pendingRef.current > 0 || lastWriteRef.current > startedAt;
        if (!hasLocalChanges) {
          const snapshot = JSON.stringify(remote);
          if (snapshot !== snapshotRef.current) {
            snapshotRef.current = snapshot;
            commit(remote); // render ใหม่เฉพาะเมื่อข้อมูลเปลี่ยนจริง
          }
        }
        setStatus({ connected: true, syncing: false, message: 'ซิงค์ Google Sheets สำเร็จ' });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Error fetching from Google Sheets:', err);
        setStatus({ connected: false, syncing: false, message: 'เชื่อมต่อ Sheets ไม่สำเร็จ (ใช้ข้อมูลสำรอง)' });
      }
    },
    [commit]
  );

  // โหลดตอนเริ่ม/เปลี่ยน URL แล้ว poll เฉพาะตอนแท็บมองเห็นอยู่
  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      if (!document.hidden) void refresh({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [sheetUrl, refresh]);

  // ซ่อนแท็บ/ปิดหน้า → ส่งที่ค้างอยู่ทันที; กลับมาเห็นแท็บ → ดึงข้อมูลใหม่
  useEffect(() => {
    const onHide = () => flushAll(true);
    const onVisibility = () => (document.hidden ? onHide() : void refresh({ silent: true }));
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
      flushAll(true);
    };
  }, [flushAll, refresh]);

  // บันทึก cache แบบ debounce แทนการ stringify ทุกครั้งที่กดปุ่ม/พิมพ์
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(patients));
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [patients]);

  // ---------- actions ----------
  const updatePatient = useCallback(
    (id: string, updater: Updater): Patient | undefined => {
      const current = patientsRef.current.find(p => p.id === id);
      if (!current) return undefined;
      const next = updater(current);
      commit(patientsRef.current.map(p => (p.id === id ? next : p)));
      queueUpsert(next);
      return next;
    },
    [commit, queueUpsert]
  );

  const toggleChecklistItem = useCallback(
    (patientId: string, shift: Shift, itemId: string, target: 'complied' | 'not_complied', assessor: Assessor) => {
      const before = patientsRef.current.find(p => p.id === patientId)?.progresses[shift];
      const next = updatePatient(patientId, p => {
        const items = p.checklists[shift].map(i =>
          i.id === itemId ? { ...i, status: toggleStatus(i.status, target) } : i
        );
        return {
          ...p,
          checklists: { ...p.checklists, [shift]: items },
          progresses: { ...p.progresses, [shift]: calculateProgress(items) },
          lastAssessedBy: assessor.name,
          lastAssessedShift: assessor.shiftLabel,
          lastAssessedTime: formatTime()
        };
      });
      // แสดงพลุเฉพาะตอน "เพิ่งครบ 100%" (ไม่ใช่ทุกครั้งที่กดขณะอยู่ที่ 100%)
      if (next && next.progresses[shift] === 100 && before !== 100) celebrate();
    },
    [updatePatient]
  );

  const toggleWeaningItem = useCallback(
    (patientId: string, shift: Shift, itemId: string, target: 'complied' | 'not_complied', assessor: Assessor) => {
      updatePatient(patientId, p => ({
        ...p,
        weaningSurveys: {
          ...p.weaningSurveys,
          [shift]: p.weaningSurveys[shift].map(i =>
            i.id === itemId ? { ...i, status: toggleStatus(i.status, target) } : i
          )
        },
        lastAssessedBy: assessor.name,
        lastAssessedShift: assessor.shiftLabel,
        lastAssessedTime: formatTime()
      }));
    },
    [updatePatient]
  );

  const setWeaningNote = useCallback(
    (patientId: string, shift: Shift, itemId: string, note: string) => {
      updatePatient(patientId, p => ({
        ...p,
        weaningSurveys: {
          ...p.weaningSurveys,
          [shift]: p.weaningSurveys[shift].map(i => (i.id === itemId ? { ...i, note } : i))
        }
      }));
    },
    [updatePatient]
  );

  const addPatient = useCallback(
    (input: NewPatientInput, assessor: Assessor) => {
      const patient = createPatient(input, assessor);
      commit(sortPatients([patient, ...patientsRef.current]));
      queueUpsert(patient, true);
    },
    [commit, queueUpsert]
  );

  const removePatient = useCallback(
    (id: string) => {
      const timer = timersRef.current.get(id);
      if (timer !== undefined) clearTimeout(timer);
      timersRef.current.delete(id);
      queuedRef.current.delete(id);
      commit(patientsRef.current.filter(p => p.id !== id));
      lastWriteRef.current = Date.now();
      void runSync('delete', undefined, id);
    },
    [commit, runSync]
  );

  return { patients, status, refresh, toggleChecklistItem, toggleWeaningItem, setWeaningNote, addPatient, removePatient };
}
