import { TestBed } from '@angular/core/testing';

import { LocalizationService } from './localization-service.service';

describe('LocalizationServiceService', () =>
{
    let service: LocalizationService;

    beforeEach(() =>
    {
        TestBed.configureTestingModule({});
        service = TestBed.inject(LocalizationService);
    });

    it('should be created', () =>
    {
        expect(service).toBeTruthy();
    });
});
