/**
 * HabitSeries Entity — Domain Layer
 *
 * This is the core domain entity of the "Create Habit Series" endpoint.
 * It represents a thematic collection of habit actions governed by
 * explicit business rules.
 *
 * This entity:
 * - Aggregates multiple Value Objects (Action, Rank, etc.)
 * - Encapsulates domain invariants and behavior
 * - Is completely independent from transport, persistence or AI concerns
 *
 * IMPORTANT:
 * - This is NOT a DTO.
 * - This is NOT an AI artifact.
 * - This is NOT a persistence model.
 *
 * External communication is handled via explicit DTO mapping (toDTO()).
 * AI-generated content is accepted only through controlled factory methods.
 */

import { Action } from '../value_objects/habit_objects/Action.ts';
import type { ActionDTO, AIActionInput } from '../value_objects/habit_objects/Action.ts';
import { Rank, calculateRankFromScore } from '../value_objects/habit_objects/Rank.ts';

/**
 * Data Transfer Object used for API responses.
 * This shape is intentionally decoupled from the domain entity.
 */
export interface HabitSeriesDTO {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly actions: readonly ActionDTO[];
  readonly rank: Rank;
  readonly totalScore: number;
  readonly createdAt: string;
  readonly lastActivityAt: string;
}

/**
 * Minimal input structure expected from AI output.
 *
 * NOTE:
 * This interface does not represent trust.
 * Validation and normalization occur before and after entity creation.
 */
export interface AIHabitSeriesInput {
  readonly title: string;
  readonly description: string;
  readonly actions: readonly AIActionInput[];
}

export class HabitSeries {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly actions: readonly Action[];
  readonly rank: Rank;
  readonly totalScore: number;
  readonly createdAt: Date;
  readonly lastActivityAt: Date;

  /**
   * Private constructor to enforce controlled creation.
   * All instances must be created through explicit factory methods.
   */
  private constructor(
    id: string,
    title: string,
    description: string,
    actions: readonly Action[],
    rank: Rank,
    totalScore: number,
    createdAt: Date,
    lastActivityAt: Date
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.actions = actions;
    this.rank = rank;
    this.totalScore = totalScore;
    this.createdAt = createdAt;
    this.lastActivityAt = lastActivityAt;
  }

  /**
   * Factory method for creating a HabitSeries from AI-generated content.
   *
   * This method:
   * - Accepts only the minimal, already-sanitized AI output
   * - Converts AI inputs into domain Value Objects
   * - Applies safe defaults for rank and score
   *
   * NOTE:
   * No business decisions (ranking, scoring evolution) are delegated to AI.
   */
  static fromAIOutput(id: string, input: AIHabitSeriesInput): HabitSeries {
    const now = new Date();

    const actions = input.actions.map((actionInput, index) =>
      Action.fromAIOutput(actionInput, `${id}_action_${index}`)
    );

    return new HabitSeries(
      id,
      input.title,
      input.description,
      actions,
      Rank.BRONZE,
      0,
      now,
      now
    );
  }

  /**
   * Factory method for rehydrating a HabitSeries from persistence.
   *
   * Used when loading existing series from storage.
   * Defaults are applied defensively if optional fields are missing.
   */
  static create(params: {
    id: string;
    title: string;
    description: string;
    actions: readonly Action[];
    rank?: Rank;
    totalScore?: number;
    createdAt?: Date;
    lastActivityAt?: Date;
  }): HabitSeries {
    const now = new Date();

    return new HabitSeries(
      params.id,
      params.title,
      params.description,
      params.actions,
      params.rank ?? Rank.BRONZE,
      params.totalScore ?? 0,
      params.createdAt ?? now,
      params.lastActivityAt ?? now
    );
  }

  /**
   * Computes the rank based on the current total score.
   *
   * Business rule (centralized in Rank value object):
   * - >= 1000 points → diamond
   * - >= 600 points  → golden
   * - >= 300 points  → silver
   * - < 300 points   → bronze
   */
  calculateRank(): Rank {
    return calculateRankFromScore(this.totalScore);
  }

  /**
   * Maps the domain entity into a plain DTO
   * suitable for API responses.
   *
   * No domain logic should leak beyond this point.
   */
  toDTO(): HabitSeriesDTO {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      actions: this.actions.map(action => action.toDTO()),
      rank: this.rank,
      totalScore: this.totalScore,
      createdAt: this.createdAt.toISOString(),
      lastActivityAt: this.lastActivityAt.toISOString(),
    };
  }
}

export default HabitSeries;
