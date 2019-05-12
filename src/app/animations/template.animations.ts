import { trigger, sequence, state, animate, transition, style } from '@angular/animations';

export const rowsAnimation = 
    trigger('rowsAnimation', [
      transition('* => added', [
        sequence([
          animate("1s ease", style({ background: 'lightgreen' })),
          animate("1s ease", style({ background: 'white' })),
        ])
      ]),
      transition('* => modified', [
        sequence([
          animate("1s ease", style({ background: 'orange' })),
          animate("1s ease", style({ background: 'white' })),
        ])
      ])
    ]);