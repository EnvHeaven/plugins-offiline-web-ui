import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  signal,
} from '@angular/core';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

export interface TerminalExitEvent {
  runId: string;
  exitCode: number;
  status: string;
}

@Component({
  selector: 'jov-terminal-panel',
  standalone: true,
  templateUrl: './terminal-panel.component.html',
  styleUrl: './terminal-panel.component.css',
})
export class TerminalPanelComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input({ required: true }) runId!: string;
  @Output() exited = new EventEmitter<TerminalExitEvent>();

  @ViewChild('terminalHost', { static: true }) terminalHost!: ElementRef<HTMLDivElement>;

  readonly connected = signal(false);
  readonly ended = signal(false);

  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private socket: WebSocket | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private domCleanup: Array<() => void> = [];
  private suppressPasteEventUntil = 0;

  ngAfterViewInit(): void {
    this.initTerminal();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['runId'] && !changes['runId'].firstChange) {
      this.dispose();
      this.initTerminal();
    }
  }

  ngOnDestroy(): void {
    this.dispose();
  }

  private initTerminal(): void {
    const term = new Terminal({
      cursorBlink: true,
      scrollback: 10000,
      fontSize: 12,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', monospace",
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        selectionBackground: '#264f78',
        black: '#0d1117',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#c9d1d9',
        brightBlack: '#484f58',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#f0f6fc',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(this.terminalHost.nativeElement);
    fitAddon.fit();

    this.terminal = term;
    this.fitAddon = fitAddon;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}/api/actions/terminal/${this.runId}`;
    const socket = new WebSocket(wsUrl);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.connected.set(true);
      const dims = fitAddon.proposeDimensions();
      if (dims) {
        socket.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
      }
    });

    socket.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          data?: string;
          exitCode?: number;
          status?: string;
        };
        if ((msg.type === 'prelude' || msg.type === 'output') && msg.data) {
          term.write(msg.data, () => {
            term.scrollToBottom();
          });
        }
        if (msg.type === 'exit') {
          this.ended.set(true);
          term.write(`\r\n\x1b[90m[process exited: ${msg.exitCode ?? -1}]\x1b[0m\r\n`);
          this.exited.emit({
            runId: this.runId,
            exitCode: msg.exitCode ?? -1,
            status: msg.status ?? 'error',
          });
        }
        if (msg.type === 'error') {
          const errText = (msg as { message?: string }).message ?? msg.data ?? 'unknown';
          term.write(`\r\n\x1b[31m[error: ${errText}]\x1b[0m\r\n`);
        }
      } catch { /* ignore */ }
    });

    socket.addEventListener('close', () => {
      this.connected.set(false);
    });

    socket.addEventListener('error', () => {
      this.connected.set(false);
    });

    term.attachCustomKeyEventHandler((event) => this.handleTerminalKey(event));

    term.onData((data) => {
      this.sendTerminalInput(data);
    });

    term.onResize(({ cols, rows }) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    this.resizeObserver = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch { /* ignore */ }
    });
    this.resizeObserver.observe(this.terminalHost.nativeElement);
    this.bindClipboardHandlers();
  }

  private dispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    for (const cleanup of this.domCleanup) {
      cleanup();
    }
    this.domCleanup = [];
    this.socket?.close();
    this.socket = null;
    this.terminal?.dispose();
    this.terminal = null;
    this.fitAddon = null;
    this.connected.set(false);
    this.ended.set(false);
  }

  private bindClipboardHandlers(): void {
    const host = this.terminalHost.nativeElement;

    const onPaste = (event: ClipboardEvent): void => {
      if (Date.now() < this.suppressPasteEventUntil) {
        event.preventDefault();
        return;
      }
      const text = event.clipboardData?.getData('text/plain') ?? '';
      if (!text) return;
      event.preventDefault();
      this.sendPastedText(text);
    };

    const onContextMenu = (event: MouseEvent): void => {
      if (event.shiftKey) return;
      event.preventDefault();
      if (this.hasTerminalSelection()) {
        void this.copySelectionAndClear();
        return;
      }
      void this.pasteFromClipboard();
    };

    host.addEventListener('paste', onPaste);
    host.addEventListener('contextmenu', onContextMenu);
    this.domCleanup.push(
      () => host.removeEventListener('paste', onPaste),
      () => host.removeEventListener('contextmenu', onContextMenu),
    );
  }

  private handleTerminalKey(event: KeyboardEvent): boolean {
    if (this.isCopyShortcut(event)) {
      if (this.hasTerminalSelection()) {
        this.preventTerminalShortcut(event);
        void this.copySelectionAndClear();
        return false;
      }
      if (event.metaKey) {
        this.preventTerminalShortcut(event);
        return false;
      }
      return !event.metaKey;
    }

    if (this.isPasteShortcut(event)) {
      this.preventTerminalShortcut(event);
      this.suppressNextPasteEvent();
      void this.pasteFromClipboard();
      return false;
    }

    if (this.isCtrlBackspace(event)) {
      this.preventTerminalShortcut(event);
      this.sendWordErase();
      return false;
    }

    return true;
  }

  private isCopyShortcut(event: KeyboardEvent): boolean {
    return (event.key.toLowerCase() === 'c') && (event.ctrlKey || event.metaKey) && !event.altKey;
  }

  private isPasteShortcut(event: KeyboardEvent): boolean {
    if (event.key.toLowerCase() !== 'v' || event.altKey) return false;
    return event.metaKey || event.ctrlKey;
  }

  private isCtrlBackspace(event: KeyboardEvent): boolean {
    return event.ctrlKey && !event.altKey && !event.metaKey && (event.key === 'Backspace' || event.code === 'Backspace');
  }

  private preventTerminalShortcut(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private suppressNextPasteEvent(): void {
    this.suppressPasteEventUntil = Date.now() + 1000;
  }

  private hasTerminalSelection(): boolean {
    return this.terminal?.hasSelection() === true;
  }

  private async copySelectionAndClear(): Promise<void> {
    const selection = this.terminal?.getSelection() ?? '';
    if (!selection) return;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard write is unavailable.');
      }
      await navigator.clipboard.writeText(selection);
      this.terminal?.clearSelection();
    } catch (error) {
      console.warn('[envheaven terminal] Clipboard copy failed.', this.describeClipboardError(error));
    }
  }

  private async pasteFromClipboard(): Promise<void> {
    try {
      if (!navigator.clipboard?.readText) {
        throw new Error('Clipboard read is unavailable.');
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        this.sendPastedText(text);
      }
    } catch (error) {
      console.warn('[envheaven terminal] Clipboard paste failed.', this.describeClipboardError(error));
    }
  }

  private sendPastedText(text: string): void {
    this.sendTerminalInput(text);
  }

  private sendWordErase(): void {
    this.sendTerminalInput('\x17');
  }

  private sendTerminalInput(data: string): void {
    if (!data || this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ type: 'stdin', data }));
  }

  private describeClipboardError(error: unknown): string {
    return error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
  }
}
