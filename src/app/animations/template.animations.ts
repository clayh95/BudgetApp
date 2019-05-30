import { trigger, sequence, state, animate, transition, style } from '@angular/animations';

export const rowsColor = 
    trigger('rowsColor', [
      transition('* => added', [
        sequence([
          style({'border-left':'2px solid lightgreen'}),
          animate(".35s ease-out", style({ transform: 'translateX(3px)' })),
          animate(".25s ease-in", style({ transform: 'translateX(0px)' })),
          style({'border-left':'none'})
        ])
      ]),
      transition('* => modified', [
        sequence([
          style({'border-left':'2px solid orange'}),
          animate(".35s ease-out", style({ transform: 'translateX(3px)' })),
          animate(".25s ease-in", style({ transform: 'translateX(0px)' })),
          style({'border-left':'none'})
        ])
      ])
    ]);

export const rowsEnterLeave = 
    trigger('rowsEnterLeave', [
      transition(':enter', [
          style({ opacity: 0 }),
          animate('.7s ease-out', style({ opacity: 1 }))
      ])
    ]);