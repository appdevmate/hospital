import { Component, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, ToastModule],
  template: `
    <!-- Single global host -->
    <p-toast></p-toast>
    <router-outlet></router-outlet>
  `
})
export class AppComponent implements OnInit {
  private router = inject(Router);

  ngOnInit(): void {
    // Fallback deep-link restore. If, after the Cognito callback, the app
    // lands on '/' but localStorage has a pending `returnUrl`, navigate to it.
    // This catches the right-click → Open in new tab case where the auth
    // guard's UrlTree doesn't take effect.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const target = localStorage.getItem('returnUrl');
        if (!target || !target.startsWith('/') || target.startsWith('//')) return;
        const here = (e.urlAfterRedirects || '/').split('?')[0];
        if (here === target) {
          localStorage.removeItem('returnUrl');
          return;
        }
        if (here === '/' || here === '') {
          localStorage.removeItem('returnUrl');
          this.router.navigateByUrl(target);
        }
      });
  }
}
