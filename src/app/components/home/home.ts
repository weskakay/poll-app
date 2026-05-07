import { Component, computed, ElementRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PollService } from '../../services/poll.service';
import { PollCard } from '../poll-card/poll-card';
import { POLL_CATEGORIES, type Poll, type PollCategory } from '../../interfaces/poll.interface';

type StatusFilter = 'active' | 'past';

/** Landing page with hero, ending-soon highlights and a filtered, sortable poll list. */
@Component({
  selector: 'app-home',
  imports: [PollCard, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly pollService = inject(PollService);
  private readonly elementRef = inject(ElementRef);

  protected readonly loading = this.pollService.loading;
  protected readonly error = this.pollService.error;
  protected readonly categories = POLL_CATEGORIES;

  protected readonly status = signal<StatusFilter>('active');
  protected readonly categoryFilter = signal<PollCategory | 'all'>('all');
  protected readonly dropdownOpen = signal(false);

  protected readonly endingSoon = computed<Poll[]>(() =>
    this.pollService
      .polls()
      .filter((p) => p.status === 'published' && p.expiresAt && !isPast(p.expiresAt))
      .sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''))
      .slice(0, 3),
  );

  protected readonly visiblePolls = computed<Poll[]>(() => {
    const status = this.status();
    const cat = this.categoryFilter();

    return this.pollService.polls().filter((p) => {
      if (p.status !== 'published') return false;
      const matchesStatus = status === 'past' ? isPast(p.expiresAt) : !isPast(p.expiresAt);
      const matchesCategory = cat === 'all' || p.category === cat;
      return matchesStatus && matchesCategory;
    });
  });

  ngOnInit(): void {
    this.pollService.loadAll();
    this.pollService.subscribe();
  }

  protected toggleDropdown(): void {
    this.dropdownOpen.update((open) => !open);
  }

  protected selectCategory(category: PollCategory | 'all'): void {
    this.categoryFilter.set(category);
    this.dropdownOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownOpen()) return;
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.dropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.dropdownOpen.set(false);
  }
}

function isPast(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}
