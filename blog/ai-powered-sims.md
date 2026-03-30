---
title: "AI-Powered Sims: How We Use Local LLMs for Personality"
date: 2026-03-30
author: Stark Studio Labs
tags: [ai, llm, autonomy, personality, sims4]
excerpt: "We replaced The Sims 4's autonomy system with a local LLM. Now every Sim has a real personality."
---

# AI-Powered Sims: How We Use Local LLMs for Personality

The Sims 4 has a personality problem. Not the traits themselves -- EA designed a solid trait system with over 50 personality traits, each one modifying how a Sim behaves. The problem is *how little those traits actually matter* once the game is running.

## The Vanilla Autonomy System

EA's autonomy engine uses a scoring model. When a Sim needs to decide what to do next, the game collects every valid interaction on the lot -- sit on the couch, cook dinner, flirt with a neighbor, insult a coworker -- and assigns each one a numerical weight. Traits modify those weights by a percentage. A "Mean" Sim gets a +20% bump to mean interactions. An "Art Lover" gets a small bonus to painting. A "Foodie" gravitates slightly toward the kitchen.

The result is a Sim that feels, at best, like a weighted random number generator. A "Mean" Sim will insult someone roughly one in five times instead of one in ten. That is the entire depth of their personality. There is no reasoning about *why* they are being mean, no memory of past conflicts, no awareness that they just insulted the same person three times in a row. They are a dice roll with a thumb on the scale.

Players have tried to fix this with mods like MCCC's MC Tuner, which lets you disable specific autonomous actions. But that is a bandaid -- you are removing behaviors, not adding intelligence. You still end up with a Sim who does not feel like a person.

## Our Approach: LLM-Driven Autonomy

smart_sims takes a different approach. Instead of tweaking the weights on EA's scoring model, we intercept the decision point itself and hand it to a language model.

When a Sim is about to choose their next action, we build a decision context: who they are (traits, personality, aspirations), how they feel (current mood, needs, active buffs), what they remember (recent interactions, emotional events, relationship changes), who is nearby, and what is happening in the room. That context goes to a local LLM, which picks from the candidate actions and provides a *reason* for its choice.

Here is the core of the decision pipeline:

```python
class AutonomyBrain:
    """Intercepts EA's autonomy evaluation and routes decisions
    through an LLM for personality-aware action selection."""

    async def decide(self, sim_context, candidate_actions):
        # Build the personality prompt from vanilla traits
        personality = self.personality_engine.build_prompt(
            traits=sim_context.traits,
            mood=sim_context.current_mood,
            aspirations=sim_context.aspirations,
        )

        # Inject recent memories as context
        memories = self.memory.get_recent(
            sim_id=sim_context.sim_id,
            limit=10,
        )

        # Format candidate actions for the LLM
        action_list = [
            f"- {a.name}: {a.short_description}"
            for a in candidate_actions
        ]

        prompt = DECISION_PROMPT.format(
            personality=personality,
            mood=sim_context.current_mood,
            needs=sim_context.needs_summary,
            memories=self._format_memories(memories),
            nearby_sims=sim_context.nearby_sims_summary,
            actions="\n".join(action_list),
        )

        # Hard latency budget -- fall back to vanilla if LLM is too slow
        result = await self.brain.infer(
            prompt, timeout_ms=200
        )

        if result is None:
            return None  # Vanilla fallback

        return AutonomyDecision(
            action=result.chosen_action,
            reason=result.reasoning,
            confidence=result.confidence,
        )
```

The key design choice: we do not replace EA's action candidates. The game still generates the list of valid interactions based on the Sim's current state, skill levels, and lot objects. We just change *which one gets picked* and *why*.

## The Personality Engine

The personality engine translates vanilla trait combinations into rich behavioral prompts. A Sim with "Gloomy + Bookworm + Loner" does not just get three isolated modifiers. They get a synthesized personality:

```python
def build_prompt(self, traits, mood, aspirations):
    """Generate a personality prompt from vanilla trait data.

    Combines traits into a coherent behavioral voice rather than
    treating each trait as an independent modifier.
    """
    # Trait synergy detection -- some combinations create
    # emergent personalities that are more than their parts
    synergies = self._detect_synergies(traits)

    if {"gloomy", "bookworm", "loner"} <= set(traits):
        return (
            "You are introspective and prefer solitude. Books are "
            "your escape from a world that feels too loud. You find "
            "most social situations draining, and you process your "
            "emotions through reflection rather than conversation. "
            "You are not unfriendly -- you are just selective about "
            "who gets your energy."
        )

    if {"mean", "genius"} <= set(traits):
        return (
            "You are sharply intelligent and you know it. Your wit "
            "is a weapon -- you do not just insult people, you "
            "dismantle them with precision. You find most people "
            "boring, and you are not shy about letting them know."
        )

    # Fall back to compositional generation for uncommon combos
    return self._compose_from_traits(traits, mood, aspirations)
```

This is where the LLM's reasoning ability changes things. A "Mean + Genius" Sim does not just insult people 20% more often. The LLM understands that a smart, mean person makes *cutting intellectual remarks*, not random insults. A "Romantic + Foodie" Sim plans dinner dates instead of randomly flirting. The personality prompt gives the LLM enough context to make these distinctions naturally.

## Memory Makes It Real

