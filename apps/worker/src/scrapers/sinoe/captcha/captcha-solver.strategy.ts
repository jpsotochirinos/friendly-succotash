export interface CaptchaSolverStrategy {
  readonly name: string;
  solve(imageBytes: Buffer): Promise<string>;
}
