# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Builder: instala dependências Python num prefix isolado
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1

# Build deps pra compilar psycopg2, cryptography etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Instala dependências direto do pyproject.toml num prefix
COPY pyproject.toml ./
RUN pip install --prefix=/install .

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Runtime: imagem slim só com o necessário
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/install/bin:$PATH" \
    PYTHONPATH="/install/lib/python3.12/site-packages"

# Runtime deps: libpq5 (psycopg2), curl (health check), tini (reaping)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    tini \
    && rm -rf /var/lib/apt/lists/*

# Copia pacotes Python instalados no builder
COPY --from=builder /install /install

WORKDIR /app

# Copia o código da aplicação
COPY . /app

# Usuário não-root (segurança)
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Render injeta a variável PORT dinamicamente
EXPOSE 8000

# tini como init (reaping de processos zumbis)
ENTRYPOINT ["/usr/bin/tini", "--"]

# Roda migrações antes de subir o servidor
CMD ["sh", "-c", "alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
