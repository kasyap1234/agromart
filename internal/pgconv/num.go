package pgconv

import (
	"fmt"
	"math/big"

	"github.com/jackc/pgx/v5/pgtype"
)

// NumericFromInt converts an int to a non-null pgtype.Numeric.
// It encodes the integer exactly using a decimal string to avoid float precision.
func NumericFromInt(v int) pgtype.Numeric {
	// Represent as decimal string to let pgtype parse precisely.
	s := fmt.Sprintf("%d", v)
	var n pgtype.Numeric
	_ = n.Scan(s)
	// Ensure Valid true if value provided
	n.Valid = true
	return n
}

// NumericPtrFromInt converts an *int to a pgtype.Numeric pointer-like value using Valid flag.
// When nil, returns an invalid (NULL) Numeric.
func NumericPtrFromInt(v *int) pgtype.Numeric {
	if v == nil {
		return pgtype.Numeric{Valid: false}
	}
	return NumericFromInt(*v)
}

// NumericFromBigInt builds a non-null Numeric from *big.Int for callers with larger values.
func NumericFromBigInt(v *big.Int) pgtype.Numeric {
	if v == nil {
		return pgtype.Numeric{Valid: false}
	}
	var n pgtype.Numeric
	_ = n.Scan(v.String())
	n.Valid = true
	return n
}

// TextFromString converts a string to a non-null pgtype.Text.
// Empty string is considered a valid empty text, not NULL.
func TextFromString(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: true}
}

// TextPtrFromString converts optional string pointer to pgtype.Text (NULL when nil).
func TextPtrFromString(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{Valid: false}
	}
	return TextFromString(*s)
}