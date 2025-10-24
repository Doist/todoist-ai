# search tool

The `search` tool is responsible for returning a list of relevant search results from your MCP server's data source, given a user's query.

*Arguments:*

A single query string.

*Returns:*

An object with a single key, `results`, whose value is an array of result objects. Each result object should include:

- `id` - a unique ID for the document or search result item
- `title` - human-readable title.
- `url` - canonical URL for citation.

In MCP, tool results must be returned as a content array containing one or more "content items." Each content item has a type (such as `text`, `image`, or `resource`) and a payload.

For the `search` tool, you should return **exactly one** content item with:

- `type: "text"`
- `text`: a JSON-encoded string matching the results array schema above.

The final tool response should look like:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"results\":[{\"id\":\"doc-1\",\"title\":\"...\",\"url\":\"...\"}]}"
    }
  ]
}
```

# fetch tool

The fetch tool is used to retrieve the full contents of a search result document or item.

*Arguments:*

A string which is a unique identifier for the search document.

*Returns:*

A single object with the following properties:

- `id` - a unique ID for the document or search result item
- `title` - a string title for the search result item
- `text` - The full text of the document or item
- `url` - a URL to the document or search result item. Useful for citing specific resources in research.
- `metadata` - an optional key/value pairing of data about the result

In MCP, tool results must be returned as a content array containing one or more "content items." Each content item has a `type` (such as `text`, `image`, or `resource`) and a payload.

In this case, the `fetch` tool must return exactly one content item with `type: "text"`. The `text` field should be a JSON-encoded string of the document object following the schema above.

The final tool response should look like:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"id\":\"doc-1\",\"title\":\"...\",\"text\":\"full text...\",\"url\":\"...\"}"
    }
  ]
}
```
