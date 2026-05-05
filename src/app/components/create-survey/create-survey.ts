import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PollService } from '../../services/poll.service';

/** Reactive form to create a new poll with two to six options. */
@Component({
  selector: 'app-create-survey',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})
export class CreateSurvey {
  private readonly formBuilder = inject(FormBuilder);
  private readonly pollService = inject(PollService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly error = this.pollService.error;

  protected readonly form = this.formBuilder.nonNullable.group({
    question: ['', Validators.required],
    options: this.formBuilder.nonNullable.array([
      this.createOptionControl(),
      this.createOptionControl(),
    ]),
  });

  protected get options(): FormArray<FormControl<string>> {
    return this.form.controls.options;
  }

  protected letterFor(index: number): string {
    return String.fromCharCode('A'.charCodeAt(0) + index);
  }

  protected addOption(): void {
    if (this.options.length < 6) {
      this.options.push(this.createOptionControl());
    }
  }

  protected removeOption(index: number): void {
    if (this.options.length > 2) {
      this.options.removeAt(index);
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { question, options } = this.form.getRawValue();
    const success = await this.pollService.create(question, options);
    this.submitting.set(false);

    if (success) {
      this.router.navigate(['/']);
    }
  }

  private createOptionControl(): FormControl<string> {
    return this.formBuilder.nonNullable.control('', Validators.required);
  }
}
