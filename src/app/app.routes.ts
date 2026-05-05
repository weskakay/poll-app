import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { CreateSurvey } from './components/create-survey/create-survey';
import { PollDetail } from './components/poll-detail/poll-detail';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'create', component: CreateSurvey },
  { path: 'poll/:id', component: PollDetail },
];
