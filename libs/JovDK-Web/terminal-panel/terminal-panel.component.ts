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
  @Input() daemonPort = 42990;
  @Output() exited = new EventEmitter<TerminalExitEvent>();

  @ViewChild('terminalHost', { static: true }) terminalHost!: ElementRef<HTMLDivElement>;

  readonly connected = signal(false);
  readonly ended = signal(false);

  private terminal: Terminal | null = null;
  private fitAddon: FitAddon | null = null;
  private socket: WebSocket | null = null;
  private resizeObserver: ResizeObserver | null = null;

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

    const wsUrl = `ws://127.0.0.1:${this.daemonPort}/api/actions/terminal/${this.runId}`;
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
        if (msg.type === 'output' && msg.data) {
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

    term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'stdin', data }));
      }
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
  }

  private dispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.socket?.close();
    this.socket = null;
    this.terminal?.dispose();
    this.terminal = null;
    this.fitAddon = null;
    this.connected.set(false);
    this.ended.set(false);
  }
}
