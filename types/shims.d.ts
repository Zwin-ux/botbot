declare module "express" {
  import { IncomingMessage, ServerResponse } from "http";

  export interface Request extends IncomingMessage {
    params: Record<string, string>;
    body?: unknown;
  }

  export interface Response extends ServerResponse {
    json: (body: unknown) => void;
    status: (code: number) => Response;
  }

  export type NextFunction = () => void;
  export type Handler = (req: Request, res: Response, next?: NextFunction) => void;

  export interface Router extends Handler {
    get: (path: string, handler: Handler) => Router;
    post: (path: string, handler: Handler) => Router;
    use: (path: string | Handler | Router, handler?: Handler) => Router;
  }

  export interface Express {
    use: (path: string | Handler | Router, handler?: Handler) => Express;
    get: (path: string, handler: Handler) => Express;
    post: (path: string, handler: Handler) => Express;
    listen: (port: number, callback?: () => void) => void;
  }

  export function Router(options?: { mergeParams?: boolean }): Router;
  const express: {
    (): Express;
    json: () => Handler;
  };
  export default express;
}

declare module "react" {
  export type ReactNode = unknown;
  export type CSSProperties = Record<string, string | number>;
  export interface FC<P = {}> {
    (props: P & { children?: ReactNode }): ReactNode;
  }
  export function useState<T>(initial: T): [T, (value: T) => void];
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  const React: {
    useState: typeof useState;
    useMemo: typeof useMemo;
    useEffect: typeof useEffect;
  };
  export default React;
}

declare module "react-dom" {}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
