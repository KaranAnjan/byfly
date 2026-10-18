package controllers

import (
	"io"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
)

func (s *Controller) Image(w http.ResponseWriter, r *http.Request) {
	if s.S3 == nil {
		Error(w, http.StatusNotFound, "image storage is not configured")
		return
	}
	key := strings.TrimPrefix(chi.URLParam(r, "*"), "/")
	if key == "" {
		Error(w, http.StatusBadRequest, "invalid image key")
		return
	}
	body, contentType, err := s.S3.GetObject(r.Context(), key)
	if err != nil {
		Error(w, http.StatusNotFound, "image not found")
		return
	}
	defer body.Close()
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=86400")
	_, _ = io.Copy(w, body)
}
