import { Patient } from '../types';
import { TriageTemplate, triageModelService, TriagePredictionResult } from '../services/triageModelService';
import { buildFeatureVector, VitalsInput } from './featureBuilder';

export interface DynamicQuestionAnswer {
  questionId: string;
  value: string | number | boolean;
  score?: number;
}

export class DynamicQuestionManager {
  private template: TriageTemplate;
  private answers: Record<string, DynamicQuestionAnswer> = {};
  private currentQuestionIdx = 0;

  constructor(template: TriageTemplate) {
    this.template = template;
  }

  public getTemplate(): TriageTemplate {
    return this.template;
  }

  public getNextQuestion() {
    const questions = this.template.questions || [];
    while (this.currentQuestionIdx < questions.length) {
      const q = questions[this.currentQuestionIdx];
      if (q && !this.answers[q.id]) {
        return q;
      }
      this.currentQuestionIdx++;
    }
    return null;
  }

  public getCurrentQuestion() {
    const questions = this.template.questions || [];
    if (this.currentQuestionIdx >= questions.length) {
      return null;
    }
    return questions[this.currentQuestionIdx];
  }

  public hasNextQuestion(): boolean {
    return this.currentQuestionIdx < (this.template.questions || []).length;
  }

  public recordAnswer(questionId: string, value: string | number | boolean, score = 0) {
    this.answers[questionId] = { questionId, value, score };
    this.currentQuestionIdx++;
  }

  public getAnswers(): Record<string, DynamicQuestionAnswer> {
    return { ...this.answers };
  }

  public getRawAnswers(): Record<string, any> {
    const raw: Record<string, any> = {};
    for (const [k, v] of Object.entries(this.answers)) {
      raw[k] = v.value;
    }
    return raw;
  }

  public isComplete(): boolean {
    return this.getNextQuestion() === null;
  }

  public calculateSeverityScore(): number {
    let total = 0;
    for (const ans of Object.values(this.answers)) {
      total += ans.score || 0;
    }
    return total;
  }

  public checkRedFlagPresent(): boolean {
    for (const ans of Object.values(this.answers)) {
      if ((ans.score || 0) >= 3) return true;
      if (ans.value === true && (ans.questionId.includes('red_flag') || ans.questionId.includes('radiating') || ans.questionId.includes('bleeding'))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Evaluates the case and returns the final On-Device XGBoost ML triage prediction
   */
  public evaluateTriage(
    patient: Partial<Patient> | null | undefined,
    durationDays = 1,
    vitals?: VitalsInput,
    userSeverity?: string
  ): TriagePredictionResult {
    const { featureVector, hasRedFlag } = buildFeatureVector(
      patient,
      this.template,
      this.getRawAnswers(),
      vitals,
      durationDays,
      userSeverity
    );

    const forceRed = hasRedFlag || this.checkRedFlagPresent();
    return triageModelService.predictTriage(featureVector, forceRed, this.template);
  }
}
