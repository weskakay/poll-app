import { Component, inject, OnInit } from '@angular/core';
import { PollService } from '../../services/poll.service';
import { PollCard } from '../poll-card/poll-card';

@Component({
  selector: 'app-home',
  imports: [PollCard],
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
  }
}
