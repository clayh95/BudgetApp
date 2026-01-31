import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../shared/shared.module';

@Component({
  selector: 'app-base-page',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './base-page.component.html',
  styleUrls: ['./base-page.component.scss']
})
export class BasePageComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
