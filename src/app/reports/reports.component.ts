import { Component, OnInit, OnDestroy, AfterViewInit, AfterContentInit } from '@angular/core';
import { Chart } from 'Chart.js'
import { DbService } from '../core/db.service';
import {  map } from '../../../node_modules/rxjs/operators';
import { combineLatest } from 'rxjs';
import { ICategory } from '../core/dataTypes';
import { MatRadioGroupBase } from '../../../node_modules/@angular/material';

enum colors {
  gray = "#C5B7BA",
  lightBlue = "#99b7e8",
  red = "#E31437",
  green = "#43C158"
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit, OnDestroy {

  constructor(private service: DbService) { }

  ExpensesChart: Chart;
  IncomeChart: Chart;
  ExpensesConfig: Chart.ChartConfiguration = {};
  IncomeConfig: Chart.ChartConfiguration = {};
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
    responsive: true
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
    if (this.ExpensesChart) {this.ExpensesChart.destroy()}
    this.ExpensesConfig.type = this.chartType;
    this.ExpensesConfig.options = this.ExpensesConfigOptions
    this.ExpensesChart = new Chart('canvasExpenses', this.ExpensesConfig)

    if (this.IncomeChart) {this.IncomeChart.destroy()}
    this.IncomeConfig.type = this.chartType;
    this.IncomeConfig.options = this.IncomeConfigOptions
    if (!this.IncomeChart) {this.IncomeChart = new Chart('canvasIncome', this.IncomeConfig)}
    this.IncomeChart.canvas.parentElement.style.height = '676px'
    this.IncomeChart.data.labels = ["Income"]

    combineLatest(this.service.categories, this.service.transactions).subscribe(([cats, trans]) => {

          this.ExpensesChart.data.labels = []
          this.ExpensesChart.data.datasets = []

          this.income = 0;
          this.spent = 0

          let reportCats = new Array(...cats)
          reportCats.map(c => c.spent = 0)
          reportCats.push({id:'', name:'Uncategorized',budgeted:0, spent:0, keywords:[]})

          trans.map(t => {
            if (t.category == '') {t.category = 'Uncategorized'}
            if (reportCats.find(x => x.name == t.category)) {
              //Reverse the sign. That way negative charges are added to the total spent, and positive are subtracted
              //This accounts for returns, etc. within a category that you might not classify as income
              reportCats.find(x => x.name == t.category).spent += (-1 * +t.amount);
            } else {
              console.log(`${t.category} not found`)
            }

            //Here we just add all the posative transactions to the negative oens
            if (+t.amount <= 0) {
              this.spent += Math.abs(+t.amount);
            } else {
              this.income += +t.amount;
            }

          });
          
          //Pull out the income category
          this.incomeData = reportCats.find(x => x.name.toUpperCase() == 'INCOME');
          reportCats.splice(reportCats.indexOf(this.incomeData), 1)
          this.totalBudgeted = reportCats.map(c => c.budgeted).reduce((pv, v) => +pv + +v, 0);

          this.ExpensesChart.data.labels = reportCats.map(x => x.name)
          this.ExpensesChart.data.datasets.push({
            label:'Budgeted', 
            data:reportCats.map(x => x.budgeted),
            backgroundColor: colors.lightBlue
          })
          this.ExpensesChart.data.datasets.push({
            label:'Spent', 
            data:reportCats.map(x => x.spent),
            backgroundColor: reportCats.map(x => this.getBarColor(x.spent, x.budgeted))
          })
          this.ExpensesChart.config.options.tooltips.callbacks =  {
            afterBody: function(data) {
              let text = [];
              data.map(d => {
                trans.filter(t => t.category == d.xLabel).map(t => {
                  text.push(t.amount + ' ' + t.description)
                })
              })
              return text;
            }
          }

          this.ExpensesChart.update()
          
          this.IncomeChart.data.datasets = []
          if (this.incomeData) {
            //I just don't know if we need this?? Maybe when defining the categories...
            this.IncomeChart.data.datasets.push({label: 'Expected', data:[this.incomeData.budgeted], backgroundColor: colors.gray})
          }
          this.IncomeChart.data.datasets.push({label: 'Total Budgeted', data:[this.totalBudgeted],  backgroundColor: colors.lightBlue})
          this.IncomeChart.data.datasets.push({label: 'Actual', data:[this.income],  backgroundColor: this.getBarColor(this.totalBudgeted, this.income)})
          this.IncomeChart.data.datasets.push({label: 'Spent', data:[this.spent],  backgroundColor: this.getBarColor(this.spent, this.income)})
          this.IncomeChart.update()
      }
    )
  }

  getBarColor(spent, budgeted) {
    if (spent <= budgeted) {
      return colors.green
    } else {
      return colors.red
    }
  }

  ngOnDestroy() {
    this.ExpensesChart.destroy
  }

 



}
