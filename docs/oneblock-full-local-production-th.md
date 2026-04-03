# Gemini-Ready Blueprint: Screenshot-to-Code (Local ใช้งานได้ทันที)

เอกสารนี้ปรับจากโครงสร้างเดิมให้ **ใช้งานกับ Gemini ได้เลยทันทีบนรีโปนี้** โดยเน้น local workflow แบบ production-minded ตั้งแต่ติดตั้ง, config, run, validate, test, และ runbook แก้ปัญหาเมื่อไม่ผ่าน

---

## 1) โครงสร้างที่ต้องใช้ (ตามรีโปปัจจุบัน)

```text
/workspace/screenshot-to-code
  backend/      # FastAPI
  frontend/     # React + Vite
  docker-compose.yml
  README.md
```

หลักการใช้งาน:
- backend รับภาพ/ข้อความ แล้วเรียก model provider
- frontend ส่ง request และแสดงผลโค้ด
- provider ของ Gemini เชื่อมผ่าน `GEMINI_API_KEY`
- หากใส่ key แค่ Gemini ก็ใช้งานได้ (ไม่ต้องพึ่ง OpenAI/Anthropic)

---

## 2) ติดตั้งให้พร้อมใช้งานทันที (Gemini only)

## 2.1 สร้างไฟล์คีย์

สร้าง `backend/.env`:

```bash
GEMINI_API_KEY=your_google_gemini_api_key
# optional
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_BASE_URL=
```

> ถ้าไม่อยากเก็บ key ในไฟล์ สามารถใส่ผ่านหน้า Settings ใน frontend ได้

## 2.2 ติดตั้ง backend

```bash
cd backend
poetry install
```

## 2.3 ติดตั้ง frontend

```bash
cd frontend
yarn
```

---

## 3) รันระบบ local ให้ครบ

## 3.1 เปิด backend

```bash
cd backend
poetry run uvicorn main:app --reload --port 7001
```

## 3.2 เปิด frontend

```bash
cd frontend
yarn dev
```

เปิดใช้งานที่:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:7001`

ถ้าพอร์ต backend ไม่ใช่ 7001 ให้ตั้งใน `frontend/.env.local`:

```bash
VITE_HTTP_BACKEND_URL=http://localhost:7001
VITE_WS_BACKEND_URL=ws://localhost:7001
```

---

## 4) Config ให้เลือก Gemini อัตโนมัติ

ระบบ backend จะเลือก model ตาม key ที่มีใน runtime:
- มี Gemini key อย่างเดียว → ใช้เซ็ต Gemini
- มีหลายคีย์ → เข้าโหมด compare หลาย provider

ถ้าต้องการบังคับ “Gemini only” ให้ทำดังนี้:
1. ตั้ง `GEMINI_API_KEY` ให้ถูกต้อง
2. ปล่อย `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` ว่าง
3. ใน UI เลือกโมเดลกลุ่ม Gemini (เช่น flash/pro)

---

## 5) โหมด Oneblock (single output block)

เพื่อให้ผลลัพธ์เป็นไฟล์เดียวแบบ production-ready ให้ใช้ prompt รูปแบบนี้ตอน generate:

```text
Generate ONE complete file only.
Output exactly one code block.
Stack: HTML + Tailwind.
Requirements:
- mobile-first
- structure must be: main > section > div.container.mx-auto.px-4
- polished production-level UI
- no placeholder text
- no explanations, only final code
```

ถ้าต้องการ strict มากขึ้น (ห้ามหลายไฟล์):

```text
Return only index.html in one markdown code block.
Do not output any additional files.
Do not include commentary.
```

---

## 6) Pipeline การทำงานครบทุกขั้นตอน

1. **Input**: อัปโหลด screenshot (png/jpg/webp)
2. **Frontend preprocess**: resize/compress ตาม logic ฝั่ง client (ลด timeout)
3. **Backend parse request**: ดึง params + keys (จาก settings dialog หรือ env)
4. **Model select**: เลือก Gemini model set ตาม key availability
5. **Provider call**: เรียก Gemini API พร้อม timeout
6. **Stream/response**: ส่งผลลัพธ์โค้ดกลับ UI
7. **Render preview**: แสดงผลทันที
8. **Quality check**: ตรวจโครง layout / class ที่จำเป็น
9. **Retry strategy**: ถ้าผลลัพธ์ไม่ผ่าน ให้ regenerate ด้วย prompt เดิม + constraints เพิ่ม

---

## 7) UX/UI สำหรับใช้งานจริง (Full polish)

ต้องมีอย่างน้อย:
- Upload area ชัดเจน (drag/drop + click)
- Model selector (default เป็น Gemini Flash)
- Settings dialog ใส่ `GEMINI_API_KEY`
- สถานะชัดเจน: idle / generating / success / failed
- Error box ที่บอกวิธีแก้ได้ทันที
- Preview + code panel + copy

แนวทางลด error ฝั่งผู้ใช้:
- ถ้าไม่พบ key ให้เตือนทันทีพร้อมปุ่มเปิด Settings
- ถ้า timeout ให้แนะนำลดขนาดภาพหรือเลือก Flash
- ถ้า format ผิด ให้ regenerate อัตโนมัติด้วย prompt guardrail

---

## 8) Validation / Test / Check (ต้องทำทุกครั้ง)

## 8.1 Backend tests

```bash
cd backend && poetry run pytest
cd backend && poetry run pyright
```

เกณฑ์ผ่าน:
- ไม่มี error ใหม่จากการแก้ไข
- warning เดิมยอมรับได้ถ้าไม่เพิ่มในไฟล์ที่แตะ

## 8.2 Frontend checks

```bash
cd frontend && yarn lint
cd frontend && yarn build
```

## 8.3 Runtime smoke

```bash
# backend health
curl -f http://localhost:7001/health || curl -f http://localhost:7001/api/health

