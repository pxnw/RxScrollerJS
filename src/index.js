import _ from 'underscore'
import Rx from 'rx-dom'

const cssSizeValue = function(attr) {
  return typeof attr === 'number' ? attr+'px' : attr
}

const cssBoundingRect = function(e, origin, size) {
  e.setAttribute("style", "visibility:hidden;position:fixed;top:"+origin.y+";left:"+origin.x+";width:"+size.width+";height:"+size.height)
  document.firstElementChild.appendChild(e)
  let rect = e.getBoundingClientRect()
  e.remove()

  return rect
}

export class ScrollController {
  constructor (container, options) {
    this._container = container

    this._options = options
    this._elements = []
    this._scrollOffset = this.calculateScrollOffset(this._container)
    this._containerSize = this.calculateContainerSize(this._container)
    this._scrollSize = this.calculateScrollSize(this._container)
    this._scrollProgress = this.calculateScrollProgress(this._scrollSize, this._containerSize, this._scrollOffset)

    this._update$ = new Rx.BehaviorSubject({
      updateAll: true, 
      controller: this, 
      scrollOffset: this._scrollOffset, 
      containerSize: this._containerSize, 
      scrollSize: this._scrollSize,
      scrollProgress: this._scrollProgress
    })

    this.update$ = this._update$.observeOn(Rx.Scheduler.requestAnimationFrame)
    this.resize$ = new Rx.Subject()

    this.viewport$ = new Rx.BehaviorSubject(this._containerSize)
    this.resize$.distinctUntilChanged().subscribe((size) => {
      this.viewport$.onNext(this._containerSize)
    })

    this.update$
    .filter((v) => {
      return v.updateAll === true
    })
    .subscribe((v) => {
      // console.log("--- NEEDS UPDATE ---", Date.now())
      // This just sets the child element as dirty.
      // The next subscription makes sure
      // that all elements get updated at the same
      // time in a case of a full repaint (scroll)
      // e.needsUpdate = true
      _.each(this._elements, (e) => {
        e.needsUpdate = true
      })
    })
    // this.update$.subscribe(() => {}, () => {}, () => {
    //   this._needsUpdate = false
    // })
    window.addEventListener("mousewheel", function () {});

    this.attachEvents(container)

    this._update$.subscribe((s) => {
      // con sole.log(s)
    })
  }

  set container(container) {
    this._container = container
    this.attachEvents(this._container)
  }

  get container() {
    return this._container
  }

  get containerSize() {
    return this._containerSize
  }

  get scrollSize() {
    return this._scrollSize
  }

  get scrollProgress() {
    return this._scrollProgress
  }

  get scrollOffset() {
    return this._scrollOffset
  }

  set needsUpdate(needsUpdate) {
    this._needsUpdate = needsUpdate
    if (needsUpdate) {
      // console.log("--- Set Needs Update ----")
      this._update$.onNext({
        updateAll: true, 
        controller: this, 
        scrollOffset: this._scrollOffset, 
        containerSize: this._containerSize, 
        scrollSize: this._scrollSize,
        scrollProgress: this._scrollProgress
      })

      this.needsUpdate = false
    }
    //  else {
    //   this._update$.onNext(false)
    // }
  }

  set needsResize(needsResize) {
    if (needsResize) {
      this.resize$.onNext(this._containerSize)
    }
  }

  attachEvents(container) {
    let c = this
    this.scroll = Rx.DOM.scroll(container).map((e) => { //observeOn(Rx.Scheduler.requestAnimationFrame).
      e.offset = c.calculateScrollOffset(e.currentTarget)
      return e
    }).filter((e) => {
      let offset = e.offset
      return offset.x != c._scrollOffset.x || offset.y != c._scrollOffset.y
    }).map((e) => {
      let offset = e.offset
      c._scrollOffset = offset
      
      return [offset, e]
    })

    this.resize = Rx.DOM.resize(container).map((e) => {
      e.size = c.calculateContainerSize(e.currentTarget)
      e.scrollSize = c.calculateScrollSize(e.currentTarget)
      return e
    }).filter((e) => {
      let size = e.size
      return size.width != c._containerSize.width || size.height != c._containerSize.height
    }).map((e) => {
      let size = e.size
      c._containerSize = size
      this.resize$.onNext(size)

      return [size, e]
    })

    Rx.Observable.merge(this.scroll, this.resize)
    .subscribe((v) => {
      this._scrollProgress = c.calculateScrollProgress(c._scrollSize, c._containerSize, c._scrollOffset)
      // console.log("---- Scroll / Resize ----")
      this.needsUpdate = true
    })
  }

