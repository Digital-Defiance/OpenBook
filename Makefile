build:
	docker build -t node-gitdb:latest .

build-nocache:
	docker build --no-cache -t node-gitdb:latest .

run:
	docker run -p 3000:3000 -d node-gitdb:latest

run-interactive:
	docker run \
	--env GITDB_REPO="${GITDB_REPO}" \
	--env GITDB_REPO_RECURSIVE="${GITDB_REPO_RECURSIVE}" \
	--env GITDB_REPO_BRANCH="${GITDB_REPO_BRANCH}" \
	--env GITDB_PATH="${GITDB_PATH}" \
	--env MONGO_URI="${MONGO_URI}" \
	--publish 3000:3000 \
	--interactive --tty \
	node-gitdb:latest

run-bash-interactive:
	docker run -p 3000:3000 -it node-gitdb:latest bash

stop:
	docker stop $$(docker ps -q --filter ancestor=node-gitdb:latest --format="{{.ID}}")

devcontainer-up:
	docker-compose --env-file .devcontainer/.env -f .devcontainer/docker-compose.yml up devcontainer-mongo-1