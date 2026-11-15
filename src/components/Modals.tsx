import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Moon, Sun, Sunset, X } from 'lucide-react';
import { SHIFTS } from '../constants';
import type { NewPatientInput, ShiftLabel, SyncStatus } from '../types';

const SHIFT_ICONS = { morning: Sun, afternoon: Sunset, night: Moon } as const;

const inputClass =
  'w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-500';
const primaryButton =
  'w-full bg-teal-600 hover:bg-teal-700 text-white font-prompt text-xs rounded-xl shadow-md transition-colors';

function Overlay({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      {children}
    </div>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex justify-between items-center">
      <h3 className="text-sm font-bold font-prompt text-slate-800">{title}</h3>
      <button
        onClick={onClose}
        aria-label="ปิด"
        className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

const card = 'bg-white rounded-3xl p-6 w-full shadow-2xl animate-pop font-sarabun';

/* ---------------- 1. เพิ่มผู้ป่วย ---------------- */
export function AddPatientModal({
  onClose,
  onSubmit
}: {
  onClose: () => void;
  onSubmit: (input: NewPatientInput) => void;
}) {
  // state ของฟอร์มอยู่ที่นี่ → พิมพ์แล้วไม่ทำให้ App ทั้งหน้า re-render
  const [bed, setBed] = useState('B01');
  const [name, setName] = useState('');
  const [hn, setHn] = useState('');
  const [age, setAge] = useState('60');
  const [ventDay, setVentDay] = useState('1');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !hn.trim() || !bed.trim()) {
      setError('กรุณากรอกเลขเตียง ชื่อ และเลข HN ให้ครบถ้วน');
      return;
    }
    onSubmit({
      bed: bed.trim().toUpperCase(),
      name: name.trim(),
      hn: hn.trim(),
      age: parseInt(age, 10) || 60,
      ventDay: parseInt(ventDay, 10) || 1
    });
  };

  return (
    <Overlay label="เพิ่มผู้ป่วยใหม่" onClose={onClose}>
      <div className={`${card} max-w-sm space-y-4`}>
        <Header title="เพิ่มผู้ป่วยใหม่ (หอผู้ป่วย อญ.3)" onClose={onClose} />
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <label className="block">
            <span className="block text-slate-500 font-semibold mb-1">เลขเตียง (เช่น B01)</span>
            <input type="text" value={bed} onChange={e => setBed(e.target.value)} required className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-slate-500 font-semibold mb-1">ชื่อ-นามสกุลผู้ป่วย (หญิง)</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="เช่น นางสมใจ รักษาดี"
              required
              autoFocus
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="block text-slate-500 font-semibold mb-1">เลข HN</span>
            <input
              type="text"
              inputMode="numeric"
              value={hn}
              onChange={e => setHn(e.target.value)}
              placeholder="เช่น 6701350"
              required
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-slate-500 font-semibold mb-1">อายุ (ปี)</span>
              <input
                type="number"
                min={0}
                max={130}
                value={age}
                onChange={e => setAge(e.target.value)}
                required
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="block text-slate-500 font-semibold mb-1">Ventilator Day</span>
              <input
                type="number"
                min={1}
                value={ventDay}
                onChange={e => setVentDay(e.target.value)}
                required
                className={inputClass}
              />
            </label>
          </div>

          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-sarabun leading-relaxed">
            ℹ️ <strong>ระดับความเสี่ยง:</strong> จะคำนวณและอัปเดตอัตโนมัติจากผลการประเมินคะแนน WHAPO+S Bundle ในระบบ
          </div>

          {error && (
            <p role="alert" className="text-rose-600 text-[11px] font-semibold">
              {error}
            </p>
          )}

          <button type="submit" className={`${primaryButton} py-3 mt-2`}>
            บันทึกข้อมูลผู้ป่วยลง Sheets
          </button>
        </form>
      </div>
    </Overlay>
  );
}

