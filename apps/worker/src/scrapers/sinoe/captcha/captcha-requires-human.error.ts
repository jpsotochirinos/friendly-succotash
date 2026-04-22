export class CaptchaRequiresHumanError extends Error {
  constructor(
    message: string,
    readonly debugPath?: string,
  ) {
    super(message);
    this.name = 'CaptchaRequiresHumanError';
  }
}
