import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as CryptoJS from 'crypto-js';
import * as dataTypes from '../../src/app/core/dataTypes';
import { formatCurrency, getLocaleId } from '@angular/common';
import moment = require('moment');
import { environment } from './environments/environments.prod';
import * as appEnviroment from '../../src/environments/environment.prod';
import { QueryDocumentSnapshot } from '@google-cloud/firestore';

//CHANGE THIS!
// var serviceAccount = require("credential json");
// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     databaseURL: "",              
// });
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
        response.send('App not authorized!');

    const encPend:string = request.body["pendingTransactions"];
    const encPost:string = request.body["postedTransactions"];
    const encBalances:string = request.body['balances'];

    const pendIn = JSON.parse(decrypt(encPend));
    const postIn = JSON.parse(decrypt(encPost));
    const balancesIn = JSON.parse(decrypt(encBalances));

    //Get Latest date
    let currDate:moment.Moment;
    currDate = moment();
    const monthPK:string = currDate.format(MMYY_FORMAT.display.noSlash); 
    const previousMonthPK:string = currDate.add(-1, "month").format(MMYY_FORMAT.display.noSlash); 
    const transactionCollection = admin.firestore().collection(`monthsPK/${monthPK}/transactions`);
    const categoryCollection = admin.firestore().collection(`monthsPK/${monthPK}/categories`);
    const previousMonthTransactionCollection = admin.firestore().collection(`monthsPK/${previousMonthPK}/transactions`);
    const cats = await categoryCollection.get().then(qs => {return qs.docs}); //Sort of assuming these will be acceptable for both months
    const additionalDataCollection = admin.firestore().collection('additionalData');
    let latestDate:string
    let previousMonthLatestDate:string

    const pendTrans = Object.keys(pendIn).reduce((obj, key, idx) => {
        obj[idx] = ConvertScrapeToTransaction(pendIn[key], dataTypes.ITransactionStatus.pending, cats);
        return obj;
    }, []);

    const postTrans = Object.keys(postIn).reduce((obj, key, idx) => {
        obj[idx] = ConvertScrapeToTransaction(postIn[key], dataTypes.ITransactionStatus.posted, cats);
        return obj;
    }, []);

    latestDate = await getLatestDate(transactionCollection);
    previousMonthLatestDate = await getLatestDate(previousMonthTransactionCollection);

    // This means there are no posted transactions in the current month,
    // so we use the last day of the previous month
    if (latestDate === null) latestDate = moment().add(-1, "month").endOf('month').format("MM/DD/YYYY");

    let retVal:String = `latestDate: ${latestDate}\n`;
    retVal += `currDate: ${currDate.format('MM/DD/YYYY')}\n`
    retVal += `monthPK: ${monthPK}\n`;
    retVal += `previousMonthLatestDate: ${previousMonthLatestDate}\n`;
    retVal += `previousMonthPK: ${previousMonthPK}\n`;

    // Delete all pending transactions for curr and previous months
    retVal = await deletePendingTransactions(transactionCollection, retVal);
    retVal = await deletePendingTransactions(previousMonthTransactionCollection, retVal);

    // Add all pending transactions to the current month from WF.
    // Anything pending will be for the current month
    pendTrans.map(t => {
        transactionCollection.add(t).then(() => {
            retVal +=  `Add Pending: ${JSON.stringify(t)} to ${monthPK}\n`;
        }).catch(e => {
            retVal += e.toString();
            return retVal;
        });
    });

    // Add WF transactions greater than Firebase latest date
    postTrans
        .filter(t => {
            return moment(t.date, "MM/DD/YYYY").isAfter(moment(latestDate, "MM/DD/YYYY"))
        })
        .map(t => {
            transactionCollection.add(t).then(r => {
                retVal += `Add Posted: ${JSON.stringify(t)} to ${monthPK}\n`;
            }).catch(e => {
                retVal += e.toString();
                return retVal;
            });
        });


    // Add WF transactions greater than previous month's Firebase latest date, but less than current month
    postTrans
        .filter(t => {
            return moment(t.date, "MM/DD/YYYY").isAfter(moment(previousMonthLatestDate, "MM/DD/YYYY"))
                    && moment(t.date, "MM/DD/YYYY").isBefore(moment().startOf('month'));
        })
        .map(t => {
            previousMonthTransactionCollection.add(t).then(r => {
                retVal += `Add Posted: ${JSON.stringify(t)} to ${previousMonthPK}\n`;
            }).catch(e => {
                retVal += e.toString();
                return retVal;
            });
        });

    additionalDataCollection
        .doc('balances')
        .set(balancesIn)
        .catch(e => {
            retVal += e.toString();
            return retVal;
        });

    response.send(retVal);
});


async function deletePendingTransactions(transactionCollection: FirebaseFirestore.CollectionReference, retVal: String) {
    let ret = retVal;
    await transactionCollection
        .where("status", "==", "Pending")
        .get()
        .then(querySnapshot => {
            querySnapshot.forEach(doc => {
                doc.ref.delete().then(() => {
                    ret += `Deleted doc ${doc.ref.id}\n`;
                }).catch(e => {
                    ret += e.toString();
                });
            });
        }).then(function () {
            ret += 'Delete complete\n';
        }).catch(e => {
            ret += e.toString();
            return ret;
        });
    return ret;
}

async function getLatestDate(transactionCollection: FirebaseFirestore.CollectionReference) {
    let ret:string = null;
    await transactionCollection.where("status", "==", "Posted").get().then(querySnapshot => {
        if (querySnapshot.docs.length > 0) {
            const arr = querySnapshot.docs;
            arr.sort((a, b) => {
                return +moment(b.data().date, "MM/DD/YYYY") - +moment(a.data().date, "MM/DD/YYYY");
            });
            ret = arr[0].data().date;
        }
    });
    return ret;
}

//FUNCTIONS
function decrypt(encString:string) {
    const testBytes = CryptoJS.AES.decrypt(encString, environment.autoImport.key);
    return testBytes.toString(CryptoJS.enc.Utf8);
}

function ConvertScrapeToTransaction(strTrans: Object, status:dataTypes.ITransactionStatus, cats: QueryDocumentSnapshot[]): dataTypes.ITransaction {
    const desc:string = strTrans[2].replace(/\s\s+/g, ' ');
    const category:string = status === dataTypes.ITransactionStatus.pending ? '' : SetCategoryFromKeywords(desc, cats);
    const t = {
        "date" : moment(strTrans[1], "MM/DD/YYYY").format("MM/DD/YYYY"),
        "amount" : strTrans[4].trim() === "" ? Currency(strTrans[3], "+") : Currency(strTrans[4], "-"),
        "description" : desc,
        "category" : category,
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
            qds.data().keywords.map((k: string) => {
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
    const tmp = val.replace(/\$/g,"").replace(/,/g,"");
    let nVal = +tmp;
    if (sign === "-")
        nVal = -nVal;
    return formatCurrency(nVal, getLocaleId('en-US'), '','USD').replace(/,/g,"");
}