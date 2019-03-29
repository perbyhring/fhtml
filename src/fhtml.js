import Data from './data';
import isPlainObject from 'is-plain-object'
import RenderingScheduler from './rendering-scheduler'
const renderingScheduler = new RenderingScheduler()

const isFunction = fn => fn && {}.toString.call(fn) === '[object Function]'
const isArray = value => Array.isArray(value)
const isEmptyArray = value => isArray(value) && value.length === 0
const isHtmlElement = obj => obj instanceof Element
const isComponent = obj => obj && obj.$el && isHtmlElement(obj.$el)
const isComponentArray = arr =>
  isArray(arr) && arr.length &&
  arr.every(value => isComponent(value))
const isTextNode = obj => obj.nodeType === Node.TEXT_NODE
const isUndefined = value => typeof value === 'undefined'
const renderAsSvg = string => string.search(/<!--?(\s*)svg?(\s*)-->/gmi) !== -1
const fhtmlFn = /fhtmlfn\((\d+)\)/g
const fhtmlFnWholeExpression = /(fhtmlfn\(\d+\))/gm
const isFhtmlFn = string => string.search(fhtmlFn) !== -1

const createRenderContext = def => {
  if (renderAsSvg(def))
    return document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  return document.createElement('span')
}

const createTemplate = (strings, expressions) => strings.map((string, i) => {
  const expr = expressions[i]
  if (!expr)
    return string
  if (expr[isProxy]) {
    expressions[i] = () => expr()
    return `${string}fhtmlfn(${i})`
  }
  if (isFunction(expr))
    return `${string}fhtmlfn(${i})`
  if (
    isHtmlElement(expr) || 
    isComponent(expr) || 
    isComponentArray(expr) || 
    isPlainObject(expr)
  ) {
    expressions[i] = () => expr
    return `${string}fhtmlfn(${i})`
  }
  return `${string}${expr}`
}).join('')

const propertyNames = new Map()

const getPropertyNameFromLowerCase = (node, lowerCasePropertyName) => {
  if (propertyNames.has(lowerCasePropertyName))
    return propertyNames.get(lowerCasePropertyName)
  for (let prop in node) {
    if (prop.toLowerCase() === lowerCasePropertyName) {
      propertyNames.set(lowerCasePropertyName, prop)
      return prop
    }
  }
  return lowerCasePropertyName
}
const isProxy = Symbol('isProxy')

const createComponentProxy = (data, path = '') =>  new Proxy(() => {}, {
  apply(target, thisArg, argumentsList) {
    if (!path)
      return data
    const value = argumentsList[0]
    if (!isUndefined(value))
      return data(path)
    return data(path, value)
  },
  get(obj, prop, value) {
    if (prop === isProxy)
      return true
    return createComponentProxy(data, `${path ? `${path}.` : ''}${prop}`)
  }
})

const createproxy = (f, data, subscribers, path = '') =>  new Proxy(() => {}, {
  apply(target, thisArg, argumentsList) {
    const value = argumentsList[0]
    if (!isUndefined(value))
      rendererData.bind(f())(data(), subscribers, path, value)
    return rendererData.bind(f())(data(), subscribers, path)
  },
  get(obj, prop, value) {
    if (prop === isProxy)
      return true
    return createproxy(f, data, subscribers, `${path ? `${path}.` : ''}${prop}`)
  }
})

const createContentProxy = (f, type, dataType = '', path = '') => new Proxy(() => {}, {
  apply(target, thisArg, argumentsList) {
    const fn = argumentsList[0]
    return f()[type](dataType, path, fn)
  },
  get(obj, prop) {
    return createContentProxy(
      f, type,
      dataType ? dataType : prop, 
      `${path ? `${path}.` : ''}${dataType ? prop : ''}`
    )
  }
})

function rendererData(data, subscribers, path, value) {
  if (
    !subscribers.some(subscriber => subscriber.path === path) && 
    path && 
    isUndefined(value))
  {
    subscribers.push({path, id: this})
    data().subscribe(path, () => this.render(), this)
  }
  return data(path, value)
}

const createSubscribers = () => ({
  state: [],
  data: [],
  props: [],
  attrs: []
})

const dataType = {
  state: '$state',
  data: '$data',
  prop: '$props',
  attr: '$attrs'
}

