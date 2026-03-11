#!/bin/bash
#
# Branch name validation script
# Enforces format: <type>/<issue-id>-<short-description>
#

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

branch=$(git rev-parse --abbrev-ref HEAD)

# Allow main branch
if [[ "$branch" == "main" ]]; then
    exit 0
fi

# Check if branch name matches the required format
if [[ "$branch" =~ ^(feat|fix|perf|refactor|test|chore)/[0-9]+-[a-z0-9-]+$ ]]; then
    exit 0
else
    echo ""
    echo -e "${RED}${BOLD}╔════════════════════════════════════════════════════════════════╗${RESET}"
    echo -e "${RED}${BOLD}║                   BRANCH NAME VALIDATION FAILED                ║${RESET}"
    echo -e "${RED}${BOLD}╚════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""
    echo -e "${YELLOW}  Current branch:${RESET} ${RED}$branch${RESET}"
    echo ""
    echo -e "${CYAN}${BOLD}Required Format:${RESET}"
    echo -e "  ${DIM}<type>/<issue-id>-<short-description>${RESET}"
    echo ""
    echo -e "${CYAN}${BOLD}Branch Types:${RESET}"
    echo -e "  ${GREEN}feat${RESET}     → New feature or enhancement"
    echo -e "  ${GREEN}fix${RESET}      → Bug correction or revert"
    echo -e "  ${GREEN}perf${RESET}     → Performance improvements"
    echo -e "  ${GREEN}refactor${RESET} → Internal code restructuring"
    echo -e "  ${GREEN}test${RESET}     → Adding or modifying tests"
    echo -e "  ${GREEN}chore${RESET}    → Maintenance (build, CI, deps, docs, tooling)"
    echo ""
    echo -e "${CYAN}${BOLD}Examples:${RESET}"
    echo -e "  ${DIM}•${RESET} feat/123-add-weekly-snapshots"
    echo -e "  ${DIM}•${RESET} fix/456-handle-empty-ccusage-output"
    echo -e "  ${DIM}•${RESET} chore/789-update-dependencies"
    echo ""
    exit 1
fi
