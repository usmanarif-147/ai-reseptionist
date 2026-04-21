# ──────────────────────────────────────────────────────────────────────────
#  AI Receptionist — developer commands
#  Run `make help` to see what's available.
# ──────────────────────────────────────────────────────────────────────────

DC      := docker compose
DB_SVC  := db
DB_USER := supabase_admin
DB_NAME := postgres
MIG_DIR := volumes/db

# Migrations NOT covered by docker-entrypoint-initdb.d mounts.
# (Baseline migrations — roles, jwt, subscriptions, phase3, phase4 —
#  are auto-run by Postgres on first container init.)
EXTRA_MIGRATIONS := \
    imp-01-schema.sql \
    imp-02-schema.sql \
    imp03-appointments.sql \
    imp03-payment-type.sql \
    imp-04-schema.sql \
    imp-05-appointment-module.sql \
    appearance-settings.sql \
    wimp-02-schema.sql \
    ws-04-widget-appearance.sql \
    phase5-customer-capture.sql \
    wimp-03-schema.sql \
    wimp-03-widget-opens.sql \
    wimp-05-chat-history.sql \
    wimp-06-booking-bridge.sql \
    wimp-07-schema-cleanup.sql

SEEDS := \
    seed-botox-clinic.sql \
    seed-dental-clinic.sql

.DEFAULT_GOAL := help

.PHONY: help \
        up down restart build rebuild \
        status ps \
        logs logs-app logs-db logs-kong logs-auth logs-tail \
        psql shell-app \
        migrate seed \
        reset-data fresh \
        nuke reinit \
        prune

# ─── Help ─────────────────────────────────────────────────────────────────

help: ## Show available commands
	@echo ""
	@echo "  AI Receptionist — dev commands"
	@echo "  ──────────────────────────────"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""
	@echo "  Typical flows:"
	@echo "    make up            Start everything"
	@echo "    make fresh         Wipe DB + reapply all migrations (keeps images)"
	@echo "    make reinit        Full teardown + fresh containers + migrate"
	@echo "    make logs-app      Tail Next.js logs"
	@echo ""

# ─── Lifecycle ────────────────────────────────────────────────────────────

up: ## Start all containers (build if image missing)
	$(DC) up -d

down: ## Stop containers, keep data
	$(DC) down

restart: ## Restart every service
	$(DC) restart

build: ## Build the Next.js image
	$(DC) build nextjs

rebuild: ## Rebuild Next.js image with no cache
	$(DC) build --no-cache nextjs

# ─── Status & logs ────────────────────────────────────────────────────────

status: ## Show container state, ports, health
	@$(DC) ps

ps: status

logs: ## Follow logs from all services (last 100)
	$(DC) logs -f --tail=100

logs-app: ## Follow Next.js logs (last 200)
	$(DC) logs -f --tail=200 nextjs

logs-db: ## Follow database logs (last 200)
	$(DC) logs -f --tail=200 $(DB_SVC)

logs-kong: ## Follow Kong gateway logs
	$(DC) logs -f --tail=100 kong

logs-auth: ## Follow GoTrue auth logs
	$(DC) logs -f --tail=100 auth

logs-tail: ## Dump last 300 lines from all services (no follow)
	$(DC) logs --tail=300

# ─── Interactive shells ───────────────────────────────────────────────────

psql: ## Open a psql session in the db container
	$(DC) exec $(DB_SVC) sh -c 'PGPASSWORD=$$POSTGRES_PASSWORD psql -U $(DB_USER) -d $(DB_NAME)'

shell-app: ## Open a shell inside the Next.js container
	$(DC) exec nextjs sh

# ─── Database ─────────────────────────────────────────────────────────────

migrate: ## Apply every post-init migration in order
	@echo ""
	@echo "Applying migrations not covered by docker-entrypoint-initdb.d..."
	@for f in $(EXTRA_MIGRATIONS); do \
	    printf "  → %s\n" $$f; \
	    $(DC) exec -T $(DB_SVC) sh -c 'PGPASSWORD=$$POSTGRES_PASSWORD psql -U $(DB_USER) -d $(DB_NAME) -v ON_ERROR_STOP=1 -q' < $(MIG_DIR)/$$f || exit 1; \
	done
	@echo ""
	@echo "✓ Migrations applied."

seed: ## Insert demo businesses (botox + dental)
	@for f in $(SEEDS); do \
	    printf "  → %s\n" $$f; \
	    $(DC) exec -T $(DB_SVC) sh -c 'PGPASSWORD=$$POSTGRES_PASSWORD psql -U $(DB_USER) -d $(DB_NAME) -v ON_ERROR_STOP=1 -q' < $(MIG_DIR)/$$f || exit 1; \
	done

# ─── Full resets ──────────────────────────────────────────────────────────

reset-data: ## Drop the db volume (every row gone, images kept)
	@echo "⚠  Deleting db_data volume — all rows gone."
	$(DC) down -v

fresh: reset-data up ## Empty data, bring services back up, run all migrations
	@echo "Waiting for db to be healthy..."
	@until $(DC) exec -T $(DB_SVC) pg_isready -U $(DB_USER) >/dev/null 2>&1; do sleep 1; done
	@$(MAKE) migrate
	@echo ""
	@echo "✓ Database is fresh and fully migrated."

reinit: nuke up ## Full teardown (containers + volumes + orphans) then up + migrate
	@echo "Waiting for db to be healthy..."
	@until $(DC) exec -T $(DB_SVC) pg_isready -U $(DB_USER) >/dev/null 2>&1; do sleep 1; done
	@$(MAKE) migrate
	@echo ""
	@echo "✓ Containers reinitialised with fresh schema."

# ─── Cleanup ──────────────────────────────────────────────────────────────

nuke: ## Remove containers + volumes + orphans (keeps images)
	$(DC) down -v --remove-orphans

prune: ## Project nuke + global docker prune (dangling images/volumes/networks)
	$(DC) down -v --remove-orphans --rmi local
	docker system prune -f --volumes
