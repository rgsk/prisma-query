#!/bin/bash

docker rm -f prisma-query-db

docker run \
	--rm \
	-p 5432:5432 \
	--name prisma-query-db \
	-e POSTGRES_PASSWORD=postgres \
	-e POSTGRES_USER=postgres \
	-e POSTGRES_DB=postgres \
	-d postgres:14
