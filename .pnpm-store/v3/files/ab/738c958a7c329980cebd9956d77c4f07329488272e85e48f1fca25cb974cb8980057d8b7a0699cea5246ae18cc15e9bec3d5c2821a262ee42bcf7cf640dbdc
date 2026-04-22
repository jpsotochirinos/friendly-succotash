/**
 * Type representing a value that can be either a direct value or a function that returns that value.
 */
export type MaybeGetter<T, Args extends unknown[] = []> = T | ((...args: Args) => T);
/**
 * If "value" is a function, then call it and return result.
 * Otherwise it is returned directly.
 * @param value Any value or function that returns a value.
 * @param context Context to bind to function (Optional).
 * @param props Props for function (Optional).
 */
export declare function callOrGet<T, Args extends unknown[] = []>(value: MaybeGetter<T, Args>, context?: unknown, ...props: Args): T;
//# sourceMappingURL=callOrGet.d.ts.map