/* ---------------- 2. ผู้ประเมิน & เวร ---------------- */
export function NurseModal({
  nurseName,
  onNurseNameChange,
  activeShift,
  onShiftChange,
  onClose
}: {
  nurseName: string;
  onNurseNameChange: (name: string) => void;
  activeShift: ShiftLabel;
  onShiftChange: (shift: ShiftLabel) => void;
  onClose: () => void;
}) {
  return (
    <Overlay label="ตั้งค่าผู้ประเมินและเวร" onClose={onClose}>
      <div className={`${card} max-w-sm space-y-4`}>
        <Header title="ตั้งค่าผู้ประเมินและเวรปฏิบัติงาน" onClose={onClose} />
        <div className="space-y-3 text-xs">
          <label className="block">
            <span className="block text-slate-600 font-semibold mb-1 font-prompt">
              ชื่อพยาบาลผู้ประเมิน (Nurse Assessor):
            </span>
            <input
              type="text"
              value={nurseName}
              onChange={e => onNurseNameChange(e.target.value)}
              placeholder="เช่น พว.กานดา ใจดี"
              className={`${inputClass} font-sarabun`}
            />
          </label>

          <div>
            <span className="block text-slate-600 font-semibold mb-1.5 font-prompt">เลือกเวรปฏิบัติงาน:</span>
            <div className="grid grid-cols-3 gap-2">
              {SHIFTS.map(({ key, label }) => {
                const Icon = SHIFT_ICONS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={activeShift === label}
                    onClick={() => onShiftChange(label)}
                    className={`py-2 px-3 rounded-xl font-prompt text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                      activeShift === label
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={onClose} className={`${primaryButton} py-2.5 mt-2`}>
            บันทึกข้อมูล
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ---------------- 3. ตั้งค่า Google Sheets ---------------- */
export function CloudModal({
  sheetUrl,
  status,
  onSave,
  onClose
}: {
  sheetUrl: string;
  status: SyncStatus;
  onSave: (url: string) => void;
  onClose: () => void;
}) {
  // เก็บค่าที่กำลังพิมพ์ไว้ใน draft — ไม่ยิง fetch จนกว่าจะกดบันทึก
  const [draft, setDraft] = useState(sheetUrl);

  return (
    <Overlay label="เชื่อมต่อ Google Sheets" onClose={onClose}>
      <div className={`${card} max-w-sm space-y-4`}>
        <Header title="เชื่อมต่อฐานข้อมูล Google Sheets" onClose={onClose} />
        <div className="space-y-3 text-xs">
          <p className="text-slate-600 leading-relaxed">
            ข้อมูลผู้ป่วย ผลการประเมิน WHAPO + S และตารางสรุปผล <strong>Report_Summary</strong>{' '}
            จะถูกบันทึกและดึงข้อมูลจาก Google Sheets อัตโนมัติ
          </p>

          <label className="block space-y-1">
            <span className="block text-slate-700 font-semibold font-prompt">Google Apps Script Web App URL:</span>
            <textarea
              rows={3}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              spellCheck={false}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-[11px] font-mono text-slate-800 focus:outline-none focus:border-teal-500"
            />
          </label>

          <div
            role="status"
            className={`p-2.5 rounded-xl text-[11px] font-semibold flex items-center gap-2 ${
              status.connected
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {status.connected ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            )}
            <span>สถานะ: {status.message}</span>
          </div>

          <div className="pt-2 flex gap-2">
            <button onClick={() => onSave(draft)} className={`flex-1 ${primaryButton} py-2.5`}>
              บันทึกและซิงค์ข้อมูลทันที
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

/* ---------------- 4. ยืนยันการลบ ---------------- */
export function DeleteConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <Overlay label="ยืนยันการลบเตียง" onClose={onCancel}>
      <div className={`${card} max-w-xs text-center space-y-4`}>
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold font-prompt text-slate-800">ยืนยันการลบเตียง / จำหน่ายผู้ป่วย?</h3>
        <p className="text-xs text-slate-500">
          คุณต้องการลบข้อมูลเตียงนี้ออกจาก Google Sheets และระบบหอผู้ป่วย อญ.3 หรือไม่
        </p>
        <div className="flex gap-2 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-prompt py-2.5 rounded-xl transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-prompt py-2.5 rounded-xl shadow-md transition-colors"
          >
            ยืนยันลบ
          </button>
        </div>
      </div>
    </Overlay>
  );
}
