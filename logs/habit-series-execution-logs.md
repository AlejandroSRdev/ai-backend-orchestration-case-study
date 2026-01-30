# Habit Series – Execution Logs (Happy Path)

This document captures the successful execution flow of the `Create Habit Series` endpoint, including AI orchestration, energy accounting, schema validation, and persistence.

---

## Request Initialization

```text
[START] [Habit Series] Request received
User: 6XbZIsVhs0beYwfsWTHGjMEjlAn1
Language: en
User context keys received:

What habit, routine or area of your life would you like to improve or strengthen right now?

Why is it important for you to work on this habit? What do you hope to achieve in the long term?

Have you already tried to build or maintain this habit before? What helped you or what failed?

How would you like to approach the process of integrating this habit into your daily life?

Which approach suits you best: progressive and smooth, or demanding and disciplined from the start?

Do you have any environment, person or place that helps you stay consistent?

What thought or emotion usually makes you give up when trying to maintain a habit?
```

---

## Use Case Execution

```text
[USE-CASE] [Habit Series] CreateHabitSeries started
User: 6XbZIsVhs0beYwfsWTHGjMEjlAn1
```

The application layer takes control and orchestrates the full flow.

---

## AI Orchestration

### Creative Pass (Gemini Flash)

```text
[AIRouter] Routing to GeminiAdapter
Model: gemini-2.5-flash

[Gemini] Calling model: gemini-2.5-flash
[SanitizeUserInput] Input normalized
```

#### Energy Accounting

```text
[Gemini Energy]
Prompt: 791 tokens
Response: 95 tokens
Total: 332 tokens
Energy cost: 4

[Gemini] Response received
Tokens: 95
Energy: 4

[Energy] Energy updated
Action: AI_CALL_gemini-2.5-flash
```

---

### Structuring Pass (Gemini Pro)

```text
[AIRouter] Routing to GeminiAdapter
Model: gemini-2.5-pro

[Gemini] Calling model: gemini-2.5-pro
[SanitizeUserInput] Input normalized
```

#### Energy Accounting

```text
[Gemini Energy]
Prompt: 260 tokens
Response: 98 tokens
Total: 176 tokens
Energy cost: 2

[Gemini] Response received
Tokens: 98
Energy: 2

[Energy] Energy updated
Action: AI_CALL_gemini-2.5-pro
```

---

### Schema Enforcement (OpenAI)

```text
[AIRouter] Routing to OpenAIAdapter
Model: gpt-4o-mini

[OpenAI] Calling model: gpt-4o-mini
[OpenAI] Response received
Tokens: 518
Energy cost: 0
```

This step is used exclusively for schema alignment and structural enforcement, not for domain decisions. GPT models do not consume internal energy units.

---

## Schema Validation

```text
[SCHEMA] [Habit Series] Validating AI output against schema
Actions detected: 0
[SCHEMA] [Habit Series] Schema validation OK
```

The generated output complies with the expected domain contract.

---

## Persistence

```text
[REPOSITORY] [Habit Series] Saving series
User: 6XbZIsVhs0beYwfsWTHGjMEjlAn1
[REPOSITORY] [Habit Series] Series saved successfully
Series ID: 1769702926214
```

---

## Successful Completion

```text
[SUCCESS] [Habit Series] Created successfully
User: 6XbZIsVhs0beYwfsWTHGjMEjlAn1
Series ID: 1769702926214
```

---

## Summary

- End-to-end execution completed without errors
- Multi-model AI orchestration executed as designed
- Energy consumption tracked per AI call
- Schema validation enforced before persistence
- Deterministic backend control maintained over AI output
