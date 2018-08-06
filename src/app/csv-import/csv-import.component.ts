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
  categories = new Array();

  constructor(svc: DbService) { 
    this.service = svc;
    svc.categoryCollection.ref.get().then(snap => snap.docs.map((d) => this.categories.push(d.data())))
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
        if (objs.length > 1) {
          let t = this.ConvertCSVToTransaction(objs);
          this.service.transactionCollection.add(t);
        }
      });
  }
    fRdr.readAsText(this.selectedFile);
  }

  ConvertCSVToTransaction(stringTransaction: string[]): ITransaction {
    let t = {
        "date" : stringTransaction[0],
        "amount" :  formatCurrency(+stringTransaction[1], getLocaleId('en-US'), '','USD'),
        "description" : stringTransaction[4],
        "category" : this.SetCategoryFromKeywords(stringTransaction[4])
    }
    return <ITransaction>t;
  }

  SetCategoryFromKeywords(tDesc: string): string {
    tDesc = tDesc.toUpperCase();
    let ret = '';
    this.categories.map((c) => {
      let kw = c.keyword;
      if (tDesc.indexOf(kw) >= 0) {
        ret = c.category;
      }
    });
    return ret;
  }

}
