const RenderingScheduler = function() {
  this.queue = new Set()
  this.now = Date.now()

  const loop = () => {
    this.tick()
    window.requestAnimationFrame(loop)
  }
  loop()
}
RenderingScheduler.prototype.tick = function() {
  this.now = Date.now()
  this.renderQueue()
}
RenderingScheduler.prototype.add = function(renderer) {
  if (this.queue.has(renderer))
    return
  this.queue.add(renderer)
}
RenderingScheduler.prototype.renderQueue = function() {
  this.queue.forEach(renderer => {
    this.render(renderer)
  })
}
RenderingScheduler.prototype.render = function(renderer) {
  if (renderer.renderTimestamp < this.now) {
    renderer._render()
    renderer.renderTimestamp = this.now
  }
  this.queue.delete(renderer)
}

export default RenderingScheduler