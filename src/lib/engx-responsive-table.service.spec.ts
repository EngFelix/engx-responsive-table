import { TestBed } from '@angular/core/testing';

import { EngxResponsiveTableService } from './engx-responsive-table.service';

describe('EngxResponsiveTableService', () => {
  let service: EngxResponsiveTableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EngxResponsiveTableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
