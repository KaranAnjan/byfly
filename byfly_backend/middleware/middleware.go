package middleware

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/byfly/byfly-backend/auth"
)

type rateWindow struct {
	started time.Time
	count   int
}

// RateLimit applies a fixed one-second request window per authenticated user.
// Unauthenticated requests are limited per remote IP address.
func RateLimit(requestsPerSecond int) func(http.Handler) http.Handler {
	return rateLimit(requestsPerSecond, time.Second, "rate limit exceeded: maximum %d requests per second", clientKey)
}

// LoginRateLimit applies a separate fixed one-minute window per remote IP.
func LoginRateLimit(attemptsPerMinute int) func(http.Handler) http.Handler {
	return rateLimit(attemptsPerMinute, time.Minute, "login rate limit exceeded: maximum %d attempts per minute", ipKey)
}

func rateLimit(limit int, windowDuration time.Duration, message string, keyFunc func(*http.Request) string) func(http.Handler) http.Handler {
	if limit < 1 {
		limit = 20
	}
	var mu sync.Mutex
	clients := make(map[string]rateWindow)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := keyFunc(r)
			now := time.Now()
			mu.Lock()
			window := clients[key]
			if window.started.IsZero() || now.Sub(window.started) >= windowDuration {
				window = rateWindow{started: now}
			}
			window.count++
			clients[key] = window
			allowed := window.count <= limit
			// Keep the in-memory map bounded when old clients stop sending traffic.
			if len(clients) > 10000 {
				for client, item := range clients {
					if now.Sub(item.started) >= windowDuration {
						delete(clients, client)
					}
				}
			}
			mu.Unlock()

			if !allowed {
				w.Header().Set("Content-Type", "application/json")
				retryAfter := "1"
				if windowDuration >= time.Minute {
					retryAfter = "60"
				}
				w.Header().Set("Retry-After", retryAfter)
				w.WriteHeader(http.StatusTooManyRequests)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf(message, limit)})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func clientKey(r *http.Request) string {
	if identity, ok := auth.FromContext(r.Context()); ok && identity.ID != "" {
		return "user:" + identity.ID
	}
	return ipKey(r)
}

func ipKey(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		return "ip:" + host
	}
	return "ip:" + r.RemoteAddr
}

func CORS(origins []string) func(http.Handler) http.Handler {
	allowed := map[string]bool{}
	for _, origin := range origins {
		allowed[strings.TrimSpace(origin)] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if allowed[origin] || allowed["*"] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
			}
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-User-ID, X-User-Email")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		next.ServeHTTP(w, r)
	})
}
func RequestLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}
