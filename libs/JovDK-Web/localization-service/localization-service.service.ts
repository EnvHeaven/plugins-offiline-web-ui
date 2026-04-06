import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import
    {
        LOCALIZATION_CONFIG,
        LocalizationConfig,
        LocalizationLanguageOption,
        LocalizationTerm,
    } from './localization-config';
import { DEFAULT_LOCALIZATION_CONFIG } from './default-localization.config';

type TermsDictionary = Record<string, string>;

const DEFAULT_STORAGE_KEY = 'config-language-preference-id';

@Injectable({
    providedIn: 'root',
})
export class LocalizationService
{
    private readonly platformId = inject(PLATFORM_ID);
    private readonly config: LocalizationConfig =
        inject(LOCALIZATION_CONFIG, { optional: true }) ?? DEFAULT_LOCALIZATION_CONFIG;

    private readonly storageKey = this.config.storageKey ?? DEFAULT_STORAGE_KEY;
    private readonly languages: LocalizationLanguageOption[] =
        (this.config.languages && this.config.languages.length > 0)
            ? [...this.config.languages]
            : [...DEFAULT_LOCALIZATION_CONFIG.languages];
    private readonly languagesById = new Map<string, LocalizationLanguageOption>(
        this.languages.map((language) => [language.id, language]),
    );
    private readonly terms: LocalizationTerm[] =
        (this.config.terms && this.config.terms.length > 0)
            ? [...this.config.terms]
            : [...(DEFAULT_LOCALIZATION_CONFIG.terms ?? [])];

    private readonly currentLanguageSubject = new BehaviorSubject<LocalizationLanguageOption>(
        this.resolveInitialLanguage(),
    );
    readonly currentLanguage$: Observable<LocalizationLanguageOption> = this.currentLanguageSubject.asObservable();

    private readonly dictionarySubject = new BehaviorSubject<TermsDictionary>(
        this.buildDictionary(this.currentLanguageSubject.value.id),
    );
    readonly dictionary$: Observable<TermsDictionary> = this.dictionarySubject.asObservable();

    get availableLanguages(): ReadonlyArray<LocalizationLanguageOption>
    {
        return this.languages;
    }

    get currentLanguage(): LocalizationLanguageOption
    {
        return this.currentLanguageSubject.value;
    }

    get currentDictionary(): TermsDictionary
    {
        return this.dictionarySubject.value;
    }

    translate(termKey: string): string
    {
        return this.dictionarySubject.value[termKey] ?? termKey;
    }

    setLanguage(languageId: string): void
    {
        const targetLanguage = this.languagesById.get(languageId);
        if (!targetLanguage || targetLanguage.id === this.currentLanguageSubject.value.id)
        {
            return;
        }

        this.currentLanguageSubject.next(targetLanguage);
        this.dictionarySubject.next(this.buildDictionary(targetLanguage.id));
        this.writeLanguagePreference(targetLanguage.id);
    }

    private resolveInitialLanguage(): LocalizationLanguageOption
    {
        const cachedLanguageId = this.readLanguagePreference();
        const fallbackLanguageId =
            this.config.defaultLanguageId ??
            this.languages[0]?.id ??
            DEFAULT_LOCALIZATION_CONFIG.defaultLanguageId ??
            DEFAULT_LOCALIZATION_CONFIG.languages[0]?.id;

        if (cachedLanguageId && this.languagesById.has(cachedLanguageId))
        {
            return this.languagesById.get(cachedLanguageId)!;
        }

        if (fallbackLanguageId && this.languagesById.has(fallbackLanguageId))
        {
            return this.languagesById.get(fallbackLanguageId)!;
        }

        return this.languages[0] ?? DEFAULT_LOCALIZATION_CONFIG.languages[0];
    }

    private buildDictionary(languageId: string): TermsDictionary
    {
        const dictionary: TermsDictionary = {};

        this.terms.forEach((term) =>
        {
            const value = term.values[languageId];
            dictionary[term.key] = value ?? this.fallbackValue(term);
        });

        return dictionary;
    }

    private fallbackValue(term: LocalizationTerm): string
    {
        const values = Object.values(term.values);
        return values.length > 0 ? values[0] : '';
    }

    private readLanguagePreference(): string | undefined
    {
        if (!isPlatformBrowser(this.platformId))
        {
            return undefined;
        }

        try
        {
            return window.localStorage.getItem(this.storageKey) ?? undefined;
        } catch
        {
            return undefined;
        }
    }

    private writeLanguagePreference(languageId: string): void
    {
        if (!isPlatformBrowser(this.platformId))
        {
            return;
        }

        try
        {
            window.localStorage.setItem(this.storageKey, languageId);
        } catch
        {
            // ignore persistence failures
        }
    }
}

