package models

// Role represents a user role as a string-backed enum.
// The database uses a Postgres enum type; in Go we model it as string.
type Role string

const (
	RoleAdmin   Role = "admin"
	RoleBuyer   Role = "buyer"
	RoleSeller  Role = "seller"
	RoleManager Role = "manager"
	RoleStaff   Role = "staff"
)

func (r Role) String() string { return string(r) }