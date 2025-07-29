package utils

import (
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/rs/zerolog/log"
)

// UUIDToPgUUID converts a google/uuid.UUID to pgx/v5/pgtype.UUID
func UUIDToPgUUID(u uuid.UUID) pgtype.UUID {
	return pgtype.UUID{
		Bytes: u,
		Valid: true,
	}
}

// PgUUIDToUUID converts a pgx/v5/pgtype.UUID to google/uuid.UUID
func PgUUIDToUUID(pgUUID pgtype.UUID) uuid.UUID {
	return pgUUID.Bytes
}

// IntToPgNumeric converts an int to pgx/v5/pgtype.Numeric
func IntToPgNumeric(num int) pgtype.Numeric {
	var n pgtype.Numeric
	err := n.Scan(num)
	if err != nil {
		log.Error().Err(err).Msg("failed to convert int to pgtype.Numeric")
	}
	return n
}

// Float64ToPgNumeric converts a float64 to pgx/v5/pgtype.Numeric
func Float64ToPgNumeric(num float64) pgtype.Numeric {
	var n pgtype.Numeric
	err := n.Scan(num)
	if err != nil {
		log.Error().Err(err).Msg("failed to convert float64 to pgtype.Numeric")
	}
	return n
}

// PgNumericToFloat64 converts a pgx/v5/pgtype.Numeric to float64
func PgNumericToFloat64(n pgtype.Numeric) float64 {
	if !n.Valid {
		return 0
	}
	result, err := n.Float64Value()
	if err != nil {
		log.Error().Err(err).Msg("failed to convert pgtype.Numeric to float64")
		return 0
	}
	return result.Float64
}

// TimeToPgDate converts a time.Time to pgx/v5/pgtype.Date
func TimeToPgDate(t time.Time) pgtype.Date {
	return pgtype.Date{
		Time:  t,
		Valid: true,
	}
}

// PgDateToTime converts a pgx/v5/pgtype.Date to time.Time
func PgDateToTime(d pgtype.Date) time.Time {
	if !d.Valid {
		return time.Time{}
	}
	return d.Time
}

// TimeToPgTimestamp converts a time.Time to pgx/v5/pgtype.Timestamp
func TimeToPgTimestamp(t time.Time) pgtype.Timestamp {
	return pgtype.Timestamp{
		Time:  t,
		Valid: true,
	}
}

// PgTimestampToTime converts a pgx/v5/pgtype.Timestamp to time.Time
func PgTimestampToTime(ts pgtype.Timestamp) time.Time {
	if !ts.Valid {
		return time.Time{}
	}
	return ts.Time
}

// StringToPgText converts a string to pgx/v5/pgtype.Text
func StringToPgText(s string) pgtype.Text {
	return pgtype.Text{
		String: s,
		Valid:  s != "",
	}
}

// PgTextToString converts a pgx/v5/pgtype.Text to string
func PgTextToString(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}

// BoolToPgBool converts a bool to pgx/v5/pgtype.Bool
func BoolToPgBool(b bool) pgtype.Bool {
	return pgtype.Bool{
		Bool:  b,
		Valid: true,
	}
}

// PgBoolToBool converts a pgx/v5/pgtype.Bool to bool
func PgBoolToBool(pb pgtype.Bool) bool {
	if !pb.Valid {
		return false
	}
	return pb.Bool
}

// NullableStringToPgText converts a nullable string to pgx/v5/pgtype.Text
func NullableStringToPgText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{
		String: *s,
		Valid:  true,
	}
}

// NullableIntToPgNumeric converts a nullable int to pgx/v5/pgtype.Numeric
func NullableIntToPgNumeric(i *int) pgtype.Numeric {
	if i == nil {
		return pgtype.Numeric{Valid: false}
	}
	var n pgtype.Numeric
	err := n.Scan(*i)
	if err != nil {
		log.Error().Err(err).Msg("failed to convert nullable int to pgtype.Numeric")
		return pgtype.Numeric{Valid: false}
	}
	return n
}

// NullableUUIDToPgUUID converts a nullable UUID to pgx/v5/pgtype.UUID
func NullableUUIDToPgUUID(u *uuid.UUID) pgtype.UUID {
	if u == nil {
		return pgtype.UUID{Valid: false}
	}
	return pgtype.UUID{
		Bytes: *u,
		Valid: true,
	}
}

// PgNumericToInt converts a pgx/v5/pgtype.Numeric to int
func PgNumericToInt(n pgtype.Numeric) int {
	if !n.Valid {
		return 0
	}
	result, err := n.Int64Value()
	if err != nil {
		log.Error().Err(err).Msg("failed to convert pgtype.Numeric to int")
		return 0
	}
	return int(result.Int64)
}

// TimeToPgTimestamptz converts a time.Time to pgx/v5/pgtype.Timestamptz
func TimeToPgTimestamptz(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{
		Time:  t,
		Valid: true,
	}
}

// PgTimestamptzToTime converts a pgx/v5/pgtype.Timestamptz to time.Time
func PgTimestamptzToTime(ts pgtype.Timestamptz) time.Time {
	if !ts.Valid {
		return time.Time{}
	}
	return ts.Time
}
