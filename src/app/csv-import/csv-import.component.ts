import { Component, ViewChild, ElementRef, NgZone, ChangeDetectorRef  } from '@angular/core';
import { collectionType, ITransaction, ITransactionStatus } from '../core/dataTypes';
import { DbService } from '../core/db.service';
import { MMYY_FORMAT } from '../month-year-picker/month-year-picker.component';
import {default as _rollupMoment, Moment} from 'moment';
import { BehaviorSubject } from 'rxjs';
import { SharedModule } from '../shared/shared.module';
import { parseMoney } from '../core/utilities';
const moment = _rollupMoment;

@Component({
  selector: 'app-csv-import',
  standalone: true,
  imports: [SharedModule],
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

  constructor(private service: DbService, private zone: NgZone, private cdr: ChangeDetectorRef) {}

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
      this.zone.run(() => {
        let res: string = fRdr.result.toString();
        let lines: Array<string> = res.split('\n');
        lines.map(line => {
          let objs = this.parseCsvLine(line);
          if (objs.length > 1) {
            let t = this.ConvertCSVToTransaction(objs);
            if (t) {
              this.checkTransaction(t)
            }
            }
        });
        this.cdr.markForCheck();
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
      this.zone.run(() => {
        for (let r of res) {
          if (r.docs.length > 0){
            this.importSummary.duplicateTransactions.push(t);
            break;
          }
          if (res.indexOf(r) == res.length - 1) {
            this.importSummary.readyTransactions.push(t);
          }
        }
        this.cdr.detectChanges();
      });
    });
  }

  //Check current month and previous 2
  //Break if value returned
  //Might should put this in the service

  ConvertCSVToTransaction(stringTransaction: string[]): ITransaction | null {
    const format = this.detectCsvFormat(stringTransaction);
    if (!format) {
      return null;
    }

    if (format === 'old') {
      return this.convertOldFormatRow(stringTransaction);
    }

    return this.convertNewFormatRow(stringTransaction);
  }

  detectCsvFormat(stringTransaction: string[]): CsvImportFormat | null {
    if (!this.rowHasDate(stringTransaction[0])) {
      return null;
    }

    if (this.isNewFormatHeader(stringTransaction)) {
      return null;
    }

    if (this.isAmountValue(stringTransaction[2])) {
      return 'new';
    }

    if (this.isAmountValue(stringTransaction[1]) && stringTransaction.length > 4) {
      return 'old';
    }

    return null;
  }

  convertOldFormatRow(stringTransaction: string[]): ITransaction | null {
    const parsedAmount = parseMoney(stringTransaction[1]);
    if (parsedAmount === null) {
      return null;
    }

    const description = this.normalizeDescription(stringTransaction[4]);
    return <ITransaction>{
      "date": stringTransaction[0],
      "amount": parsedAmount,
      "description": description,
      "category": this.SetCategoryFromKeywords(description),
      "notes": "",
      "status": ITransactionStatus.posted
    };
  }

  convertNewFormatRow(stringTransaction: string[]): ITransaction | null {
    const parsedAmount = parseMoney(stringTransaction[2]);
    if (parsedAmount === null) {
      return null;
    }

    const description = this.normalizeDescription(stringTransaction[1]);
    return <ITransaction>{
      "date": stringTransaction[0],
      "amount": parsedAmount,
      "description": description,
      "category": this.SetCategoryFromKeywords(description),
      "notes": "",
      "status": ITransactionStatus.posted
    };
  }

  normalizeDescription(value: string): string {
    return (value || '').trim().replace(/\s+/g, ' ');
  }

  parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let idx = 0; idx < (line || '').length; idx++) {
      const char = line[idx];
      const nextChar = line[idx + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          idx++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        result.push(currentValue);
        currentValue = '';
        continue;
      }

      if (char !== '\r') {
        currentValue += char;
      }
    }

    result.push(currentValue);
    return result;
  }

  private isNewFormatHeader(stringTransaction: string[]): boolean {
    return stringTransaction[0] === 'DATE'
      && stringTransaction[1] === 'DESCRIPTION'
      && stringTransaction[2] === 'AMOUNT'
      && stringTransaction[3] === 'CHECK #'
      && stringTransaction[4] === 'STATUS';
  }

  private rowHasDate(value: string): boolean {
    return /^\d{2}\/\d{2}\/\d{4}$/.test((value || '').trim());
  }

  private isAmountValue(value: string): boolean {
    return /^-?\$?\d{1,3}(,\d{3})*(\.\d{2})?$|^-?\$?\d+(\.\d{2})?$/.test((value || '').trim());
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

type CsvImportFormat = 'old' | 'new';
