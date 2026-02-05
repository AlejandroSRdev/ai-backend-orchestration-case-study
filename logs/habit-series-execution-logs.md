# Habit Series – Execution Log (Runtime Example)

This document captures a real execution of the **Create Habit Series** use case
in a production-like environment.

The goal is to illustrate how the backend orchestrates AI calls, validates
structure, enforces constraints, and persists the result — end to end.

---

## Server Startup

```text
🚀 ARVI Backend Server v2.0.1
Environment: production
Port: 10000

Active routes:
- POST /api/habits/series        → Create habit series via AI
- GET  /api/energy               → Energy status
- POST /api/ai/json-convert      → JSON conversion
- POST /api/payments/start       → Stripe payment flow
```

### Notes

- The server is running in production mode.
- All core dependencies (Gemini, OpenAI, Firebase, Stripe) are initialized.
- The habit series endpoint is exposed and ready to receive requests.

---

## Request Received

```text
[START] [Habit Series] Request received
User: 6XbZIsVhs0beYwfsWTHGjMEjlAn1
Language: en
Test keys received:
- What habit would you like to improve?
- Why is it important?
- What have you tried before?
- Preferred approach?
- Supporting environment?
- Blocking thoughts or emotions?
```

### Notes

- A real user request enters the system.
- Input consists of structured answers from a habit discovery test.
- No AI interaction has happened yet.

---

## Use Case Entry

```text
[USE-CASE] [Habit Series] CreateHabitSeries started
```

### Notes

- Control is transferred to the application layer.
- From this point on, the use case governs the entire flow.

---

## Input Sanitization

```text
[SanitizeUserInput] Input normalized
```

### Notes

- Raw human input is sanitized once at the use-case level.
- Sanitization happens before any AI call.
- After this point, the system only works with controlled input.

---

## AI Orchestration – Creative Pass

```text
[AIRouter] Routing to GeminiAdapter (gemini-2.5-flash)
[Gemini] Calling model: gemini-2.5-flash
[Gemini] Response received
[Gemini Energy] Prompt: 791t, Response: 307t → Energy: 6
[Energy] Energy updated (AI_CALL_gemini-2.5-flash)
```

### Notes

- Gemini is used for probabilistic, creative generation.
- Energy consumption is calculated deterministically.
- The backend remains in control of cost and execution.

---

## AI Orchestration – Structuring Pass

```text
[AIRouter] Routing to GeminiAdapter (gemini-2.5-pro)
[Gemini] Calling model: gemini-2.5-pro
[Gemini] Response received
[Gemini Energy] Prompt: 473t, Response: 0t → Energy: 2
[Energy] Energy updated (AI_CALL_gemini-2.5-pro)
```

### Notes

- A second Gemini pass extracts structure from free-form text.
- This step reduces ambiguity before strict validation.
- Still treated as probabilistic output.

---

## AI Orchestration – Schema Alignment

```text
[AIRouter] Routing to OpenAIAdapter (gpt-4o-mini)
[OpenAI] Calling model: gpt-4o-mini
[OpenAI] Response received
```

### Notes

- OpenAI is used exclusively for structure-only transformation.
- No creative decisions are made at this stage.
- GPT models do not consume internal energy units.

---

## Schema Validation

```text
[SCHEMA] Validating AI output against schema
[SCHEMA] Schema validation OK
```

### Notes

- The backend parses and validates the JSON deterministically.
- Provider-native schema tools are intentionally not used.
- The backend is the final authority over correctness.

---

## Persistence

```text
[REPOSITORY] Saving habit series
[REPOSITORY] Series saved successfully
Series ID: 1769777854704
```

### Notes

- Only schema-compliant data reaches persistence.
- Domain rules and authorization have already been enforced.
- The result is stored as a first-class domain entity.

---

## Successful Completion

```text
[SUCCESS] Habit Series created
User: 6XbZIsVhs0beYwfsWTHGjMEjlAn1
Series ID: 1769777854704
```

### Notes

- The full execution completed without errors.
- AI, domain validation, and persistence worked as a single controlled flow.

---

## Summary

- Real backend execution (not a mock or demo)
- Multi-pass AI orchestration with explicit responsibility boundaries
- Deterministic validation and persistence
- AI treated as an external dependency, not as a decision-maker
