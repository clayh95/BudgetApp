import { Component, OnInit } from '@angular/core';
import { ITransaction } from './core/dataTypes';
import { AngularFirestore } from 'angularfire2/firestore';
import { Observable } from 'rxjs';
import { DbService } from './core/db.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'fdsf';

  transactions: Observable<ITransaction[]>;
  
  constructor(service: DbService) {
    this.transactions = service.transactionCollection.valueChanges();
  }

  ngOnInit() {
  }

  }


