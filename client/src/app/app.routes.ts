import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { HomeComponent } from './home/home';
import { RegisterComponent } from './register/register';
import { LoginComponent } from './login/login';
// אם המסכים עדיין לא קיימים – ניצור אותם עוד רגע
import { DashboardComponent } from './features/dashboard/dashboard';
import { Upload } from './features/upload/upload';
import { Invoices } from './features/invoices/invoices';
import { Reports } from './features/reports/reports';
import { Settings } from './features/settings/settings/settings';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    component: MainLayout,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'upload', component: Upload },
      { path: 'invoices', component: Invoices },
      { path: 'reports', component: Reports },
      { path: 'settings', component: Settings },
    ],
  },
];
