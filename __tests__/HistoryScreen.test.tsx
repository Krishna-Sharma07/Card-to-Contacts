import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import HistoryScreen from '../src/screens/HistoryScreen';
import { getScanHistory } from '../src/services/scanHistory';

jest.mock('../src/services/scanHistory', () => ({
  getScanHistory: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const { useEffect } = jest.requireActual('react');
  return {
    ...actual,
    useFocusEffect: (callback: () => void | (() => void)) => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      useEffect(() => callback(), []);
    },
  };
});

const mockGetScanHistory = getScanHistory as jest.Mock;

async function renderHistoryScreen() {
  const navigation = {} as any;
  const route = { key: 'History', name: 'History' as const, params: undefined };
  await render(<HistoryScreen navigation={navigation} route={route} />);
}

describe('HistoryScreen', () => {
  beforeEach(() => {
    mockGetScanHistory.mockReset();
  });

  it('shows an empty message when there is no scan history', async () => {
    mockGetScanHistory.mockResolvedValueOnce([]);

    await renderHistoryScreen();

    await waitFor(() => {
      expect(screen.getByTestId('history-empty')).toBeTruthy();
    });
  });

  it('lists past scans with name, company, and date', async () => {
    mockGetScanHistory.mockResolvedValueOnce([
      {
        id: '1',
        name: 'Jane Doe',
        company: 'Acme Inc.',
        scannedAt: '2026-07-12T10:00:00.000Z',
      },
      {
        id: '2',
        name: 'John Smith',
        company: 'Widgets Co.',
        scannedAt: '2026-07-11T10:00:00.000Z',
      },
    ]);

    await renderHistoryScreen();

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });
    expect(screen.getByText('Acme Inc.')).toBeTruthy();
    expect(screen.getByText('John Smith')).toBeTruthy();
    expect(screen.getByText('Widgets Co.')).toBeTruthy();
  });

  it('falls back to a placeholder name when the entry has no name', async () => {
    mockGetScanHistory.mockResolvedValueOnce([
      { id: '1', name: '', company: '', scannedAt: '2026-07-12T10:00:00.000Z' },
    ]);

    await renderHistoryScreen();

    await waitFor(() => {
      expect(screen.getByText('Unnamed contact')).toBeTruthy();
    });
  });
});
