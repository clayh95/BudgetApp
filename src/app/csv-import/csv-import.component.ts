import { Component, OnInit } from '@angular/core';
import { ITransaction } from '../core/dataTypes';
import { formatCurrency, getLocaleId } from '@angular/common';
import { DbService } from '../core/db.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-csv-import',
  templateUrl: './csv-import.component.html',
  styleUrls: ['./csv-import.component.scss']
})
export class CsvImportComponent {

  selectedFile: File = null;
  importSummary = {'title':'',summaries:[], chargesImported: 0, duplicates: 0};
  showSummary: boolean = false;

  constructor(private service: DbService) {}

  GetFiles(e) {
    this.showSummary = false;
    this.selectedFile = <File>e.target.files[0];    
  }

  ProcessFile() {
    let fRdr = new FileReader();
    this.importSummary.summaries = [];
    this.importSummary.title = `Import results for ${this.selectedFile.name}`;
    this.importSummary.chargesImported = 0;
    this.importSummary.duplicates = 0;

    fRdr.onload = (e) => {
      let res: string = fRdr.result;
      let lines: Array<string> = res.replace(/"/g, "").split('\n');
      lines.map(line => {
        let objs = line.split(',');
        if (objs.length > 1) {
          let t = this.ConvertCSVToTransaction(objs);
          this.service.transactionCollection.ref
            .where('date','==',t.date)
            .where('amount','==',t.amount)
            .where('description','==',t.description).get().then(d => {
              if (d.docs.length > 0){
                this.importSummary.summaries.push({'summary':`${t.date} - ${t.description} - ${t.amount}`});
                this.importSummary.duplicates ++;
                //TODO: (maybe) override capibility?
              }
              else {
                this.service.transactionCollection.add(t);
                this.importSummary.chargesImported ++;
              }
            });
          }
      });
      this.showSummary = true;
      //TODO: Clear file input
    }

    fRdr.readAsText(this.selectedFile);
  }

  ConvertCSVToTransaction(stringTransaction: string[]): ITransaction {
    let t = {
        "date" : stringTransaction[0],
        "amount" :  formatCurrency(+stringTransaction[1], getLocaleId('en-US'), '','USD'),
        "description" : stringTransaction[4],
        "category" : this.SetCategoryFromKeywords(stringTransaction[4]),
        "notes" : ""
    }
    return <ITransaction>t;
  }

  SetCategoryFromKeywords(tDesc: string): string {
    tDesc = tDesc.toUpperCase();
    let ret = '';
    this.service.categories.getValue().map(c => {
      c.keywords.map(k => {
        if (tDesc.indexOf(k.toUpperCase()) >= 0) {
          ret = c.name;
          return ret;
        }
      })
    });
    return ret;
  }

}
