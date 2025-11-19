package crawler

type pageData struct {
	URL        string   `json:"url"`
	Title      string   `json:"title"`
	LinksFound int      `json:"linksFound"`
	Errors     []string `json:"errors"`
}

func (p *pageData) AddError(errMsg string) {
	p.Errors = append(p.Errors, errMsg)
}
