import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CaptchaSolverStrategy } from './captcha-solver.strategy';

const CAPTCHA_PROMPT = `This is a CAPTCHA image from a Peruvian government website.
Read the characters exactly as shown. Return ONLY the characters, no spaces, no explanation.`;

export class GeminiCaptchaSolver implements CaptchaSolverStrategy {
  readonly name = 'gemini';

  constructor(
    private readonly apiKey: string,
    private readonly modelName: string,
  ) {}

  async solve(imageBytes: Buffer): Promise<string> {
    if (!this.apiKey) {
      throw new Error('gemini: GEMINI_API_KEY is not set');
    }
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: this.modelName });
    const base64 = imageBytes.toString('base64');
    const result = await model.generateContent([
      { text: CAPTCHA_PROMPT },
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64,
        },
      },
    ]);
    const text = result.response.text().trim();
    const cleaned = text.replace(/\s+/g, '');
    if (!cleaned.length) {
      throw new Error('gemini: empty captcha response');
    }
    return cleaned;
  }
}
