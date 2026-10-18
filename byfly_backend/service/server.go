package service

import (
	"context"
	"encoding/json"
	"github.com/jackc/pgx/v5/pgxpool"
	"net/http"
	"time"
)

// Server contains shared service dependencies and the health endpoint.
type Server struct{ DB *pgxpool.Pool }

func (s *Server) Health(w http.ResponseWriter, r *http.Request) {
	if err := s.DB.Ping(r.Context()); err != nil {
		Error(w, 503, "database unavailable")
		return
	}
	JSON(w, 200, map[string]string{"status": "ok"})
}
func decode(r *http.Request, dst any) error { return json.NewDecoder(r.Body).Decode(dst) }
func ctxTimeout(r *http.Request) (context.Context, context.CancelFunc) {
	return context.WithTimeout(r.Context(), 5*time.Second)
}
