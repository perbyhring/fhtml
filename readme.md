# `f=>html`
This is my personal reactive ui-library for small web-apps. I use it to create interactive graphics and stuff like that.

It's pretty small. 4.7kb gzipped.

## Import
```
import html from '@perbyhring/fhtml'
```
I like to import the libraray as `html` because then I can use the lit-html syntax-highliger in vscode to make my templates look `<🐱>purrrrty</🐱>`.

## The basic idea

The basic idea of `f=>html` is that everything inserted as a function in the template-literal can be re-rendererd.

**Basic example:**
```
let greeting = 'Hello'
let name = 'World'

const app = html`
  <div>
    ${greeting} ${f => name}!
  </div>
`
.mount(placeholderElement)
// ^ or parent.appendChild(app.$el)

greeting = 'Have a greeeeat day'
name = 'Buddy McGee!'

app.render()
```
**Result:**
```
Hello Buddy McGee!
```

😲 ***-The fuuu!!?*** Why didn't Buddy McGee recieve our message to `Have a greeeeat day`? We did everything right. ...right? ... right!!?

The answer is: **`-YES!`**

Kidding, the answer is `no`. Definitely `no`.

**Because, this is what happened when we called `app.render()`:**

- `greeting` was **not** updated in the DOM, because it's value was inserted directly (`${greeting}`).
- `name` was updated, because it was inserted as the returned value of a function (`${f => name}`).

## Data-model

If you don't want to call `app.render()` every time you change the data, you can use the provided data-model.

**Every component can contain three different types of data:**
- State
- Data
- Props

See the examples below for how they are used.

## Examples

### Attributes
Prefix dynamic attributes with a `:`.

If you don't do this you sometimes might get errors in your console. Which is not cool, according to the cool patrol.

Svg-elements sometimes contains attributes which are case-sensitive. These must be written like this:
- `baseFrequency`: `base^frequency`
- `xChannelSelector`: `x^channel^selector`

You have to do it this way because I tell you to. Also because this library does not use a virtual-dom implementation. Therefore the browser automatically translates all uppercase-attributes to lowercase. I could write more letters to explain this problem but it's pretty boring, so I won't.

**Attribute example:**
```
html`
  <div class="app" :title=${f => f.data.message()}>
    ${f => f.data.message()}
  </div>
`
.data({
  message: 'Hello fhtml!'
})
.mount(document.querySelector('#app'))
```

### Properties

Properties are prefixed with a `.`.

A big heads-up here is that `textContent` could also be written as `textcontent`. The library will try to find the correct property automatically. If you for some reason have a dom-node which also contains a lowercase `textcontent`-property, the results will be unpredictable. Which can be nice on valentines day or similar events where you're hungry for excitement, but not so nice in a ui-library. So just remember that.

**Property example:**
```
html`
  <div class="app" .textContent=${f => f.data.message()}></div>
`
.data({
  message: 'Hello fhtml!'
})
.mount(placeholder_element)
```

### Directives
If you don't trust the library to make the right assumtion about which property to set, you could also set it through a directive.

**Here's a simple little directive:**
```
html`
  <div
    class="app" ${f => 
      f.node.textContent = f.data.message()
    }
  ></div>
`
.data({
  message: 'Hello fhtml!'
})
.mount(placeholder_element)
```

Directives can also be used to run more complex and/or fun manipulations of a dom-node. For instance painting something to a canvas.

**Canvas directive example:**
```
html`
  <canvas ${f => {
    f.isStatic
    const ctx = f.node.getContext('2d')
    ctx.fillStyle = 'yellow'
    ctx.beginPath()
    ctx.rect(0,0,100,100)
    ctx.fill()
  }}></canvas>
`
```
By calling the special `f.isStatic`-property you tell `f=>html` to never re-run this function.

### Events

Events are declared in a similar way to Vue's shorthand event-syntax, with the `@`-prefix.

**Event example:**
```
const add = n1 => n2 => n1 + n2
const addOne = add(1)
html`
  <div
    class="app"
    @click=${(f,event) =>
      f.state.clicks(addOne)
    }>
    ${f => f.data.message() }
    ${f => f.state.clicks().toString() }
  </div>
`
.state({
  clicks: 0
})
.data({
  message: 'Number of clicks:'
})
.mount(placeholder_node)
```

Notice how you can make use of the functional pattern of the data model to create reusable manipulator-functions (`f.state.clicks(addOne)`). Holy smokes, what a terrible sentence I just wrote. Sorry.

Also notice that the number of clicks are converted to a string with `f.state.clicks().toString()`. This is because if `f.state.clicks()` returned a value of `0`, it would be a falsey-value, which is an instruction for `f=>html` to not render it.

**Which leads us to the next chapter:**

### Conditionals
Conditionals can be written in a similar way to how I think it's done in React.

**Conditional example:**
```
html`
  <div class="app">
    ${f => f.state.showMessage() && f.data.message()}
  </div>
`
.state({
  showMessage: true
})
.data({
  message: 'Can you see me?'
})
.mount(document.querySelector('#app'))
```

### Lifecycle events

**There are four lifecycle-events you can use:**
- beforemount
- mounted
- beforeunmount
- unmounted

These are written just like normal events, on the dom-nodes themselves.

