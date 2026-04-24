# ChatBubble

Embeddable HTML and JavaScript chat widget for adding a floating AI chatbot to any website.

## Features

- Floating chat window that sits above the page
- Minimize to a single chat icon and reopen it
- Configurable endpoint URL, theme colors, and launcher icon URL
- Sends chat messages with the Fetch API
- Shadow DOM styling to reduce CSS collisions with the host site

## Quick Start

```html
<script src="./chatbubble.js"></script>
<script>
  window.ChatBubbleWidget.create({
    url: 'https://your-api.example.com/chat',
    iconUrl: 'https://your-cdn.example.com/chat-icon.svg',
    themeColors: {
      primary: '#16423C',
      background: '#F6F3EF',
      surface: '#FFFFFF'
    }
  });
</script>
```

## Configuration

| Option | Type | Description |
| --- | --- | --- |
| `url` | `string` | Endpoint that receives POST requests. |
| `iconUrl` | `string` | Icon shown in the launcher button and header. |
| `themeColors` | `object` | Partial color override for the widget theme. |
| `title` | `string` | Header title shown in the chat window. |
| `welcomeMessage` | `string` | Initial assistant message. |
| `placeholder` | `string` | Input placeholder text. |
| `headers` | `object` | Extra request headers for `fetch`. |
| `fetchOptions` | `object` | Additional `fetch` options merged into the request. |
| `buildPayload` | `function` | Custom payload builder receiving `(text, history)`. |
| `responseParser` | `function` | Custom response parser receiving `(response, payload)`. |
| `onMessageSent` | `function` | Callback fired after a user message is added. |
| `onResponse` | `function` | Callback fired after the assistant reply is added. |
| `onError` | `function` | Callback fired when the request fails. |
| `startMinimized` | `boolean` | Starts with only the chat icon visible. |

## Default Request Body

```json
{
  "message": "Hello",
  "history": [
    { "role": "assistant", "text": "How can I help you today?" },
    { "role": "user", "text": "Hello" }
  ]
}
```

## Local Demo

Run the bundled demo server so the sample widget can POST to a local endpoint:

```bash
python3 demo_server.py
```

Then open `http://127.0.0.1:8000`.