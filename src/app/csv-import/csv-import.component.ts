import { Component, ViewChild, ElementRef  } from '@angular/core';
import { ITransaction } from '../core/dataTypes';
import { formatCurrency, getLocaleId } from '@angular/common';
import { DbService } from '../core/db.service';
import { map } from 'rxjs/operators';
import { MMYY_FORMAT } from '../month-year-picker/month-year-picker.component';
import {default as _rollupMoment, Moment} from 'moment';
const moment = _rollupMoment

@Component({
  selector: 'app-csv-import',
  templateUrl: './csv-import.component.html',
  styleUrls: ['./csv-import.component.scss']
})
export class CsvImportComponent {

  selectedFile: File = null;
  importSummary = {'title':'',summaries:[], chargesImported: 0, duplicates: 0};
  showSummary: boolean = false;

  @ViewChild('fileUpload')
  myFileInput: ElementRef;
  
  @ViewChild('notImported')
  notImportedList: ElementRef;

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
      let res: string = fRdr.result.toString();
      let lines: Array<string> = res.replace(/"/g, "").split('\n');
      lines.map(line => {
        let objs = line.split(',');
        if (objs.length > 1) {
          let t = this.ConvertCSVToTransaction(objs);

           this.checkTransaction(t)
          }
      });
      this.showSummary = true;
      this.selectedFile = null;
      this.myFileInput.nativeElement.value = "";
  }

    fRdr.readAsText(this.selectedFile);
  }

  async checkTransaction(t) {
    let transactionsToAdd = [];
    let promiseArray:Array<Promise<any>> = []
    let d = new Date(`${this.service.monthYear.getValue().split('\/')[0]}\/01\/${this.service.monthYear.getValue().split('\/')[1]}`)
    let pks = [this.service.monthYear.getValue().replace(/\//g,''), moment(d).add(-1, 'month').format(MMYY_FORMAT.display.noSlash)]
    pks.forEach(p => promiseArray.push(this.service.CheckIfTransactionExists(p, t.description)));
    await Promise.all(promiseArray).then(res => {
      let b = false;
      for (let r of res) {
        if (r.docs.length > 0){
          this.importSummary.summaries.push(t);
          this.importSummary.duplicates ++;
          b = true;
          break;
        }
        if (res.indexOf(r) == res.length - 1) {
          transactionsToAdd.push(t);
        }
      }
    })

    transactionsToAdd.forEach(t => {
      this.service.transactionCollection.add(t);
      this.importSummary.chargesImported ++;
    })
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
        "notes" : ""
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


  ImportSelectedAnyway(selectedList) {
    selectedList.map(t => {
      this.service.transactionCollection.add(t.value).then(() => {
        this.importSummary.chargesImported ++;
        this.importSummary.duplicates --;
        this.importSummary.summaries.splice(this.importSummary.summaries.indexOf(t), 1)
        // t.selected = false;
      });
    });
  }

}