const sharedRendererMethods = (fn, node, component) => {
  const subscribers = createSubscribers()
  let isStatic = false
  const renderer = {
    fn,
    node,
    resetPropSubscribers() {
      if (!subscribers.props.length)
        return
      subscribers.props.forEach(subscriber => {
        component.$props().unsubscribe(false, false, subscriber.id)
      })
      subscribers.props = []
    },
    state: createproxy(() => renderer, () => component.$state, subscribers.state),
    data: createproxy(() => renderer, () => component.$data, subscribers.data),
    prop: createproxy(() => renderer, () => component.$props, subscribers.props),
    attr: createproxy(() => renderer, () => component.$attrs, subscribers.attrs),
    renderTimestamp: 0,
    render() {
      renderingScheduler.add(renderer)
    },
    _render() {},
    get _isStatic() {
      return isStatic
    },
    get isStatic() {
      return isStatic = true
    }
  }
  return renderer
}

const linkDirective = (node, fn, renderers, component) => {
  const renderer = sharedRendererMethods(fn, node, component)
  renderer._render = () => {
    if (renderer._isStatic)
      return
    renderer.fn(renderer)
  }
  renderers.push(renderer)
}

const linkEvent = (event, node, fn, renderers, component) => {
  
  const renderer = sharedRendererMethods(fn, node, component)
  
  const eventHandler = e => fn(renderer, e)
  const lifeCycleHooks = ['beforemount','mounted','beforeunmount','unmounted']
  const isLifeCycleEvent = lifeCycleHooks.some(hook => hook === event)
  if (isLifeCycleEvent)
    renderer[event] = fn
  else {
    renderer.mounted = () => node.addEventListener(event, eventHandler)
    renderer.unmounted = () => node.removeEventListener(event, eventHandler)
  }
  renderers.push(renderer)
}

const linkAttributeOrProperty = (isProperty, attribute, node, fn, renderers, component) => {
  const property = isProperty
    ? getPropertyNameFromLowerCase(node, attribute)
    : attribute

  const renderer = sharedRendererMethods(fn, node, component)
  renderer.value = undefined
  renderer._render = () => {
    if (renderer._isStatic)
      return
    const newValue = renderer.fn(renderer)
    if (isUndefined(newValue) || newValue === renderer.value)
      return
    if (isPlainObject(newValue) && attribute === 'class') {
      const classNames = Object.keys(newValue)
        .filter(key => newValue[key])
        .join(' ')
      node.setAttribute(attribute, classNames)
    }
    else if (isPlainObject(newValue) && attribute === 'style') {
      for (let k in newValue) {
        // Set CSS Variable
        if (k.substr(0,2) === '--')
          node.style.setProperty(k, newValue[k])
        // Set CSS property
        else {
          if (k === 'transform' && isPlainObject(newValue[k])) {
            const transformObject = newValue[k]
            const transformString = Object.keys(newValue[k])
              .map(method => `${method}(${transformObject[method]})`)
              .join(' ')
            node.style.transform = transformString
          }
          node.style[k] = newValue[k]
        }
      }
    }
    else if (isPlainObject(newValue) && attribute === 'dataset') {
      for (let k in newValue) {
        node.dataset[k] = JSON.stringify(newValue[k])
      }
    }
    else if (isProperty) {
      node[property] = newValue
    }
    else {
      node.setAttribute(attribute, newValue)
    }
    renderer.value = newValue 
  }
  renderers.push(renderer)
}

const linkAttributesPropsDirectives = (node, expressions, renderers, component) => {
  const getFn = value => expressions[value.replace(fhtmlFn, '$1')]
  ;[...node.attributes]
    .forEach(attribute => {
      const valueIsFn = isFhtmlFn(attribute.value)
      const nameIsFn = isFhtmlFn(attribute.name)
      if (!valueIsFn && !nameIsFn)
        return

      const isProperty = attribute.name.startsWith('.')
      const isEvent = attribute.name.startsWith('@')
      const isAttribute = !isProperty && !isEvent
      const parsedAttributeName = attribute.name
        .replace(/\./g, '')
        .replace(/:/g, '')
        .replace(/@/g, '')
        .replace(/\^([a-z])/g, (whole, char) => char.toUpperCase())

      if (isEvent)
        linkEvent(parsedAttributeName, node, getFn(attribute.value), renderers, component)
      if (valueIsFn && !isEvent)
        linkAttributeOrProperty(isProperty, parsedAttributeName, node, getFn(attribute.value), renderers, component)
      else if (nameIsFn)
        linkDirective(node, getFn(attribute.name), renderers, component)
      node.removeAttribute(attribute.name)
    })
}

