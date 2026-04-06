import { InjectionToken, Provider } from '@angular/core';

export interface AppEnvironmentInfo
{
    readonly appVersion: string;
    readonly environmentName: string;
    readonly cdnUrl?: string;
    readonly apiUrl?: string;
    readonly isProduction?: boolean;
    readonly isLocal?: boolean;
}

export const APP_ENVIRONMENT_INFO = new InjectionToken<AppEnvironmentInfo>('APP_ENVIRONMENT_INFO');

export const provideAppEnvironmentInfo = (info: AppEnvironmentInfo): Provider => ({
    provide: APP_ENVIRONMENT_INFO,
    useValue: info,
});

