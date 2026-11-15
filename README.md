# VAP Care Smart 2.0 (อญ.3)

แอปเช็กลิสต์ VAP Bundle (WHAPO + S) และแบบสำรวจ Weaning Protocol สำหรับหอผู้ป่วยอายุรกรรมหญิง 3
เก็บข้อมูลลง Google Sheets (ผ่าน Google Apps Script) และมี cache ใน localStorage

## Run Locally

**Prerequisites:** Node.js (หรือ Bun)

1. ติดตั้ง dependencies: `npm install`
2. (แนะนำ) สร้าง `.env.local` แล้วกำหนด URL ของ Apps Script Web App:
   ```
   VITE_GOOGLE_SHEET_URL=https://script.google.com/macros/s/XXXX/exec
   ```
   หากไม่กำหนด แอปจะใช้ค่าเริ่มต้นใน `src/constants.ts` และเปลี่ยนได้ที่ปุ่ม Sheets ในหน้าจอ
3. รันแอป: `npm run dev`

## โครงสร้าง

```
src/
  App.tsx                 layout + การประกอบหน้าจอ
  constants.ts            checklist, เกณฑ์ความเสี่ยง, ค่าตั้งต้น
  types.ts / utils.ts     ชนิดข้อมูล, คำนวณ %, migrate ข้อมูล, สร้างข้อความส่งเวร
  services/sheets.ts      fetch / push ไป Google Sheets
  hooks/usePatients.ts    state ผู้ป่วย, debounce การเขียน, polling
  components/             PatientCard, PatientDetail, HandoverNote, GuideScreen, Modals
```