const linkContent = (node, expressions, renderers, component) => {
  [...node.childNodes]
    .filter(childNode => isTextNode(childNode))
    .forEach(childNode => {
      if (!isFhtmlFn(childNode.textContent))
        return
      childNode.textContent
        .split(fhtmlFnWholeExpression)
        .map(subChildText => {
          if (!isFhtmlFn(subChildText))
            return document.createTextNode(subChildText)
          const fn = expressions[
            subChildText.replace(fhtmlFn, '$1')
          ]
          const cache = new Map()
          const textNode = document.createTextNode('')
          const placeholderNode = document.createComment('')
          const renderer = sharedRendererMethods(fn, node, component)
          renderer.value = placeholderNode
          renderer.cache = (key, fn) => getCachedComponent(cache, key, fn)
          renderer.map = createContentProxy(() => renderer, '_map')
          renderer._map = (type, value, fn = v => v) => {
            const $data = component[dataType[type]]
            return renderer[type][value]().map((key, i, arr) => {
              const childComponentProps = (prop, newVal) => $data().extract(`${value}.${i}`)
              const props = renderer[type][value][i]
              const childComponent = getCachedComponent(cache, key, () => 
                fn(props, i, arr)
              )
              if (isComponent(childComponent)) {
                childComponent.props(childComponentProps)
                childComponent.renderers.forEach(renderer => {
                  renderer.resetPropSubscribers()
                })
              }
              return childComponent
            })
          }
          renderer._render = () => {
            if (renderer._isStatic)
              return
            let newValue = renderer.fn(renderer)
            if (newValue === renderer.value)
              return
            if (isTextNode(renderer.value) && newValue === textNode.textContent)
              return
            if (!newValue || isEmptyArray(newValue)) {
              if (renderer.value === placeholderNode)
                return
              replaceContent(component, placeholderNode, renderer.value)
              renderer.value = placeholderNode
            }
            else if (
              isHtmlElement(newValue) ||
              isComponent(newValue) ||
              isComponentArray(newValue)
            ) {
              replaceContent(component, newValue, renderer.value)
              renderer.value = newValue
            }
            else {
              if (renderer.value.textContent && `${newValue}` === `${renderer.value.textContent}`)
                return
              textNode.textContent = newValue
              replaceContent(component, textNode, renderer.value)
              renderer.value = textNode
            }
          }
          renderers.push(renderer)
          return renderer.value
        })
        .forEach(subChildNode => {
          const placeholder = document.createComment('')
          childNode.parentNode.insertBefore(placeholder, childNode)
          replaceContent(component, subChildNode, placeholder)
        })
      childNode.parentNode.removeChild(childNode)
  })
}

const getElements = x => isArray(x)
  ? [...x].map(value => isComponent(value) ? value.$el : value)
  : [isComponent(x) ? x.$el : x]

const getComponents = x => isArray(x)
  ? x.filter(y => isComponent(y))
  : isComponent(x) ? [x] : []

const replaceContent = (parentComponent, newValue, oldValue) => {

  // Detect when all the values are the same
  if (!isArray(newValue) && newValue === oldValue)
    return
  if (
    isArray(newValue) &&
    isArray(oldValue) &&
    newValue.every((newValue, i) => newValue === oldValue[i]) &&
    newValue.length === oldValue.length
  ) return

  const newElements = getElements(newValue)
  const oldElements = getElements(oldValue)
  const newComponents = getComponents(newValue)
  const oldComponents = getComponents(oldValue)
  const firstNode = oldElements[0]
  const lastNode = oldElements[oldElements.length-1]
  const parentNode = firstNode.parentNode
  const firstNodePlaceholder = document.createComment('')
  const lastNodePlaceholder = document.createComment('')
  const componentsToBeUnmounted = oldComponents
    .filter(component => !newComponents.includes(component))
  const componentsToBeMounted = newComponents
    .filter(component => !oldComponents.includes(component))
  parentNode.insertBefore(firstNodePlaceholder, firstNode)
  parentNode.insertBefore(lastNodePlaceholder, lastNode.nextSibling)
  
  componentsToBeUnmounted
    .forEach(component => component.lifeCycle('beforeunmount'))
  oldElements
    .filter(el => !newElements.includes(el))
    .forEach(el => parentNode.removeChild(el))
  componentsToBeUnmounted
    .forEach(component => component.lifeCycle('unmounted'))

  const firstIndex = [...parentNode.childNodes].indexOf(firstNodePlaceholder) + 1

  componentsToBeMounted
    .forEach(component => component.lifeCycle('beforemount'))
  newElements.forEach((el,i) => {
    const nodeOnIndex = parentNode.childNodes[firstIndex + i]
    if (!el.isSameNode(nodeOnIndex))
      parentNode.insertBefore(el, nodeOnIndex)
  })
  componentsToBeMounted
    .forEach(component => {
      component.state(parentComponent.$state)
      component.render()
      window.requestAnimationFrame(() => {
        component.lifeCycle('mounted')
      })
    })
  
  parentNode.removeChild(firstNodePlaceholder)
  parentNode.removeChild(lastNodePlaceholder)
}

