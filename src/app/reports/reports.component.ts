import { Component, OnInit, OnDestroy } from '@angular/core';
import { Chart } from 'Chart.js'
import { DbService, tAction } from '../core/db.service';
import { combineLatest, Subscription } from 'rxjs';
import { ICategory, ITransaction } from '../core/dataTypes';
import {default as _rollupMoment, Moment} from 'moment';
const moment = _rollupMoment


export enum colors {
  GRAY = "#C5B7BA",
  LIGHTBLUE = "#99b7e8",
  RED = "#E31437",
  GREEN = "#43C158",
  BLACK = "#000000",
  MAROON = "#800000",
  YELLOW = "#FFFF00",
  OLIVE = "#808000",
  LIME = "#00FF00",
  AQUA = "#00FFFF",
  TEAL = "#008080",
  BLUE = "#0000FF",
  NAVY = "#000080",
  FUCHSIA = "#FF00FF",
  PURPLE = "#800080",
  PALEVIOLETRED = "#DB7093",
  SLATEBLUE = "#473C8B",
  MIDNIGHTBLUE = "#191970",
  LIGHTSKYBLUE1 = "#B0E2FF",
  LIGHTSKYBLUE2 = "#A4D3EE"
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit, OnDestroy {

  constructor(private service: DbService) { }

  catsTrans:Subscription;

  ExpensesChart: Chart;
  IncomeChart: Chart;
  ExpensesConfig: Chart.ChartConfiguration = {};
  IncomeConfig: Chart.ChartConfiguration = {};
  reportCats: ICategory[];
  incomeData: any;
  chartType:string = 'bar';
  ExpensesConfigOptions = {
    scales: {
        xAxes: [{
          ticks: {
            beginAtZero: true
          }
        }],
        yAxes: [{
            ticks: {
                beginAtZero:true
            }
        }]
    },
    responsive: true,
    maintainAspectRatio: false
  }
  
  IncomeConfigOptions = {
    scales: {
        xAxes: [{
          ticks: {
            beginAtZero: true,
          }
        }],
        yAxes: [{
            ticks: {
              beginAtZero:true,
              stepSize:500
            }
        }]
    },
    responsive: true,
    maintainAspectRatio: false
  }

  income:number;
  spent:number;
  totalBudgeted:number;

  ngOnInit() {
    
    //Initialize Charts
    // if (this.ExpensesChart) {this.ExpensesChart.destroy()}
    // this.ExpensesConfig.type = this.chartType;
    // this.ExpensesConfig.options = this.ExpensesConfigOptions
    // this.ExpensesChart = new Chart('canvasExpenses', this.ExpensesConfig)
    // this.ExpensesChart.canvas.parentElement.style.height = '700px'

    // if (this.IncomeChart) {this.IncomeChart.destroy()}
    // this.IncomeConfig.type = this.chartType;
    // this.IncomeConfig.options = this.IncomeConfigOptions
    // if (!this.IncomeChart) {this.IncomeChart = new Chart('canvasIncome', this.IncomeConfig)}
    // this.IncomeChart.canvas.parentElement.style.height = '700px'
    // this.IncomeChart.data.labels = ["Income"]

    // this.catsTrans = combineLatest(this.service.categories, this.service.transactions).subscribe(([cats, trans]) => {

    //       this.ExpensesChart.data.labels = []
    //       this.ExpensesChart.data.datasets = []

    //       this.income = 0;
    //       this.spent = 0

    //       this.reportCats = new Array(...cats)
    //       this.reportCats.map(c => c.spent = 0)
    //       this.reportCats.push({id:'', name:'Uncategorized',budgeted:0, spent:0, keywords:[]})

    //       trans.map(t => {
    //         if (t.category == '') {t.category = 'Uncategorized'}
    //         if (this.reportCats.find(x => x.name == t.category)) {
    //           //Reverse the sign. That way negative charges are added to the total spent, and positive are subtracted
    //           //This accounts for returns, etc. within a category that you might not classify as income
    //           let tmp:number = this.reportCats.find(x => x.name == t.category).spent;
    //           tmp += (-1 * +t.amount);
    //           this.reportCats.find(x => x.name == t.category).spent = +tmp.toFixed(2);
    //         } else {
    //           console.log(`${t.category} not found`)
    //         }

    //         if (t.category.toUpperCase() == 'INCOME') {
    //           let tmp:number = this.income;
    //           tmp += +t.amount;
    //           this.income = +tmp.toFixed(2);
    //         }

    //       });
          
    //       //Pull out the income category
    //       this.incomeData = this.reportCats.find(x => x.name.toUpperCase() == 'INCOME');
    //       this.reportCats.splice(this.reportCats.indexOf(this.incomeData), 1)

    //       this.spent = this.reportCats.map(c => c.spent).reduce((pv, v) => +pv + +v, 0); //Everything remaining is SPENT
    //       this.spent = +this.spent.toFixed(2)

    //       let tmp: number = this.reportCats.map(c => c.budgeted).reduce((pv, v) => +pv + +v, 0);
    //       this.totalBudgeted = +tmp.toFixed(2);

    //       this.ExpensesChart.data.labels = this.reportCats.map(x => [x.name, (x.budgeted-x.spent).toFixed(2)])
    //       this.ExpensesChart.data.datasets.push({
    //         label:'Budgeted', 
    //         data:this.reportCats.map(x => x.budgeted),
    //         backgroundColor: colors.LIGHTBLUE
    //       })
    //       this.ExpensesChart.data.datasets.push({
    //         label:'Spent', 
    //         data:this.reportCats.map(x => x.spent),
    //         backgroundColor: this.reportCats.map(x => this.getBarColor(x.spent, x.budgeted))
    //       })
    //       this.ExpensesChart.config.options.tooltips.callbacks =  {
    //         afterBody: function(data) {
    //           let text = [];
    //           data.map(d => {
    //             trans.filter(t => t.category == d.xLabel[0]).map(t => {
    //               text.push(t.amount + ' ' + t.description)
    //             })
    //           })
    //           return text;
    //         }
    //       }

    //       this.ExpensesChart.update()
          
    //       this.IncomeChart.data.datasets = []
    //       if (this.incomeData) {
    //         this.IncomeChart.data.datasets.push({label: 'Expected', data:[this.incomeData.budgeted], backgroundColor: colors.GRAY})
    //       }
    //       this.IncomeChart.data.datasets.push({label: 'Total Budgeted', data:[this.totalBudgeted],  backgroundColor: colors.LIGHTBLUE})
    //       this.IncomeChart.data.datasets.push({label: 'Actual', data:[this.income],  backgroundColor: this.getBarColor(this.totalBudgeted, this.income)})
    //       this.IncomeChart.data.datasets.push({label: 'Spent', data:[this.spent],  backgroundColor: this.getBarColor(this.spent, this.income)})
    //       this.IncomeChart.config.options.tooltips.callbacks =  {
    //         afterBody: function(data) {
    //           let text = [];
    //           data.map(d => {
    //             if (d.datasetIndex == 1) {
    //               cats.map(c => {
    //                 text.push(c.budgeted + ' ' + c.name)
    //               })
    //             }
    //             else if (d.datasetIndex == 2) {
    //               trans.filter(t => t.category.toUpperCase() == 'INCOME').map(t => {
    //                 text.push(t.amount + ' ' + t.description)
    //               })
    //             }
    //           })
    //           return text;
    //         }
    //       }

    //       this.IncomeChart.update()
    //   }
    // )
  }

  getBarColor(spent, budgeted) {
    // if (spent <= budgeted) {
    //   return colors.GREEN
    // } else {
    //   return colors.RED
    // }
  }

  carryAmounts() {
    // if (confirm("Are you sure?")) {
    //   let tmp:number = 0
    //   this.reportCats.filter(c => (c.budgeted - c.spent) != 0).map(c => {
    //     let m = this.service.monthYear.getValue();
    //     let d = new Date(`${m.split('/')[0]}/01/${m.split('/')[1]}`)
    //     let dPlus = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    //     let t = <ITransaction>{
    //         description: `${c.name} Starting Balance`, 
    //         amount: (c.budgeted-c.spent).toFixed(2), 
    //         category: c.name, 
    //         date: moment(dPlus).format('MM/DD/YYYY'),
    //         notes: "",
    //         status: ""
    //       }
    //     tmp += +t.amount;
    //     this.service.AddOrUpdateTransaction(t, tAction.add);
    //   })
    // }
  }

  ngOnDestroy() {
    // this.ExpensesChart.destroy;
    // this.IncomeChart.destroy;
    // this.catsTrans.unsubscribe();
  }

}
