import uuidv4 from 'uuid/v4'
const defineProps = function() {
  for (let prop in this.props) {
    Object.defineProperty(this, prop, {
      get() {
        return this.app.$props(prop)
      },
      set(newValue) {
        return this.app.$props(prop, newValue)
      }
    })
  }
}
const defineElement = config => {
  config.attrs = config.attrs || function() { return{} }
  config.props = config.props || function() { return{} }
  config.isShadow = config.isShadow || true
  config.shadowMode = config.shadowMode || 'closed'

  if (window.customElements.get(config.tagName))
    return console.warn(`<${config.tagName} /> is already defined`)

  const customElement = {
    [config.tagName]: class extends HTMLElement {
      static get observedAttributes() {
        return Object.keys(config.attrs());
      }
      get state() {
        return this.app.$state()
      }
      set state(renderer) {
        if (!renderer.parentComponent)
          return
        const state = renderer.parentComponent.$state
        if (!state)
          return
        this.app.state(state)
        this.app.render()
      }
      constructor() {
        super()
        this.props = config.props()
        this.attrs = config.attrs()
        if (config.isShadow) {
          const shadowRoot = this.attachShadow({mode: config.shadowMode})
          shadowRoot.innerHTML = '<div></div>'
          this.placeholder = shadowRoot.children[0]
        } else {
          this.innerHTML = '<div></div>'
          this.placeholder = this.children[0]
        }
        this.app = config.template({
          element: this,
          id: uuidv4()
        })
        this._propsDefined = false
      }
      connectedCallback() {
        if (this._propsDefined) {
          this.app.mount(this.placeholder)
          return
        }
        this._propsDefined = true

        this.app
          .props(this.props)
          .attrs(this.attrs)
          .mount(this.placeholder)
        
        ;[...this.attributes].forEach(attr => {
          this.app.$attrs(attr.name, attr.value)
        })
        defineProps.bind(this)()
      }
      disconnectedCallback() {
        this.app.unmount(true)
      }
      attributeChangedCallback(name, oldVal, newVal) {
        this.app.$attrs(name, newVal)
      }
      disconnectedCallback() {
        this.app.unmount()
      }
    }
  }
  window.customElements.define(config.tagName, customElement[config.tagName])
  return customElement[config.tagName]
}

export default defineElement