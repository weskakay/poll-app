import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PollService } from '../../services/poll.service';
import { PollCard } from '../poll-card/poll-card';

/** Landing page that loads polls on init and renders them as cards. */
@Component({
  selector: 'app-home',
  imports: [PollCard, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly pollService = inject(PollService);

  protected readonly polls = this.pollService.polls;
  protected readonly loading = this.pollService.loading;
  protected readonly error = this.pollService.error;

  ngOnInit(): void {
    this.pollService.loadAll();
    this.pollService.subscribe();
  }
}
