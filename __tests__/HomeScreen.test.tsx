import React from 'react';
import { PermissionsAndroid } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { ImagePickerResponse } from 'react-native-image-picker';
import HomeScreen from '../src/screens/HomeScreen';

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

const mockLaunchCamera = launchCamera as jest.Mock;
const mockLaunchImageLibrary = launchImageLibrary as jest.Mock;

async function renderHomeScreen() {
  const navigation = { navigate: jest.fn() } as any;
  const route = { key: 'Home', name: 'Home' as const, params: undefined };
  await render(<HomeScreen navigation={navigation} route={route} />);
  return { navigation };
}

describe('HomeScreen', () => {
  beforeEach(() => {
    mockLaunchCamera.mockReset();
    mockLaunchImageLibrary.mockReset();
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
  });

  it('does not navigate to Review until a front photo is captured', async () => {
    const { navigation } = await renderHomeScreen();

    await fireEvent.press(screen.getByTestId('save-button'));

    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('navigates to Review with the captured photo once a front photo is taken', async () => {
    mockLaunchCamera.mockImplementation(
      (_options: unknown, callback: (response: ImagePickerResponse) => void) => {
        callback({ assets: [{ uri: 'file://front.jpg' }] });
      },
    );

    const { navigation } = await renderHomeScreen();

    await fireEvent.press(screen.getByTestId('front-take-photo'));
    await fireEvent.press(screen.getByTestId('save-button'));

    expect(navigation.navigate).toHaveBeenCalledWith('Review', {
      frontUri: 'file://front.jpg',
      backUri: undefined,
    });
  });

  it('includes the back photo when one was captured', async () => {
    mockLaunchCamera.mockImplementation(
      (_options: unknown, callback: (response: ImagePickerResponse) => void) => {
        callback({ assets: [{ uri: 'file://front.jpg' }] });
      },
    );
    mockLaunchImageLibrary.mockImplementation(
      (_options: unknown, callback: (response: ImagePickerResponse) => void) => {
        callback({ assets: [{ uri: 'file://back.jpg' }] });
      },
    );

    const { navigation } = await renderHomeScreen();

    await fireEvent.press(screen.getByTestId('front-take-photo'));
    await fireEvent.press(screen.getByTestId('back-choose-from-gallery'));
    await fireEvent.press(screen.getByTestId('save-button'));

    expect(navigation.navigate).toHaveBeenCalledWith('Review', {
      frontUri: 'file://front.jpg',
      backUri: 'file://back.jpg',
    });
  });

  it('ignores a cancelled image picker response', async () => {
    mockLaunchImageLibrary.mockImplementation(
      (_options: unknown, callback: (response: ImagePickerResponse) => void) => {
        callback({ didCancel: true });
      },
    );

    const { navigation } = await renderHomeScreen();

    await fireEvent.press(screen.getByTestId('front-choose-from-gallery'));
    await fireEvent.press(screen.getByTestId('save-button'));

    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('navigates to History when the view history button is pressed', async () => {
    const { navigation } = await renderHomeScreen();

    await fireEvent.press(screen.getByTestId('view-history-button'));

    expect(navigation.navigate).toHaveBeenCalledWith('History');
  });
});
