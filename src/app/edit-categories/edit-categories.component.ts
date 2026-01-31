import { Component, OnInit } from '@angular/core';
import { CategoryTableComponent } from '../category-table/category-table.component';
import { SharedModule } from '../shared/shared.module';

@Component({
  selector: 'app-edit-categories',
  standalone: true,
  imports: [SharedModule, CategoryTableComponent],
  templateUrl: './edit-categories.component.html',
  styleUrls: ['./edit-categories.component.scss']
})
export class EditCategoriesComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
