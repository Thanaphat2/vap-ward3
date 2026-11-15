import React, { useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronRight, FileText, Moon, Sun, Sunset, Trash2, X } from 'lucide-react';
import { DEFAULT_WEANING_SURVEY, DEFAULT_WHAPOS_CHECKLIST, WEANING_ITEM_ID } from '../constants';
import type { Patient, Shift } from '../types';
import { getRiskTier } from '../utils';
import HandoverNote from './HandoverNote';

type Status = 'complied' | 'not_complied';

interface Props {
  selectedPatient: Patient;
  activeChecklistShift: Shift;
  nurseName: string;
  onShiftChange: (shift: Shift) => void;
  onBack: () => void;
  onDelete: (id: string) => void;
  updateItemStatus: (patientId: string, shift: Shift, itemId: string, status: Status) => void;
  updateWeaningItemStatus: (patientId: string, shift: Shift, itemId: string, status: Status) => void;
  updateWeaningItemNote: (patientId: string, shift: Shift, itemId: string, note: string) => void;
}

export default function PatientDetail({
  selectedPatient,
  activeChecklistShift,
  nurseName,
  onShiftChange,
  onBack,
  onDelete,
  updateItemStatus,
  updateWeaningItemStatus,
  updateWeaningItemNote
}: Props) {
  const [subTab, setSubTab] = useState<'bundle' | 'notes'>('bundle');
  const [showWeaningProtocolSurvey, setShowWeaningProtocolSurvey] = useState(false);

  const currentProg = selectedPatient.progresses?.[activeChecklistShift] ?? 0;
  const riskTier = getRiskTier(currentProg);

  return (
    <div className="space-y-4 font-sarabun">
      {/* Top Bar with Back & Delete */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => onBack()}
          className="flex items-center gap-1.5 text-xs font-prompt font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200"
        >
          <ArrowLeft className="w-4 h-4" /> กลับ
        </button>
        <button 
          onClick={() => onDelete(selectedPatient.id)}
          className="flex items-center gap-1.5 text-xs font-prompt font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors"
        >
          <Trash2 className="w-4 h-4" /> ลบเตียงนี้
        </button>
      </div>

      {/* Patient Header Card */}
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

        {/* Prominent Dynamic Risk & Evaluation Banner */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
          riskTier.bannerClass
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm font-prompt flex-shrink-0 ${
              riskTier.bubbleClass
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

      {/* Sub-tabs */}
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

      {/* Subtab 1: WHAPO + S Assessment Screen */}
      {subTab === 'bundle' && (
        <div className="space-y-4">
          {/* Shift Selector Tabs */}
          <div className="flex bg-white p-1.5 rounded-2xl border border-teal-200 shadow-xs gap-1">
            <button
              onClick={() => onShiftChange('morning')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-prompt font-semibold flex items-center justify-center gap-1 transition-all ${
                activeChecklistShift === 'morning' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-teal-50'
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> เวรเช้า ({selectedPatient.progresses?.morning ?? 0}%)
            </button>
            <button
              onClick={() => onShiftChange('afternoon')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-prompt font-semibold flex items-center justify-center gap-1 transition-all ${
                activeChecklistShift === 'afternoon' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-teal-50'
              }`}
            >
              <Sunset className="w-3.5 h-3.5" /> เวรบ่าย ({selectedPatient.progresses?.afternoon ?? 0}%)
            </button>
            <button
              onClick={() => onShiftChange('night')}
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
            const groupTitle = groupItems[0].groupTitle;
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
                    const cleanText = item.text;

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

                        {item.id === WEANING_ITEM_ID && (
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
                              <div className="bg-slate-50 border border-teal-200 rounded-2xl p-3.5 space-y-4 animate-fade">
                                <div className="text-xs font-bold text-teal-900 font-prompt border-b border-teal-100 pb-1.5">
                                  แบบสำรวจการใช้ Weaning Protocol (4 หมวด)
                                </div>

                                {[1, 2, 3, 4].map(catNum => {
                                  const surveyList = selectedPatient.weaningSurveys?.[activeChecklistShift] || DEFAULT_WEANING_SURVEY;
                                  const catItems = surveyList.filter(s => s.category === catNum);
                                  if (catItems.length === 0) return null;
                                  const catTitle = catItems[0].categoryTitle;

                                  return (
                                    <div key={catNum} className="space-y-2 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                                      <h5 className="text-[11px] font-bold font-prompt text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg">
                                        {catTitle}
                                      </h5>

                                      <div className="space-y-3 pt-1">
                                        {catItems.map(surveyItem => {
                                          const sComplied = surveyItem.status === 'complied';
                                          const sNotComplied = surveyItem.status === 'not_complied';
                                          const cleanSurveyText = surveyItem.text;

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
      <HandoverNote patient={selectedPatient} shift={activeChecklistShift} nurseName={nurseName} />
    )}

    </div>
  );
}
