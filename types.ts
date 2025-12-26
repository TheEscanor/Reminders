
export type FieldType = 'text' | 'number' | 'date' | 'checkbox';

export interface CustomField {
  id: string;
  label: string;
  type: FieldType;
  value: string | number | boolean;
}

export interface ReminderItem {
  id: string;
  title: string;
  category: string;
  tags: string[];
  fields: CustomField[];
  dueDate: string | null; // ISO Date string
  isCompleted: boolean;
  recurrence?: string; 
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  owner?: string; 
}

export interface Template {
  id: string;
  name: string;
  category: string;
  defaultFields: Omit<CustomField, 'value' | 'id'>[];
  icon: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface User {
  username: string;
  isAuthenticated: boolean;
  apiKey?: string;
}