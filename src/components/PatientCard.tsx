import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import type { Patient, Shift, ShiftLabel } from '../types';
import { getRiskTier } from '../utils';

interface Props {
  patient: Patient;
  shift: Shift;
  activeShift: ShiftLabel;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

/** memo: การ์ดที่ข้อมูลไม่เปลี่ยนจะไม่ render ซ้ำเมื่อมีการอัปเดตผู้ป่วยรายอื่นหรือ poll รอบใหม่ */
function PatientCard({ patient, shift, activeShift, onOpen, onDelete }: Props) {
  const currentProg = patient.progresses?.[shift] ?? 0;
  const riskTier = getRiskTier(currentProg);

  return (
    <div
      onClick={() => onOpen(patient.id)}
      className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden ${
        riskTier.isHighRisk ? 'border-rose-400 ring-2 ring-rose-100 bg-rose-50/30' : 'border-teal-100'
      }`}
    >
      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(patient.id);
        }}
        className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors z-10"
        title="ลบเตียง"
        aria-label="ลบเตียง"
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
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-prompt text-slate-800">{patient.name}</h3>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${riskTier.badgeClass}`}>
                {riskTier.label} ({currentProg}%)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              HN: {patient.hn} | {patient.gender} {patient.age} ปี | <span className="font-semibold text-teal-700">Ventilator Day {patient.ventDay}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar inside card & Assessor Info */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
            <span>WHAPO + S Score ({activeShift})</span>
            <span className={riskTier.textClass}>
              {currentProg}% ({riskTier.evalLevel.split(' ')[0]})
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${riskTier.barClass}`}
              style={{ width: `${currentProg}%` }}
            />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {patient.lastAssessedBy ? (
            <>
              <span className="text-[10px] text-teal-800 font-semibold block">{patient.lastAssessedBy} ({patient.lastAssessedShift})</span>
              <span className="text-[10px] text-slate-500">เวลา {patient.lastAssessedTime}</span>
            </>
          ) : (
            <span className="text-[10px] text-slate-400">ยังไม่มีการประเมิน</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(PatientCard);
