package config

import (
	"fmt"
)

func SetConnectionString(host, user, password, name string, port int) string {
	if host == "" || user == "" || password == "" || name == "" || port == 0 {
		return ""
	}

	connStr := fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=disable",
		user, password, host, port, name,
	)

	return connStr
}
