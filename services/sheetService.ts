import { ReminderItem, User } from "../types.ts";

// Note: Ensure this URL matches your deployed Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbxj_PHDFFZVEMOFgtTuUkVsuXfm8OsUIuzR642uA2ST4HfkUr5FkLYYHAShgnclxNhsLA/exec';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  const payload = JSON.stringify({
    action: 'login',
    username: username.trim(),
    password: password.trim()
  });

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      body: payload,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        return {
          username: result.username,
          isAuthenticated: true,
          apiKey: result.apiKey // Get from column D
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
};

/**
 * Re-fetches only the user's profile metadata (like API Key) from the sheet
 */
export const fetchUserProfile = async (username: string): Promise<{ apiKey: string } | null> => {
  try {
    const url = `${API_URL}?action=getProfile&username=${encodeURIComponent(username.trim())}&t=${new Date().getTime()}`;
    const response = await fetch(url, { method: 'GET', mode: 'cors', redirect: 'follow' });
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        return { apiKey: result.apiKey };
      }
    }
    return null;
  } catch (error) {
    console.error("Profile sync error:", error);
    return null;
  }
};

export const fetchItemsFromSheet = async (username: string): Promise<ReminderItem[]> => {
  const cleanUsername = username.trim();
  const maxRetries = 3;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const url = `${API_URL}?action=read&username=${encodeURIComponent(cleanUsername)}&t=${new Date().getTime()}`;
      const response = await fetch(url, { method: 'GET', mode: 'cors', redirect: 'follow' });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await wait(1000 * (i + 1));
    }
  }
  return [];
};

export const saveItemsToSheet = async (items: ReminderItem[], username: string): Promise<boolean> => {
  const cleanUsername = username.trim();
  const payload = JSON.stringify({ action: 'save', items, username: cleanUsername });

  try {
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
     console.warn("Standard save failed", error);
     return false;
  }
};