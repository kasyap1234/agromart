 //go:build tools
package testutil

import (
"agromart/apps/server"
"github.com/labstack/echo/v4"
)

// NewAppForTest wires an Echo instance with routes (no external side effects) for handler tests.
func NewAppForTest(e *echo.Echo) *server.App {
app := server.NewApp(e)
return app
}
