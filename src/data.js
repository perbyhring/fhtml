const isUndefined = value => typeof value === 'undefined'
const isArray = value => Array.isArray(value)
const isFunction = fn => fn && {}.toString.call(fn) === '[object Function]'
const formatBasePath = basePath => basePath !== ''
  ? `${basePath}.`
  : ''
const resolve = function(path, obj = self, separator = '.') {
  const properties = Array.isArray(path) ? path : path.split(separator)
  if (properties.length === 1)
    return obj[properties[0]]
  return properties.reduce((prev, curr) => {
    return prev && prev[curr]
  }, obj)
}
function Data(sourceOfTruth, basePath, subscribers) {
  this.sourceOfTruth = sourceOfTruth || {}
  this.basePath = basePath || ''
  this.subscribers = subscribers || {
    entries: []
  }
  return this.DataInterpreter.bind(this)
}
Data.prototype.extract = function(path) {
  return new Data(
    this.sourceOfTruth,
    `${formatBasePath(this.basePath)}${path}`,
    this.subscribers
  )
}
Data.prototype.DataInterpreter = function DataInterpreter(path, value) {
  if (!isUndefined(path) && isUndefined(value))
    return this.get(path)
  if (!isUndefined(path) && typeof !isUndefined(value))
    return this.set(path, value)
  return this
}
Data.prototype.get = function(path) {
  if (isArray(path)) {
    const pathsObject = {}
    const pathsArray = path.map(path => {
      pathsObject[path] = this.get(path)
    })
    return pathsObject
  }
  if (!isUndefined(path))
    return resolve(`${formatBasePath(this.basePath)}${path}`, this.sourceOfTruth)
  return this
}
Data.prototype.set = function(_path, value, valueIsFunction = false, addToHistory = true) {
  const path = `${formatBasePath(this.basePath)}${_path}`
  const pathArray = path.split('.')
  pathArray.unshift('sourceOfTruth')
  const property = pathArray.pop()
  const objectPath = pathArray.join('.')
  const object = resolve(objectPath, this)
  const oldValue = object[property]
  object[property] = isFunction(value) && !valueIsFunction
    ? value(resolve(path, this.sourceOfTruth))
    : value;
  this.notifySubscribers(path, oldValue)
  return this
}
Data.prototype.emitSubscriber = function(subscriber) {
  
  const newValue = resolve(subscriber.path, this.sourceOfTruth)
  if (newValue === subscriber.value)
    return
  subscriber.fn(newValue, subscriber.value ? subscriber.value : false, subscriber.path)
  subscriber.value = newValue
  
}
Data.prototype.notifySubscribers = function(path, oldValue) {
  this.subscribers.entries
    .forEach(subscriber => {
      if (subscriber.deep && subscriber.path === path.substr(0, subscriber.path.length)) {
        this.emitSubscriber(subscriber)
      }
      else if (subscriber.path === path) {
        this.emitSubscriber(subscriber)
      }
      else if (path === subscriber.path.substr(0, path.length)) {
        this.emitSubscriber(subscriber)
      }
    })
}

Data.prototype.subscribe = function(path, fn = false, id = Date.now(), deep = false) {
  const subscribe = path => {
    const formatedPath = `${formatBasePath(this.basePath)}${path}`
    if (this.subscribers.entries.some(subscriber => {
      return subscriber.path === formatedPath && subscriber.fn === fn
    })) return
    this.subscribers.entries.push({
      path: formatedPath,
      fn,
      deep,
      id: id
    })
  }
  if (isArray(path))
    path.forEach(subscribe)
  else
    subscribe(path)
  return this
}
Data.prototype.unsubscribe = function(path = false, fn = false, id = false) {
  this.subscribers.entries = this.subscribers.entries.filter(subscriber => {
    if (id)
      return subscriber.id !== id
    if (path && fn)
      return subscriber.path !== path && subscriber.fn !== fn
    else if (path && !fn)
      return subscriber.path !== path || subscriber !== path
    else if (!path && fn)
      return subscriber.fn !== fn
  })
  return this
}
Data.prototype.toJSON = function() {
  if (this.basePath)
    return resolve(this.basePath,this.sourceOfTruth)
  else
    return this.sourceOfTruth
}

export default Data
