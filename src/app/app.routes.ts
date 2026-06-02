import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { CreateSurvey } from './components/create-survey/create-survey';
import { EditSurvey } from './components/edit-survey/edit-survey';
import { PollDetail } from './components/poll-detail/poll-detail';
import { NotFound } from './components/not-found/not-found';

/** Top-level route table; the wildcard entry must stay last. */
export const routes: Routes = [
  { path: '', component: Home },
  { path: 'create', component: CreateSurvey },
  { path: 'poll/:id', component: PollDetail },
  { path: 'poll/:id/edit', component: EditSurvey },
  { path: '**', component: NotFound },
];
