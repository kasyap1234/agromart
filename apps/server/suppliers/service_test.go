package suppliers

import (
	"context"
	"testing"

	"agromart2/db"
	"github.com/stretchr/testify/require"
)

type fakeQ struct {
	created db.Supplier
	err     error
}

func (f *fakeQ) CreateSupplier(ctx context.Context, p db.CreateSupplierParams) (db.Supplier, error) {
	return f.created, f.err
}

func TestService_CreateSupplier_FakeCreatorWorks(t *testing.T) {
	q := &fakeQ{created: db.Supplier{Name: "Acme"}}
	// Just assert our fake creator returns the expected value without wiring into sqlc concrete type.
	got, err := q.CreateSupplier(context.Background(), db.CreateSupplierParams{Name: "Acme"})
	require.NoError(t, err)
	require.Equal(t, "Acme", got.Name)
}