const getCachedComponent = (cache, key, fn) => {
  if (cache.has(key)) {
    return cache.get(key)
  }
  else {
    const value = fn(key)
    if (isComponent(value)) {
      return cache
        .set(key, value)
        .get(key)
    } else {
      return value
    }
  }
}

const insertData = data => {
  if (isPlainObject(data))
    return new Data(data)
  else if (isFunction(data) && data() instanceof Data)
    return data
  else if (isFunction(data) && isFunction(data()) && data()() instanceof Data)
    return data()
}

const setWatchers = (component, data, watchers) => {
  if (!isPlainObject(watchers))
    return
  for (let prop in watchers) {
    const watcher = watchers[prop]
    let handler;
    let deep;
    if (isFunction(watcher)) {
      handler = watcher
      deep = false
    }
    if (isPlainObject(watcher)) {
      handler = watcher.handler
      deep = watcher.deep
    }
    data().unsubscribe(prop, handler.bind(component), `watcher`, deep)
    data().subscribe(prop, handler.bind(component), `watcher`, deep)
  }
}

function fhtml() {
  const args = [...arguments]
  const strings = args[0]
  const expressions = args.length > 1
    ? args.slice(1)
    : []
  const renderers = []
  let componentState = new Data({})
  let componentData = new Data({})
  let componentProps = new Data({})
  let componentAttrs = new Data({})
  let componentWatchers = {}
  const template = createTemplate(strings, expressions)
  const $ctx = createRenderContext(strings[0])
  let fhtml_placeholder
  $ctx.insertAdjacentHTML('beforeend', template)
  const component = {
    mount(placeholder) {
      fhtml_placeholder = placeholder
      if (!placeholder || !fhtml_placeholder.parentNode)
        return
      replaceContent(this, this, fhtml_placeholder)
      return this 
    },
    unmount(returnPlaceholder = false) {
      if (!this.$el.parentNode) return
      this.lifeCycle('beforeunmount')
      if (returnPlaceholder)
        this.$el.parentNode.replaceChild(fhtml_placeholder, this.$el)
      else
        this.$el.parentNode.removeChild(this.$el)
        this.lifeCycle('unmounted')
      return this
    },
    lifeCycle(hook) {
      renderers.forEach(renderer => {
        if (renderer[hook])
          renderer[hook](renderer, hook)
        if (isComponent(renderer.value))
          renderer.value.lifeCycle(hook)
        if (isComponentArray(renderer.value)) {
          renderer.value.forEach(component => 
            component.lifeCycle(hook)
          )
        }
      })
    },
    state(state) {
      componentState = insertData(state)
      setWatchers(this, componentState, componentWatchers.state)
      return this
    },
    get $state() {
      return componentState
    },
    data(data) {
      componentData = insertData(data)
      setWatchers(this, componentData, componentWatchers.data)
      return this
    },
    get $data() {
      return componentData
    },
    props(props) {
      componentProps = insertData(props)
      setWatchers(this, componentProps, componentWatchers.props)
      return this
    },
    get $props() {
      return componentProps
    },
    attrs(props) {
      componentAttrs = insertData(props)
      setWatchers(this, componentAttrs, componentWatchers.attrs)
      return this
    },
    get $attrs() {
      return componentAttrs
    },
    watch(watchers) {
      componentWatchers = watchers
      setWatchers(this, componentState, watchers.state)
      setWatchers(this, componentData, watchers.data)
      setWatchers(this, componentProps, watchers.props)
      setWatchers(this, componentAttrs, watchers.attrs)
      return this
    },
    get renderers() {
      return renderers
    },
    renderTimestamp: 0,
    render() {
      renderers.forEach(renderer => {
        renderer.render()
        if (isComponent(renderer.value)) {
          renderer.value.render()
        }
        if (isComponentArray(renderer.value)) {
          renderer.value.forEach(component => 
            component.render()
          )
        }
      })
      return this
    },
    $el: $ctx.children[0] || $ctx
  }
  ;[$ctx,...$ctx.querySelectorAll('*')]
    .forEach(node => {
      linkAttributesPropsDirectives(node, expressions, renderers, component)
      linkContent(node, expressions, renderers, component)
    })
  return component
}

export default fhtml
