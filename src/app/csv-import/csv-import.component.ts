import { Component, OnInit } from '@angular/core';
import { ITransaction } from '../core/dataTypes';
import { formatCurrency, getLocaleId } from '@angular/common';
import { DbService } from '../core/db.service';

@Component({
  selector: 'app-csv-import',
  templateUrl: './csv-import.component.html',
  styleUrls: ['./csv-import.component.scss']
})
export class CsvImportComponent {

  selectedFile: File = null;
  service;

  constructor(svc: DbService) { 
    this.service = svc;
  }

  GetFiles(e) {
    this.selectedFile = <File>e.target.files[0];
  }

  ProcessFile() {
    let transList: Array<ITransaction>;
    let fRdr = new FileReader();
    fRdr.onload = (e) => {
      let res: string = fRdr.result;
      let lines: Array<string> = res.replace(/"/g, "").split('\n');
      lines.map(line => {
        let objs = line.split(',');
        let t = this.ConvertCSVToTransaction(objs);
        if (t.description !== undefined) {
          this.service.transactionCollection.add(t);
        }
      });
    }
    fRdr.readAsText(this.selectedFile);
    //the main page is going to pull from the actual transaction data...
    //this should just have its own reference to the mat table and pass in this transaction list
    //or, pass the transaction list to the service
  }

ConvertCSVToTransaction(stringTransaction: string[]): ITransaction {
  let t = {
      "date" : stringTransaction[0],
      "amount" :  formatCurrency(+stringTransaction[1], getLocaleId('en-US'), '','USD'),
      "description" : stringTransaction[4],
      "category" : "",
      "keyword" : "" //Will want to "auto-set" this from the keyword list eventually
  }
  return <ITransaction>t;
}

}
