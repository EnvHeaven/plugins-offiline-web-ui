import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppVersionPanelComponent } from './app-version-panel.component';

describe('AppVersionPanelComponent', () =>
{
    let component: AppVersionPanelComponent;
    let fixture: ComponentFixture<AppVersionPanelComponent>;

    beforeEach(async () =>
    {
        await TestBed.configureTestingModule({
            imports: [AppVersionPanelComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(AppVersionPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () =>
    {
        expect(component).toBeTruthy();
    });
});
