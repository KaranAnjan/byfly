package controllers

import (
	"github.com/byfly/byfly-backend/auth"
	"github.com/jackc/pgx/v5"
	"log"
	"net/http"
	"strings"
)

type loginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Controller) Login(w http.ResponseWriter, r *http.Request) {
	var in loginInput
	if decode(r, &in) != nil {
		Error(w, 400, "invalid login request")
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	var id, email, role, hash string
	var active bool
	err := s.DB.QueryRow(r.Context(), `SELECT id,email,role,password_hash,is_active FROM users WHERE lower(email)=lower($1)`, in.Email).Scan(&id, &email, &role, &hash, &active)
	if err != nil || !active || !auth.CheckPassword(hash, in.Password) {
		Error(w, 401, "invalid email or password")
		return
	}
	token, err := auth.IssueToken(s.JWTSecret, id, email, role)
	if err != nil {
		Error(w, 500, "could not issue token")
		return
	}
	JSON(w, 200, map[string]any{"token": token, "user": map[string]string{"id": id, "email": email, "role": role}})
}

func (s *Controller) Register(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
	}
	if decode(r, &in) != nil || strings.TrimSpace(in.Email) == "" || len(in.Password) < 6 {
		Error(w, 400, "email and a password of at least 6 characters are required")
		return
	}
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		Error(w, 500, "could not secure password")
		return
	}
	email := strings.ToLower(strings.TrimSpace(in.Email))
	var id string
	err = s.DB.QueryRow(r.Context(), `INSERT INTO users(id,email,name,password_hash,role) VALUES(gen_random_uuid()::text,$1,$2,$3,'customer') RETURNING id`, email, strings.TrimSpace(in.Name), hash).Scan(&id)
	if err != nil {
		Error(w, 409, "email is already registered")
		return
	}
	token, err := auth.IssueToken(s.JWTSecret, id, email, "customer")
	if err != nil {
		Error(w, 500, "could not create session")
		return
	}
	JSON(w, 201, map[string]any{"token": token, "user": map[string]any{"id": id, "email": email, "name": strings.TrimSpace(in.Name), "role": "customer"}})
}

func (s *Controller) FirebaseLogin(w http.ResponseWriter, r *http.Request) {
	if s.FirebaseAuth == nil {
		Error(w, 503, "Firebase authentication is not configured")
		return
	}
	var in struct {
		IDToken string `json:"id_token"`
		Name    string `json:"name"`
	}
	if decode(r, &in) != nil || strings.TrimSpace(in.IDToken) == "" {
		Error(w, 400, "Firebase ID token is required")
		return
	}
	token, err := s.FirebaseAuth.VerifyIDToken(r.Context(), in.IDToken)
	if err != nil {
		Error(w, 401, "invalid Firebase ID token")
		return
	}
	email, _ := token.Claims["email"].(string)
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		email, _ = token.Claims["phone_number"].(string)
	}
	uid := token.UID
	name := strings.TrimSpace(in.Name)
	if name == "" {
		if value, ok := token.Claims["name"].(string); ok {
			name = value
		}
	}
	// Phone-only Firebase accounts do not have an email. Use the verified phone
	// number as the internal login identifier, and reuse an existing user when
	// the same Firebase UID or email/phone is already present. This also works
	// with older databases where firebase_uid was created as a partial index.
	var id, role string
	err = s.DB.QueryRow(r.Context(), `
		SELECT id, COALESCE(role,'customer') FROM users
		WHERE firebase_uid=$1 OR (email=$2 AND $2 <> '')
		ORDER BY CASE WHEN firebase_uid=$1 THEN 0 ELSE 1 END
		LIMIT 1`, uid, email).Scan(&id, &role)
	if err == nil {
		_, err = s.DB.Exec(r.Context(), `UPDATE users SET firebase_uid=$1, email=CASE WHEN $2 <> '' THEN $2 ELSE email END, name=COALESCE(NULLIF($3,''),name), phone=CASE WHEN $4 LIKE '+%' THEN $4 ELSE phone END, updated_at=now() WHERE id=$5`, uid, email, name, email, id)
	} else if err == pgx.ErrNoRows {
		err = s.DB.QueryRow(r.Context(), `INSERT INTO users(id,email,firebase_uid,name,phone,role) VALUES(gen_random_uuid()::text,$1,$2,$3,CASE WHEN $4 LIKE '+%' THEN $4 ELSE NULL END,'customer') RETURNING id,COALESCE(role,'customer')`, email, uid, name, email).Scan(&id, &role)
		if err != nil {
			// A concurrent request may have inserted the same Firebase account.
			err = s.DB.QueryRow(r.Context(), `SELECT id, COALESCE(role,'customer') FROM users WHERE firebase_uid=$1 OR email=$2 LIMIT 1`, uid, email).Scan(&id, &role)
		}
	}
	if err != nil {
		log.Printf("Firebase user upsert failed for uid %s: %v", uid, err)
		Error(w, 500, "could not create Firebase account")
		return
	}
	jwtToken, err := auth.IssueToken(s.JWTSecret, id, email, role)
	if err != nil {
		Error(w, 500, "could not create session")
		return
	}
	JSON(w, 200, map[string]any{"token": jwtToken, "user": map[string]any{"id": id, "email": email, "name": name, "role": role}})
}
