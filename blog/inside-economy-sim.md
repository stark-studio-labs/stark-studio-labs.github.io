---
title: "Inside the Economy Sim: What We Learned from Decompiling SNB"
date: 2026-03-30
author: Stark Studio Labs
tags: [economy, decompilation, reverse-engineering, sims4]
excerpt: "We decompiled SimRealist's banking mod to understand how Sims 4 handles money. Then we built something much bigger."
---

# Inside the Economy Sim: What We Learned from Decompiling SNB

The Sims 4 treats money as a single number. Your household has funds. You earn money, you spend money, the number goes up or down. There are no bank accounts, no savings rates, no credit cards, no loans, no investments, no realistic bills. For a life simulator, the financial layer is paper-thin.

SimRealist's SNB (Sim National Bank) was the closest thing the modding community had to a real banking system. We wanted to understand exactly how it worked before we built our own, so we decompiled it from bytecode. What we found was a clean, well-structured mod that solved a genuine problem -- but also one that stopped well short of what's possible.

This is the story of that decompilation, what we learned, and how it shaped sims4-economy-sim.

## Why We Went Bytecode Diving

We could have just built our economy mod from scratch. But SNB had been around for years. It had solved problems we were going to face -- hooking into career pay events, handling Sim death, persisting data across save/load cycles. We wanted to learn from someone who'd already navigated EA's undocumented Python internals.

Sims 4 mods ship as compiled `.pyc` files. SimRealist's SNB package contained about 20 modules covering the bank itself and a companion bills system. We ran them through a bytecode disassembler and spent a few days reconstructing the Python source.

## What SNB Actually Does

The architecture is straightforward. The package is split across roughly 20 modules, with a clear separation between the core banking logic (`mod_snb.py`), game hooks (`main_snb.py`), and UI (`main_snb_ui.py`).

The central design decision is how account balances are stored. SNB uses EA's Commodity/Statistic system -- the same mechanism the game uses for things like hunger, fun, and skill levels. Each account type maps to a custom commodity tuning ID:

```python
# SNB's approach: account balances as hidden commodities on the Sim
class TuningIdSNB:
    class Commodity:
        ACCOUNT = {
            Account.MAIN: 18117047674729460082
        }
```

When you deposit 500 simoleons, SNB adds 500 to a hidden commodity stat on your Sim. When you withdraw, it subtracts. The game's built-in save system handles persistence automatically because commodities are serialized with save data.

It's clever. And it works. But there's a catch.

The `ACCOUNT_SNB_ALL` tuple only contains one entry -- `Account.MAIN`. The enum defines `FUNDS` (the household wallet) and `MAIN` (the bank account), and that's it. The architecture was clearly designed to support multiple account types, but only one was ever implemented. There's a single "checking" account. No savings. No interest. No credit.

SNB's other major feature is direct deposit splitting. It intercepts career pay events and routes a configurable percentage to the bank account:

```python
# SNB: percentage-based paycheck splitting
class ToggleState(enum.Int):
    DISABLED = 0   # All pay goes to wallet
    ENABLED = 1    # All pay goes to bank
    CUSTOM = 2     # Custom percentage split
```

It also intercepts death events to liquidate accounts (so your Sim's savings don't vanish when they die) and provides a phone menu UI for deposits, withdrawals, and Sim-to-Sim transfers. The bills companion mod is actually more ambitious -- it replaces EA's entire billing system with itemized utilities, property tax, child support, and alimony. But even the bills mod has no concept of credit or payment history.

We want to be clear: SNB is solid work. SimRealist built a mod that thousands of players use, and the code is functional and well-organized. Everything we built was informed by their groundwork.

## What We're Building on Top of It

sims4-economy-sim takes the core insight from SNB -- that the game needs a real financial layer -- and extends it into six interconnected modules.

**Banking** gives every Sim individual checking and savings accounts, plus a joint household account for shared expenses. Savings accounts accrue daily interest. Checking accounts have overdraft modes (block the purchase, charge a fee, or auto-transfer from savings). This is the foundation that SNB's single `MAIN` account pointed toward but never built.

**Credit scoring** is entirely new. Neither SNB nor any other financial mod we've found implements credit. Our system uses five weighted components inspired by real-world FICO scoring: payment history (35%), credit utilization (30%), account age (15%), credit mix (10%), and recent inquiries (10%). Scores range from 300 to 850 and determine loan eligibility, interest rates, and deposit requirements. A new Sim starts at 600 and builds credit through on-time bill payments.

**Bills** replaces EA's rabbit-hole bill payment with itemized utility bills (power, water, internet, phone), rent or mortgage payments, insurance, and subscriptions. Where SNB Bills calculates utility costs from object tags, we also factor in household behavior -- leave all the lights on and your power bill goes up.

**Jobs** hooks into the career system to model realistic pay: salary minus taxes, benefit deductions, and retirement contributions. Promotions come with raises. Getting fired triggers unemployment benefits that taper off over time.

