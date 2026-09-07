from __future__ import annotations

"""
Step 7 — Candidate Ranking
==========================

Deterministic scoring and ranking of filtered candidate products.

Separation of concerns
----------------------
  Retrieval  → repository.py          (pgvector cosine similarity)
  Filtering  → filtering.py           (budget / capacity / status / location)
  Ranking    → THIS FILE              (deterministic match_score)
  Allocation → Step 8 (not here)

Scoring formula
---------------
  match_score = (W_SEM  * semantic_score)
              + (W_PRICE * price_score)
              + (W_CAP  * capacity_score)
              + (W_RATE * rating_score)

Where each component ∈ [0.0, 1.0] and all weights sum to 1.0.

Weights — MVP IMPLEMENTATION DECISION
--------------------------------------
ARCHITECTURE.md §6 and API_CONTRACT.md §22 list the ranking signals
(semantic relevance, capacity/availability, price suitability, location,
artisan rating) but do NOT specify exact numerical weights.

The weights below are therefore an explicit MVP implementation decision,
chosen to be simple, transparent, and easy to adjust:

  W_SEM   = 0.50   (semantic relevance is the primary signal)
  W_PRICE = 0.20   (price suitability matters for B2B buyers)
  W_CAP   = 0.20   (capacity determines fulfilment feasibility)
  W_RATE  = 0.10   (artisan rating is a quality tiebreaker)

To change the weights, update the four constants below.

Price Suitability — What the source documents say vs. what this implements
--------------------------------------------------------------------------
DOCUMENTED REQUIREMENT (ARCHITECTURE.md §6):
    "Candidate ranking may consider: ... price suitability ..."
    → price suitability is listed as ONE of the signals to consider.
    → No exact formula, no direction (cheaper vs. at-budget), and no
      weights are specified anywhere in the source-of-truth documents.

MVP IMPLEMENTATION DECISION — formula chosen here:
    price_score = price / budget_per_unit   (clamped to [0.0, 1.0])

    Assumption: a product priced *closer to the buyer's stated maximum*
    is treated as MORE price-suitable. A product at exactly the maximum
    budget scores 1.0; a product at half the budget scores 0.5.

    Rationale for this direction (not from docs — explicit assumption):
    In an artisan craft B2B context, the buyer's budget ceiling often
    reflects a quality tier. A product priced significantly below the
    ceiling may represent lower-quality materials or craftsmanship.
    The formula therefore rewards artisans who can deliver at the full
    value the buyer is willing to pay.

    Alternative that was considered and rejected:
    savings_score = 1 - (price / budget)  (cheaper = better)
    This interpretation favours cost minimisation above quality fit,
    which is less appropriate when buyers specify a quality-level budget
    rather than seeking the cheapest available option.

    Step 6 has already eliminated products that EXCEED the budget as a
    hard constraint. This formula operates only within the already-
    filtered, budget-eligible candidate set.

    If the business later decides cheaper is always better, replace
    _price_score with:  1.0 - (price / budget)  and update these tests.

Location
--------
ARCHITECTURE.md lists location as a ranking signal but the current
CandidateProduct model exposes only text fields (city, state, country,
location) — not geographic coordinates or distance from buyer.

Step 6 filtering already performs hard location matching when a location
constraint is supplied. Soft location boosting is therefore not added here
to avoid double-counting; this limitation is noted in the final report.

Components
----------
1. semantic_score  = 1.0 - candidate.distance
   (pgvector returns cosine *distance*; similarity = 1 - distance)
   Clamped to [0.0, 1.0] to guard against numerical noise.

2. price_score     = price / budget_per_unit, clamped to [0.0, 1.0]
   MVP ASSUMPTION (not from source docs): product priced closer to the
   buyer's maximum budget is treated as more price-suitable.
   If no budget is provided: price_score = 0.5 (neutral, no penalty).
   If no price is available: price_score = 0.5 (neutral).

3. capacity_score  = total_capacity / requested_quantity, clamped [0.0, 1.0]
   total_capacity = available_quantity + production_capacity
   A candidate that fully covers the request → score 1.0.
   If no quantity is provided: capacity_score = 0.5 (neutral).

4. rating_score    = artisan_rating / 5.0
   Normalises the documented 0–5 artisan rating to [0.0, 1.0].

Tie-breaking
------------
When two candidates produce identical match_scores (after rounding to 6
decimal places), they are broken deterministically by:

  1. product_id (UUID string, ascending lexicographic order)

This guarantees a stable, reproducible ordering without relying on time,
random values, or insertion order.
"""

from dataclasses import dataclass, field
from uuid import UUID

from app.schemas.search import SearchIntent
from app.services.search.repository import CandidateProduct


# ---------------------------------------------------------------------------
# Ranking weights  — MVP IMPLEMENTATION DECISION (not from source-of-truth docs)
# ---------------------------------------------------------------------------

W_SEM: float = 0.50    # Semantic relevance weight
W_PRICE: float = 0.20  # Price suitability weight
W_CAP: float = 0.20    # Capacity suitability weight
W_RATE: float = 0.10   # Artisan rating weight

# Sanity-check: weights must sum to 1.0
assert abs(W_SEM + W_PRICE + W_CAP + W_RATE - 1.0) < 1e-9, (
    "Ranking weights must sum to 1.0"
)

