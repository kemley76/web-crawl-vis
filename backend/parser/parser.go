package parser

import (
	"io"

	"golang.org/x/net/html"
)

type ParseData struct {
	Title string
	Links []string
}

func ParseHTML(page io.Reader) ParseData {
	doc, err := html.Parse(page)
	pd := ParseData{}
	if err != nil {
		return pd
	}

	traverse(doc, &pd)
	return pd
}

func traverse(n *html.Node, pd *ParseData) {
	if n.Type == html.ElementNode {
		switch n.Data {
		case "a":
			for _, attr := range n.Attr {
				if attr.Key == "href" {
					pd.Links = append(pd.Links, attr.Val)
				}
			}
		case "title":
			if n.FirstChild != nil {
				pd.Title = n.FirstChild.Data
			}
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		traverse(c, pd)
	}
}
