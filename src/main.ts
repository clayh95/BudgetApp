import { enableProdMode, importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AppComponent } from './app/app.component';
import { routes } from './app/app-routing.module';
import { environment } from './environments/environment';


if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(),
    provideRouter(routes),
    importProvidersFrom(
      AngularFireModule.initializeApp(environment.firebase),
      AngularFireAuthModule,
      AngularFirestoreModule,
      ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })
    )
  ]
}).catch(err => console.error(err));
