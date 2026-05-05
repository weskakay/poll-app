import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { CreateSurvey } from './components/create-survey/create-survey';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'create', component: CreateSurvey },
];
