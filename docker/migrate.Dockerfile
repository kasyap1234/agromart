FROM golang:1.23-alpine

RUN apk add --no-cache git

RUN go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

ENTRYPOINT ["migrate"]