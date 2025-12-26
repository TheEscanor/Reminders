
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

// Always use process.env.API_KEY for the API client
export const analyzeDataWithGemini = async (
  items: ReminderItem[],
  userQuery: string,
  history: ChatMessage[] = []
): Promise<string> => {
  try {
    // Initializing with process.env.API_KEY directly as required
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    const itemsContext = JSON.stringify(items.map(item => ({
      title: item.title,
      category: item.category,
      dueDate: item.dueDate,
      status: item.isCompleted ? 'Completed' : 'Pending',
      details: item.fields.map(f => `${f.label}: ${f.value}`).join(', ')
    })));

    const today = new Date().toLocaleDateString('en-CA'); 

    // Optional: Include history in the prompt context
    const historyContext = history.length > 0 ? 
      "\n[ประวัติการสนทนา]\n" + history.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n') : "";

    const prompt = `
    [บริบทข้อมูลปัจจุบัน (วันนี้: ${today})]
    รายการทั้งหมดในระบบ:
    ${itemsContext}
    ${historyContext}
    
    [คำถามของผู้ใช้]
    ${userQuery}
    `;

    // Always use gemini-3-flash-preview for general text and reasoning tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    // Extract text directly from the property .text (do not use .text())
    return response.text || "ขออภัย ไม่สามารถประมวลผลคำตอบได้ในขณะนี้";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : "โปรดตรวจสอบการเชื่อมต่อของคุณ"}`;
  }
};

export const generateSmartSummary = async (items: ReminderItem[]): Promise<string> => {
    const query = "ช่วยสรุปภาพรวมงานที่ต้องทำ งานที่ค้าง และงานสำคัญในเดือนนี้ให้หน่อย รวมถึงตรวจสอบรีไฟแนนซ์บ้านด้วย และอย่าลืมเน้นคำสำคัญด้วยเครื่องหมาย **...**";
    // Removed apiKey argument to use process.env.API_KEY internally
    return analyzeDataWithGemini(items, query);
}
