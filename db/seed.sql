-- Pyramid — v1 seed data
-- 7 tier-1 interventions + 1 demo user.
--
-- IMPORTANT (spec §1/§4): every citation below is a REAL, well-known source but is
-- seeded with "verified": false. The spec requires each citation to be personally
-- verified before it ships. Effect_size / evidence_grade / effort_cost are defensible
-- STARTING values (§4.2) to be corrected by your reading — not final.
--
-- Run `schema.sql` first (it drops + recreates the tables), then this file.

USE pyramid;
SET NAMES utf8mb4; -- interpret this file as UTF-8 on import (see schema.sql)

-- Demo user so the v1 loop can run "for one user" (no auth in v1).
INSERT INTO users (label) VALUES ('demo user');

-- ---------------------------------------------------------------------------
-- 1. Sleep (tier 1) — large effect; prereq of exercise + diet adherence.
-- ---------------------------------------------------------------------------
INSERT INTO interventions
  (signal_key, tier, claim, effect_size, evidence_grade, effort_cost, prereq_of, citations, msg_unmet, msg_borderline, msg_met)
VALUES (
  'sleep', 1,
  'Sleep 7 or more hours per night on a regular schedule.',
  'large', 'moderate', 'moderate',
  '["exercise","diet_protein","diet_produce","diet_upf"]',
  '[{"title":"Watson NF et al. Recommended Amount of Sleep for a Healthy Adult: A Joint Consensus Statement of the American Academy of Sleep Medicine and Sleep Research Society. Sleep. 2015;38(6):843-844.","url":"https://doi.org/10.5665/sleep.4716","verified":false}]',
  'Start here. You''re averaging under 6 hours, which undercuts nearly everything else — training recovery, appetite control, diet adherence. Fixing sleep first makes the other changes easier.',
  'You''re in the 6–7 hour range. Nudging toward 7+ is likely the highest-leverage change you can make; treat it as the next priority once anything more urgent is handled.',
  'You''re getting 7+ hours — keep doing what you''re doing. Sleep is the foundation the rest builds on.'
);

-- ---------------------------------------------------------------------------
-- 2. Exercise — aerobic / general activity (tier 1) — large effect.
-- ---------------------------------------------------------------------------
INSERT INTO interventions
  (signal_key, tier, claim, effect_size, evidence_grade, effort_cost, prereq_of, citations, msg_unmet, msg_borderline, msg_met)
VALUES (
  'exercise', 1,
  'Do intentional physical activity on 3 or more days per week.',
  'large', 'high', 'moderate',
  '[]',
  '[{"title":"WHO Guidelines on Physical Activity and Sedentary Behaviour. World Health Organization, 2020.","url":"https://www.who.int/publications/i/item/9789240015128","verified":false},{"title":"Physical Activity Guidelines for Americans, 2nd edition. U.S. Department of Health and Human Services, 2018.","url":"https://health.gov/sites/default/files/2019-09/Physical_Activity_Guidelines_2nd_edition.pdf","verified":false}]',
  'You''re active 0–1 days most weeks. Getting to 3+ days of intentional movement is one of the largest, best-evidenced wins available. Anything counts to start — walking included.',
  'Two active days is a real base. Adding a third gets you to the level where the mortality and health returns are clearest.',
  '3+ active days — keep doing what you''re doing.'
);

-- ---------------------------------------------------------------------------
-- 3. Exercise — resistance training (tier 1). The 7th intervention: a SECONDARY
-- note with its own key `exercise_resistance` (NOT one of the 6 scored signals),
-- driven by the resistance y/n flag rather than the days-per-week bucket. Keeping
-- it under a distinct key means each scored signal maps to exactly one row.
-- ---------------------------------------------------------------------------
INSERT INTO interventions
  (signal_key, tier, claim, effect_size, evidence_grade, effort_cost, prereq_of, citations, msg_unmet, msg_borderline, msg_met)
VALUES (
  'exercise_resistance', 1,
  'Include muscle-strengthening (resistance) activity on at least 2 days per week.',
  'moderate', 'moderate', 'moderate',
  '[]',
  '[{"title":"Physical Activity Guidelines for Americans, 2nd edition — muscle-strengthening activity on 2+ days/week. U.S. HHS, 2018.","url":"https://health.gov/sites/default/files/2019-09/Physical_Activity_Guidelines_2nd_edition.pdf","verified":false},{"title":"Momma H et al. Muscle-strengthening activities are associated with lower risk and mortality in major non-communicable diseases: systematic review and meta-analysis. Br J Sports Med. 2022;56(13):755-763.","url":"https://doi.org/10.1136/bjsports-2021-105061","verified":false}]',
  'Secondary note: no resistance training detected. Once your weekly activity is consistent, adding 2 days of strength work covers a benefit that cardio alone doesn''t.',
  'Secondary note: resistance work is close — aim for 2 dedicated days per week.',
  'Resistance training 2+ days/week — keep it up.'
);

-- ---------------------------------------------------------------------------
-- 4. Diet — Protein (tier 1) — large effect; the cleanest signal; low effort.
-- ---------------------------------------------------------------------------
INSERT INTO interventions
  (signal_key, tier, claim, effect_size, evidence_grade, effort_cost, prereq_of, citations, msg_unmet, msg_borderline, msg_met)
