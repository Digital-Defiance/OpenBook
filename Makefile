build:
	docker build -t openbook:latest .

build-nocache:
	docker build --no-cache -t openbook:latest .

run:
	docker run -p 3000:3000 -d openbook:latest

run-interactive:
	docker run \
	--env GITDB_REPO="${GITDB_REPO}" \
	--env GITDB_REPO_RECURSIVE="${GITDB_REPO_RECURSIVE}" \
	--env GITDB_REPO_BRANCH="${GITDB_REPO_BRANCH}" \
	--env GITDB_PATH="${GITDB_PATH}" \
	--env MONGO_URI="${MONGO_URI}" \
	--publish 3000:3000 \
	--interactive --tty \
	openbook:latest

run-bash-interactive:
	docker run -p 3000:3000 -it openbook:latest bash

stop:
	docker stop $$(docker ps -q --filter ancestor=openbook:latest --format="{{.ID}}")

devcontainer-up:
	docker-compose --env-file .devcontainer/.env -f .devcontainer/docker-compose.yml up devcontainer-mongo-1