import { Routes } from '@angular/router';
import { AccessDenied } from './accessdenied';
import { Error } from './error';
import { Login } from './login';
import { ForgotPassword } from './forgotpassword';
import { Register } from './register';
import { NewPassword } from './newpassword';
import { Verification } from './verification';
import { LockScreenComponent } from './lockscreen';

export default [
    { path: 'error', component: Error },
    { path: 'access', component: AccessDenied },
    { path: 'login', component: Login },
    { path: 'forgotpassword', component: ForgotPassword },
    { path: 'register', component: Register },
    { path: 'newpassword', component: NewPassword },
    { path: 'verification', component: Verification },
    { path: 'lockscreen', component: LockScreenComponent },
    { path: '**', redirectTo: '/notfound' }
] as Routes;
