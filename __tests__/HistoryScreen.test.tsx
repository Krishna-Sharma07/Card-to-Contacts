import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import HistoryScreen from '../src/screens/HistoryScreen';
import {
  clearScanHistory,
  getScanHistory,
  removeScanHistoryEntry,
} from '../src/services/scanHistory';

jest.mock('../src/services/scanHistory', () => ({
  getScanHistory: jest.fn(),
  clearScanHistory: jest.fn(),
  removeScanHistoryEntry: jest.fn(),
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
const mockClearScanHistory = clearScanHistory as jest.Mock;
const mockRemoveScanHistoryEntry = removeScanHistoryEntry as jest.Mock;

async function renderHistoryScreen() {
  const navigation = { navigate: jest.fn() } as any;
  const route = { key: 'History', name: 'History' as const, params: undefined };
  await render(<HistoryScreen navigation={navigation} route={route} />);
  return { navigation };
}

describe('HistoryScreen', () => {
  beforeEach(() => {
    mockGetScanHistory.mockReset();
    mockClearScanHistory.mockReset();
    mockClearScanHistory.mockResolvedValue(undefined);
    mockRemoveScanHistoryEntry.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('navigates to the detail screen with the full entry when a scan is tapped', async () => {
    const entry = {
      id: '1',
      name: 'Jane Doe',
      company: 'Acme Inc.',
      scannedAt: '2026-07-12T10:00:00.000Z',
    };
    mockGetScanHistory.mockResolvedValueOnce([entry]);

    const { navigation } = await renderHistoryScreen();

    await waitFor(() => {
      expect(screen.getByTestId('history-item-1')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('history-item-1'));

    expect(navigation.navigate).toHaveBeenCalledWith('HistoryDetail', { entry });
  });

  it('removes a single entry after confirming', async () => {
    mockGetScanHistory.mockResolvedValueOnce([
      { id: '1', name: 'Jane Doe', company: 'Acme Inc.', scannedAt: '2026-07-12T10:00:00.000Z' },
    ]);
    mockRemoveScanHistoryEntry.mockResolvedValueOnce([]);
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const removeButton = buttons?.find(button => button.text === 'Remove');
      removeButton?.onPress?.();
    });

    await renderHistoryScreen();

    await waitFor(() => {
      expect(screen.getByTestId('remove-history-1')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('remove-history-1'));

    await waitFor(() => {
      expect(mockRemoveScanHistoryEntry).toHaveBeenCalledWith('1');
    });
    await waitFor(() => {
      expect(screen.getByTestId('history-empty')).toBeTruthy();
    });
  });

  it('does not remove an entry when the user cancels the confirmation', async () => {
    mockGetScanHistory.mockResolvedValueOnce([
      { id: '1', name: 'Jane Doe', company: 'Acme Inc.', scannedAt: '2026-07-12T10:00:00.000Z' },
    ]);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await renderHistoryScreen();

    await waitFor(() => {
      expect(screen.getByTestId('remove-history-1')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('remove-history-1'));

    expect(mockRemoveScanHistoryEntry).not.toHaveBeenCalled();
  });

  it('clears all history after confirming', async () => {
    mockGetScanHistory.mockResolvedValueOnce([
      { id: '1', name: 'Jane Doe', company: 'Acme Inc.', scannedAt: '2026-07-12T10:00:00.000Z' },
    ]);
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const clearButton = buttons?.find(button => button.text === 'Clear All');
      clearButton?.onPress?.();
    });

    await renderHistoryScreen();

    await waitFor(() => {
      expect(screen.getByTestId('clear-history-button')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId('clear-history-button'));

    await waitFor(() => {
      expect(mockClearScanHistory).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByTestId('history-empty')).toBeTruthy();
    });
  });
});
