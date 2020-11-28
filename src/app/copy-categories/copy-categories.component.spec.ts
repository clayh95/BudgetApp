import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CopyCategoriesComponent } from './copy-categories.component';

describe('CopyCategoriesComponent', () => {
  let component: CopyCategoriesComponent;
  let fixture: ComponentFixture<CopyCategoriesComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CopyCategoriesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CopyCategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