  addElement(e) {
    this._elements.push(e)
  }

  calculateContainerSize(container) {
    let rect = (container === window) ? {width: window.innerWidth, height: document.documentElement.clientHeight} : container.getBoundingClientRect()
    return {width: rect.width, height: rect.height}
  }

  calculateScrollOffset(container) {
    return GetScrollOffset(container)
  }

  calculateScrollSize(container) {
    var scrollSize = null
    if (container == window) {
      var body = document.body,
      html = document.documentElement;

      scrollSize = {
        height: Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight ),
        width: Math.max( body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth )
      }
    } else {
      scrollSize = {
        height: container.scrollHeight,
        width: container.scrollWidth
      }
    }

    return scrollSize
  }

  calculateScrollProgress(scrollSize, containerSize, offset) {
    return {
      x: offset.x != 0 ? offset.x / (scrollSize.width - containerSize.width) : 0,
      y: offset.y != 0 ? offset.y / (scrollSize.height - containerSize.height) : 0,
    }
  }
}

export class ScrollElement {
  constructor (element, options) {
    this._nonFixedPosition = null

    this._element = element
    this._elementOffset = {x: 0, y: 0}
    this._triggers = []
    this._anchorPoint = {x: 0, y: 0}

    this._needsUpdate = false
    this.action$ = new Rx.BehaviorSubject(null)
    this.update$ = new Rx.BehaviorSubject(false)
    this.viewportOffset$ = new Rx.BehaviorSubject(this.viewportOffsetWithAnchor)

    this._scrollBehavior = null
    this._scrollAttached = false
    this._scrollAttachmentInitialValue = 0

    this.update$
    .filter((needsUpdate) => {
      return needsUpdate
    })
    // .subscribeOn(Rx.Scheduler.requestAnimationFrame)
    .subscribe((v) => {
      this.update()
      this.needsUpdate = false
    })
  }
  
  set anchorPoint(point) {
    this._anchorPoint = point
  }

  set element(element) {
    this._element = element
  }

  get needsUpdate() {
    return this._needsUpdate
  }

  get viewportOffsetWithAnchor() {
    let rect = GetViewportRect(this._element)
    let anchor = this._anchorPoint

    // Incorporate the anchor point.
    return {
      x: rect.left + anchor.x * rect.width,
      y: rect.top + anchor.y * rect.height,
    }
  }

  get absoluteRect() {
    return GetAbsoluteRect(this._element)
  }

  get viewportRect() {
    return GetViewportRect(this._element)
  }

  set needsUpdate(needsUpdate) {
    this._needsUpdate = needsUpdate
    this.update$.onNext(needsUpdate)
  }

  set scrollBehavior(scrollBehavior) {
    this._scrollBehavior = scrollBehavior
  }

  set scrollAttached(scrollAttached) {
    this._scrollAttached = scrollAttached
  }

  update() {
    // console.log(Date.now())
    this.viewportOffset$.onNext(this.viewportOffsetWithAnchor)
    this.needsUpdate = false
  }
}

export class ScrollAction {
  constructor (controller, options) {
    this.viewport$ = new Rx.BehaviorSubject(controller.containerSize)
    this._containerSize$ = new Rx.BehaviorSubject(controller.containerSize)
    this.controller = controller

    this._options = options
    this._elements = []
  }

  addElement(e) {
    this._elements.push(e)
    this._controller.addElement(e)
  }

  set controller(controller) {
    this._controller = controller
    // this._containerSize$.onNext(controller.containerSize)
    controller.resize$.subscribe(this._containerSize$)
  }
}

export const STATE_UNKNOWN = "UNKNOWN"
export const STATE_BEFORE = "BEFORE"
export const STATE_INSIDE = "INSIDE"
export const STATE_AFTER = "AFTER"

export const DIRECTION_NONE = "NONE"
export const DIRECTION_FORWARD = "FORWARD"
export const DIRECTION_BACKWARD = "BACKWARD"

export const TRANSITION_NONE = "NONE"
export const TRANSITION_ENTER = "ENTER"
export const TRANSITION_LEAVE = "LEAVE"

