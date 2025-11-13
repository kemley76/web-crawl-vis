package web

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func RunServer() {
	r := chi.NewRouter()
	r.Use(middleware.Logger)

	fs := http.FileServer(http.Dir("../public"))
	r.Handle("/", fs)

	fmt.Println("Server running at localhost:3000")
	http.ListenAndServe(":3000", r)
}
