# TalentMesh

<!-- TODO (Phase 6): 2-3 sentence description of the use case. -->

## Use case

<!-- TODO (Phase 6): expand into a few sentences — candidate/skill/job matching graph for recruiting. -->

## Why a graph database?

TalentMesh's core questions are about relationships, not rows: finding candidates whose skills are
adjacent (not identical) to a job's requirements via a skill-similarity graph, finding warm-referral
paths through shared work history, and scoring skill gaps by graph distance. These require
multi-hop, variable-length traversals that are natural in Cypher and awkward as recursive SQL joins.

<!-- TODO (Phase 6): sharpen this section with concrete examples from the finished app. -->

## Data model

<!-- TODO (Phase 6): paste the Mermaid diagram and summary from /docs/data-model.md. -->

## Setup

<!-- TODO (Phase 6): CognoDB instance creation steps + local run instructions + env vars. -->

## Queries

<!-- TODO (Phase 6): plain-language explanation of the five main queries, from /docs/queries.md. -->

## Screenshots

<!-- TODO (Phase 6): candidate detail, job detail with recommendations, skill-gap view, error state. -->

## Demo

<!-- TODO (Phase 7): hosted URL + short screen recording link. -->
