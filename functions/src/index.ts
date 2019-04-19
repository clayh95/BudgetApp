import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as CryptoJS from 'crypto-js';
import * as dataTypes from '../../src/app/core/dataTypes';
import { formatCurrency, getLocaleId } from '@angular/common';
import moment = require('moment');
import { environment } from './environments/environments.prod';
import * as appEnviroment from '../../src/environments/environment.prod';
import { QueryDocumentSnapshot } from '@google-cloud/firestore';

admin.initializeApp(functions.config().firebase);

const MMYY_FORMAT = {
    parse: {
      dateInput: 'MM/YYYY',
    },
    display: {
      dateInput: 'MM/YYYY',
      monthYearLabel: 'MMM YYYY',
      dateA11yLabel: 'LL',
      monthYearA11yLabel: 'MMMM YYYY',
      noSlash: 'MMYYYY'
    },
  };

export const autoImport = functions.https.onRequest(async (request, response) => {

    //Decrypt credentials
    const fireID = decrypt(request.header("fireID"));
    if (fireID !== appEnviroment.environment.firebase.apiKey)
        return response.send('App not authorized!');

    const encPend:string = request.body["pendingTransactions"];
    const encPost:string = request.body["postedTransactions"];

    const pendIn = JSON.parse(decrypt(encPend));
    const postIn = JSON.parse(decrypt(encPost));

    //Get Latest date
    let currDate:moment.Moment;
    currDate = moment();
    const monthPK:string = currDate.format(MMYY_FORMAT.display.noSlash); 
    const transactionCollection = admin.firestore().collection(`monthsPK/${monthPK}/transactions`);
    const categoryCollection = admin.firestore().collection(`monthsPK/${monthPK}/categories`);
    const cats = await categoryCollection.get().then(qs => {return qs.docs})
    let latestDate:string

    const pendTrans = Object.keys(pendIn).reduce((obj, key, idx) => {
        obj[idx] = ConvertScrapeToTransaction(pendIn[key], dataTypes.ITransactionStatus.pending, cats);
        return obj;
    }, []);

    const postTrans = Object.keys(postIn).reduce((obj, key, idx) => {
        obj[idx] = ConvertScrapeToTransaction(postIn[key], dataTypes.ITransactionStatus.posted, cats);
        return obj;
    }, []);

    await transactionCollection.where("status", "==", "Posted").get().then(querySnapshot => {
        const arr = querySnapshot.docs
        arr.sort((a, b) => {
            return +moment(b.data().date, "MM/DD/YYYY") - +moment(a.data().date, "MM/DD/YYYY")
        })
        latestDate = arr[0].data().date;
    });

    let retVal:String = 'LatestDate: ' + latestDate + '\n';
    retVal += 'monthPK: ' + monthPK + '\n';

    //DELETE all pending transactions currently in the collection
    await transactionCollection
        .where("status", "==", "Pending")
        .get()
        .then(querySnapshot => {
            querySnapshot.forEach(doc => {
                doc.ref.delete().then(() => {
                    retVal += `Deleted doc ${doc.ref.id}\n`;
                }).catch(e => {
                    retVal += e.toString();
                });
            });
        }).then(function() {
            retVal += 'Delete complete\n';
        }).catch(e => {
            retVal += e.toString();
            return retVal;
        }); 


    //ADD all pending transactions from WF
    pendTrans.map(t => {
        transactionCollection.add(t).then(() => {
            retVal += 'Add pending: ' + JSON.stringify(t) + '\n';
        }).catch(e => {
            retVal += e.toString();
            return retVal;
        });
    })

    //Filter Posted list to date greater than greatest collection trans date
    postTrans
        .filter(t => {
            return moment(t.date, "MM/DD/YYYY").isAfter(moment(latestDate, "MM/DD/YYYY"))
        })
        .map(t => {
            transactionCollection.add(t).then(r => {
                retVal += 'Add Posted: ' + JSON.stringify(t) + '\n';
            }).catch(e => {
                retVal += e.toString();
                return retVal;
            });
        });

    return response.send(retVal);

});


//FUNCTIONS
function decrypt(encString) {
    const testBytes = CryptoJS.AES.decrypt(encString, environment.autoImport.key);
    return testBytes.toString(CryptoJS.enc.Utf8);
}

function ConvertScrapeToTransaction(strTrans: Object, status:dataTypes.ITransactionStatus, cats: QueryDocumentSnapshot[]): dataTypes.ITransaction {
    const desc:string = strTrans[2].replace(/\s\s+/g, ' ');
    const t = {
        "date" : moment(strTrans[1], "MM/DD/YYYY").format("MM/DD/YYYY"),
        "amount" : strTrans[4].trim() === "" ? Currency(strTrans[3], "+") : Currency(strTrans[4], "-"),
        "description" : desc,
        "category" : SetCategoryFromKeywords(desc, cats), //Not a great way to do this right now...SetCategoryFromKeywords(strTrans[2]),
        "notes" : "",
        "status": status
    }
    return <dataTypes.ITransaction>t;
}

function SetCategoryFromKeywords(tDesc: string, cats: QueryDocumentSnapshot[]): string {
    const desc = tDesc.toUpperCase();
    let ret = '';
    cats.map(qds => {
        if (qds.data().keywords) {
            qds.data().keywords.map(k => {
                if (desc.indexOf(k.toUpperCase()) >= 0) {
                    ret = qds.data().name;
                    return;
                }
            });
        }
    });
    return ret;
  }

function Currency(val:string, sign:string) {
    const tmp = val.replace(/\$/g,"");
    let nVal = +tmp;
    if (sign === "-")
        nVal = -nVal;
    return formatCurrency(nVal, getLocaleId('en-US'), '','USD').replace(/,/g,"");
}