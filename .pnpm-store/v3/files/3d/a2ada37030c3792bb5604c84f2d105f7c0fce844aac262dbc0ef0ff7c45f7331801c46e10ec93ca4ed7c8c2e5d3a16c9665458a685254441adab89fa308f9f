/**
 * Default event map with string keys and any arguments.
 * Using `any[]` is necessary here to allow flexible event argument types
 * while maintaining type safety through generic constraints in EventEmitter.
 */
export type DefaultEventMap = Record<string, any[]>;
/**
 * Event callback function type.
 * Using `any[]` default is necessary for variance and compatibility with event handlers.
 */
export type EventCallback<Args extends any[] = any[]> = (...args: Args) => void;
/**
 * EventEmitter class is used to emit and subscribe to events.
 * @template EventMap - Map of event names to their argument types
 */
export declare class EventEmitter<EventMap extends DefaultEventMap = DefaultEventMap> {
    #private;
    /**
     * Subscribe to the event.
     * @param name Event name.
     * @param fn Callback.
     * @returns {void}
     */
    on<K extends keyof EventMap>(name: K, fn: EventCallback<EventMap[K]>): void;
    /**
     * Emit event.
     * @param name Event name.
     * @param args Arguments to pass to each listener.
     * @returns {void}
     */
    emit<K extends keyof EventMap>(name: K, ...args: EventMap[K]): void;
    /**
     * Remove a specific callback from event
     * or all event subscriptions.
     * @param name Event name.
     * @param fn Callback.
     * @returns {void}
     */
    off<K extends keyof EventMap>(name: K, fn?: EventCallback<EventMap[K]>): void;
    /**
     * Subscribe to an event that will be called only once.
     * @param name Event name.
     * @param fn Callback.
     * @returns {void}
     */
    once<K extends keyof EventMap>(name: K, fn: EventCallback<EventMap[K]>): void;
    /**
     * Remove all registered events and subscriptions.
     */
    removeAllListeners(): void;
}
//# sourceMappingURL=EventEmitter.d.ts.map