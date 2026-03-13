#!/usr/bin/env bash
name_prefix="cobuild-interface-chatgpt-audit"
include_tests=0
include_docs=1
preset_dir="scripts/chatgpt-review-presets"
package_script="scripts/package-audit-context.sh"

review_gpt_register_dir_preset "security" "security-audit.md" \
  "Focused security review of wallet-auth, authorization, and UI trust boundaries." \
  "security-audit" \
  "audit-security"
review_gpt_register_dir_preset "simplify" "complexity-simplification.md" \
  "Behavior-preserving simplification opportunities for the interface." \
  "complexity" \
  "complexity-simplification"
review_gpt_register_dir_preset "bad-code" "bad-code-quality.md" \
  "Frontend code-quality and anti-pattern pass." \
  "anti-patterns" \
  "antipatterns" \
  "bad-practices" \
  "anti-patterns-and-bad-practices" \
  "code-quality" \
  "bad-code-quality"
review_gpt_register_dir_preset "grief-vectors" "grief-vectors.md" \
  "Abuse, liveness, and denial-of-service vectors." \
  "grief" \
  "dos" \
  "liveness"
review_gpt_register_dir_preset "incentives" "incentives.md" \
  "Product and abuse incentive review." \
  "economic-security" \
  "economics" \
  "economic-security-and-incentives"
