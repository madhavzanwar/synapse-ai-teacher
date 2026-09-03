import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseEmotionFromScript(script: string): {
  cleanText: string;
  emotion: 'enthusiastic' | 'thoughtful' | 'encouraging' | 'curious' | 'empathetic' | 'neutral';
} {
  let emotion: 'enthusiastic' | 'thoughtful' | 'encouraging' | 'curious' | 'empathetic' | 'neutral' = 'enthusiastic';

  if (script.includes('<emotion=empathetic>')) {
    emotion = 'empathetic';
  } else if (script.includes('<emotion=thoughtful>')) {
    emotion = 'thoughtful';
  } else if (script.includes('<emotion=encouraging>')) {
    emotion = 'encouraging';
  } else if (script.includes('<emotion=curious>')) {
    emotion = 'curious';
  } else if (script.includes('<emotion=enthusiastic>')) {
    emotion = 'enthusiastic';
  }

  // Remove XML-like emotion and pause tags for clean display & speech
  const cleanText = script
    .replace(/<emotion=[a-zA-Z0-9_-]+>/gi, '')
    .replace(/<\/emotion>/gi, '')
    .replace(/<pause=[a-zA-Z0-9_-]+>/gi, '')
    .replace(/<emphasis=[a-zA-Z0-9_-]+>/gi, '')
    .replace(/<\/emphasis>/gi, '')
    .trim();

  return { cleanText, emotion };
}
