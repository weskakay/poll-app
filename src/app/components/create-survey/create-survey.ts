import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PollService } from '../../services/poll.service';
import { POLL_CATEGORIES, type PollCategory } from '../../interfaces/poll.interface';

type AnswerControl = FormControl<string>;

type QuestionGroup = FormGroup<{
  text: FormControl<string>;
  allowMultiple: FormControl<boolean>;
  answers: FormArray<AnswerControl>;
}>;

const MAX_ANSWERS = 6;

/** Reactive form to create a poll with one or more questions, each with two to six answers. */
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
  protected readonly categories = POLL_CATEGORIES;

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', Validators.required],
    description: this.formBuilder.nonNullable.control(''),
    category: this.formBuilder.nonNullable.control<PollCategory>(
      'Team Activities',
      Validators.required,
    ),
    expiresAt: this.formBuilder.nonNullable.control(''),
    questions: this.formBuilder.nonNullable.array<QuestionGroup>([this.createQuestion()]),
  });

  /** Form array holding the question groups of the current poll. */
  protected get questions(): FormArray<QuestionGroup> {
    return this.form.controls.questions;
  }

  /** Returns the answer controls for the given question group. */
  protected answersOf(question: QuestionGroup): FormArray<AnswerControl> {
    return question.controls.answers;
  }

  /** Maps a zero-based index to its answer letter (A, B, C, ...). */
  protected letterFor(index: number): string {
    return String.fromCharCode('A'.charCodeAt(0) + index);
  }

  /** Appends an empty question group with two empty answers. */
  protected addQuestion(): void {
    this.questions.push(this.createQuestion());
  }

  /** Removes a question group while always keeping at least one. */
  protected removeQuestion(index: number): void {
    if (this.questions.length > 1) {
      this.questions.removeAt(index);
    }
  }

  /** Clears all input values of a question without removing it from the form. */
  protected clearQuestionInputs(index: number): void {
    const question = this.questions.at(index);
    question.controls.text.reset('');
    question.controls.allowMultiple.reset(false);
    this.answersOf(question).controls.forEach((control) => control.reset(''));
  }

  /** Adds an empty answer control until the maximum count is reached. */
  protected addAnswer(question: QuestionGroup): void {
    if (this.answersOf(question).length < MAX_ANSWERS) {
      this.answersOf(question).push(this.createAnswer());
    }
  }

  /** Removes the answer row at the given index. Only used for additional answers (index 2+). */
  protected removeAnswer(question: QuestionGroup, index: number): void {
    this.answersOf(question).removeAt(index);
  }

  /** Resets the value of any reactive form control to an empty string. */
  protected clearControl(control: AbstractControl): void {
    control.reset('');
  }

  /** Saves the current form as a draft (not visible in the public list). */
  protected async saveDraft(): Promise<void> {
    await this.createPoll('draft');
  }

  /** Validates the form and publishes the poll, then navigates back to home on success. */
  protected async submit(): Promise<void> {
    const newPollId = await this.createPoll('published');
    if (newPollId) {
      this.pollService.publishedMessage.set('Your survey is now published');
    }
  }

  private async createPoll(status: 'published' | 'draft'): Promise<string | null> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return null;
    }
    this.submitting.set(true);
    const value = this.form.getRawValue();
    const newPollId = await this.pollService.create({
      title: value.title,
      description: value.description.trim() ? value.description : null,
      category: value.category,
      expiresAt: value.expiresAt || null,
      status,
      questions: value.questions.map((q) => ({
        text: q.text,
        allowMultiple: q.allowMultiple,
        answerLabels: q.answers,
      })),
    });
    this.submitting.set(false);
    if (newPollId) this.router.navigate(['/']);
    return newPollId;
  }

  private createQuestion(): QuestionGroup {
    return this.formBuilder.nonNullable.group({
      text: this.formBuilder.nonNullable.control('', Validators.required),
      allowMultiple: this.formBuilder.nonNullable.control(false),
      answers: this.formBuilder.nonNullable.array<AnswerControl>([
        this.createAnswer(),
        this.createAnswer(),
      ]),
    });
  }

  private createAnswer(): AnswerControl {
    return this.formBuilder.nonNullable.control('', Validators.required);
  }
}
