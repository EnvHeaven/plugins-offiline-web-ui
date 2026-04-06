export interface LoadingCoverOptions {
    backgroundColor?: string;
    spinnerTrackColor?: string;
    spinnerAccentColor?: string;
    navHeight?: string;
    heroMinHeight?: string;
    reserveHeroSpace?: boolean;
    removeDelayMs?: number;
}

const DEFAULT_OPTIONS = {
    backgroundColor: '#050a12',
    spinnerTrackColor: 'rgba(148, 163, 184, 0.25)',
    spinnerAccentColor: 'rgba(255, 138, 76, 0.9)',
    navHeight: '64px',
    heroMinHeight: 'calc(100vh - var(--nav-h, 64px))',
    removeDelayMs: 800,
    reserveHeroSpace: true,
};

type ResolvedOptions = Required<Omit<LoadingCoverOptions, 'reserveHeroSpace'>> & { reserveHeroSpace: boolean };

const STYLE_ELEMENT_ID = 'global-loading-cover-style';
const OVERLAY_ID = 'global-loading-cover';
const RESERVE_ID = 'global-loading-reserve';

class GlobalLoadingCoverController {
    private initialized = false;
    private overlay?: HTMLElement;
    private reserve?: HTMLElement;
    private options: ResolvedOptions = DEFAULT_OPTIONS;

    init(options?: LoadingCoverOptions)
    {
        if (this.initialized)
            return this;

        this.options = { ...DEFAULT_OPTIONS, ...options } as ResolvedOptions;
        const { backgroundColor, spinnerAccentColor, spinnerTrackColor, navHeight, heroMinHeight, reserveHeroSpace } = this.options;

        const styleElement = document.createElement('style');
        styleElement.id = STYLE_ELEMENT_ID;
        styleElement.textContent = `
:root {
    color-scheme: dark light;
    --nav-h: ${navHeight};
    --hero-min-h: ${heroMinHeight};
}
#${OVERLAY_ID} {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: grid;
    place-items: center;
    background: ${backgroundColor};
    color: #e5e7eb;
    font: 500 16px/1.2 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: opacity 200ms ease;
}
#${OVERLAY_ID}.hide-overlay { opacity: 0; pointer-events: none; }
#${OVERLAY_ID}[hidden] { display: none !important; }
#${OVERLAY_ID} .boot-spinner {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 3px solid ${spinnerTrackColor};
    border-top-color: ${spinnerAccentColor};
    animation: app-loading-spin 0.9s linear infinite;
}
#${RESERVE_ID}[data-reserve='hero'] {
    inline-size: 100%;
    min-height: var(--hero-min-h);
    block-size: var(--hero-min-h);
    contain: layout paint size;
    contain-intrinsic-size: auto;
}
@keyframes app-loading-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;

        document.head.prepend(styleElement);

        if (reserveHeroSpace)
        {
            this.reserve = document.createElement('div');
            this.reserve.id = RESERVE_ID;
            this.reserve.dataset['reserve'] = 'hero';
            this.reserve.setAttribute('aria-hidden', 'true');
            document.body.prepend(this.reserve);
        }

        this.overlay = document.createElement('div');
        this.overlay.id = OVERLAY_ID;
        this.overlay.setAttribute('role', 'status');
        this.overlay.setAttribute('aria-live', 'polite');
        this.overlay.setAttribute('aria-busy', 'true');
        this.overlay.innerHTML = `
            <span class="sr-only">Loading content</span>
            <div class="boot-spinner"></div>
        `;
        document.body.prepend(this.overlay);

        this.initialized = true;
        return this;
    }

    show()
    {
        if (!this.overlay)
            return;

        this.overlay.hidden = false;
        this.overlay.classList.remove('hide-overlay');
    }

    hide()
    {
        if (!this.overlay)
            return;

        this.overlay.classList.add('hide-overlay');
        setTimeout(() => {
            if (!this.overlay)
                return;
            this.overlay.hidden = true;
        }, this.options.removeDelayMs);

    }

    hideReserve()
    {
        if (!this.reserve)
            return;

        const reserveEl = this.reserve;
        reserveEl.remove();

        if (this.reserve === reserveEl)
        {
            this.reserve = undefined;
        }
    }
}

export const GlobalLoadingCover = new GlobalLoadingCoverController();
