# Habit Series Endpoint — Backend Architecture

This repository documents the internal architecture and execution flow of the  
`POST /api/habits/series` endpoint.

The focus of this repository is to present **engineering decisions**, architectural
structure, and execution flow for a real backend use case that integrates AI as part
of a production system.

---

## Overview

The `habit series` endpoint is responsible for generating and optionally persisting
structured habit series based on user input.

The implementation follows a **Hexagonal Architecture (Ports & Adapters)** approach,
with clear separation between:

- Application orchestration
- Domain decision logic
- Infrastructure execution

The repository is intentionally scoped to highlight **core engineering elements**
relevant to this endpoint.

---

## Architectural structure

### Application layer
The application layer coordinates the execution flow of the endpoint through a
dedicated use case.

Its responsibilities include:
- Request orchestration
- Input normalization
- Coordination of AI calls
- Delegation to domain policies
- Handling of validation and error paths

The application layer does not contain business rules or infrastructure-specific logic.

---

### Domain layer
The domain layer encapsulates **decision-making logic** expressed as explicit policies.

In this endpoint, domain policies determine:
- Whether a generated habit series represents a final artifact
- Whether persistence should occur based on domain criteria

Domain logic is implemented as pure, side-effect-free decisions.

---

### Infrastructure layer
The infrastructure layer provides concrete implementations for:
- AI provider execution
- Provider routing
- Persistence mechanisms

AI providers are accessed through a routing adapter that resolves the appropriate
implementation based on the requested model family, keeping provider-specific concerns
isolated from the rest of the system.

---

## AI execution strategy

The endpoint uses a **multi-pass AI pipeline**:

1. A creative pass to explore and generate candidate habit series
2. A structural pass to consolidate output into a deterministic representation
3. A normalization pass to convert free-form output into a strict JSON contract

Each pass is treated as an independent execution step and validated accordingly.

AI output is considered untrusted input until validated.

---

## Validation and error handling

Validation is performed explicitly at multiple stages:
- Request validation
- Input normalization
- Schema validation of AI output

Failure paths are handled in a fail-fast manner with explicit error signaling.

---

## Persistence strategy

Persistence is conditional and governed by domain policies.

A successful execution does not necessarily imply persistence; only domain-approved
results are stored.

---

## Purpose

This repository serves as a **technical reference** for:

- Backend system design
- Applied AI orchestration
- Architectural boundary enforcement
- Robust execution flow under real-world constraints

It is intended for engineers and reviewers interested in **how the system is designed
and why**, rather than in feature breadth.