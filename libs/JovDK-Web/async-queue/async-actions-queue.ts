export class AsyncActionsQueue
{
    private readonly queue: AsyncAction[] = [];
    private processing = false;

    enqueue(action: () => Promise<void>): void
    {
        this.queue.push({ action });
        void this.tryProcessNext();
    }

    private async tryProcessNext(): Promise<void>
    {
        if (this.processing || this.queue.length === 0)
        {
            return;
        }

        this.processing = true;
        const asyncAction = this.queue.shift();

        if (asyncAction?.action)
        {
            await asyncAction.action();
        }

        this.processing = false;
        void this.tryProcessNext();
    }
}

export interface AsyncAction
{
    action: (() => Promise<void>) | null;
}

