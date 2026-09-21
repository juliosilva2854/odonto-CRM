#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data.
# The testing data must be entered in yaml format Below is the data structure:
#
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main Agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Test Result File Updates:
#    - Main Agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 3. Incorporate User Feedback:
#    - When testing agent reports issues, main agent should carefully review the work and verify
#      the fixes are correct
#    - Do not fix minor issues as suggested by the testing agent
#    - Never fix something which has already been fixed by testing agent
#
# 4. Testing Protocol:
#    - Main agent MUST test BACKEND first
#    - After backend testing is done, STOP to ask the user whether to test frontend or not
#    - ONLY test frontend if user asks to test frontend
#    - NEVER invoke frontend testing without explicit user permission

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

user_problem_statement: >
  odonto-CRM (Dental CRM multi-tenant, FastAPI + SQLAlchemy 2 async + Postgres + Alembic).
  Task: add subscription/billing support to Clinic — Alembic migration 0006_subscription
  (5 new columns on clinics, enum subscriptionstatus, 2 indexes, backfill legacy clinics to 'active'),
  SubscriptionStatus enum + Clinic fields in tenancy/models.py, ClinicOut fields in tenancy/schemas.py,
  TenancyService.is_subscription_active() in tenancy/service.py.
  Validation environment: local Postgres 15 installed via apt (disposable), DB dental_crm,
  user dental/dental, backend/.env created (gitignored). NO Docker available in this environment.

backend:
  - task: "Migration 0006_subscription — upgrade/downgrade/backfill"
    implemented: true
    working: true
    file: "backend/alembic/versions/0006_subscription.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: >
            Ran manually against local Postgres: alembic upgrade head (0001->0006) OK, \d clinics shows
            5 columns + ix_clinics_subscription_status + partial UNIQUE uq_clinics_stripe_customer_id,
            enum subscriptionstatus has 4 values, downgrade to 0005_quotes removes columns/indexes/type,
            re-upgrade OK, backfill sets pre-existing clinic to 'active'. Needs independent verification.
        - working: true
          agent: "testing"
          comment: >
            ✓ VERIFIED ALL 9 STEPS: (1) alembic current shows 0006_subscription (head), history shows
            0005_quotes->0006_subscription chain. (2) \d clinics has all 5 columns (trial_ends_at timestamptz null,
            subscription_status subscriptionstatus NOT NULL default 'trialing', stripe_customer_id varchar(255),
            stripe_subscription_id varchar(255), current_period_end timestamptz), both indexes
            (ix_clinics_subscription_status, uq_clinics_stripe_customer_id partial UNIQUE), \dT+ subscriptionstatus
            lists all 4 values (trialing, active, past_due, canceled). (3) Downgrade to 0005_quotes successfully
            removed all 5 columns, both indexes, and enum type. (4) Backfill test: inserted clinic at 0005,
            upgraded to head, clinic has subscription_status='active' (backfill worked). (5) New clinic default:
            inserted clinic at 0006, subscription_status='trialing' (server_default works). (6) Partial unique
            index: two NULLs allowed, duplicate non-null 'cus_A' rejected with unique constraint violation.
            (7) Enum guard: UPDATE to 'bogus' rejected with "invalid input value for enum subscriptionstatus".
            (8) ORM/service test via Python script with real AsyncSession: is_subscription_active() returned
            correct values for all 6 cases (active=True, trial_future=True, trial_expired=False, trial_null=False,
            past_due=False, canceled=False); ClinicOut.model_validate() includes subscription_status/trial_ends_at/
            current_period_end and correctly excludes stripe_customer_id/stripe_subscription_id. (9) Cleanup:
            deleted all test clinics, DB at head. Migration and ORM layer fully verified.

  - task: "Clinic model / SubscriptionStatus enum / ClinicOut schema / is_subscription_active()"
    implemented: true
    working: true
    file: "backend/src/modules/tenancy/models.py, schemas.py, service.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: >
            Unit-tested with fake session: active->True, trialing future->True, trialing expired->False,
            trialing null->False, past_due->False, canceled->False. ClinicOut hides stripe_* fields.
            Needs verification against the real DB via async session.
        - working: true
          agent: "testing"
          comment: >
            ✓ VERIFIED via real AsyncSession against local Postgres: TenancyService.is_subscription_active()
            correctly implements business logic for all 6 subscription states (active always True, trialing
            with future trial_ends_at True, trialing with expired trial_ends_at False, trialing with NULL
            trial_ends_at False, past_due False, canceled False). ClinicOut schema correctly exposes
            subscription_status/trial_ends_at/current_period_end and excludes stripe_customer_id/
            stripe_subscription_id (verified via model_validate and model_dump). All tests passed.

frontend: []

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus:
    - "Migration 0006_subscription — upgrade/downgrade/backfill"
    - "Clinic model / SubscriptionStatus enum / ClinicOut schema / is_subscription_active()"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: >
        Backend-only validation, NO HTTP routes exist for this feature yet (do not test API endpoints).
        Postgres 15 is running locally (service postgresql). Use `cd /app/backend && alembic ...` and
        `su - postgres -c "psql -d dental_crm -c '...'"`. Do NOT use docker. Do NOT modify project files.
        Verify: (1) alembic current == 0006_subscription (head); (2) downgrade 0005_quotes -> columns,
        indexes and type subscriptionstatus gone; (3) insert a clinic while at 0005, upgrade head ->
        that clinic has subscription_status='active' (backfill); (4) a clinic inserted AFTER 0006 gets
        server_default 'trialing'; (5) uq_clinics_stripe_customer_id: two NULLs allowed, duplicate
        non-null rejected; (6) invalid enum value rejected; (7) run TenancyService.is_subscription_active
        via real AsyncSession (DATABASE_URL in backend/.env) for the 6 cases; (8) ClinicOut.model_validate
        from ORM object excludes stripe_customer_id/stripe_subscription_id. Leave DB at head when done.
    - agent: "testing"
      message: >
        ✓ COMPLETE: All 9 verification steps passed. Migration 0006_subscription upgrade/downgrade/backfill
        works correctly. DB schema matches specification (5 columns, 2 indexes, enum with 4 values).
        Partial unique index on stripe_customer_id works (multiple NULLs allowed, duplicate non-null rejected).
        Enum constraint enforced. ORM layer verified via real AsyncSession: TenancyService.is_subscription_active()
        implements correct business logic for all 6 subscription states. ClinicOut schema correctly exposes
        subscription fields and hides Stripe internal IDs. DB left at head (0006_subscription). No issues found.
