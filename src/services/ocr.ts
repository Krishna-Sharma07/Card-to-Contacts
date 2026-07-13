import TextRecognition from '@react-native-ml-kit/text-recognition';
import type { TextRecognitionResult } from '@react-native-ml-kit/text-recognition';
import type { OcrLine } from './parseCardFields';

export type CardOcrResult = {
  frontText: string;
  backText?: string;
  frontLines: OcrLine[];
  backLines: OcrLine[];
};

function extractLines(result: TextRecognitionResult): OcrLine[] {
  return result.blocks.flatMap(block =>
    block.lines.map(line => ({ text: line.text, height: line.frame?.height ?? 0 })),
  );
}

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
    frontLines: extractLines(front),
    backLines: back ? extractLines(back) : [],
  };
}
