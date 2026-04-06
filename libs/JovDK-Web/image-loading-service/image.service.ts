import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type ImageCompletionStatus = 'loaded' | 'error' | 'timeout';

interface TrackedImageInfo
{
    readonly src: string;
}

@Injectable({
    providedIn: 'root',
})
export class ImageLoadingService
{
    private readonly loadingCounter$ = new BehaviorSubject<number>(0);
    private readonly trackedImages = new Map<HTMLElement, TrackedImageInfo>();
    private readonly failedImages = new Set<string>();

    readonly imagesLoading$ = this.loadingCounter$.asObservable();

    imageLoading(img: HTMLElement): void
    {
        if (this.trackedImages.has(img))
        {
            return;
        }

        this.trackedImages.set(img, {
            src: this.resolveImageSource(img),
        });
        this.incrementCounter();
    }

    forceImageLoadingCount = (): void =>
    {
        this.incrementCounter();
    };

    imageLoadedOrError(img: HTMLElement, status: ImageCompletionStatus = 'loaded'): void
    {
        const entry = this.trackedImages.get(img);
        if (!entry)
        {
            return;
        }

        this.trackedImages.delete(img);
        if (status === 'error')
        {
            this.failedImages.add(entry.src);
        }
        this.decrementCounter();
    }

    forceImageLoadingUncount = (): void =>
    {
        this.decrementCounter();
    };

    getDiagnosticsSnapshot(): { errors: string[]; pending: string[] }
    {
        const pending: string[] = [];
        for (const entry of this.trackedImages.values())
        {
            pending.push(entry.src);
        }
        return {
            errors: Array.from(this.failedImages),
            pending,
        };
    }

    resetDiagnostics(): void
    {
        this.failedImages.clear();
    }

    private resolveImageSource(element: HTMLElement): string
    {
        const img = element as HTMLImageElement;
        return img.currentSrc ||
            img.src ||
            img.getAttribute('src') ||
            img.getAttribute('data-src') ||
            '[unresolved image source]';
    }

    private incrementCounter(): void
    {
        this.loadingCounter$.next(this.loadingCounter$.value + 1);
    }

    private decrementCounter(): void
    {
        const nextValue = Math.max(0, this.loadingCounter$.value - 1);
        this.loadingCounter$.next(nextValue);
    }
}
