import {
  getScanHistory,
  addScanHistoryEntry,
  clearScanHistory,
  removeScanHistoryEntry,
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

  it('removes a single entry by id', async () => {
    await addScanHistoryEntry({ name: 'Jane Doe', company: 'Acme Inc.' });
    const history = await addScanHistoryEntry({ name: 'John Smith', company: 'Widgets Co.' });
    const [newest, oldest] = history;

    const updated = await removeScanHistoryEntry(newest.id);

    expect(updated).toEqual([oldest]);
  });

  it('leaves history unchanged when removing an id that does not exist', async () => {
    await addScanHistoryEntry({ name: 'Jane Doe', company: 'Acme Inc.' });

    const updated = await removeScanHistoryEntry('does-not-exist');

    expect(updated).toHaveLength(1);
  });

  it('stores the full contact details and photo for later viewing', async () => {
    const history = await addScanHistoryEntry({
      name: 'Jane Doe',
      title: 'Sales Manager',
      company: 'Acme Inc.',
      phones: ['555-123-4567'],
      countryCode: '+1',
      email: 'jane@acme.com',
      website: 'www.acme.com',
      address: '123 Main Street',
      photoUri: 'file:///padded-photo.jpg',
    });

    expect(history[0]).toMatchObject({
      title: 'Sales Manager',
      phones: ['555-123-4567'],
      countryCode: '+1',
      email: 'jane@acme.com',
      website: 'www.acme.com',
      address: '123 Main Street',
      photoUri: 'file:///padded-photo.jpg',
    });
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
