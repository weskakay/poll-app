import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Wildcard route handler shown for unknown urls. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {}
