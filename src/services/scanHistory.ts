import AsyncStorage from '@react-native-async-storage/async-storage';

export type ScanHistoryEntry = {
  id: string;
  name: string;
  company: string;
  scannedAt: string;
  title?: string;
  phones?: string[];
  countryCode?: string;
  email?: string;
  website?: string;
  address?: string;
  photoUri?: string;
};

const STORAGE_KEY = '@card-to-contacts/scan-history';
const MAX_ENTRIES = 100;

export async function getScanHistory(): Promise<ScanHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  return JSON.parse(raw) as ScanHistoryEntry[];
}

export async function addScanHistoryEntry(
  entry: Omit<ScanHistoryEntry, 'id' | 'scannedAt'>,
): Promise<ScanHistoryEntry[]> {
  const existing = await getScanHistory();
  const newEntry: ScanHistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    scannedAt: new Date().toISOString(),
  };
  const updated = [newEntry, ...existing].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function clearScanHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function removeScanHistoryEntry(id: string): Promise<ScanHistoryEntry[]> {
  const existing = await getScanHistory();
  const updated = existing.filter(entry => entry.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