export class ViewportCoordinateScrollAction extends ScrollAction {
  constructor (controller, options) {
    super(controller, options)
    this._sizeE = document.createElement('div')

    this.scrollOptions = options
    
    this._containerSize$.subscribe((newSize) => {
      // console.log("> Container Size Update: ", newSize)
      this.updateSizeProperties(this._sizeE, this._cssOrigin, this._cssSize, this._padding)
      this.viewport$.onNext(newSize)
    })

    let nullAction = {
      element: null,
      state: {x: STATE_UNKNOWN, y: STATE_UNKNOWN},
      direction: {x: DIRECTION_NONE, y: DIRECTION_NONE},
      transition: {x: TRANSITION_NONE, y: TRANSITION_NONE},
      progress: {x: 0, y: 0},
      paddingProgress: {x: 0, y: 0}
    }

    this.action$ = new Rx.BehaviorSubject(nullAction)
    this.distinctElementState$ = new Rx.BehaviorSubject(nullAction)
    this.transition$ = this.action$.distinctUntilChanged((a) => { return [a.transition.x, a.transition.y, a.element] })
    this.progress$ = this.action$.distinctUntilChanged((a) => { return [a.progress.x, a.progress.y, a.element] })
    this.state$ = this.action$.distinctUntilChanged((a) => { return [a.state.x, a.state.y, a.element] })
    this.paddingProgress$ = this.action$.distinctUntilChanged((a) => { return [a.paddingProgress.x, a.paddingProgress.y, a.state.x, a.state.y, a.element]  })
  }

  set scrollOptions(props) {
    this._options = _.defaults(props || {}, {
      origin: {x: 0, y: 0},
      size: {width: '100vw', height: '100vh'},
      padding: {top: 0, left: 0, bottom: 0, right: 0}
    })

    var origin = this._options.origin
    this._cssOrigin = {
      x: cssSizeValue(origin.x),
      y: cssSizeValue(origin.y)
    }
  
    var size = this._options.size
    this._cssSize = {
      width: cssSizeValue(size.width),
      height: cssSizeValue(size.height)
    }

    this.updateSizeProperties(this._sizeE, this._cssOrigin, this._cssSize, this._options.padding)
  }

  updateSizeProperties(e, origin, size, padding) {
    let rect = cssBoundingRect(this._sizeE, origin, size)
    this._origin = {x: rect.left, y: rect.top}
    this._size = {width: rect.width, height: rect.height}
    this._padding = padding
  }

  addElement(e) {
    this._controller.addElement(e)
    e.stateAction$ = e.action$.filter((a) => { return a != null }).distinctUntilChanged((a) => { return [a.state] })
    e.stateAction$.subscribe(this.distinctElementState$)

    e.viewportOffset$.pairwise().subscribe((v) => {
      let actions = this.calculateAction(v[0], v[1], e)
      for (var i = 0; i < actions.length; i++) {
        e.action$.onNext(actions[i])
        this.action$.onNext(actions[i])
      }
    })
  }

  calculateAction(prevValue, newValue, element) {
    let origin = this._origin
    let size = this._size
    let padding = this._padding

    var action = {
      state: {x: STATE_UNKNOWN, y: STATE_UNKNOWN},
      direction: {x: DIRECTION_NONE, y: DIRECTION_NONE},
    }

    // console.log("Origin: ", origin, "Size :", size, "New Value: ", newValue.y)

    action.direction.x = this.calculateDirection(prevValue.x, newValue.x)
    action.direction.y = this.calculateDirection(prevValue.y, newValue.y)

    action.state = this.calculateState(newValue)
    var prevState = this.calculateState(prevValue)

    let transitions = [this.calculateTransitions(prevState.x, action.state.x), this.calculateTransitions(prevState.y, action.state.y)]

    var actions = []
    if (transitions[0].length == transitions[1].length) {
      for (var i = 0; i < transitions[0].length; i++) {
        var a = {
          element: element,
          state: action.state,
          direction: action.direction,
          transition: {x: transitions[0][i], y: transitions[1][i]},
          progress: this.calculateProgress(action.state, origin, size, {x: newValue.x, y: newValue.y}),
          paddingProgress: this.calculatePaddingProgress(action.state, origin, size, padding, {x: newValue.x, y: newValue.y})
        }

        actions.push(a)
      }
    }

    return actions
  }

