import { ReminderItem } from "../types";

// Note: Ensure this URL matches your deployed Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbxj_PHDFFZVEMOFgtTuUkVsuXfm8OsUIuzR642uA2ST4HfkUr5FkLYYHAShgnclxNhsLA/exec';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const loginUser = async (username: string, password: string): Promise<boolean> => {
  const payload = JSON.stringify({
    action: 'login',
    username: username.trim(),
    password: password.trim()
  });

  try {
    // Try standard fetch first
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: payload,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });

    if (response.ok) {
      const result = await response.json();
      return result.success === true;
    }
    return false;
  } catch (error) {
    console.warn("Login failed via CORS, trying fallback...");
    // Fallback: This is tricky for login because we need the return value.
    // If CORS fails, we can't really read the "success" boolean from an opaque response.
    // However, usually login fails due to network or script 500 errors, not CORS if deployed correctly.
    console.error("Login error:", error);
    return false;
  }
};

export const fetchItemsFromSheet = async (username: string): Promise<ReminderItem[]> => {
  const cleanUsername = username.trim();
  const maxRetries = 3;
  
  console.log(`Fetching data for user: "${cleanUsername}"`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const url = `${API_URL}?action=read&username=${encodeURIComponent(cleanUsername)}&t=${new Date().getTime()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
         throw new Error("Invalid response format. Check Script Deployment.");
      }
      
      const data = await response.json();
      return data.items || [];
      
    } catch (error) {
      console.warn(`Fetch Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) throw error;
      await wait(1000 * (i + 1));
    }
  }
  return [];
};

export const saveItemsToSheet = async (items: ReminderItem[], username: string): Promise<boolean> => {
  const cleanUsername = username.trim();
  const payload = JSON.stringify({ 
    action: 'save',
    items,
    username: cleanUsername
  });

  // 1. Try Standard Fetch
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
      body: payload,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) return true;
    }
    console.warn("Save response OK but success=false");
  } catch (error) {
     console.warn("Standard save failed, trying no-cors fallback...", error);
  }
  
  // 2. Fallback: No-CORS (Blind Send)
  // This is useful if CORS headers are missing but the script still executes.
  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      credentials: 'omit',
      redirect: 'follow',
      body: payload,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      keepalive: true, // Attempt to keep connection alive
    });
    return true; // Assume success for no-cors
  } catch (fallbackError) {
    console.error("Critical: All save attempts failed:", fallbackError);
    return false;
  }
};