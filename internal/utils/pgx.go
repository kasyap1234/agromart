package utils

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// PGX provides simple conversions for nullable pgx types
type PGX struct{}

var P PGX

// Numeric converts int to pgtype.Numeric (for nullable numeric fields)
func (PGX) Numeric(i int) pgtype.Numeric {
	var n pgtype.Numeric
	n.Scan(i)
	return n
}

// NumericPtr converts *int to pgtype.Numeric
func (PGX) NumericPtr(i *int) pgtype.Numeric {
	if i == nil {
		return pgtype.Numeric{Valid: false}
	}
	var n pgtype.Numeric
	n.Scan(*i)
	return n
}

// Text converts string to pgtype.Text (for nullable text fields)
func (PGX) Text(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: s != ""}
}

// TextPtr converts *string to pgtype.Text
func (PGX) TextPtr(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *s, Valid: true}
}

// UUID converts uuid.UUID to pgtype.UUID (for nullable UUID fields)
func (PGX) UUID(u uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: u, Valid: true}
}

// UUIDPtr converts *uuid.UUID to pgtype.UUID
func (PGX) UUIDPtr(u *uuid.UUID) pgtype.UUID {
	if u == nil {
		return pgtype.UUID{Valid: false}
	}
	return pgtype.UUID{Bytes: *u, Valid: true}
}

// Bool converts bool to pgtype.Bool
func (PGX) Bool(b bool) pgtype.Bool {
	return pgtype.Bool{Bool: b, Valid: true}
}

// BoolPtr converts *bool to pgtype.Bool
func (PGX) BoolPtr(b *bool) pgtype.Bool {
	if b == nil {
		return pgtype.Bool{Valid: false}
	}
	return pgtype.Bool{Bool: *b, Valid: true}
}
