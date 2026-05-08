import { Component, computed, effect, HostListener, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { PollService } from './services/poll.service';

const TOAST_DISMISS_MS = 3000;

/** Application shell with global header, route-aware Create CTA and publish-confirmation toast. */
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly pollService = inject(PollService);
  private readonly router = inject(Router);

  /** Current router URL, kept in sync with navigation events. */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** True when the current route is the poll detail view. */
  private readonly onPollDetail = computed(() => this.currentUrl().startsWith('/poll/'));

  /** True when the global Create survey CTA should be shown in the header. */
  protected readonly showCreateCta = this.onPollDetail;

  /** True when the current route uses the light page theme (poll detail). */
  protected readonly lightTheme = this.onPollDetail;

  /** Message shown in the bottom-right toast after a survey is published. */
  protected readonly publishedMessage = this.pollService.publishedMessage;

  constructor() {
    effect((onCleanup) => {
      if (!this.publishedMessage()) return;

      const timerId = setTimeout(() => this.dismissPublishedMessage(), TOAST_DISMISS_MS);
      onCleanup(() => clearTimeout(timerId));
    });
  }

  /** Dismisses the publish-confirmation toast. */
  protected dismissPublishedMessage(): void {
    this.pollService.publishedMessage.set(null);
  }

  /** Closes the toast when the user presses escape. */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.publishedMessage()) {
      this.dismissPublishedMessage();
    }
  }
}
