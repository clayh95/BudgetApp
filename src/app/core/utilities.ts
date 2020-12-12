
const storeLogos: Map<RegExp, string> = new Map([
    [new RegExp('target\.com|target t\-', 'i'), 'assets/images/target-logo.png'],
    [new RegExp('wal-?mart', 'i'), 'assets/images/walmart-logo.png'],
    [new RegExp('chick-?fil-?a', 'i'), 'assets/images/chick-fil-a-logo.png'],
    [new RegExp('tyler tech', 'i'), 'assets/images/tyler-logo.png'],
    [new RegExp('mcdonald\'s', 'i'), 'assets/images/mcdonalds-logo.png'],
    [new RegExp('whataburger', 'i'), 'assets/images/whataburger-logo.png'],
    [new RegExp('campus crusade', 'i'), 'assets/images/cru-logo.png'],
    [new RegExp('grace bible church', 'i'), 'assets/images/grace-logo.png'],
    [new RegExp('amzn\.com|amazon payme|prime video', 'i'), 'assets/images/amazon-a-logo.png']
]);

export function getIcon(description:string):string {
    let ret:string;
    storeLogos.forEach((value: string, key: RegExp) => {
      if (key.test(description)) ret = value;
    });
    return ret;
  }
