.PHONY: build start stop restart logs

build:
	docker compose build --no-cache

start:
	docker compose up -d

stop:
	docker compose down

restart:
	docker compose down
	docker compose up -d

logs:
	docker compose logs -f api
