# fhtml
My personal template literal-based ui-library for small web apps. Inspired by Vue.js and lit-html. I use it to create interactive graphics and stuff like that.

## Documentation
`<img src="shovel-guy.gif">`

## Some examples

### Hello world
```
import html from '@perbyhring/fhtml'

const app = html`
  <div class="#app">
    ${f => f.data.message()}
  </div>
`
.data({
  message: 'Hello fhtml!'
})
.mount(document.querySelector('#app'))
```

### Input
```
import html from '@perbyhring/fhtml'

const app = html`
  <div class="#app">
    ${f => f.data.message()}
    <input
      type="text"
      .value=${f => f.data.message()}
      @input=${f => f.data.message(f.node.value)}
    >
  </div>
`
.data({
  message: 'Hello fhtml!'
})
.mount(document.querySelector('#app'))
```

### List
```
import html from '@perbyhring/fhtml'

const app = html`
  <div class="#app">
    <ul>
    ${f => f.map.messages(() => html`
      <li>${f => f.prop.text()}</li>
    `)}
    </ul>
  </div>
`
.data({
  messages: [
    { text: 'Hello fhtml!'},
    { text: 'How are you?'},
    { text: 'Fine, thanks!' }
  ]
})
.mount(document.querySelector('#app'))
```

### More examples coming soon, perhaps