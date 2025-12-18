import { GoogleGenAI } from "@google/genai";
import { ReminderItem, ChatMessage } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
คุณคือผู้ช่วย AI อัจฉริยะสำหรับ "ระบบเตือนความจำ" หน้าที่ของคุณคือวิเคราะห์ข้อมูลรายการของผู้ใช้ และตอบคำถามเป็นภาษาไทย

ข้อมูลที่ได้รับจะเป็น JSON Array ของรายการต่างๆ (Items) ซึ่งประกอบด้วย:
- ชื่อรายการ (Title)
- หมวดหมู่ (Category)
- วันที่ครบกำหนด (DueDate)
- ข้อมูลที่กำหนดเอง (Custom Fields) เช่น ระยะทาง, วันที่ตรวจล่าสุด เป็นต้น

ความสามารถของคุณ:
1. วิเคราะห์สถานะ: บอกได้ว่ารายการไหนครบกำหนด, เลยกำหนด (Overdue), หรือใกล้ถึงเวลา
2. คำนวณรอบทั่วไป: หากมีข้อมูลตัวเลข (เช่น เลขไมล์รถ) หรือวันที่ล่าสุด สามารถคำนวณรอบถัดไปได้ (เช่น เปลี่ยนน้ำมันเครื่องทุก 10,000 กม.)
3. **การคำนวณสินเชื่อบ้าน/รีไฟแนนซ์ (สำคัญมาก)**: 
   - หากพบรายการเกี่ยวกับ "บ้าน", "คอนโด", "Mortgage" หรือ "สินเชื่อ"
   - และมีข้อมูล Custom Field ที่ระบุวันเริ่มต้น เช่น "วันเริ่มสัญญา" หรือ "Start Date"
   - ให้คำนวณหา "วันครบกำหนด Retention/Refinance" โดยอัตโนมัติ (ปกติคือ 3 ปี นับจากวันเริ่มสัญญา)
   - หากวันที่ปัจจุบันใกล้ถึงกำหนด (ล่วงหน้า 3 เดือน) หรือเลยกำหนด 3 ปีแล้ว ให้แจ้งเตือนผู้ใช้ทันทีว่า "ควรติดต่อธนาคารเพื่อทำ Retention หรือ Refinance"
4. ตรวจสอบข้อมูลไม่ครบ: หากผู้ใช้ถามแล้วข้อมูลไม่เพียงพอ ให้แนะนำว่าควรเพิ่มข้อมูลฟิลด์ไหน
5. สรุปภาพรวม: สรุปงานสำคัญประจำสัปดาห์/เดือน

คำแนะนำการตอบ:
- ตอบด้วยน้ำเสียงสุภาพ กระชับ และเป็นประโยชน์
- **สำคัญมาก**: ให้เน้นคำสำคัญ ตัวเลข หรือประเด็นที่ต้องสนใจเป็นพิเศษด้วยเครื่องหมาย ** (ดอกจันคู่) เช่น **3 รายการ**, **ภายในพรุ่งนี้**, **ครบกำหนดรีไฟแนนซ์บ้าน** เพื่อให้ระบบนำไปแสดงไฮไลท์สีได้
`;

export const analyzeDataWithGemini = async (
  items: ReminderItem[],
  userQuery: string,
  history: ChatMessage[] = []
): Promise<string> => {
  try {
    // Prepare context
    const itemsContext = JSON.stringify(items.map(item => ({
      title: item.title,
      category: item.category,
      dueDate: item.dueDate,
      status: item.isCompleted ? 'Completed' : 'Pending',
      details: item.fields.map(f => `${f.label}: ${f.value}`).join(', '),
      tags: item.tags.join(', ')
    })));

    // Use locale date string to ensure AI knows the local "Today" (e.g., in Thailand)
    // Using en-CA format (YYYY-MM-DD) preserves sortability and consistency
    const today = new Date().toLocaleDateString('en-CA'); 

    const prompt = `
    [บริบทข้อมูลปัจจุบัน (วันนี้: ${today})]
    รายการทั้งหมดในระบบ:
    ${itemsContext}
    
    [คำถามของผู้ใช้]
    ${userQuery}
    `;

    const model = 'gemini-2.5-flash';
    
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
    return "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI โปรดตรวจสอบ API Key หรือลองใหม่อีกครั้ง";
  }
};

export const generateSmartSummary = async (items: ReminderItem[]): Promise<string> => {
    // Explicitly ask for marking important parts including mortgage refinance checks
    const query = "ช่วยสรุปภาพรวมงานที่ต้องทำ งานที่ค้าง และงานสำคัญในเดือนนี้ให้หน่อย แบบสั้นๆ เข้าใจง่าย รวมถึงตรวจสอบด้วยว่ามีรายการสินเชื่อบ้านที่ครบกำหนด Retention/Refinance (ครบ 3 ปี) หรือไม่? และอย่าลืมเน้นคำสำคัญ (เช่น จำนวนงาน, วันที่, ชื่อรายการ) ด้วยเครื่องหมาย **...**";
    return analyzeDataWithGemini(items, query);
}