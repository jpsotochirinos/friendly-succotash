import * as fs from 'fs/promises';
import * as path from 'path';
import type { CaptchaSolverStrategy } from './captcha-solver.strategy';
import { CaptchaRequiresHumanError } from './captcha-requires-human.error';

export class ManualCaptchaSolver implements CaptchaSolverStrategy {
  readonly name = 'manual';

  constructor(private readonly debugDir: string) {}

  async solve(imageBytes: Buffer): Promise<string> {
    await fs.mkdir(this.debugDir, { recursive: true });
    const filePath = path.join(this.debugDir, `captcha-${Date.now()}.png`);
    await fs.writeFile(filePath, imageBytes);
    throw new CaptchaRequiresHumanError(
      `manual: captcha saved for human entry (worker cannot prompt). Path: ${filePath}`,
      filePath,
    );
  }
}
