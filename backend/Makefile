	.PHONY: install run test lint format typecheck docker-build docker-run compose-up compose-down

install:
	python3 -m pip install --upgrade pip
	pip install -e .[dev]

run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest

lint:
	ruff check app tests

format:
	ruff format app tests

typecheck:
	mypy app

docker-build:
	docker build -t esri-fast-api .

docker-run:
	docker run --rm -p 8000:8000 --env-file .env esri-fast-api

compose-up:
	docker compose up --build

compose-down:
	docker compose down --remove-orphans