**Stocks** is the most departure from anything that exists in the modding ecosystem. We simulate a market of 20+ companies -- named after Sims 4 families and institutions to feel native to the game world -- with daily price movements driven by geometric Brownian motion:

```python
# Our price model: GBM with mean reversion and sector correlation
mu = base_drift + economy_daily + reversion
sigma = company.annual_volatility * volatility_scale / math.sqrt(365.0)

# Correlated sector shocks (70% sector, 30% idiosyncratic)
combined_shock = 0.7 * sector_shock + 0.3 * idiosyncratic
price_change = current_price * (mu + sigma * combined_shock)
```

Prices drift with the simulated economy, revert toward fundamentals so they don't spiral to infinity, and correlate within sectors so a tech boom lifts all tech stocks. Market events from gameplay (a fire at a factory, a new invention) trigger price shocks. Some companies pay dividends. It's simplified compared to real quantitative finance, but it's enough to make "check your portfolio" a meaningful gameplay loop.

## The Storage Decision

This is where we diverged most from SNB's architecture. SNB stores account balances as EA Commodity stats on the Sim. We considered this approach carefully and decided against it for primary storage. The reason: commodities can be culled.

EA's statistic system occasionally prunes commodities that haven't been accessed recently, especially during lot transitions. For a hunger bar, that's fine -- it just resets to a default. For a bank account balance, losing data is catastrophic.

Our approach uses the game's save data persistence layer with a dedicated JSON blob. Each module registers serializers and deserializers with a central PersistenceManager. On zone save, everything gets written to a single JSON payload under the key `stark_economy_sim`. On zone load, it's restored:

```python
# Our approach: module-keyed JSON persistence via save data
def save_all(self) -> str:
    save_data = {"version": SAVE_VERSION, "modules": {}}
    for key, serializer in self._serializers.items():
        save_data["modules"][key] = serializer()
    return json.dumps(save_data, separators=(",", ":"))
```

We do still use commodity-backed storage as a secondary layer for in-game integration (so the game's native systems can read account state), but the JSON save is the source of truth.

## The Event Bus: How Modules Talk Without Coupling

SNB's banking and bills mods are separate packages that don't directly reference each other. We wanted tighter coordination -- when your Sim gets paid, the banking module should deposit the check, the bills module should check for overdue payments, and the credit system should note the income -- but without modules importing each other.

The solution is a lightweight event bus. When the jobs module processes a paycheck, it publishes a `SALARY_DEPOSITED` event. The banking module subscribes and handles the deposit. The bills module subscribes and checks for overdue auto-payments. The credit module subscribes and updates income history. No module knows the others exist:

```python
# Any module can subscribe to events without importing the publisher
@economy_event(EventType.SALARY_DEPOSITED)
def handle_salary(event: EconomyEvent) -> None:
    account = get_checking(event.sim_id)
    account.deposit(event.amount)
```

This pattern came directly from studying how SNB handles the career pay hook. SNB's `main_snb.py` monkey-patches the career pay function to call `MoneyTransfer.deposit()`. It works, but it means the banking logic is hardcoded into the hook. Our event bus makes the same flow composable.

## Lessons from the Detective Work

A few things we learned that apply beyond this project:

**EA's Python is well-structured but undocumented.** The interaction-to-loot-to-buff chain is a powerful system once you understand it. Most modders only scratch the surface. The Commodity/Statistic system in particular is far more flexible than people realize -- SNB proved you can use it as a general-purpose per-Sim data store.

**Most financial mods take the simplest possible approach.** SNB, Kuttoe's career mods, Basemental -- they all use phone menu UIs and thin wrappers around household funds. Nobody had attempted a full economic simulation layer. The opportunity is wide open.

**The phone menu UI pattern is a solved problem but clunky.** Every mod that adds phone interactions uses the same picker-dialog flow that SNB uses. It works, but it's three taps to do anything. We're exploring whether a custom UI overlay (like the skill progress panel) could replace the phone menu for quick financial actions. The game's UI framework supports it in theory, but nobody's published a working example.

**Decompilation is worth the time.** We could have guessed at how SNB works from its user-facing features. But reading the actual bytecode showed us the commodity storage pattern, the injection decorator approach, the save data serialization strategy -- design decisions that aren't visible from the outside. If you're building on top of what came before, go read the source.

## What's Next

The core modules are built. The event bus is wired. The stock market generates plausible price movements. The next phase is integration testing inside the live game -- making sure our save hooks survive EA's zone lifecycle, that commodity-backed accounts stay in sync with the JSON store, and that the phone banking UI doesn't conflict with other mods.

We'll write about the game integration process next. In the meantime, the economy-sim source is in our GitHub org alongside the rest of the Stark Framework ecosystem.

---

*Stark Studio Labs builds mods and tools for The Sims 4. Our work includes the Stark Framework, Drama Engine, and Economy Sim.*
