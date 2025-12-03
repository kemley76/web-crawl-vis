package crawler

type pageData struct {
	ID           int      `json:"id"`
	URL          string   `json:"url"`
	Title        string   `json:"title"`
	LinksFound   int      `json:"linksFound"`
	Errors       []string `json:"errors"`
	Neighbors    []uint64 `json:"neighbors"` // List of node IDs that are this page contains references to
	ResponseTime int      `json:"responseTime"`
}

func (p *pageData) AddError(errMsg string) {
	p.Errors = append(p.Errors, errMsg)
}
