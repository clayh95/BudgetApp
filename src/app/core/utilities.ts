
const storeLogos: Map<RegExp, string> = new Map([
    [new RegExp('target\.com|target t\-', 'i'), 'assets/images/target-logo.png'],
    [new RegExp('wal-?mart', 'i'), 'assets/images/walmart-logo.png'],
    [new RegExp('chick-?fil-?a', 'i'), 'assets/images/chick-fil-a-logo.png'],
    [new RegExp('tyler tech', 'i'), 'assets/images/tyler-logo.png'],
    [new RegExp('mcdonald\'s', 'i'), 'assets/images/mcdonalds-logo.png'],
    [new RegExp('whataburger', 'i'), 'assets/images/whataburger-logo.png'],
    [new RegExp('campus crusade', 'i'), 'assets/images/cru-logo.png'],
    [new RegExp('grace bible church', 'i'), 'assets/images/grace-logo.png'],
    [new RegExp('amzn\.com|amazon payme|prime video', 'i'), 'assets/images/amazon-a-logo.png'],
    [new RegExp('costco (whse|gas|com)', 'i'), 'assets/images/costco-c.png'],
    [new RegExp('venmo', 'i'), 'assets/images/venmo-logo.png'],
    [new RegExp('sonic', 'i'), 'assets/images/sonic-logo.png'],
    [new RegExp('chevron', 'i'), 'assets/images/chevron-logo.png'],
    [new RegExp('google', 'i'), 'assets/images/google-logo.png'],
    [new RegExp('h-e-b', 'i'), 'assets/images/heb-logo.png'],
    [new RegExp('aggieland lawn', 'i'), 'assets/images/aggieland-lawn-logo.png'],
    [new RegExp('koppe bridge', 'i'), 'assets/images/koppe-bridge-logo.png']
]);

export function getIcon(description:string):string {
    let ret:string;
    storeLogos.forEach((value: string, key: RegExp) => {
      if (key.test(description)) ret = value;
    });
    return ret;
}

export function getPosNegColor(val1:number, val2:number) {
  if (val1 - val2 < 0) {
    return 'red'
  } else {
    return 'green'
  }
}
