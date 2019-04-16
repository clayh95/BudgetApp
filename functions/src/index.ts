import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as CryptoJS from 'crypto-js';
import * as dataTypes from '../../src/app/core/dataTypes';
import { formatCurrency, getLocaleId } from '@angular/common';
import moment = require('moment');
import { MMYY_FORMAT } from '../../src/app/month-year-picker/month-year-picker.component';
import { environment } from './environments/environments.prod';
import * as appEnviroment from '../../src/environments/environment.prod';

admin.initializeApp(functions.config().firebase);

export const autoImport = functions.https.onRequest(async (request, response) => {

    //Decrypt credentials
    const fireID = decrypt(request.header("fireID"));
    if (fireID !== appEnviroment.environment.firebase.apiKey)
        return response.send('App not authorized!');

    let encPend:string = request.body["pendingTransactions"];
    let encPost:string = request.body["postedTransactions"];

    let pendIn = JSON.parse(decrypt(encPend));
    let postIn = JSON.parse(decrypt(encPost));

    let pendTrans = Object.keys(pendIn).reduce((obj, key, idx) => {
        obj[idx] = ConvertScrapeToTransaction(pendIn[key], dataTypes.ITransactionStatus.pending);
        return obj;
    }, []);

    let postTrans = Object.keys(postIn).reduce((obj, key, idx) => {
        obj[idx] = ConvertScrapeToTransaction(postIn[key], dataTypes.ITransactionStatus.posted);
        return obj;
    }, []);

    //Get Latest date
    let currDate:moment.Moment;
    currDate = moment();
    let monthPK:string = currDate.format(MMYY_FORMAT.display.noSlash); 
    const transactionCollection = admin.firestore().collection(`monthsPK/${monthPK}/transactions`);
    let latestDate:string
    await transactionCollection.where("status", "==", "Posted").get().then(querySnapshot => {
        let arr = querySnapshot.docs
        arr.sort((a, b) => {
            return +moment(a.data().date) - +moment(b.data().date)
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
                });
            });
        }).then(function() {
            retVal += 'Delete complete\n';
        }).catch(e => {
            retVal += e.toString();
        }); 


    //ADD all pending transactions from WF
    pendTrans.map(t => {
        transactionCollection.add(t).then(() => {
            retVal += 'Add pending: ' + JSON.stringify(t) + '\n';
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
            });
        });

    return response.send(retVal);

});


//FUNCTIONS
function decrypt(encString) {
    const testBytes = CryptoJS.AES.decrypt(encString, environment.autoImport.key);
    return testBytes.toString(CryptoJS.enc.Utf8);
}

function ConvertScrapeToTransaction(strTrans: Object, status:dataTypes.ITransactionStatus): dataTypes.ITransaction {
    const t = {
        "date" : moment(strTrans[1], "MM/DD/YYYY").format("MM/DD/YYYY"),
        "amount" : strTrans[4].trim() === "" ? Currency(strTrans[3], "+") : Currency(strTrans[4], "-"),
        "description" : strTrans[2].replace(/\s\s+/g, ' '),
        "category" : "", //Not a great way to do this right now...SetCategoryFromKeywords(strTrans[2]),
        "notes" : "",
        "status": status
    }
    return <dataTypes.ITransaction>t;
}

function Currency(val:string, sign:string) {
    val = val.replace(/\$/g,"");
    let nVal = +val;
    if (sign === "-")
        nVal = -nVal;
    return formatCurrency(nVal, getLocaleId('en-US'), '','USD').replace(/,/g,"");
}