VALUES (
  'diet_protein', 1,
  'Include a real protein source in most meals.',
  'large', 'moderate', 'low',
  '[]',
  '[{"title":"Morton RW et al. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. Br J Sports Med. 2018;52(6):376-384.","url":"https://doi.org/10.1136/bjsports-2017-097608","verified":false},{"title":"Institute of Medicine. Dietary Reference Intakes for protein (RDA 0.8 g/kg/day baseline). 2005.","url":"https://nap.nationalacademies.org/catalog/10490","verified":false}]',
  'Few of your meals include real protein. This is the cleanest, lowest-effort diet fix — anchor each meal with a protein source (eggs, dairy, legumes, meat, fish, tofu).',
  'About one protein-anchored meal a day. Getting protein into most meals is a small change with a large, well-supported payoff.',
  'Protein in most meals — keep doing what you''re doing.'
);

-- ---------------------------------------------------------------------------
-- 5. Diet — Produce / fiber (tier 1) — moderate effect; micronutrient proxy.
-- ---------------------------------------------------------------------------
INSERT INTO interventions
  (signal_key, tier, claim, effect_size, evidence_grade, effort_cost, prereq_of, citations, msg_unmet, msg_borderline, msg_met)
VALUES (
  'diet_produce', 1,
  'Eat 3 or more servings of vegetables and fruit on a typical day.',
  'moderate', 'moderate', 'moderate',
  '[]',
  '[{"title":"Aune D et al. Fruit and vegetable intake and the risk of cardiovascular disease, total cancer and all-cause mortality: a dose-response meta-analysis of prospective studies. Int J Epidemiol. 2017;46(3):1029-1056.","url":"https://doi.org/10.1093/ije/dyw319","verified":false},{"title":"Dietary Guidelines for Americans, 2020–2025. USDA & U.S. HHS.","url":"https://www.dietaryguidelines.gov/","verified":false}]',
  'Close to no produce on a typical day. Work toward 3+ combined servings of vegetables and fruit — the practical proxy for the micronutrients and fiber you''re missing.',
  '1–2 servings is a start. Pushing to 3+ is where the associations with better long-term outcomes get stronger.',
  '3+ produce servings — keep doing what you''re doing.'
);

-- ---------------------------------------------------------------------------
-- 6. Diet — Ultra-processed / whole-food base (tier 1) — moderate effect.
-- The upstream diet fix: prereq_of the other diet signals + energy_balance.
-- Framed honestly (§4.3): associations strong, mechanism partly via calories.
-- ---------------------------------------------------------------------------
INSERT INTO interventions
  (signal_key, tier, claim, effect_size, evidence_grade, effort_cost, prereq_of, citations, msg_unmet, msg_borderline, msg_met)
VALUES (
  'diet_upf', 1,
  'Base most of your daily calories on whole or minimally-processed foods.',
  'moderate', 'low', 'moderate',
  '["diet_protein","diet_produce","energy_balance"]',
  '[{"title":"Hall KD et al. Ultra-Processed Diets Cause Excess Calorie Intake and Weight Gain: An Inpatient Randomized Controlled Trial of Ad Libitum Food Intake. Cell Metab. 2019;30(1):67-77.e3.","url":"https://doi.org/10.1016/j.cmet.2019.05.008","verified":false},{"title":"Pagliai G et al. Consumption of ultra-processed foods and health status: a systematic review and meta-analysis. Br J Nutr. 2021;125(3):308-318.","url":"https://doi.org/10.1017/S0007114520002688","verified":false}]',
  'Your calorie base is mostly processed/takeout. Honest framing: the associations are strong, but the mechanism runs largely through calories and displacing whole foods. Still, this is usually the upstream diet fix — shifting the base tends to pull protein, produce, and weight along with it.',
  'A mixed base. Tilting further toward whole foods is the single diet change most likely to improve the others at the same time.',
  'Mostly whole-food base — keep doing what you''re doing.'
);

-- ---------------------------------------------------------------------------
-- 7. Energy balance (tier 1) — OUTCOME signal, not a food question. Moderate
-- effect, context-dependent on the user''s goal. Used as a cross-check.
-- ---------------------------------------------------------------------------
INSERT INTO interventions
  (signal_key, tier, claim, effect_size, evidence_grade, effort_cost, prereq_of, citations, msg_unmet, msg_borderline, msg_met)
VALUES (
  'energy_balance', 1,
  'Keep your weight trend moving toward your goal, or hold steady at goal.',
  'moderate', 'moderate', 'high',
  '[]',
  '[{"title":"Dietary Guidelines for Americans, 2020–2025 — energy balance and weight management. USDA & U.S. HHS.","url":"https://www.dietaryguidelines.gov/","verified":false},{"title":"Hall KD, Guo J. Obesity Energetics: Body Weight Regulation and the Effects of Diet Composition. Gastroenterology. 2017;152(7):1718-1727.","url":"https://doi.org/10.1053/j.gastro.2017.01.052","verified":false}]',
  'Outcome check: your weight is trending the wrong way for your goal. This is a cross-check, not a food question — if your diet answers looked fine but the trend disagrees, trust the trend and revisit the upstream diet base first.',
  'Weight is roughly stable. Whether that''s good depends on your goal — hold here if you''re at goal, adjust the diet base if you''re not.',
  'Weight is moving the right way (or at goal) — keep doing what you''re doing.'
);
