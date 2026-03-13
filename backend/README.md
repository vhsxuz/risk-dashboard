# ESRI FastAPI Starter

FastAPI project skeleton with sensible defaults for building lightweight services. It includes
structured settings management, simple health + echo routes, pytest + httpx tests, and linting
with Ruff + mypy.

## Requirements

- Python 3.10+
- `pip` (or another installer such as `uv`/`pipx`)

## Quickstart

```bash
python3 -m venv .venv
source .venv/bin/activate
make install
make run
```

Visit `http://127.0.0.1:8000/docs` for the interactive Swagger UI once the dev server starts.

## Docker

```bash
make docker-build
make docker-run
```

The runtime picks up environment variables via the root `.env` file by default when you pass it
through `docker run --env-file .env`. Override values (for example `APP_ENVIRONMENT=production`)
before running the container to customize behavior.

## Docker Compose

`docker compose up --build` (or `make compose-up`) will build the image, load variables from `.env`,
and expose the service on `http://127.0.0.1:8000`. Tear everything down with `docker compose down`
or `make compose-down`.

## Project Layout

```
app/
  config.py          # pydantic-settings powered configuration
  main.py            # FastAPI factory + middleware + router registration
  api/routes.py      # example health + echo endpoints
  schemas.py         # pydantic models shared by routes

tests/
  conftest.py        # Async httpx client fixture
  test_routes.py     # coverage for sample endpoints
```

## Useful Commands

| Command        | Purpose                               |
| -------------- | ------------------------------------- |
| `make install` | Install project + dev dependencies    |
| `make run`     | Launch Uvicorn with reload            |
| `make test`    | Run pytest suite                      |
| `make lint`    | Run Ruff lint checks                  |
| `make format`  | Format with Ruff                      |
| `make typecheck` | Run mypy over `app/`                |
| `make docker-build` | Build the production Docker image |
| `make docker-run` | Run the built image with `.env`     |
| `make compose-up` | `docker compose up --build` wrapper |
| `make compose-down` | Stop/remove compose stack         |

## Configuration

Runtime settings live in `app/config.py` and can be overridden by environment variables prefixed
with `APP_`. Example:

```bash
export APP_ENVIRONMENT=production
export APP_DEBUG=true
uvicorn app.main:app --host 0.0.0.0 --port 8080
uvicorn app.main:app --port 8080
```

To add secrets, create a local `.env` file (ignored by git) with lines like `APP_APP_NAME="My API"`.
