import { Component, ViewChild, ElementRef  } from '@angular/core';
import { collectionType, ITransaction, ITransactionStatus } from '../core/dataTypes';
import { formatCurrency, getLocaleId } from '@angular/common';
import { DbService } from '../core/db.service';
import { MMYY_FORMAT } from '../month-year-picker/month-year-picker.component';
import {default as _rollupMoment, Moment} from 'moment';
import { BehaviorSubject } from 'rxjs';
const moment = _rollupMoment;

@Component({
  selector: 'app-csv-import',
  templateUrl: './csv-import.component.html',
  styleUrls: ['./csv-import.component.scss']
})
export class CsvImportComponent {

  selectedFile: File = null;
  importSummary = {
    'title':'',
    duplicateTransactions:[],
    duplicateImportAnyway: 0,
    transactionsImported: 0,
    readyTransactions: []
  };
  // showSummary: boolean = false;
  // showFileControls: boolean = true;
  importDups:BehaviorSubject<Boolean> = new BehaviorSubject<Boolean>(false);
  importComplete:boolean = false;

  status:importStatus = importStatus.start;

  @ViewChild('fileUpload')
  myFileInput: ElementRef;
  
  @ViewChild('summary')
  summaryList: ElementRef;

  constructor(private service: DbService) {}

  GetFiles(e) {
    this.status = importStatus.review;
    this.selectedFile = <File>e.target.files[0];  
    this.ProcessFile();
  }

  ProcessFile() {
    let fRdr = new FileReader();
    this.importSummary.readyTransactions = [];
    this.importSummary.duplicateTransactions = [];
    this.importSummary.title = `Selected file: ${this.selectedFile.name}`;

    fRdr.onload = (e) => {
      let res: string = fRdr.result.toString();
      let lines: Array<string> = res.replace(/"/g, "").split('\n');
      lines.map(line => {
        let objs = line.split(',');
        if (objs.length > 1) {
          let t = this.ConvertCSVToTransaction(objs);
          this.checkTransaction(t)
          }
      });
    }
    fRdr.readAsText(this.selectedFile);
  }

  // this.myFileInput.nativeElement.value = "";
  
  async checkTransaction(t:ITransaction) {
    let promiseArray:Array<Promise<any>> = []
    let d = new Date(`${this.service.getMonthYearValue().split('\/')[0]}\/01\/${this.service.getMonthYearValue().split('\/')[1]}`)
    let pks = [this.service.getMonthYearValue().replace(/\//g,''), moment(d).add(-1, 'month').format(MMYY_FORMAT.display.noSlash)]
    pks.forEach(p => promiseArray.push(this.service.checkIfTransactionExists(p, t.description)));
    await Promise.all(promiseArray).then(res => {
      for (let r of res) {
        if (r.docs.length > 0){
          this.importSummary.duplicateTransactions.push(t);
          break;
        }
        if (res.indexOf(r) == res.length - 1) {
          this.importSummary.readyTransactions.push(t);
        }
      }
    });
  }

  //Check current month and previous 2
  //Break if value returned
  //Might should put this in the service

  ConvertCSVToTransaction(stringTransaction: string[]): ITransaction {
    let t = {
        "date" : stringTransaction[0],
        "amount" :  formatCurrency(+stringTransaction[1], getLocaleId('en-US'), '','USD').replace(/,/g,""),
        "description" : stringTransaction[4],
        "category" : this.SetCategoryFromKeywords(stringTransaction[4]),
        "notes" : "",
        "status": ITransactionStatus.posted //WF manual import is only posted
    }
    return <ITransaction>t;
  }

  SetCategoryFromKeywords(tDesc: string): string {
    tDesc = tDesc.toUpperCase();
    let ret = '';
    this.service.categories.getValue().map(c => {
      if (c.keywords) {
        c.keywords.map(k => {
          if (tDesc.indexOf(k.toUpperCase()) >= 0) {
            ret = c.name;
            return ret;
          }
        })
      }
    });
    return ret;
  }

  async ImportSelected(selectedList) {
    await selectedList.map(async t => {
      await this.service.addDocument(t.value, collectionType.transactions);
      this.importSummary.transactionsImported++;
    });
    this.status = importStatus.complete;
  }

  isStart() {
    return this.status == importStatus.start;
  }

  isReview() {
    return this.status == importStatus.review;
  }

  isComplete() {
    return this.status == importStatus.complete;
  }

}

enum importStatus {
  start = 0,
  review = 1,
  complete = 2
}