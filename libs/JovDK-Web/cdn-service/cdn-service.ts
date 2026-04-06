export class CdnService
{
    private isInitialized = false;
    private cdnBaseUrl = '';
    private readonly onInitializedCallbacks: Array<() => void> = [];

    constructor(cdnBaseUrl: string)
    {
        this.setCdnUrl(cdnBaseUrl);
    }

    setOnInitializedCallback(onInitializedCallback: () => void): void
    {
        this.onInitializedCallbacks.push(onInitializedCallback);
    }

    setCdnUrl(cdnBaseUrl: string): void
    {
        this.cdnBaseUrl = normalizeBaseUrl(cdnBaseUrl);
        this.isInitialized = true;
        this.notifyInitialized();
    }

    getContentUrl(contentPath: string): string
    {
        const normalizedPath = normalizeContentPath(contentPath);

        if (!this.cdnBaseUrl)
        {
            return normalizedPath;
        }

        return `${this.cdnBaseUrl}/${normalizedPath}`;
    }

    private notifyInitialized(): void
    {
        if (!this.isInitialized)
        {
            return;
        }

        this.onInitializedCallbacks.forEach((callback) => callback());
    }
}

const normalizeBaseUrl = (cdnUrl: string): string =>
{
    if (!cdnUrl)
    {
        return '';
    }

    return cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl;
};

const normalizeContentPath = (contentPath: string): string =>
{
    if (!contentPath)
    {
        return '';
    }

    return contentPath.startsWith('/') ? contentPath.slice(1) : contentPath;
};

