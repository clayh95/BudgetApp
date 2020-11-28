import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { EditCategoriesComponent } from './edit-categories.component';

describe('EditCategoriesComponent', () => {
  let component: EditCategoriesComponent;
  let fixture: ComponentFixture<EditCategoriesComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EditCategoriesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditCategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
