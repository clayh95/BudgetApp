import { Component, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { SharedModule } from '../shared/shared.module';
import { SectionDrawerComponent } from './section-drawer.component';
import { EditorDrawerService } from './editor-drawer.service';
import { CategoryModalComponent } from '../category-modal/category-modal.component';
import { AddTransactionComponent } from '../add-transaction/add-transaction.component';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { ConfirmModalButtons } from '../core/dataTypes';
import { DbService } from '../core/db.service';

/** Drawer entry point for dashboard and maintenance screens. Summary owns its section-local drawer. */
@Component({
  selector: 'app-editor-drawer',
  standalone: true,
  imports: [SharedModule, SectionDrawerComponent, CategoryModalComponent, AddTransactionComponent],
  template: `
    <app-section-drawer
      [opened]="editors.opened"
      [class.is-active]="editors.category || editors.transactions"
      (closed)="editors.clearClosedDraft()"
      [label]="title"
      (closeRequested)="close()"
    >
      <h2 drawer-header>{{ title }}</h2>
      <div drawer-body>
        <app-category-modal
          *ngIf="editors.category"
          [initialData]="editors.category"
          (saved)="editors.finish()"
          (dismiss)="close()"
        ></app-category-modal>
        <app-add-transaction
          *ngIf="editors.transactions"
          [initialData]="editors.transactions"
          (saved)="editors.finish()"
          (dismiss)="close()"
        ></app-add-transaction>
      </div>
    </app-section-drawer>
  `,
  styles: [
    `
      :host {
        position: fixed;
        top: 95px;
        bottom: 24px;
        left: 70px;
        right: 10px;
        z-index: 501;
        pointer-events: none;
      }
      app-section-drawer {
        pointer-events: none;
      }
      app-section-drawer.is-active {
        pointer-events: auto;
      }
      [drawer-body] {
        height: 100%;
        min-height: 0;
      }
      h2 {
        margin: 0;
        font-size: 18px;
      }
      @media (max-width: 700px) {
        :host {
          left: 10px;
          bottom: 44px;
        }
      }
    `,
  ],
})
export class EditorDrawerComponent implements OnDestroy {
  @ViewChild(CategoryModalComponent) categoryEditor?: CategoryModalComponent;
  @ViewChild(AddTransactionComponent) transactionEditor?: AddTransactionComponent;
  private previousMonthGuard: DbService['beforeEditorMonthChange'];
  private closeGuard = () => this.close();
  private monthGuard = async () =>
    (await this.close()) && (!this.previousMonthGuard || (await this.previousMonthGuard()));
  get title() {
    return this.editors.category ? 'Edit category' : 'Edit transaction';
  }
  constructor(
    public editors: EditorDrawerService,
    private dialog: MatDialog,
    private db: DbService,
  ) {
    this.editors.requestClose = this.closeGuard;
    this.previousMonthGuard = db.beforeEditorMonthChange;
    db.beforeEditorMonthChange = this.monthGuard;
  }
  async close(): Promise<boolean> {
    if (!this.editors.opened) {
      return true;
    }
    const editor = this.categoryEditor || this.transactionEditor;
    if (editor?.saving) {
      return false;
    }
    if (editor?.dirty) {
      const ref = this.dialog.open(ConfirmModalComponent, {
        width: '400px',
        maxWidth: '90vw',
        disableClose: true,
        data: {
          title: 'Discard unsaved changes?',
          message: 'Discard your unsaved edits?',
          buttons: [ConfirmModalButtons.yes, ConfirmModalButtons.no],
          matIconName: 'edit_off',
        },
      });
      if (!(await firstValueFrom(ref.afterClosed()))) {
        return false;
      }
    }
    this.editors.finish();
    return true;
  }
  @HostListener('window:beforeunload', ['$event']) guardExit(event: BeforeUnloadEvent) {
    const editor = this.categoryEditor || this.transactionEditor;
    if (editor?.dirty || editor?.saving) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  ngOnDestroy() {
    if (this.db.beforeEditorMonthChange === this.monthGuard) {
      this.db.beforeEditorMonthChange = this.previousMonthGuard;
    }
    if (this.editors.requestClose === this.closeGuard) {
      this.editors.requestClose = async () => true;
    }
    this.editors.finish();
    this.editors.clearClosedDraft();
  }
}
