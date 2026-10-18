package controllers

import (
	"context"
	"encoding/json"
	firebaseauth "firebase.google.com/go/v4/auth"
	"github.com/byfly/byfly-backend/storage"
	"github.com/jackc/pgx/v5/pgxpool"
	"net/http"
	"time"
)

// Controller contains the PostgreSQL dependency used by the data controllers.
type Controller struct {
	DB               *pgxpool.Pool
	S3               *storage.S3
	JWTSecret        string
	FirebaseAuth     *firebaseauth.Client
	MaxProductImages int
}

func decode(r *http.Request, dst any) error { return json.NewDecoder(r.Body).Decode(dst) }
func ctxTimeout(r *http.Request) (context.Context, context.CancelFunc) {
	return context.WithTimeout(r.Context(), 5*time.Second)
}
