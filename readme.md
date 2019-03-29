# fhtml
My personal template literal-based reactive ui-framework for small web apps. Inspired by Vue.js and lit-html.
I use it to create interactive graphics and stuff like that.

## Documentation
`<img src="shovel-guy.gif">`

## Hello world
```
import html from 'fhtml'

html`
  <div class="#app">
    <input
      type="checkbox"
      .checked=${f => f.state.showMessage()}
      @click=${f => f.state.showMessage(f.node.checked)}
    >
    <input
      type="text"
      .value=${f => f.data.message()}
      @input=${f => f.data.message(f.node.value)}
    >
    <h1>${f => f.state.showMessage() && f.data.message()}</h1>
  </div>
`
.state({
  showMessage: true
})
.data({
  message: 'Hello fhtml!'
})
.mount(document.querySelector('#app'))
```