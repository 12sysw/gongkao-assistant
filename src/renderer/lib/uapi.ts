const UAPI_BASE = 'https://uapis.cn/api/v1';

export interface WeatherData {
  province: string;
  city: string;
  adcode?: string;
  weather: string;
  weather_icon?: string;
  temperature: number;
  wind_direction: string;
  wind_power: string;
  humidity: number;
  report_time?: string;
  alerts?: WeatherAlert[];
}

export interface WeatherAlert {
  title: string;
  type: string;
  level: string;
  text: string;
  publish_time?: string;
  publisher?: string;
  guidance?: string[];
}

export interface HolidayDay {
  date: string;
  is_holiday: boolean;
  is_workday: boolean;
  legal_holiday_name: string;
  lunar_month_name: string;
  lunar_day_name: string;
  solar_term: string;
}

// 缓存工具
const cache = new Map<string, { data: unknown; expiry: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

export async function fetchSaying(): Promise<string> {
  const cached = getCached<string>('saying');
  if (cached) return cached;

  const res = await fetch(`${UAPI_BASE}/saying`);
  if (!res.ok) throw new Error(`Saying API error: ${res.status}`);
  const json = await res.json();
  setCache('saying', json.text, 5 * 60 * 1000); // 缓存5分钟
  return json.text;
}

export async function fetchWeather(city: string): Promise<WeatherData> {
  const cacheKey = `weather_${encodeURIComponent(city)}`;
  const cached = getCached<WeatherData>(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${UAPI_BASE}/misc/weather?city=${encodeURIComponent(city)}`);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const json = await res.json();
  setCache(cacheKey, json, 30 * 60 * 1000); // 缓存30分钟
  return json;
}

export async function fetchHolidays(year: number): Promise<HolidayDay[]> {
  const cacheKey = `holidays_${year}`;
  const cached = getCached<HolidayDay[]>(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${UAPI_BASE}/misc/holiday-calendar?year=${year}`);
  if (!res.ok) throw new Error(`Holiday API error: ${res.status}`);
  const json = await res.json();
  setCache(cacheKey, json, 24 * 60 * 60 * 1000); // 缓存24小时
  return json;
}

export async function translateText(text: string, toLang: string): Promise<string> {
  const res = await fetch(`${UAPI_BASE}/translate/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, ToLang: toLang }),
  });
  if (!res.ok) throw new Error(`Translate API error: ${res.status}`);
  const json = await res.json();
  return json.translate;
}

export async function fetchAnswer(): Promise<string> {
  const cached = getCached<string>('answer');
  if (cached) return cached;

  const res = await fetch(`${UAPI_BASE}/answerbook/ask`);
  if (!res.ok) throw new Error(`AnswerBook API error: ${res.status}`);
  const json = await res.json();
  setCache('answer', json.answer, 5 * 60 * 1000);
  return json.answer;
}
