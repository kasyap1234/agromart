package products

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestToUpdateProductPatchParms(t *testing.T) {
	name := "New"
	price := 200
	req := ProductInputRequest{
		Name:  &name,
		Price: &price,
	}
	p := ToUpdateProductPatchParms(req, uuid.New(), uuid.New())
	require.NotNil(t, p.Name)
	require.NotNil(t, p.Price)
}
