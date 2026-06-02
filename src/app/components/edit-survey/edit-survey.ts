import { Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PollService } from '../../services/poll.service';
import { POLL_CATEGORIES, type Poll, type PollCategory } from '../../interfaces/poll.interface';

type AnswerControl = FormControl<string>;

type QuestionGroup = FormGroup<{
  text: FormControl<string>;
  allowMultiple: FormControl<boolean>;
  answers: FormArray<AnswerControl>;
}>;

const MAX_ANSWERS = 6;

/** Edit form for an existing poll — pre-fills the form and calls PollService.update() on submit. */
@Component({
  selector: 'app-edit-survey',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edit-survey.html',
  styleUrl: './edit-survey.scss',
})
export class EditSurvey implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly pollService = inject(PollService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly id = signal('');
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

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id') ?? '';
    this.id.set(idParam);

    await this.pollService.ensureLoaded();
    const poll = this.pollService.polls().find((p) => p.id === idParam);

    if (!poll) {
      this.router.navigate(['/']);
      return;
    }

    this.populateForm(poll);
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

  /** Validates the form and updates the poll, then navigates back to the detail view on success. */
  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const value = this.form.getRawValue();
    const success = await this.pollService.update(this.id(), {
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
      this.router.navigate(['/poll', this.id()]);
    }
  }

  private populateForm(poll: Poll): void {
    while (this.questions.length > 0) {
      this.questions.removeAt(0);
    }

    for (const question of poll.questions) {
      const answers = this.formBuilder.nonNullable.array<AnswerControl>(
        question.answers.map((a) =>
          this.formBuilder.nonNullable.control(a.label, Validators.required),
        ),
      );

      this.questions.push(
        this.formBuilder.nonNullable.group({
          text: this.formBuilder.nonNullable.control(question.text, Validators.required),
          allowMultiple: this.formBuilder.nonNullable.control(question.allowMultiple),
          answers,
        }),
      );
    }

    this.form.patchValue({
      title: poll.title,
      description: poll.description ?? '',
      category: poll.category ?? 'Team Activities',
      expiresAt: poll.expiresAt ? poll.expiresAt.slice(0, 10) : '',
    });
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
