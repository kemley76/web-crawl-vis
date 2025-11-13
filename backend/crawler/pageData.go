package crawler

type pageData struct {
	URL          string
	Title        string
	ResponseTime float32
	Links        []string
	Errors       []string
}