  calculateState(newValue) {
    let origin = this._origin
    let size = this._size
    var state = {x: STATE_UNKNOWN, y: STATE_UNKNOWN}

    if (newValue.x > origin.x + size.width) {
      state.x = STATE_AFTER
    } else if (newValue.x < origin.x) {
      state.x = STATE_BEFORE
    } else {
      state.x = STATE_INSIDE
    }

    if (newValue.y > origin.y + size.height) {
      state.y = STATE_AFTER
    } else if (newValue.y < origin.y) {
      state.y = STATE_BEFORE
    } else {
      state.y = STATE_INSIDE
    }

    return state
  }

  calculateTransitions(prevState, newState) {
    if (prevState == STATE_BEFORE && newState == STATE_INSIDE) {
      return [TRANSITION_ENTER]
    } else if (prevState == STATE_BEFORE && newState == STATE_AFTER) {
      return [TRANSITION_LEAVE] //TRANSITION_ENTER, 
    } else if (prevState == STATE_AFTER && newState == STATE_INSIDE) {
      return [TRANSITION_ENTER]
    } else if (prevState == STATE_AFTER && newState == STATE_BEFORE) {
      return [TRANSITION_LEAVE] //TRANSITION_ENTER, 
    } else if (prevState == STATE_INSIDE && (newState == STATE_AFTER || newState == STATE_BEFORE)) {
      return [TRANSITION_LEAVE]
    } else {
      return [TRANSITION_NONE]
    }
  }

  calculateDirection(prevValue, newValue) {
    if (prevValue < newValue) {
      return DIRECTION_FORWARD
    } else if (prevValue > newValue) {
      return DIRECTION_BACKWARD
    } else {
      return DIRECTION_NONE
    }
  }

  calculateProgress(state, origin, size, value) {
    var p = {x: 0, y: 0}
    var s = {x: size.width, y: size.height }
    for (var key in p) {
      if (state[key] == STATE_AFTER) {
        p[key] = 1.0
      } else if (state[key] == STATE_BEFORE) {
        p[key] = 0
      } else if (state[key] == STATE_UNKNOWN) {
        p[key] = 1
      } else {
        p[key] = (value[key] - origin[key]) / s[key]
      }
    }

    return p
  }

  calculatePaddingProgress(state, origin, size, padding, value) {
    var p = {x: 0, y: 0}
    var s = {x: size.width, y: size.height }
    var pad = {x: [padding.left, padding.right], y: [padding.top, padding.bottom]}

    for (var key in p) {
      if (state[key] == STATE_INSIDE) {
        p[key] = 0
      } else if (state[key] == STATE_BEFORE) {
        let d = (origin[key] - value[key])
        if (d > pad[key][0]) {
          p[key] = 1
        } else {
          p[key] = d / pad[key][0]
        }
      } else if (state[key] == STATE_AFTER) {
        let d = (value[key] - origin[key])
        if (d > pad[key][0]) {
          p[key] = 1
        } else {
          p[key] = d / pad[key][0]
        }
      } else {
        p[key] = 0
      }
    }

    return p
  }
}

export class ScrollBehavior {
  constructor(controller, options) {
    this._containerSize$ = new Rx.BehaviorSubject(controller._containerSize)
    this.controller = controller
    this.viewport$ = new Rx.BehaviorSubject(this._containerSize)

    this._options = _.defaults(options || {}, {
      velocity: 1,
      applyVertical: true,
      applyHorizontal: false,
      scrollStartOffset: {x: 0, y: 0},
      scrollDistance: this._fullScrollSize,
    })

    this._sizeE = document.createElement('div')
    this.scrollOptions = {scrollStartOffset: this._options.scrollStartOffset, scrollDistance: this._options.scrollDistance}
    
    this._containerSize$.subscribe((newSize) => {
      this.updateScrollProperties(this._sizeE, this._cssStartOffset, this._cssDistance)
      this.viewport$.onNext(newSize)
      // console.log(newSize)
    })

    this.progress$ = new Rx.BehaviorSubject(this.progress)
    
  }

  updateScrollProperties(e, startOffset, distance) {
      let rect = cssBoundingRect(this._sizeE, startOffset, distance)
      this._scrollStartOffset = {x: rect.left, y: rect.top}
      this._scrollDistance = {width: rect.width, height: rect.height}
  }

  set scrollOptions(props) {
    var startOffset = props.scrollStartOffset
    startOffset.x = cssSizeValue(startOffset.x)
    startOffset.y = cssSizeValue(startOffset.y)

    this._cssStartOffset = startOffset

    var distance = props.scrollDistance
    distance.width = cssSizeValue(distance.width)
    distance.height = cssSizeValue(distance.height)

    this._cssDistance = distance

    this.updateScrollProperties(this._sizeE, startOffset, distance)
  }

