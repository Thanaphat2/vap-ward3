import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Patient, Shift } from '../types';
import { copyText, generateHandoverNote } from '../utils';

interface Props {
  patient: Patient;
  shift: Shift;
  nurseName: string;
}

export default function HandoverNote({ patient, shift, nurseName }: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  // สร้างข้อความครั้งเดียวต่อการเปลี่ยนแปลง (เดิมถูกสร้างซ้ำ 2 ครั้งทุก render)
  const note = useMemo(() => generateHandoverNote(patient, shift, nurseName), [patient, shift, nurseName]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const handleCopy = async () => {
    if (!(await copyText(note))) return;
    setCopied(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-teal-100 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold font-prompt text-slate-800">สรุปส่งเวรตาม WHAPO + S & Weaning Protocol (อญ.3)</h3>
        <button
          onClick={handleCopy}
          className="bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-prompt px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 border border-teal-200 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความส่งเวร'}
        </button>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-sarabun whitespace-pre-line leading-relaxed">
        {note}
      </div>
      <p className="text-[11px] text-slate-400">ข้อความสรุปส่งเวรแสดงคะแนน % ความเสี่ยงอัตโนมัติ และรายการ ปฏิบัติ / ไม่ปฏิบัติ ครบถ้วน</p>
    </div>
  );
}
