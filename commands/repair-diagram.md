---
name: repair-diagram
description: Diagnoses and repairs syntax errors, layout cycles, and typos in the active Markdy diagram using MCP tools.
---

# Repair Markdy Diagram

When running `/repair-diagram`:
1. Read the active `.markdy` or `.mdy` file.
2. Run `diagnose_markdy_syntax` on the file content.
3. If syntax or architectural issues are detected, invoke `fix_markdy_code` to generate clean, auto-repaired code.
4. Replace the file content with the repaired version and summarize all resolved issues.
