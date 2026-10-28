import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { MatDrawer } from '@angular/material/sidenav';
import { SharedModule } from '../shared/shared.module';

/** A section-local shell. The projected content owns drafts, validation and persistence. */
@Component({
  selector: 'app-section-drawer',
  standalone: true,
  imports: [SharedModule],
  template: ` <mat-drawer-container
    class="section-container"
    [hasBackdrop]="true"
    (backdropClick)="closeRequested.emit()"
  >
    <mat-drawer
      #drawer
      position="end"
      mode="over"
      [opened]="opened"
      [disableClose]="true"
      [style.--drawer-accent]="accent"
      [class.full-width]="fullWidth"
      [attr.aria-label]="label"
      role="dialog"
      [attr.aria-modal]="opened ? true : null"
      (closed)="closed.emit()"
        (keydown.escape)="$event.stopPropagation(); closeRequested.emit()"
    >
      <div class="drawer-layout">
        <header>
          <div class="heading"><ng-content select="[drawer-header]"></ng-content></div>
          <button mat-icon-button aria-label="Close panel" (click)="closeRequested.emit()">
            <mat-icon>close</mat-icon>
          </button>
        </header>
        <div class="drawer-body"><ng-content select="[drawer-body]"></ng-content></div>
        <footer><ng-content select="[drawer-actions]"></ng-content></footer>
      </div>
    </mat-drawer>
    <mat-drawer-content><ng-content></ng-content></mat-drawer-content>
  </mat-drawer-container>`,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 0;
      }
      .section-container,
      mat-drawer-content {
        height: 100%;
        background: transparent;
      }
      mat-drawer {
        width: min(520px, 100%);
        border-left: 3px solid var(--drawer-accent, #3b8d5f);
        border-radius: 0;
      }
      mat-drawer.full-width {
        width: 100%;
      }
      .drawer-layout {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.12);
        flex-shrink: 0;
      }
      .heading {
        min-width: 0;
        flex: 1;
      }
      .drawer-body {
        overflow: auto;
        min-height: 0;
        flex: 1;
        padding: 16px;
        box-sizing: border-box;
      }
      footer {
        flex-shrink: 0;
        padding: 0 16px;
      }
      footer:has(> :not(:empty)) {
        padding: 12px 16px;
        border-top: 1px solid rgba(0, 0, 0, 0.12);
      }
      @media (max-width: 700px) {
        mat-drawer {
          width: 100%;
        }
      }
    `,
  ],
})
export class SectionDrawerComponent {
  @Input() opened = false;
  @Input() fullWidth = false;
  @Input() label = 'Details';
  @Input() accent = '#3b8d5f';
  @Output() closed = new EventEmitter<void>();
  @Output() closeRequested = new EventEmitter<void>();
  @ViewChild('drawer') drawer: MatDrawer;
}
