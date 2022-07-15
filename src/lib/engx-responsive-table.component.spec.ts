import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EngxResponsiveTableComponent } from './engx-responsive-table.component';

describe('EngxResponsiveTableComponent', () => {
  let component: EngxResponsiveTableComponent;
  let fixture: ComponentFixture<EngxResponsiveTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EngxResponsiveTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EngxResponsiveTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
