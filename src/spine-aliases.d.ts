declare module "spine-player-42" {
  export class SpinePlayer {
    constructor(parent: HTMLElement | string, config: Record<string, unknown>);
    dispose(): void;
    play(): void;
    pause(): void;
    setAnimation(animation: string, loop?: boolean): unknown;
    paused: boolean;
    speed: number;
    skeleton: unknown;
    animationState: unknown;
    canvas: HTMLCanvasElement | null;
    bg: { setFromString(hex: string): void };
  }
}

declare module "spine-player-41" {
  export class SpinePlayer {
    constructor(parent: HTMLElement | string, config: Record<string, unknown>);
    dispose(): void;
    play(): void;
    pause(): void;
    setAnimation(animation: string, loop?: boolean): unknown;
    paused: boolean;
    speed: number;
    skeleton: unknown;
    animationState: unknown;
    canvas: HTMLCanvasElement | null;
    bg: { setFromString(hex: string): void };
  }
}

declare module "spine-player-40" {
  export class SpinePlayer {
    constructor(parent: HTMLElement | string, config: Record<string, unknown>);
    dispose(): void;
    play(): void;
    pause(): void;
    setAnimation(animation: string, loop?: boolean): unknown;
    paused: boolean;
    speed: number;
    skeleton: unknown;
    animationState: unknown;
    canvas: HTMLCanvasElement | null;
    bg: { setFromString(hex: string): void };
  }
}
