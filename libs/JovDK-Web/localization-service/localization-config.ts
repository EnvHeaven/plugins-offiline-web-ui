import { InjectionToken, Provider } from '@angular/core';

export interface LocalizationLanguageOption
{
    readonly id: string;
    readonly name: string;
    readonly flagIconName?: string;
}

export interface LocalizationTerm
{
    readonly key: string;
    readonly values: Record<string, string>;
}

export interface LocalizationConfig
{
    readonly languages: ReadonlyArray<LocalizationLanguageOption>;
    readonly defaultLanguageId?: string;
    readonly storageKey?: string;
    readonly terms?: ReadonlyArray<LocalizationTerm>;
}

export const LOCALIZATION_CONFIG = new InjectionToken<LocalizationConfig>('LOCALIZATION_CONFIG');

export const provideLocalizationConfig = (config: LocalizationConfig): Provider => ({
    provide: LOCALIZATION_CONFIG,
    useValue: config,
});