  get progress() {
    let offset = this._controller.scrollOffset
    var progress = {
      x: this.calculateProgress(offset.x, this._scrollStartOffset.x, this._scrollDistance.width),
      y: this.calculateProgress(offset.y, this._scrollStartOffset.y, this._scrollDistance.height)
    }
    
    return progress
  }

  set controller(controller) {
    if (this._controllerSubscription != null) {
      this._controller.update$.unusbscribe(this._controllerSubscription)
    }

    this._controller = controller

    this._fullScrollSize = controller.scrollSize
    this._fullScrollProgress = controller.scrollProgress
    this._containerSize = controller.containerSize
    
    controller.resize$.subscribe(this._containerSize$)
    
    this._controllerSubscription = controller.update$.subscribe((v) => {
      // console.log(Date.now())
      this._fullScrollSize = v.scrollSize
      this._fullScrollProgress = v.scrollProgress
      this._containerSize = v.containerSize

      this.progress$.onNext(this.progress)
    })

    // console.log(controller.update$)
  }

  calculateProgress(current, start, length) {
    if (current <= start) {
      return 0
    } else if (current >= start + length) {
      return 1
    } else {
      return (current-start) / length
    }
  }
}

export class GSAPScrollBehavior extends ScrollBehavior {
  constructor(controller, options) {
    super(controller, options)

    this._options = _.defaults(options || {}, {
      tween: {x: null, y: null},
      reverseTween: {x: null, y: null},
      autoProgress: true
    })

    this.tween = this._options.tween
    this.reverseTween = this._options.tween

    if (this._options.autoProgress) {
      this.progress$.distinctUntilChanged().pairwise().subscribe((v) => {
        let p = v[1]
        let prev = v[0]

        this.applyProgress(p, prev)
      })
    }
  }

  applyProgress(p, prev) {
    let direction = {x: DIRECTION_FORWARD, y: DIRECTION_FORWARD}
    if (prev.x > p.x) {
      direction.x = DIRECTION_BACKWARD
    }

    if (prev.y > p.y) {
      direction.y = DIRECTION_BACKWARD
    }

    if (this._tween.x != null && (direction.x == DIRECTION_FORWARD || this._reverseTween.x == null)) {
      this._tween.x.progress(p.x)
      this._controller.needsUpdate = true
    } else if (direction.x == DIRECTION_BACKWARD && this._reverseTween.x != null) {
      this._reverseTween.x.progress(1 - p.x)
      this._controller.needsUpdate = true
    }

    if (this._tween.y != null && (direction.y == DIRECTION_FORWARD || this._reverseTween.y == null)) {
      this._tween.y.progress(p.y)
      // console.log("Progress", p.y)
      this._controller.needsUpdate = true
    } else if (direction.y == DIRECTION_BACKWARD && this._reverseTween.y != null) {
      this._reverseTween.y.progress(1 - p.y)
      this._controller.needsUpdate = true
    }
  }

  set tween(newTween) {
    this._tween = newTween
    this.progress$.onNext(0)
    this.progress$.onNext(this.progress)
  }

  set reverseTween(newTween) {
    this._reverseTween = newTween
    this.progress$.onNext(0)
    this.progress$.onNext(this.progress)
  }
}

export const GetScrollOffset = function (el) {
  let scrollTop = (el && typeof el.scrollTop === 'number') ? el.scrollTop : window.pageYOffset || 0;
  let scrollLeft = (el && typeof el.scrollLeft === 'number') ? el.scrollLeft : window.pageXOffset || 0;
  return {x: scrollLeft, y: scrollTop}
}

export const GetViewportRect = function (el, container) {
  var rect = el.getBoundingClientRect()
  return rect
}

export const GetAbsoluteRect = function (el, container) {
  var rect = el.getBoundingClientRect()
  var absRect = {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width
  }

  let rel = (container === undefined) ? document : container
  let scrollTop = (rel && typeof rel.scrollTop === 'number') ? rel.scrollTop : window.pageYOffset || 0;
  let scrollLeft = (rel && typeof rel.scrollLeft === 'number') ? rel.scrollLeft : window.pageXOffset || 0;

  absRect.top += scrollTop
  absRect.left += scrollLeft
  absRect.bottom += scrollTop
  absRect.right += scrollLeft

  return absRect
}