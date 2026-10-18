package auth

import (
	"context"
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
	"net/http"
	"strings"
	"time"
)

type Identity struct{ ID, Email, Role string }
type contextKey struct{}

func Middleware(secret string, development bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var id, email, role string
			raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
			if raw != "" && secret != "" {
				if token, err := jwt.Parse(raw, func(t *jwt.Token) (any, error) { return []byte(secret), nil }); err == nil && token.Valid {
					if claims, ok := token.Claims.(jwt.MapClaims); ok {
						if v, ok := claims["sub"].(string); ok {
							id = v
						}
						if v, ok := claims["email"].(string); ok {
							email = v
						}
						if v, ok := claims["role"].(string); ok {
							role = v
						}
					}
				}
			}
			if id == "" && development {
				id, email = r.Header.Get("X-User-ID"), r.Header.Get("X-User-Email")
			}
			if id != "" {
				r = r.WithContext(context.WithValue(r.Context(), contextKey{}, Identity{ID: id, Email: email, Role: role}))
			}
			next.ServeHTTP(w, r)
		})
	}
}

func IssueToken(secret string, id, email, role string) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": id, "email": email, "role": role, "exp": time.Now().Add(24 * time.Hour).Unix()}).SignedString([]byte(secret))
}
func HashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(b), err
}
func CheckPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
func SeedSuperadmins(ctx context.Context, pool *pgxpool.Pool) error {
	hash, err := HashPassword("admin123")
	if err != nil {
		return err
	}
	for _, email := range []string{"anjankaran246@gmail.com", "bejbiswajit229@gmail.com"} {
		var id string
		err = pool.QueryRow(ctx, `SELECT id FROM users WHERE lower(email)=lower($1) ORDER BY created_at LIMIT 1`, email).Scan(&id)
		if err == pgx.ErrNoRows {
			id = "superadmin:" + email
			_, err = pool.Exec(ctx, `INSERT INTO users(id,email,is_active,is_admin,role,password_hash) VALUES($1,$2,true,true,'superadmin',$3)`, id, email, hash)
		} else if err == nil {
			_, err = pool.Exec(ctx, `UPDATE users SET is_active=true,is_admin=true,role='superadmin',password_hash=COALESCE(password_hash,$1),updated_at=now() WHERE id=$2`, hash, id)
		}
		if err != nil {
			return fmt.Errorf("seed superadmin %s: %w", email, err)
		}
	}
	return nil
}
func FromContext(ctx context.Context) (Identity, bool) {
	v, ok := ctx.Value(contextKey{}).(Identity)
	return v, ok
}
func Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := FromContext(r.Context()); !ok {
			http.Error(w, `{"error":"authentication required"}`, http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}
func RequireSuperadmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity, ok := FromContext(r.Context())
		if !ok || !(identity.Role == "superadmin" || identity.Role == "admin" || identity.Email == "anjankaran246@gmail.com" || identity.Email == "bejbiswajit229@gmail.com") {
			http.Error(w, `{"error":"superadmin access required"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
