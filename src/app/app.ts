import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

/** Application shell with a global Logo header above the routed view. */
@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
