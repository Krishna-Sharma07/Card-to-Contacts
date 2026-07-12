import { recognizeCardText } from '../src/services/ocr';
import TextRecognition from '@react-native-ml-kit/text-recognition';

jest.mock('@react-native-ml-kit/text-recognition', () => ({
  __esModule: true,
  default: {
    recognize: jest.fn(),
  },
}));

const mockRecognize = TextRecognition.recognize as jest.Mock;

describe('recognizeCardText', () => {
  beforeEach(() => {
    mockRecognize.mockReset();
  });

  it('recognizes the front image only when no back image is given', async () => {
    mockRecognize.mockResolvedValueOnce({ text: 'Front Text', blocks: [] });

    const result = await recognizeCardText('front.jpg');

    expect(result).toEqual({ frontText: 'Front Text', backText: undefined });
    expect(mockRecognize).toHaveBeenCalledTimes(1);
    expect(mockRecognize).toHaveBeenCalledWith('front.jpg');
  });

  it('recognizes both front and back images when both are given', async () => {
    mockRecognize.mockImplementation((uri: string) =>
      Promise.resolve({ text: uri === 'front.jpg' ? 'Front Text' : 'Back Text', blocks: [] }),
    );

    const result = await recognizeCardText('front.jpg', 'back.jpg');

    expect(result).toEqual({ frontText: 'Front Text', backText: 'Back Text' });
    expect(mockRecognize).toHaveBeenCalledTimes(2);
    expect(mockRecognize).toHaveBeenCalledWith('front.jpg');
    expect(mockRecognize).toHaveBeenCalledWith('back.jpg');
  });

  it('propagates errors from the recognizer', async () => {
    mockRecognize.mockRejectedValueOnce(new Error('recognition failed'));

    await expect(recognizeCardText('front.jpg')).rejects.toThrow('recognition failed');
  });
});
