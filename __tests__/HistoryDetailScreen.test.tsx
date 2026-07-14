import React from 'react';
import { render, screen } from '@testing-library/react-native';
import HistoryDetailScreen from '../src/screens/HistoryDetailScreen';
import type { ScanHistoryEntry } from '../src/services/scanHistory';

async function renderDetailScreen(entry: ScanHistoryEntry) {
  const navigation = {} as any;
  const route = { key: 'HistoryDetail', name: 'HistoryDetail' as const, params: { entry } };
  await render(<HistoryDetailScreen navigation={navigation} route={route} />);
}

describe('HistoryDetailScreen', () => {
  it('shows the basic fields for an older entry with no extra details saved', async () => {
    await renderDetailScreen({
      id: '1',
      name: 'Jane Doe',
      company: 'Acme Inc.',
      scannedAt: '2026-07-12T10:00:00.000Z',
    });

    expect(screen.getByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText('Acme Inc.')).toBeTruthy();
    expect(screen.queryByText('Other details')).toBeNull();
  });

  it('falls back to a placeholder name when the entry has no name', async () => {
    await renderDetailScreen({
      id: '1',
      name: '',
      company: '',
      scannedAt: '2026-07-12T10:00:00.000Z',
    });

    expect(screen.getByText('Unnamed contact')).toBeTruthy();
  });

  it('shows phone numbers, country code, and other details when present', async () => {
    await renderDetailScreen({
      id: '1',
      name: 'Jane Doe',
      title: 'Sales Manager',
      company: 'Acme Inc.',
      phones: ['555-123-4567', '555-999-8888'],
      countryCode: '+1',
      email: 'jane@acme.com',
      website: 'www.acme.com',
      address: '123 Main Street',
      scannedAt: '2026-07-12T10:00:00.000Z',
    });

    expect(screen.getByText('Sales Manager')).toBeTruthy();
    expect(screen.getByText('+1')).toBeTruthy();
    expect(screen.getByText('555-123-4567')).toBeTruthy();
    expect(screen.getByText('555-999-8888')).toBeTruthy();
    expect(screen.getByText('jane@acme.com')).toBeTruthy();
    expect(screen.getByText('www.acme.com')).toBeTruthy();
    expect(screen.getByText('123 Main Street')).toBeTruthy();
  });

  it('shows the photo when a photoUri was saved', async () => {
    await renderDetailScreen({
      id: '1',
      name: 'Jane Doe',
      company: 'Acme Inc.',
      scannedAt: '2026-07-12T10:00:00.000Z',
      photoUri: 'file:///padded-photo.jpg',
    });

    expect(screen.getByTestId('history-detail-photo').props.source).toEqual({
      uri: 'file:///padded-photo.jpg',
    });
  });
});
