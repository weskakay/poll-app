import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
const MIN_ANSWERS = 2;

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

  protected get questions(): FormArray<QuestionGroup> {
    return this.form.controls.questions;
  }

  protected answersOf(question: QuestionGroup): FormArray<AnswerControl> {
    return question.controls.answers;
  }

  protected letterFor(index: number): string {
    return String.fromCharCode('A'.charCodeAt(0) + index);
  }

  protected addQuestion(): void {
    this.questions.push(this.createQuestion());
  }

  protected removeQuestion(index: number): void {
    if (this.questions.length > 1) {
      this.questions.removeAt(index);
    }
  }

  protected addAnswer(question: QuestionGroup): void {
    if (this.answersOf(question).length < MAX_ANSWERS) {
      this.answersOf(question).push(this.createAnswer());
    }
  }

  protected removeAnswer(question: QuestionGroup, index: number): void {
    if (this.answersOf(question).length > MIN_ANSWERS) {
      this.answersOf(question).removeAt(index);
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const value = this.form.getRawValue();
    const success = await this.pollService.create({
      title: value.title,
      description: value.description.trim() ? value.description : null,
      category: value.category,
      expiresAt: value.expiresAt || null,
      status: 'published',
      questions: value.questions.map((q) => ({
        text: q.text,
        allowMultiple: q.allowMultiple,
        answerLabels: q.answers,
      })),
    });
    this.submitting.set(false);

    if (success) {
      this.router.navigate(['/']);
    }
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
