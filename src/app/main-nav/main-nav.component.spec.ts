import { Subject, of } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';

import { MainNavComponent } from './main-nav.component';
import { DbService } from '../core/db.service';

describe('MainNavComponent', () => {
  function createComponent(service: DbService, observeValue = false, emitEvents = false) {
    const events = new Subject();
    const breakpointObserver = {
      observe: vi.fn(() => ({
        pipe: vi.fn(() => of(observeValue))
      }))
    } as unknown as BreakpointObserver;

    const router = {
      events
    } as unknown as Router;

    const component = new MainNavComponent(breakpointObserver, router, service);
    (component as any).drawer = { close: vi.fn() } as any;
    (component as any).isHandset$ = of(observeValue);

    if (emitEvents) {
      events.next(new NavigationEnd(1, '/a', '/a'));
    }
    return { component, events };
  }

  it('delegates undo to service', () => {
    const service = { undo: vi.fn(), redo: vi.fn() } as unknown as DbService;
    const { component } = createComponent(service, false, false);

    component.undo();

    expect(service.undo).toHaveBeenCalled();
    expect(service.redo).not.toHaveBeenCalled();
  });

  it('delegates redo to service', () => {
    const service = { undo: vi.fn(), redo: vi.fn() } as unknown as DbService;
    const { component } = createComponent(service, false, false);

    component.redo();

    expect(service.redo).toHaveBeenCalled();
    expect(service.undo).not.toHaveBeenCalled();
  });

  it('ignores router navigation events when handset is false', () => {
    const service = { undo: vi.fn(), redo: vi.fn() } as unknown as DbService;
    const { component, events } = createComponent(service, false, true);

    component.drawer = { close: vi.fn() } as any;
    events.next(new NavigationEnd(1, '/a', '/a'));
    expect((component.drawer.close as any)).not.toHaveBeenCalled();
  });
});
