# syntax=docker/dockerfile:1

# ---------- deps: cache go modules ----------
FROM golang:1.24.5-alpine AS deps
RUN apk add --no-cache git ca-certificates tzdata build-base
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

# ---------- builder: generate sqlc and build ----------
FROM golang:1.24.5-alpine AS builder
RUN apk add --no-cache git ca-certificates tzdata build-base
# sqlc for generation
RUN go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
# migrate cli (postgres build tag)
RUN go install -tags "postgres" github.com/golang-migrate/migrate/v4/cmd/migrate@latest
WORKDIR /app
COPY --from=deps /go /go
COPY --from=deps /usr/local/go /usr/local/go
COPY . .
# Ensure sqlc is runnable and generate
RUN if [ -f sqlc.yaml ] || [ -f sqlc.yml ]; then sqlc generate; else echo "no sqlc config, skipping"; fi
# Build server (static)
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/main ./apps/server

# ---------- runtime: minimal image with binary and migrations ----------
FROM alpine:3.19 AS runtime
RUN apk --no-cache add ca-certificates tzdata bash wget curl
WORKDIR /root/
# copy binary and migrate cli + migrations
COPY --from=builder /out/main ./main
COPY --from=builder /go/bin/migrate /usr/local/bin/migrate
COPY --from=builder /app/apps/server/sql/schema ./sql/schema
# non-root
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup && chown -R appuser:appgroup /root
USER appuser
EXPOSE 8080
ENTRYPOINT ["./main"]
