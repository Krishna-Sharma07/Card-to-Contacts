import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ReviewScreen from '../src/screens/ReviewScreen';
import { recognizeCardText } from '../src/services/ocr';
import { saveContactFromForm } from '../src/services/saveContact';
import { addScanHistoryEntry } from '../src/services/scanHistory';

jest.mock('../src/services/ocr', () => ({
  recognizeCardText: jest.fn(),
}));

jest.mock('../src/services/saveContact', () => ({
  saveContactFromForm: jest.fn(),
}));

jest.mock('../src/services/scanHistory', () => ({
  addScanHistoryEntry: jest.fn(),
}));

const mockCapture = jest.fn();
jest.mock('../src/components/CircleSafePhotoCapture', () => {
  const { forwardRef, useImperativeHandle } = require('react');
  return {
    __esModule: true,
    default: forwardRef((_props: unknown, ref: unknown) => {
      useImperativeHandle(ref, () => ({ capture: mockCapture }));
      return null;
    }),
  };
});

const mockDetectDefaultCountryCode = jest.fn();
jest.mock('../src/services/detectCountryCode', () => ({
  detectDefaultCountryCode: () => mockDetectDefaultCountryCode(),
}));

const mockRecognizeCardText = recognizeCardText as jest.Mock;
const mockSaveContactFromForm = saveContactFromForm as jest.Mock;
const mockAddScanHistoryEntry = addScanHistoryEntry as jest.Mock;

async function renderReviewScreen(backUri?: string) {
  const navigation = { navigate: jest.fn() } as any;
  const route = {
    key: 'Review',
    name: 'Review' as const,
    params: { frontUri: 'file://front.jpg', backUri },
  };
  await render(<ReviewScreen navigation={navigation} route={route} />);
  return { navigation };
}

