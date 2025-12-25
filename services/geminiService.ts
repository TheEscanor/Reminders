import { GoogleGenAI } from "@google/genai";
import { ReminderItem, ChatMessage } from "../types";

const SYSTEM_INSTRUCTION = `
คุณคือผู้ช่วย AI อัจฉริยะสำหรับ "ระบบเตือนความจำ" หน้าที่ของคุณคือวิเคราะห์ข้อมูลรายการของผู้ใช้ และตอบคำถามเป็นภาษาไทย

ข้อมูลที่ได้รับจะเป็น JSON Array ของรายการต่างๆ (Items) ซึ่งประกอบด้วย:
- ชื่อรายการ (Title)
- หมวดหมู่ (Category)
- วันที่ครบกำหนด (DueDate)
- ข้อมูลที่กำหนดเอง (Custom Fields)

ความสามารถของคุณ:
1. วิเคราะห์สถานะ: บอกได้ว่ารายการไหนครบกำหนด, เลยกำหนด (Overdue), หรือใกล้ถึงเวลา
2. คำนวณรอบทั่วไป: คำนวณรอบถัดไปจากข้อมูลเลขไมล์หรือวันที่
3. **การคำนวณสินเชื่อบ้าน/รีไฟแนนซ์**: คำนวณวันครบกำหนด Retention/Refinance (3 ปี)
4. ตรวจสอบข้อมูลไม่ครบ และสรุปภาพรวม

คำแนะนำการตอบ:
- ตอบด้วยน้ำเสียงสุภาพ กระชับ
- เน้นคำสำคัญด้วย **...**
`;

export const analyzeDataWithGemini = async (
  items: ReminderItem[],
  userQuery: string,
  apiKey: string | undefined,
  history: ChatMessage[] = []
): Promise<string> => {
  const effectiveApiKey = apiKey?.trim();
  
  if (!effectiveApiKey) {
    return "⚠️ ไม่พบ API Key ในบัญชีของคุณ (ชีตคอลัมน์ D ว่างเปล่า) กรุณากรอก Key ใน Google Sheet แล้วทำการ Logout และ Login ใหม่เพื่อดึงข้อมูลคีย์ล่าสุดครับ";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
    
    const itemsContext = JSON.stringify(items.map(item => ({
      title: item.title,
      category: item.category,
      dueDate: item.dueDate,
      status: item.isCompleted ? 'Completed' : 'Pending',
      details: item.fields.map(f => `${f.label}: ${f.value}`).join(', ')
    })));

    const today = new Date().toLocaleDateString('en-CA'); 

    const prompt = `
    [บริบทข้อมูลปัจจุบัน (วันนี้: ${today})]
    รายการทั้งหมดในระบบ:
    ${itemsContext}
    
    [คำถามของผู้ใช้]
    ${userQuery}
    `;

    const model = 'gemini-3-flash-preview';
    
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    return response.text || "ขออภัย ไม่สามารถประมวลผลคำตอบได้ในขณะนี้";

  } catch (error) {
    console.error("Gemini API Error:", error);
    const errorStr = String(error);
    if (errorStr.includes("401") || errorStr.includes("403")) {
      return "❌ API Key ไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง (401/403) กรุณาตรวจสอบ Key ใน Google Sheet อีกครั้ง";
    }
    return `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : "โปรดตรวจสอบ API Key ของคุณ"}`;
  }
};

export const generateSmartSummary = async (items: ReminderItem[], apiKey: string | undefined): Promise<string> => {
    const query = "ช่วยสรุปภาพรวมงานที่ต้องทำ งานที่ค้าง และงานสำคัญในเดือนนี้ให้หน่อย รวมถึงตรวจสอบรีไฟแนนซ์บ้านด้วย และอย่าลืมเน้นคำสำคัญด้วยเครื่องหมาย **...**";
    return analyzeDataWithGemini(items, query, apiKey);
}