**Example:**
```
const app = html`
  <div
    @beforemount=${f => console.log(f.node, 'before mount!)}
    @mounted=${f => console.log(f.node, 'mounted!')}
    @beforeunmount=${f => console.log(f.node, 'before unmount!)}
    @unmounted=${f => console.log(f.node, 'unmounted!')}
  ></div>
`
.mount(placeholder_element)

setTimeout(app.unmount, 2000)

```

### Input / forms

Inputs and other form-elements are bound in a similar way to other ui-libraries.

**Input example:**
```
html`
  <div class="app">
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
.mount(placeholder_element)
```

### Classnames

Classnames can be written as a string or an object.

If you have a lot of conditional logic, objects are probably the way to go.

If you write your classnames as objects the property-name is the name of the class, and the property-value is a `true`- or `false`-value, which tells `f=>html` whether to add the classname.

**Classnames example:**
```
html`
  <div
    :class=${f => ({
      app: true,
      'app--active': f.state.active()
    })}
  >
  </div>
`
.state({
  active: true
})
.mount(placeholder_element)
```

### Styles

Styles can also be written as strings or objects.

The css `transform`-property can contain nested values for each type of transform.

**Example:**
```
html`
  <div
    :style=${f => ({
      width: '100px',
      height: '100px',
      backgroundColor: 'purple',
      borderRadius: '10px'
    })}
    @mousemove=${(f,e) => {
      f.state.x(e.x)
      f.state.y(e.y)
    }}
  >
    <div
      :style=${f => ({
        position:absolute,
        top: 0,
        left: 0,
        width: '10px',
        height: '10px',
        background: 'orange',
        transform: {
          translateX: `${f.state.x()}px`,
          translateY: `${f.state.y()}px`,
          rotateX: `${f.state.x()}deg`,
          rotateY: `${f.state.y()}deg`
        }
      })}
    ></div>
  </div>
`
.state({
  x: 0,
  y: 0
})
.mount(placeholder_element)
```

### Loopty-loop
This might look strange, but when you want to loop through your data, you need to write it like `f.map.data.messages(component)`, instead of the normal javascript way of going `array.map(function)`.

**Example:**
```
const message = () => html`
  <li>${f => f.prop.text()}</li>
`
html`
  <div class="app">
    <ul>
      ${f => f.map.data.messages(message)}
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
***OH SHIT***, did I just create a component-ish looking thingy-ling!?

### State vs. data vs. prop
**State:** State is like global data which is accessible from all nested child-components. You should only declare this on your outermost component.

**Data:** is only accessible from the component it is declared on.

**Prop:**
Props are passed from a parent-component's state/data/prop, to a child-component.

**Example of all three types of data:**
```
const addOne = n => ++n

const message = () => html`
  <li
    @click=${f => {
      f.state.clicks(addOne)
      f.data.clicks(addOne)
    }}
  >
  ${f => f.prop.text()} has been clicked
  ${f => f.data.clicks()} times.
  </li>
`
.data({
  clicks: 0
})

const app = html`
  <div class="app">
    <ul>
    ${f => f.map.data.messages(message)}
    </ul>
    All clicks: ${f => f.state.clicks().toString()}
  </div>
`
.state({
  clicks: 0
})
.data({
  messages: [
    { text: 'Hello fhtml!'},
    { text: 'How are you?'},
    { text: 'Fine, thanks!' }
  ]
})
.mount(document.querySelector('#app'))
```

If you want to access or change the data outside of the application you do it like this:

```
const app = html`
  <div>
    ${f => f.state.counter()}
  </div>
`
.state({
  counter: 1
})

setTimeout(() => {
  // write
  app.$state('counter', n => ++n)
  console.log(
    // read
    app.$state('counter')
  )
}, 1000)
```
To access data from outside the application you need to use a dot notation string. So for instance if you want to access a nested attribute it would look like this:
```
const firstPersonAge = app.$data('people.0.age')
```

You can subscribe to changes in the data from *outside* of the application like this:

```
app.$data().subscribe('people.0.age'. (newVal, oldVal) => {
  console.log(`First person age updated from ${oldVal} to ${newVal}`)
})
```

You can also subscribe to changes in the data *inside* like this:

```
html`
  <div class="app">
  ${f => f.map.data.people(() => html`
    <div class="person">
      Name:${f => f.prop.name()}
      <br>
      Age: ${f => f.prop.age()}
    </div>  
  `)}
  </div>
`
.data({
  people: [
    {
      name: 'Geir',
      age: 53
    }
  ]
})
.watch({
  data: {
    'people.0.age'(newVal, oldVal) {
      console.log(`First person age updated from ${oldVal} to ${newVal}`)
    }
  }
})
```

If you want to push something to an array you should do it like this:
```

// Add person from inside the application
const addPerson = f => {
  f.data.people(people => [
    ...people,
    {...f.state.newPerson()}
  ])
}

// Add person from outside of application
app.$data('people', people => [
  ...people,
  {...newPerson}
])
```

If you did this...
```
f.data.people(people => 
  people.push(f.state.newPerson())
)
```
... or this ...
```
f.data.people().push(f.state.newPerson())
```
...`f=>html` wouldn't understand that the people-array had been updated. It's a pretty tedious excercise trying to explain exactly why you have to do it this way, so I won't attempt that right now :/

### More examples coming soon, perhaps
I dunno. Maybe this little library is a pile of crap? It was pretty fun to make either way. I mean, I use it. But I also made it. So I also know when not to use it. You don't, so perhaps you should use something else. 

There's a lot of things I haven't covered here, and some best practises which are still all in my head. Until I've managed to write them down you should consider this library nothing more than a little experiment from a random person on the internet.