# Rating scale used by DATABASE_SCHEMA.md
_MAX_RATING: float = 5.0

# Neutral score assigned when a component cannot be evaluated
_NEUTRAL: float = 0.5


# ---------------------------------------------------------------------------
# Ranked result
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class RankedCandidate:
    """A candidate product annotated with its deterministic match score."""

    candidate: CandidateProduct
    match_score: float  # ∈ [0.0, 1.0]; higher = better

    # Component scores stored for transparency / future use
    semantic_score: float
    price_score: float
    capacity_score: float
    rating_score: float


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------

def _semantic_score(candidate: CandidateProduct) -> float:
    """Convert pgvector cosine *distance* → similarity, clamped [0, 1]."""
    return max(0.0, min(1.0, 1.0 - candidate.distance))


def _price_score(
    candidate: CandidateProduct,
    budget_per_unit: float | None,
) -> float:
    """
    Price suitability score ∈ [0.0, 1.0].

    DOCUMENTED REQUIREMENT (ARCHITECTURE.md §6):
        "price suitability" is listed as a ranking signal.
        No formula or direction is specified in any source-of-truth document.

    MVP IMPLEMENTATION DECISION — formula used here:
        price_score = price / budget_per_unit   (clamped to [0.0, 1.0])

    Assumption: a product priced closer to the buyer's maximum budget is
    treated as more price-suitable (score closer to 1.0). A product priced
    at exactly the budget scores 1.0; a product at half the budget scores 0.5.

    This implements a "quality-tier utilisation" preference: the buyer's
    budget ceiling signals a quality level, and artisans delivering at that
    level are preferred over those delivering well below it.

    Rules:
    - No budget provided            → 0.5 (neutral — no penalty for absence)
    - No price on product           → 0.5 (neutral — no penalty for absence)
    - Zero or negative budget       → 0.5 (neutral — guard against bad data)
    - price == budget               → 1.0 (perfect fit)
    - price > budget (post-Step-6)  → clamped to 1.0 (should not occur)
    - price < budget                → price / budget ∈ (0.0, 1.0)

    Note: Step 6 has already hard-filtered products that EXCEED the budget.
    This function operates within the already-eligible candidate set.
    """
    if budget_per_unit is None or budget_per_unit <= 0:
        return _NEUTRAL
    if candidate.price is None or candidate.price <= 0:
        return _NEUTRAL
    return min(1.0, candidate.price / budget_per_unit)


def _capacity_score(
    candidate: CandidateProduct,
    requested_quantity: int | None,
) -> float:
    """
    Capacity suitability score ∈ [0.0, 1.0].

    Logic:
    - If no quantity requested → neutral (0.5). No artificial penalty.
    - Otherwise: (available_quantity + production_capacity) / requested_quantity
      clamped to [0.0, 1.0].
      A candidate that fully covers the request → 1.0.

    Note: Do NOT allocate quantities here. That is Step 8.
    """
    if requested_quantity is None or requested_quantity <= 0:
        return _NEUTRAL
    total_capacity = (candidate.available_quantity or 0) + (
        candidate.production_capacity or 0
    )
    return min(1.0, total_capacity / requested_quantity)


def _rating_score(candidate: CandidateProduct) -> float:
    """Normalise artisan_rating (0–5) to [0.0, 1.0]."""
    return max(0.0, min(1.0, (candidate.artisan_rating or 0.0) / _MAX_RATING))


def score_candidate(
    candidate: CandidateProduct,
    intent: SearchIntent,
) -> RankedCandidate:
    """
    Compute the deterministic match_score for a single candidate.

    Returns a RankedCandidate with all component scores preserved.
    """
    sem = _semantic_score(candidate)
    price = _price_score(candidate, intent.budget_per_unit)
    cap = _capacity_score(candidate, intent.quantity)
    rate = _rating_score(candidate)

    match_score = W_SEM * sem + W_PRICE * price + W_CAP * cap + W_RATE * rate

    return RankedCandidate(
        candidate=candidate,
        match_score=round(match_score, 6),
        semantic_score=round(sem, 6),
        price_score=round(price, 6),
        capacity_score=round(cap, 6),
        rating_score=round(rate, 6),
    )


# ---------------------------------------------------------------------------
# Ranking service
# ---------------------------------------------------------------------------

class CandidateRankingService:
    """
    Ranks filtered candidate products using a deterministic weighted score.

    This service is stateless and may be called multiple times with the same
    inputs to produce exactly the same output (deterministic + reproducible).
    """

    def rank(
        self,
        candidates: list[CandidateProduct],
        intent: SearchIntent,
    ) -> list[RankedCandidate]:
        """
        Rank a list of filtered candidates by their deterministic match_score.

        Args:
            candidates: Filtered candidate products from Step 6.
            intent:     Extracted buyer intent from Step 3.

        Returns:
            Candidates sorted descending by match_score. Ties are broken
            deterministically by product_id (ascending UUID string).
        """
        if not candidates:
            return []

        ranked = [score_candidate(c, intent) for c in candidates]

        # Primary sort: match_score descending.
        # Tie-breaker: product_id ascending (stable, deterministic).
        ranked.sort(
            key=lambda r: (-r.match_score, str(r.candidate.product_id)),
        )

        return ranked
