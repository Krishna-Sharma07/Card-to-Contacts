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

    expect(result).toEqual({
      frontText: 'Front Text',
      backText: undefined,
      frontLines: [],
      backLines: [],
    });
    expect(mockRecognize).toHaveBeenCalledTimes(1);
    expect(mockRecognize).toHaveBeenCalledWith('front.jpg');
  });

  it('recognizes both front and back images when both are given', async () => {
    mockRecognize.mockImplementation((uri: string) =>
      Promise.resolve({ text: uri === 'front.jpg' ? 'Front Text' : 'Back Text', blocks: [] }),
    );

    const result = await recognizeCardText('front.jpg', 'back.jpg');

    expect(result).toEqual({
      frontText: 'Front Text',
      backText: 'Back Text',
      frontLines: [],
      backLines: [],
    });
    expect(mockRecognize).toHaveBeenCalledTimes(2);
    expect(mockRecognize).toHaveBeenCalledWith('front.jpg');
    expect(mockRecognize).toHaveBeenCalledWith('back.jpg');
  });

  it('flattens each block into lines paired with their printed height', async () => {
    mockRecognize.mockResolvedValueOnce({
      text: 'J-NX\nRishabh Overseas',
      blocks: [
        {
          text: 'J-NX',
          lines: [{ text: 'J-NX', frame: { top: 0, left: 0, width: 60, height: 18 } }],
        },
        {
          text: 'Rishabh Overseas',
          lines: [
            {
              text: 'Rishabh Overseas',
              frame: { top: 100, left: 0, width: 300, height: 40 },
            },
          ],
        },
      ],
    });

    const result = await recognizeCardText('front.jpg');

    expect(result.frontLines).toEqual([
      { text: 'J-NX', height: 18 },
      { text: 'Rishabh Overseas', height: 40 },
    ]);
  });

  it('defaults a missing frame height to 0 rather than throwing', async () => {
    mockRecognize.mockResolvedValueOnce({
      text: 'Some text',
      blocks: [{ text: 'Some text', lines: [{ text: 'Some text' }] }],
    });

    const result = await recognizeCardText('front.jpg');

    expect(result.frontLines).toEqual([{ text: 'Some text', height: 0 }]);
  });

  it('propagates errors from the recognizer', async () => {
    mockRecognize.mockRejectedValueOnce(new Error('recognition failed'));

    await expect(recognizeCardText('front.jpg')).rejects.toThrow('recognition failed');
  });
});