describe('ReviewScreen', () => {
  beforeEach(() => {
    mockRecognizeCardText.mockReset();
    mockSaveContactFromForm.mockReset();
    mockAddScanHistoryEntry.mockReset();
    mockCapture.mockReset();
    mockCapture.mockResolvedValue('file:///padded-photo.jpg');
    mockDetectDefaultCountryCode.mockReset();
    mockDetectDefaultCountryCode.mockReturnValue('');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the raw recognized text once OCR resolves', async () => {
    mockRecognizeCardText.mockResolvedValueOnce({
      frontText: 'Jane Doe\nAcme Inc.',
      backText: undefined,
    });

    await renderReviewScreen();

    await waitFor(() => {
      expect(screen.getByText('Jane Doe\nAcme Inc.')).toBeTruthy();
    });
    expect(mockRecognizeCardText).toHaveBeenCalledWith('file://front.jpg', undefined);
  });

  it('shows both front and back raw text when a back image is provided', async () => {
    mockRecognizeCardText.mockResolvedValueOnce({
      frontText: 'Front Text',
      backText: 'Back Text',
    });

    await renderReviewScreen('file://back.jpg');

    await waitFor(() => {
      expect(screen.getByText('Front Text')).toBeTruthy();
      expect(screen.getByText('Back Text')).toBeTruthy();
    });
  });

  it('shows an error message when OCR fails', async () => {
    mockRecognizeCardText.mockRejectedValueOnce(new Error('boom'));

    await renderReviewScreen();

    await waitFor(() => {
      expect(screen.getByText('boom')).toBeTruthy();
    });
  });

  it('pre-fills the editable form with fields parsed from the OCR text', async () => {
    mockRecognizeCardText.mockResolvedValueOnce({
      frontText: [
        'Jane Doe',
        'Senior Sales Manager',
        'Acme Solutions Inc.',
        '+1 (555) 123-4567',
        'jane.doe@acme.com',
        'www.acme.com',
      ].join('\n'),
      backText: undefined,
    });

    await renderReviewScreen();

    await waitFor(() => {
      expect(screen.getByTestId('name-input').props.value).toBe('Jane Doe');
    });
    expect(screen.getByTestId('title-input').props.value).toBe('Senior Sales Manager');
    expect(screen.getByTestId('company-input').props.value).toBe('Acme Solutions Inc.');
    expect(screen.getByTestId('phone-input-0').props.value).toBe('+1 (555) 123-4567');
    expect(screen.getByTestId('email-input').props.value).toBe('jane.doe@acme.com');
    expect(screen.getByTestId('website-input').props.value).toBe('www.acme.com');
  });

  it('lists every phone number found on the card and lets the user add or remove one', async () => {
    mockRecognizeCardText.mockResolvedValueOnce({
      frontText: ['Jane Doe', '555-111-2222', '555-333-4444'].join('\n'),
      backText: undefined,
    });

    await renderReviewScreen();

    await waitFor(() => {
      expect(screen.getByTestId('phone-input-0').props.value).toBe('555-111-2222');
    });
    expect(screen.getByTestId('phone-input-1').props.value).toBe('555-333-4444');

    await fireEvent.press(screen.getByTestId('add-phone-button'));
    expect(screen.getByTestId('phone-input-2').props.value).toBe('');

    await fireEvent.press(screen.getByTestId('remove-phone-1'));
    expect(screen.queryByTestId('phone-input-2')).toBeNull();
    expect(screen.getByTestId('phone-input-1').props.value).toBe('');
  });

  it('pre-fills the country code field from the device region, editable by the user', async () => {
    mockDetectDefaultCountryCode.mockReturnValue('+91');
    mockRecognizeCardText.mockResolvedValueOnce({
      frontText: 'Jane Doe',
      backText: undefined,
    });

    await renderReviewScreen();

    await waitFor(() => {
      expect(screen.getByTestId('country-code-input').props.value).toBe('+91');
    });

    await fireEvent.changeText(screen.getByTestId('country-code-input'), '+44');
    expect(screen.getByTestId('country-code-input').props.value).toBe('+44');
  });

  it('prefers a country code already printed on the card over the device default', async () => {
    mockDetectDefaultCountryCode.mockReturnValue('+1');
    mockRecognizeCardText.mockResolvedValueOnce({
      frontText: ['Rishabh Overseas', '+91 7977636041', '+91 9321249424'].join('\n'),
      backText: undefined,
    });

    await renderReviewScreen();

    await waitFor(() => {
      expect(screen.getByTestId('country-code-input').props.value).toBe('+91');
    });
  });

  it('correctly reads the printed code even when OCR drops the space after it', async () => {
    mockDetectDefaultCountryCode.mockReturnValue('+1');
    mockRecognizeCardText.mockResolvedValueOnce({
      frontText: ['Rishabh Overseas', '+917977636041', '+919321249424'].join('\n'),
      backText: undefined,
    });

    await renderReviewScreen();

    await waitFor(() => {
      expect(screen.getByTestId('country-code-input').props.value).toBe('+91');
    });
  });

  it('keeps the device-default country code when the card has none of its own', async () => {
    mockDetectDefaultCountryCode.mockReturnValue('+1');
    mockRecognizeCardText.mockResolvedValueOnce({
      frontText: ['Jane Doe', '9876543210'].join('\n'),
      backText: undefined,
    });

    await renderReviewScreen();

    await waitFor(() => {
      expect(screen.getByTestId('phone-input-0').props.value).toBe('9876543210');
    });
    expect(screen.getByTestId('country-code-input').props.value).toBe('+1');
  });

  it('passes the country code field along when saving', async () => {
    mockDetectDefaultCountryCode.mockReturnValue('+91');
    mockRecognizeCardText.mockResolvedValueOnce({
      frontText: 'Jane Doe',
      backText: undefined,
    });
    mockSaveContactFromForm.mockResolvedValueOnce({ recordID: '1' });
    mockAddScanHistoryEntry.mockResolvedValueOnce([]);

    await renderReviewScreen();

    await waitFor(() => {
      expect(screen.getByTestId('country-code-input').props.value).toBe('+91');
    });

    await fireEvent.press(screen.getByTestId('save-contact-button'));

    await waitFor(() => {
      expect(mockSaveContactFromForm).toHaveBeenCalledWith(
        expect.objectContaining({ countryCode: '+91' }),
        expect.any(String),
      );
    });
  });

  it('lets the user edit a parsed field', async () => {
    mockRecognizeCardText.mockResolvedValueOnce({
      frontText: 'Jane Doe',
      backText: undefined,
    });

    await renderReviewScreen();

    await waitFor(() => {
      expect(screen.getByTestId('name-input').props.value).toBe('Jane Doe');
    });

    await fireEvent.changeText(screen.getByTestId('name-input'), 'Janet Doe');

    expect(screen.getByTestId('name-input').props.value).toBe('Janet Doe');
  });

  it('saves the contact, records scan history, and navigates home on success', async () => {
    mockRecognizeCardText.mockResolvedValueOnce({
      frontText: 'Jane Doe\nAcme Inc.',
      backText: undefined,
    });
    mockSaveContactFromForm.mockResolvedValueOnce({ recordID: '1' });
    mockAddScanHistoryEntry.mockResolvedValueOnce([]);

    const { navigation } = await renderReviewScreen();

    await waitFor(() => {
      expect(screen.getByTestId('name-input').props.value).toBe('Jane Doe');
    });

    await fireEvent.press(screen.getByTestId('save-contact-button'));

    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith('Home');
    });
    expect(mockSaveContactFromForm).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Jane Doe', company: 'Acme Inc.' }),
      'file:///padded-photo.jpg',
    );
    expect(mockAddScanHistoryEntry).toHaveBeenCalledWith({
      name: 'Jane Doe',
      company: 'Acme Inc.',
    });
  });

  it('falls back to the raw photo when padding the card onto a square canvas fails', async () => {
    mockRecognizeCardText.mockResolvedValueOnce({
      frontText: 'Jane Doe',
      backText: undefined,
    });
    mockCapture.mockRejectedValueOnce(new Error('capture failed'));
    mockSaveContactFromForm.mockResolvedValueOnce({ recordID: '1' });
    mockAddScanHistoryEntry.mockResolvedValueOnce([]);

    await renderReviewScreen();

    await waitFor(() => {
      expect(screen.getByTestId('name-input').props.value).toBe('Jane Doe');
    });

    await fireEvent.press(screen.getByTestId('save-contact-button'));

    await waitFor(() => {
      expect(mockSaveContactFromForm).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Jane Doe' }),
        'file://front.jpg',
      );
    });
  });

  it('shows an error and does not navigate when saving the contact fails', async () => {
    mockRecognizeCardText.mockResolvedValueOnce({
      frontText: 'Jane Doe',
      backText: undefined,
    });
    mockSaveContactFromForm.mockRejectedValueOnce(new Error('Contacts permission was denied.'));

    const { navigation } = await renderReviewScreen();

    await waitFor(() => {
      expect(screen.getByTestId('name-input').props.value).toBe('Jane Doe');
    });

    await fireEvent.press(screen.getByTestId('save-contact-button'));

    await waitFor(() => {
      expect(screen.getByTestId('save-error').props.children).toBe(
        'Contacts permission was denied.',
      );
    });
    expect(mockAddScanHistoryEntry).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
