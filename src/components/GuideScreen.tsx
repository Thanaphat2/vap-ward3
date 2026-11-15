import { DEFAULT_WHAPOS_CHECKLIST, GROUP_META, GROUP_ORDER, RISK_TIERS, WEANING_ITEM_ID } from '../constants';

// สร้างครั้งเดียวระดับโมดูล — เนื้อหาคู่มือมาจาก checklist ชุดเดียวกับหน้าประเมิน จึงไม่ต้องแก้ 2 ที่
const GROUPS = GROUP_ORDER.map(key => ({
  key,
  meta: GROUP_META[key],
  items: DEFAULT_WHAPOS_CHECKLIST.filter(i => i.groupKey === key)
}));

export default function GuideScreen() {
  return (
    <div className="space-y-4 font-sarabun">
      <div>
        <h2 className="text-base font-bold font-prompt text-slate-800">คู่มือ/แนวทาง WHAPO + S & Risk Tiers</h2>
        <p className="text-xs text-slate-500">เกณฑ์การคำนวณระดับความเสี่ยงอัตโนมัติจากคะแนน % การปฏิบัติ</p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-sm space-y-3">
        <h3 className="text-xs font-bold font-prompt text-teal-800">📋 เกณฑ์การประเมินระดับความเสี่ยง VAP อัตโนมัติ</h3>
        <div className="space-y-2 text-xs text-slate-700 font-sarabun">
          {RISK_TIERS.map(tier => (
            <div key={tier.key} className={`p-2.5 rounded-xl border flex items-center justify-between ${tier.panelClass}`}>
              <div>
                <strong className={`${tier.titleClass} font-prompt`}>{tier.rangeLabel}</strong>
                <div className={`text-[11px] ${tier.subClass}`}>{tier.evalLevel}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${tier.badgeClass}`}>{tier.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {GROUPS.map(({ key, meta, items }) => (
          <div key={key} className="bg-white rounded-2xl p-4 border border-teal-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center font-prompt text-base ${meta.badgeClass}`}>
                {key}
              </div>
              <div>
                <h4 className="text-xs font-bold font-prompt text-slate-800">{meta.title}</h4>
                <p className="text-[11px] text-slate-500">{meta.subtitle}</p>
              </div>
            </div>
            <ul className={`text-xs text-slate-700 space-y-1.5 pl-4 list-disc font-sarabun ${meta.markerClass}`}>
              {items.map(item => (
                <li key={item.id}>
                  {item.text}
                  {item.id === WEANING_ITEM_ID && ' (มีแบบสำรวจละเอียด 4 หมวด)'}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
