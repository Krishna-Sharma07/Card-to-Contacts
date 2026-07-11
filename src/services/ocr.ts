import TextRecognition from '@react-native-ml-kit/text-recognition';

export type CardOcrResult = {
  frontText: string;
  backText?: string;
};

export async function recognizeCardText(
  frontUri: string,
  backUri?: string,
): Promise<CardOcrResult> {
  const [front, back] = await Promise.all([
    TextRecognition.recognize(frontUri),
    backUri ? TextRecognition.recognize(backUri) : Promise.resolve(undefined),
  ]);

  return {
    frontText: front.text,
    backText: back?.text,
  };
}
