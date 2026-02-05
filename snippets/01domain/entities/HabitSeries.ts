import { Action, Rank, calculateRankFromScore } from "../value_objects/habit_objects";

/**
 * HabitSeries (Domain Entity)
 *
 * Represents a thematic collection of habit-related actions.
 *
 * A HabitSeries:
 * - Has an identity, title and description.
 * - Contains a growing list of Actions (minimum 3).
 * - Accumulates a totalScore over time.
 * - Derives its Rank exclusively from totalScore (rank is NOT stored).
 *
 * This entity is:
 * - Pure domain logic.
 * - Defensive by construction.
 * - Free of infrastructure, DTOs, persistence or AI concerns.
 *
 * If an instance of HabitSeries exists, it is guaranteed to be valid.
 */
export class HabitSeries {
  /** Unique identifier of the series */
  public readonly id: string;

  /** Human-readable title */
  public readonly title: string;

  /** Description of the series purpose */
  public readonly description: string;

  /** Actions belonging to this series (minimum 3) */
  public readonly actions: readonly Action[];

  /** Accumulated score of the series */
  public readonly totalScore: number;

  /** Creation timestamp */
  public readonly createdAt: Date;

  /** Last activity timestamp */
  public readonly lastActivityAt: Date;

  /**
   * Private constructor.
   *
   * Enforces all domain invariants.
   * Instances can only be created through controlled factory methods.
   */
  private constructor(
    id: string,
    title: string,
    description: string,
    actions: readonly Action[],
    totalScore: number,
    createdAt: Date,
    lastActivityAt: Date
  ) {
    // --- Identity validation ---
    if (typeof id !== "string") {
      throw new Error("HabitSeries id must be a string");
    }

    if (id.trim() === "") {
      throw new Error("HabitSeries id cannot be empty");
    }

    // --- Title validation ---
    if (typeof title !== "string") {
      throw new Error("HabitSeries title must be a string");
    }

    if (title.trim() === "") {
      throw new Error("HabitSeries title cannot be empty");
    }

    // --- Description validation ---
    if (typeof description !== "string") {
      throw new Error("HabitSeries description must be a string");
    }

    if (description.trim() === "") {
      throw new Error("HabitSeries description cannot be empty");
    }

    // --- Actions validation ---
    if (!Array.isArray(actions)) {
      throw new Error("HabitSeries actions must be an array");
    }

    if (actions.length < 3) {
      throw new Error("HabitSeries must contain at least three actions");
    }

    for (const action of actions) {
      if (!(action instanceof Action)) {
        throw new Error("All HabitSeries actions must be valid Action instances");
      }
    }

    // --- Score validation ---
    if (typeof totalScore !== "number") {
      throw new Error("HabitSeries totalScore must be a number");
    }

    if (totalScore < 0) {
      throw new Error("HabitSeries totalScore cannot be negative");
    }

    // --- Temporal validation ---
    if (!(createdAt instanceof Date)) {
      throw new Error("HabitSeries createdAt must be a Date");
    }

    if (!(lastActivityAt instanceof Date)) {
      throw new Error("HabitSeries lastActivityAt must be a Date");
    }

    // --- State assignment (only after invariants are satisfied) ---
    this.id = id;
    this.title = title;
    this.description = description;
    this.actions = actions;
    this.totalScore = totalScore;
    this.createdAt = createdAt;
    this.lastActivityAt = lastActivityAt;
  }

  /**
   * Derived rank of the series.
   *
   * Rank is NOT stored as state.
   * It is always calculated from totalScore,
   * ensuring consistency by construction.
   */
  public getRank(): Rank {
    return calculateRankFromScore(this.totalScore);
  }

  /**
   * Factory method for creating a new HabitSeries.
   *
   * Intended for use by application or domain services.
   * The domain itself remains agnostic of where the data comes from.
   */
  public static create(params: {
    id: string;
    title: string;
    description: string;
    actions: readonly Action[];
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
      params.totalScore ?? 0,
      params.createdAt ?? now,
      params.lastActivityAt ?? now
    );
  }
}

export default HabitSeries;
