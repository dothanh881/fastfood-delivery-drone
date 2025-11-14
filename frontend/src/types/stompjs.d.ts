declare module '@stomp/stompjs' {
  export interface IMessage {
    body: string;
    headers?: Record<string, string>;
    binaryBody?: ArrayBuffer;
  }

  export class Client {
    constructor(config?: any);
    onConnect?: () => void;
    onStompError?: (frame?: any) => void;
    onWebSocketError?: (event?: any) => void;
    subscribe(destination: string, callback: (message: IMessage) => void): any;
    activate(): void;
    deactivate(): void;
  }
}