The personality engine handles who a Sim *is*. The memory system handles who a Sim *has been*. Every significant interaction -- a rejection, a compliment, an argument, a promotion -- gets written to short-term memory with an emotional tag and a decay timer.

Memory context gets injected into every decision prompt. A Sim who was rejected by another Sim yesterday will remember that. The LLM sees "You asked Morgan to dance and they said no. You felt embarrassed." in the memory window, and naturally factors that into its next decision when Morgan is nearby. Maybe the Sim avoids Morgan. Maybe they try again with more confidence. Maybe they are mean to Morgan out of spite. The LLM decides based on the full personality + memory context.

This creates emergent narratives that EA's system cannot produce. Grudges form. Crushes develop. Sims become hesitant around people who hurt them and warm toward people who were kind. None of this is scripted. It falls out of giving the LLM enough context to reason about social dynamics.

## Architecture: Four Layers

The system has four main components, each with a clear responsibility:

- **brain.py** -- Unified inference layer supporting four providers: Ollama, llama.cpp, Claude, and OpenAI. Async with hard latency budgets. If the LLM takes longer than 200ms (configurable), the decision falls back to vanilla game logic. No player ever sees a stutter.

- **personality.py** -- Translates EA trait data into behavioral prompts. Detects trait synergies, generates personality voices, and caches prompts per Sim so we are not regenerating them every tick.

- **memory.py** -- Short-term memory tracking recent interactions, emotional events, and relationship changes. Entries have decay timers (happy memories fade in ~48 game hours, traumatic ones persist for ~168). Memory windows are capped at 10 entries per decision to keep prompt size bounded.

- **autonomy.py** -- The injection layer that hooks into EA's autonomy evaluation. Intercepts the `_get_valid_aops_gen` method on the interaction pipeline, runs the LLM decision, and injects the chosen action back. Includes a scheduling layer that only routes "important" decisions through the LLM -- new social interactions, career choices, emotional responses. Routine actions (eat, sleep, use toilet) bypass the LLM entirely.

## Why Local, Not Cloud

We default to local inference for four reasons:

**Privacy.** Players should not need to send their Sim's life story to a cloud API. The memory system tracks relationship dynamics, emotional events, and social interactions in detail. That data stays on the player's machine.

**Latency.** Local inference on a 3B parameter model (qwen2.5 or llama3.2 via Ollama) takes 50-100ms per decision. Cloud API calls take 500-2000ms. Autonomy decisions need to be fast enough that players never notice the Sim "thinking." Our 200ms budget is tight, and local models hit it consistently. Cloud models do not.

**Cost.** Cloud API calls cost money per request. A household of 8 Sims, each making 2-3 LLM decisions per game hour, at 10x game speed, would burn through API credits fast. Local inference is free after the initial model download.

**Offline.** The game should work without internet. Local models run entirely on the player's hardware.

That said, we do support Claude and OpenAI as optional cloud providers. Some players have powerful cloud budgets and want GPT-4-class reasoning for their Sims. The inference layer abstracts over the provider -- swap a config value and the same personality prompts route to Anthropic's API instead of a local Ollama instance.

## The Results

The difference is immediately visible in gameplay.

Sims feel genuinely different from each other. A "Mean + Genius" Sim does not just insult people -- they make cutting intellectual remarks and avoid conversations they find beneath them. A "Romantic + Foodie" Sim plans dinner dates, compliments cooking, and gravitates toward the kitchen when their partner is nearby. An "Active + Bro" Sim challenges everyone to competitions and gets restless sitting on the couch.

The memory system creates continuity that vanilla Sims have never had. A Sim who was rejected remembers it and becomes hesitant around that person. A Sim who had a great conversation yesterday seeks that person out again. Grudges persist. Friendships deepen. Rivalries escalate.

Performance impact is minimal. Each LLM decision takes ~50ms on local hardware, Sims make 2-3 decisions per game hour, and inference runs on a background thread. On a machine that can run The Sims 4 at all, the overhead is invisible.

## What Is Next

Action selection is just the beginning. We are working on three extensions:

**LLM-generated conversations.** Right now the LLM picks *which* interaction a Sim performs, but the dialogue is still EA's canned text. We want Sims to actually talk to each other with generated dialogue that reflects their personalities and history.

**Long-term goal planning.** Currently, each decision is independent -- the LLM picks the best action for *right now*. We want a planning layer where the LLM decides what a Sim "wants" over the next game week, then biases individual decisions toward that goal. A Sim going through a breakup might set a goal to focus on their career. A Sim who just got promoted might plan a celebration.

**Relationship reasoning.** Why does this Sim like that person? Right now, relationships are numbers. We want the LLM to generate explicit reasons -- "You like Morgan because they always laugh at your jokes and they helped you when you were sad" -- that feed back into decision-making and create richer social dynamics.

The drama engine already supports narrative threading with archetypes, consequence chains, and story arcs. Connecting LLM-driven personality to that narrative infrastructure is the next major integration. When a Sim's personality drives their decisions, and those decisions create consequences that thread into story arcs, the game stops being a dollhouse and starts being a novel that writes itself.

---

*smart_sims is part of the [Drama Engine](https://github.com/stark-studio-labs/sims4-drama-engine), our open-source narrative framework for The Sims 4. The engine handles story arcs, consequence chains, and event threading. smart_sims adds the personality layer on top. Both are in active development.*