# frontend open
# เปิด http://localhost:5173 แล้วทดสอบ upload จริง 1 ภาพ
```

---

## 9) Deploy readiness checklist

ก่อน deploy ต้องครบ:
- [ ] ใส่ `GEMINI_API_KEY` ใน environment ของ target
- [ ] frontend ชี้ backend URL ถูกต้อง
- [ ] lint/build ผ่าน
- [ ] backend test/typecheck ผ่านเงื่อนไขทีม
- [ ] upload -> generate -> preview flow ผ่านจริง
- [ ] มี fallback error message ที่ actionable

---

## 10) Runbook เมื่อไม่ผ่าน

## A) ขึ้นข้อความ “Please add GEMINI_API_KEY ...”
แก้:
1. ตรวจ `backend/.env` มี `GEMINI_API_KEY`
2. รีสตาร์ต backend
3. หรือใส่ key ใน Settings dialog ใหม่

## B) Generate timeout
แก้:
1. ใช้ภาพเล็กลง (ยาวด้านใหญ่สุด ~1600px)
2. เลือก Gemini Flash
3. ลองใหม่โดยลด prompt verbosity

## C) ได้ผลลัพธ์หลายไฟล์ / ไม่เป็น oneblock
แก้:
1. เพิ่ม constraint “Return only index.html in one code block”
2. เปิดโหมด regenerate พร้อม strict prompt

## D) frontend ต่อ backend ไม่ได้
แก้:
1. ตรวจ `VITE_HTTP_BACKEND_URL` และ `VITE_WS_BACKEND_URL`
2. ตรวจ backend รันพอร์ตเดียวกับที่ตั้ง
3. ดู console/network ว่าติด CORS หรือ connection refused

---

## 11) คำสั่งใช้งานจริงแบบสั้น (copy/run ได้ทันที)

```bash
# 1) backend env
cat > backend/.env <<'ENV'
GEMINI_API_KEY=your_google_gemini_api_key
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
ENV

# 2) install
cd backend && poetry install
cd ../frontend && yarn

# 3) run backend
cd ../backend && poetry run uvicorn main:app --reload --port 7001

# 4) another terminal: run frontend
cd /workspace/screenshot-to-code/frontend && yarn dev

# 5) open app
# http://localhost:5173
```

---

## 12) Definition of Done (Gemini-ready)

ถือว่าเสร็จเมื่อ:
1. ใส่ Gemini key แล้ว generate ได้ทันที
2. เลือก Gemini model แล้วไม่ error เรื่อง key
3. ได้โค้ด output ตาม oneblock constraints
4. lint/build/check ผ่านตามเกณฑ์
5. flow upload -> generate -> preview ใช้งานได้จริง end-to-end
