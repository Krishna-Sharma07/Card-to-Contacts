import {
  getScanHistory,
  addScanHistoryEntry,
  clearScanHistory,
} from '../src/services/scanHistory';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('scanHistory', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns an empty list when nothing has been scanned', async () => {
    const history = await getScanHistory();

    expect(history).toEqual([]);
  });

  it('adds a new entry to the front of the list', async () => {
    await addScanHistoryEntry({ name: 'Jane Doe', company: 'Acme Inc.' });
    const history = await addScanHistoryEntry({ name: 'John Smith', company: 'Widgets Co.' });

    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({ name: 'John Smith', company: 'Widgets Co.' });
    expect(history[1]).toMatchObject({ name: 'Jane Doe', company: 'Acme Inc.' });
    expect(history[0].id).toBeTruthy();
    expect(history[0].scannedAt).toBeTruthy();
  });

  it('persists entries across calls via AsyncStorage', async () => {
    await addScanHistoryEntry({ name: 'Jane Doe', company: 'Acme Inc.' });

    const history = await getScanHistory();

    expect(history).toHaveLength(1);
    expect(history[0].name).toBe('Jane Doe');
  });

  it('clears all history', async () => {
    await addScanHistoryEntry({ name: 'Jane Doe', company: 'Acme Inc.' });
    await clearScanHistory();

    const history = await getScanHistory();

    expect(history).toEqual([]);
  });

  it('caps history at 100 entries, dropping the oldest', async () => {
    for (let i = 0; i < 101; i += 1) {
      await addScanHistoryEntry({ name: `Person ${i}`, company: 'Acme Inc.' });
    }

    const history = await getScanHistory();

    expect(history).toHaveLength(100);
    expect(history[0].name).toBe('Person 100');
    expect(history[history.length - 1].name).toBe('Person 1');
  });
});
