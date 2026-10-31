SHELL := /bin/bash
.DEFAULT_GOAL := help
.PHONY: help repo onboard role setup contracts mock-api dev smoke ship

help: ## list targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-10s %s\n", $$1, $$2}'

repo: ## repo owner, after /blueprint: create the GitHub repo, invite team.txt: make repo NAME=<name>
	@./scripts/repo.sh "$(NAME)"

onboard: ## teammate, once after cloning: .env, deps, role: make onboard ROLE=<role>
	@./scripts/onboard.sh "$(ROLE)"

role: ## save your role (from PLAN.md): make role ROLE=<role>
	@roles=$$(sed -n 's/^## Role: \([^ ]*\).*/\1/p' .hackathon/PLAN.md | tr '\n' ' '); \
	if [ -z "$$roles" ]; then echo "no roles in .hackathon/PLAN.md yet (/blueprint writes them)"; exit 1; fi; \
	if ! printf '%s\n' $$roles | grep -qx "$(ROLE)"; then echo "usage: make role ROLE=<one of: $$roles>"; exit 1; fi; \
	echo "$(ROLE)" > .hack-role && echo "role = $(ROLE)"

setup: ## install Python (+ web, if present) deps
	uv sync
	@if [ -f web/package.json ]; then npm --prefix web install --no-audit --no-fund; fi
	@uv run python scripts/gen_contracts.py

contracts: ## check fixtures against contracts/, write OpenAPI + web TS types
	@uv run python scripts/gen_contracts.py

mock-api: ## fake API from contracts/fixtures on :8001
	@uv run python scripts/mock_api.py

dev: ## run api (:8000) + web (:5173, if present)
	@trap 'kill 0' EXIT; \
	uv run uvicorn api.main:app --reload --port $${API_PORT:-8000} & \
	if [ -f web/package.json ]; then npm --prefix web run dev & fi; \
	wait

smoke: ## contracts + lint + tests (+ web build, if present): the check before every push
	@uv run python scripts/gen_contracts.py
	uv run ruff check .
	uv run pytest -q || [ $$? -eq 5 ]
	@if [ -f web/package.json ]; then npm --prefix web run build; fi

ship: ## rebase on origin/main, smoke, push
	git fetch origin && git rebase origin/main
	$(MAKE) smoke
	git push origin HEAD:main
