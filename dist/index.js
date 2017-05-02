'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GetAbsoluteRect = exports.GetViewportRect = exports.GetScrollOffset = exports.GSAPScrollBehavior = exports.ScrollBehavior = exports.ViewportCoordinateScrollAction = exports.TRANSITION_LEAVE = exports.TRANSITION_ENTER = exports.TRANSITION_NONE = exports.DIRECTION_BACKWARD = exports.DIRECTION_FORWARD = exports.DIRECTION_NONE = exports.STATE_AFTER = exports.STATE_INSIDE = exports.STATE_BEFORE = exports.STATE_UNKNOWN = exports.ScrollAction = exports.ScrollElement = exports.ScrollController = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _rxDom = require('rx-dom');

var _rxDom2 = _interopRequireDefault(_rxDom);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var cssSizeValue = function cssSizeValue(attr) {
  return typeof attr === 'number' ? attr + 'px' : attr;
};

var cssBoundingRect = function cssBoundingRect(e, origin, size) {
  e.setAttribute("style", "visibility:hidden;position:fixed;top:" + origin.y + ";left:" + origin.x + ";width:" + size.width + ";height:" + size.height);
  document.firstElementChild.appendChild(e);
  var rect = e.getBoundingClientRect();
  e.remove();

  return rect;
};

var ScrollController = exports.ScrollController = function () {
  function ScrollController(container, options) {
    var _this = this;

    _classCallCheck(this, ScrollController);

    this._container = container;

    this._options = options;
    this._elements = [];
    this._scrollOffset = this.calculateScrollOffset(this._container);
    this._containerSize = this.calculateContainerSize(this._container);
    this._scrollSize = this.calculateScrollSize(this._container);
    this._scrollProgress = this.calculateScrollProgress(this._scrollSize, this._containerSize, this._scrollOffset);

    this._update$ = new _rxDom2.default.BehaviorSubject({
      updateAll: true,
      controller: this,
      scrollOffset: this._scrollOffset,
      containerSize: this._containerSize,
      scrollSize: this._scrollSize,
      scrollProgress: this._scrollProgress
    });

    this.update$ = this._update$.observeOn(_rxDom2.default.Scheduler.requestAnimationFrame);
    this.resize$ = new _rxDom2.default.Subject();

    this.viewport$ = new _rxDom2.default.BehaviorSubject(this._containerSize);
    this.resize$.distinctUntilChanged().subscribe(function (size) {
      _this.viewport$.onNext(_this._containerSize);
    });

    this.update$.filter(function (v) {
      return v.updateAll === true;
    }).subscribe(function (v) {
      // console.log("--- NEEDS UPDATE ---", Date.now())
      // This just sets the child element as dirty.
      // The next subscription makes sure
      // that all elements get updated at the same
      // time in a case of a full repaint (scroll)
      // e.needsUpdate = true
      _underscore2.default.each(_this._elements, function (e) {
        e.needsUpdate = true;
      });
    });
    // this.update$.subscribe(() => {}, () => {}, () => {
    //   this._needsUpdate = false
    // })
    window.addEventListener("mousewheel", function () {});

    this.attachEvents(container);

    this._update$.subscribe(function (s) {
      // con sole.log(s)
    });
  }

  _createClass(ScrollController, [{
    key: 'attachEvents',
    value: function attachEvents(container) {
      var _this2 = this;

      var c = this;
      this.scroll = _rxDom2.default.DOM.scroll(container).map(function (e) {
        //observeOn(Rx.Scheduler.requestAnimationFrame).
        e.offset = c.calculateScrollOffset(e.currentTarget);
        return e;
      }).filter(function (e) {
        var offset = e.offset;
        return offset.x != c._scrollOffset.x || offset.y != c._scrollOffset.y;
      }).map(function (e) {
        var offset = e.offset;
        c._scrollOffset = offset;

        return [offset, e];
      });

      this.resize = _rxDom2.default.DOM.resize(container).map(function (e) {
        e.size = c.calculateContainerSize(e.currentTarget);
        e.scrollSize = c.calculateScrollSize(e.currentTarget);
        return e;
      }).filter(function (e) {
        var size = e.size;
        return size.width != c._containerSize.width || size.height != c._containerSize.height;
      }).map(function (e) {
        var size = e.size;
        c._containerSize = size;
        _this2.resize$.onNext(size);

        return [size, e];
      });

      _rxDom2.default.Observable.merge(this.scroll, this.resize).subscribe(function (v) {
        _this2._scrollProgress = c.calculateScrollProgress(c._scrollSize, c._containerSize, c._scrollOffset);
        // console.log("---- Scroll / Resize ----")
        _this2.needsUpdate = true;
      });
    }
  }, {
    key: 'addElement',
    value: function addElement(e) {
      this._elements.push(e);
    }
  }, {
    key: 'calculateContainerSize',
    value: function calculateContainerSize(container) {
      var rect = container === window ? { width: window.innerWidth, height: document.documentElement.clientHeight } : container.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }
  }, {
    key: 'calculateScrollOffset',
    value: function calculateScrollOffset(container) {
      return GetScrollOffset(container);
    }
  }, {
    key: 'calculateScrollSize',
    value: function calculateScrollSize(container) {
      var scrollSize = null;
      if (container == window) {
        var body = document.body,
            html = document.documentElement;

        scrollSize = {
          height: Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight),
          width: Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth)
        };
      } else {
        scrollSize = {
          height: container.scrollHeight,
          width: container.scrollWidth
        };
      }

      return scrollSize;
    }
  }, {
    key: 'calculateScrollProgress',
    value: function calculateScrollProgress(scrollSize, containerSize, offset) {
      return {
        x: offset.x != 0 ? offset.x / (scrollSize.width - containerSize.width) : 0,
        y: offset.y != 0 ? offset.y / (scrollSize.height - containerSize.height) : 0
      };
    }
  }, {
    key: 'container',
    set: function set(container) {
      this._container = container;
      this.attachEvents(this._container);
    },
    get: function get() {
      return this._container;
    }
  }, {
    key: 'containerSize',
    get: function get() {
      return this._containerSize;
    }
  }, {
    key: 'scrollSize',
    get: function get() {
      return this._scrollSize;
    }
  }, {
    key: 'scrollProgress',
    get: function get() {
      return this._scrollProgress;
    }
  }, {
    key: 'scrollOffset',
    get: function get() {
      return this._scrollOffset;
    }
  }, {
    key: 'needsUpdate',
    set: function set(needsUpdate) {
      this._needsUpdate = needsUpdate;
      if (needsUpdate) {
        // console.log("--- Set Needs Update ----")
        this._update$.onNext({
          updateAll: true,
          controller: this,
          scrollOffset: this._scrollOffset,
          containerSize: this._containerSize,
          scrollSize: this._scrollSize,
          scrollProgress: this._scrollProgress
        });

        this.needsUpdate = false;
      }
      //  else {
      //   this._update$.onNext(false)
      // }
    }
  }, {
    key: 'needsResize',
    set: function set(needsResize) {
      if (needsResize) {
        this.resize$.onNext(this._containerSize);
      }
    }
  }]);

  return ScrollController;
}();

var ScrollElement = exports.ScrollElement = function () {
  function ScrollElement(element, options) {
    var _this3 = this;

    _classCallCheck(this, ScrollElement);

    this._nonFixedPosition = null;

    this._element = element;
    this._elementOffset = { x: 0, y: 0 };
    this._triggers = [];
    this._anchorPoint = { x: 0, y: 0 };

    this._needsUpdate = false;
    this.action$ = new _rxDom2.default.BehaviorSubject(null);
    this.update$ = new _rxDom2.default.BehaviorSubject(false);
    this.viewportOffset$ = new _rxDom2.default.BehaviorSubject(this.viewportOffsetWithAnchor);

    this._scrollBehavior = null;
    this._scrollAttached = false;
    this._scrollAttachmentInitialValue = 0;

    this.update$.filter(function (needsUpdate) {
      return needsUpdate;
    })
    // .subscribeOn(Rx.Scheduler.requestAnimationFrame)
    .subscribe(function (v) {
      _this3.update();
      _this3.needsUpdate = false;
    });
  }

  _createClass(ScrollElement, [{
    key: 'update',
    value: function update() {
      // console.log(Date.now())
      this.viewportOffset$.onNext(this.viewportOffsetWithAnchor);
      this.needsUpdate = false;
    }
  }, {
    key: 'anchorPoint',
    set: function set(point) {
      this._anchorPoint = point;
    }
  }, {
    key: 'element',
    set: function set(element) {
      this._element = element;
    }
  }, {
    key: 'needsUpdate',
    get: function get() {
      return this._needsUpdate;
    },
    set: function set(needsUpdate) {
      this._needsUpdate = needsUpdate;
      this.update$.onNext(needsUpdate);
    }
  }, {
    key: 'viewportOffsetWithAnchor',
    get: function get() {
      var rect = GetViewportRect(this._element);
      var anchor = this._anchorPoint;

      // Incorporate the anchor point.
      return {
        x: rect.left + anchor.x * rect.width,
        y: rect.top + anchor.y * rect.height
      };
    }
  }, {
    key: 'absoluteRect',
    get: function get() {
      return GetAbsoluteRect(this._element);
    }
  }, {
    key: 'viewportRect',
    get: function get() {
      return GetViewportRect(this._element);
    }
  }, {
    key: 'scrollBehavior',
    set: function set(scrollBehavior) {
      this._scrollBehavior = scrollBehavior;
    }
  }, {
    key: 'scrollAttached',
    set: function set(scrollAttached) {
      this._scrollAttached = scrollAttached;
    }
  }]);

  return ScrollElement;
}();

var ScrollAction = exports.ScrollAction = function () {
  function ScrollAction(controller, options) {
    _classCallCheck(this, ScrollAction);

    this.viewport$ = new _rxDom2.default.BehaviorSubject(controller.containerSize);
    this._containerSize$ = new _rxDom2.default.BehaviorSubject(controller.containerSize);
    this.controller = controller;

    this._options = options;
    this._elements = [];
  }

  _createClass(ScrollAction, [{
    key: 'addElement',
    value: function addElement(e) {
      this._elements.push(e);
      this._controller.addElement(e);
    }
  }, {
    key: 'controller',
    set: function set(controller) {
      this._controller = controller;
      // this._containerSize$.onNext(controller.containerSize)
      controller.resize$.subscribe(this._containerSize$);
    }
  }]);

  return ScrollAction;
}();

var STATE_UNKNOWN = exports.STATE_UNKNOWN = "UNKNOWN";
var STATE_BEFORE = exports.STATE_BEFORE = "BEFORE";
var STATE_INSIDE = exports.STATE_INSIDE = "INSIDE";
var STATE_AFTER = exports.STATE_AFTER = "AFTER";

var DIRECTION_NONE = exports.DIRECTION_NONE = "NONE";
var DIRECTION_FORWARD = exports.DIRECTION_FORWARD = "FORWARD";
var DIRECTION_BACKWARD = exports.DIRECTION_BACKWARD = "BACKWARD";

var TRANSITION_NONE = exports.TRANSITION_NONE = "NONE";
var TRANSITION_ENTER = exports.TRANSITION_ENTER = "ENTER";
var TRANSITION_LEAVE = exports.TRANSITION_LEAVE = "LEAVE";

var ViewportCoordinateScrollAction = exports.ViewportCoordinateScrollAction = function (_ScrollAction) {
  _inherits(ViewportCoordinateScrollAction, _ScrollAction);

  function ViewportCoordinateScrollAction(controller, options) {
    _classCallCheck(this, ViewportCoordinateScrollAction);

    var _this4 = _possibleConstructorReturn(this, (ViewportCoordinateScrollAction.__proto__ || Object.getPrototypeOf(ViewportCoordinateScrollAction)).call(this, controller, options));

    _this4._sizeE = document.createElement('div');

    _this4.scrollOptions = options;

    _this4._containerSize$.subscribe(function (newSize) {
      // console.log("> Container Size Update: ", newSize)
      _this4.updateSizeProperties(_this4._sizeE, _this4._cssOrigin, _this4._cssSize, _this4._padding);
      _this4.viewport$.onNext(newSize);
    });

    var nullAction = {
      element: null,
      state: { x: STATE_UNKNOWN, y: STATE_UNKNOWN },
      direction: { x: DIRECTION_NONE, y: DIRECTION_NONE },
      transition: { x: TRANSITION_NONE, y: TRANSITION_NONE },
      progress: { x: 0, y: 0 },
      paddingProgress: { x: 0, y: 0 }
    };

    _this4.action$ = new _rxDom2.default.BehaviorSubject(nullAction);
    _this4.distinctElementState$ = new _rxDom2.default.BehaviorSubject(nullAction);
    _this4.transition$ = _this4.action$.distinctUntilChanged(function (a) {
      return [a.transition.x, a.transition.y, a.element];
    });
    _this4.progress$ = _this4.action$.distinctUntilChanged(function (a) {
      return [a.progress.x, a.progress.y, a.element];
    });
    _this4.state$ = _this4.action$.distinctUntilChanged(function (a) {
      return [a.state.x, a.state.y, a.element];
    });
    _this4.paddingProgress$ = _this4.action$.distinctUntilChanged(function (a) {
      return [a.paddingProgress.x, a.paddingProgress.y, a.state.x, a.state.y, a.element];
    });
    return _this4;
  }

  _createClass(ViewportCoordinateScrollAction, [{
    key: 'updateSizeProperties',
    value: function updateSizeProperties(e, origin, size, padding) {
      var rect = cssBoundingRect(this._sizeE, origin, size);
      this._origin = { x: rect.left, y: rect.top };
      this._size = { width: rect.width, height: rect.height };
      this._padding = padding;
    }
  }, {
    key: 'addElement',
    value: function addElement(e) {
      var _this5 = this;

      this._controller.addElement(e);
      e.stateAction$ = e.action$.filter(function (a) {
        return a != null;
      }).distinctUntilChanged(function (a) {
        return [a.state];
      });
      e.stateAction$.subscribe(this.distinctElementState$);

      e.viewportOffset$.pairwise().subscribe(function (v) {
        var actions = _this5.calculateAction(v[0], v[1], e);
        for (var i = 0; i < actions.length; i++) {
          e.action$.onNext(actions[i]);
          _this5.action$.onNext(actions[i]);
        }
      });
    }
  }, {
    key: 'calculateAction',
    value: function calculateAction(prevValue, newValue, element) {
      var origin = this._origin;
      var size = this._size;
      var padding = this._padding;

      var action = {
        state: { x: STATE_UNKNOWN, y: STATE_UNKNOWN },
        direction: { x: DIRECTION_NONE, y: DIRECTION_NONE }
      };

      // console.log("Origin: ", origin, "Size :", size, "New Value: ", newValue.y)

      action.direction.x = this.calculateDirection(prevValue.x, newValue.x);
      action.direction.y = this.calculateDirection(prevValue.y, newValue.y);

      action.state = this.calculateState(newValue);
      var prevState = this.calculateState(prevValue);

      var transitions = [this.calculateTransitions(prevState.x, action.state.x), this.calculateTransitions(prevState.y, action.state.y)];

      var actions = [];
      if (transitions[0].length == transitions[1].length) {
        for (var i = 0; i < transitions[0].length; i++) {
          var a = {
            element: element,
            state: action.state,
            direction: action.direction,
            transition: { x: transitions[0][i], y: transitions[1][i] },
            progress: this.calculateProgress(action.state, origin, size, { x: newValue.x, y: newValue.y }),
            paddingProgress: this.calculatePaddingProgress(action.state, origin, size, padding, { x: newValue.x, y: newValue.y })
          };

          actions.push(a);
        }
      }

      return actions;
    }
  }, {
    key: 'calculateState',
    value: function calculateState(newValue) {
      var origin = this._origin;
      var size = this._size;
      var state = { x: STATE_UNKNOWN, y: STATE_UNKNOWN };

      if (newValue.x > origin.x + size.width) {
        state.x = STATE_AFTER;
      } else if (newValue.x < origin.x) {
        state.x = STATE_BEFORE;
      } else {
        state.x = STATE_INSIDE;
      }

      if (newValue.y > origin.y + size.height) {
        state.y = STATE_AFTER;
      } else if (newValue.y < origin.y) {
        state.y = STATE_BEFORE;
      } else {
        state.y = STATE_INSIDE;
      }

      return state;
    }
  }, {
    key: 'calculateTransitions',
    value: function calculateTransitions(prevState, newState) {
      if (prevState == STATE_BEFORE && newState == STATE_INSIDE) {
        return [TRANSITION_ENTER];
      } else if (prevState == STATE_BEFORE && newState == STATE_AFTER) {
        return [TRANSITION_LEAVE]; //TRANSITION_ENTER, 
      } else if (prevState == STATE_AFTER && newState == STATE_INSIDE) {
        return [TRANSITION_ENTER];
      } else if (prevState == STATE_AFTER && newState == STATE_BEFORE) {
        return [TRANSITION_LEAVE]; //TRANSITION_ENTER, 
      } else if (prevState == STATE_INSIDE && (newState == STATE_AFTER || newState == STATE_BEFORE)) {
        return [TRANSITION_LEAVE];
      } else {
        return [TRANSITION_NONE];
      }
    }
  }, {
    key: 'calculateDirection',
    value: function calculateDirection(prevValue, newValue) {
      if (prevValue < newValue) {
        return DIRECTION_FORWARD;
      } else if (prevValue > newValue) {
        return DIRECTION_BACKWARD;
      } else {
        return DIRECTION_NONE;
      }
    }
  }, {
    key: 'calculateProgress',
    value: function calculateProgress(state, origin, size, value) {
      var p = { x: 0, y: 0 };
      var s = { x: size.width, y: size.height };
      for (var key in p) {
        if (state[key] == STATE_AFTER) {
          p[key] = 1.0;
        } else if (state[key] == STATE_BEFORE) {
          p[key] = 0;
        } else if (state[key] == STATE_UNKNOWN) {
          p[key] = 1;
        } else {
          p[key] = (value[key] - origin[key]) / s[key];
        }
      }

      return p;
    }
  }, {
    key: 'calculatePaddingProgress',
    value: function calculatePaddingProgress(state, origin, size, padding, value) {
      var p = { x: 0, y: 0 };
      var s = { x: size.width, y: size.height };
      var pad = { x: [padding.left, padding.right], y: [padding.top, padding.bottom] };

      for (var key in p) {
        if (state[key] == STATE_INSIDE) {
          p[key] = 0;
        } else if (state[key] == STATE_BEFORE) {
          var d = origin[key] - value[key];
          if (d > pad[key][0]) {
            p[key] = 1;
          } else {
            p[key] = d / pad[key][0];
          }
        } else if (state[key] == STATE_AFTER) {
          var _d = value[key] - origin[key];
          if (_d > pad[key][0]) {
            p[key] = 1;
          } else {
            p[key] = _d / pad[key][0];
          }
        } else {
          p[key] = 0;
        }
      }

      return p;
    }
  }, {
    key: 'scrollOptions',
    set: function set(props) {
      this._options = _underscore2.default.defaults(props || {}, {
        origin: { x: 0, y: 0 },
        size: { width: '100vw', height: '100vh' },
        padding: { top: 0, left: 0, bottom: 0, right: 0 }
      });

      var origin = this._options.origin;
      this._cssOrigin = {
        x: cssSizeValue(origin.x),
        y: cssSizeValue(origin.y)
      };

      var size = this._options.size;
      this._cssSize = {
        width: cssSizeValue(size.width),
        height: cssSizeValue(size.height)
      };

      this.updateSizeProperties(this._sizeE, this._cssOrigin, this._cssSize, this._options.padding);
    }
  }]);

  return ViewportCoordinateScrollAction;
}(ScrollAction);

var ScrollBehavior = exports.ScrollBehavior = function () {
  function ScrollBehavior(controller, options) {
    var _this6 = this;

    _classCallCheck(this, ScrollBehavior);

    this._containerSize$ = new _rxDom2.default.BehaviorSubject(controller._containerSize);
    this.controller = controller;
    this.viewport$ = new _rxDom2.default.BehaviorSubject(this._containerSize);

    this._options = _underscore2.default.defaults(options || {}, {
      velocity: 1,
      applyVertical: true,
      applyHorizontal: false,
      scrollStartOffset: { x: 0, y: 0 },
      scrollDistance: this._fullScrollSize
    });

    this._sizeE = document.createElement('div');
    this.scrollOptions = { scrollStartOffset: this._options.scrollStartOffset, scrollDistance: this._options.scrollDistance };

    this._containerSize$.subscribe(function (newSize) {
      _this6.updateScrollProperties(_this6._sizeE, _this6._cssStartOffset, _this6._cssDistance);
      _this6.viewport$.onNext(newSize);
      // console.log(newSize)
    });

    this.progress$ = new _rxDom2.default.BehaviorSubject(this.progress);
  }

  _createClass(ScrollBehavior, [{
    key: 'updateScrollProperties',
    value: function updateScrollProperties(e, startOffset, distance) {
      var rect = cssBoundingRect(this._sizeE, startOffset, distance);
      this._scrollStartOffset = { x: rect.left, y: rect.top };
      this._scrollDistance = { width: rect.width, height: rect.height };
    }
  }, {
    key: 'calculateProgress',
    value: function calculateProgress(current, start, length) {
      if (current <= start) {
        return 0;
      } else if (current >= start + length) {
        return 1;
      } else {
        return (current - start) / length;
      }
    }
  }, {
    key: 'scrollOptions',
    set: function set(props) {
      var startOffset = props.scrollStartOffset;
      startOffset.x = cssSizeValue(startOffset.x);
      startOffset.y = cssSizeValue(startOffset.y);

      this._cssStartOffset = startOffset;

      var distance = props.scrollDistance;
      distance.width = cssSizeValue(distance.width);
      distance.height = cssSizeValue(distance.height);

      this._cssDistance = distance;

      this.updateScrollProperties(this._sizeE, startOffset, distance);
    }
  }, {
    key: 'progress',
    get: function get() {
      var offset = this._controller.scrollOffset;
      var progress = {
        x: this.calculateProgress(offset.x, this._scrollStartOffset.x, this._scrollDistance.width),
        y: this.calculateProgress(offset.y, this._scrollStartOffset.y, this._scrollDistance.height)
      };

      return progress;
    }
  }, {
    key: 'controller',
    set: function set(controller) {
      var _this7 = this;

      if (this._controllerSubscription != null) {
        this._controller.update$.unusbscribe(this._controllerSubscription);
      }

      this._controller = controller;

      this._fullScrollSize = controller.scrollSize;
      this._fullScrollProgress = controller.scrollProgress;
      this._containerSize = controller.containerSize;

      controller.resize$.subscribe(this._containerSize$);

      this._controllerSubscription = controller.update$.subscribe(function (v) {
        // console.log(Date.now())
        _this7._fullScrollSize = v.scrollSize;
        _this7._fullScrollProgress = v.scrollProgress;
        _this7._containerSize = v.containerSize;

        _this7.progress$.onNext(_this7.progress);
      });

      // console.log(controller.update$)
    }
  }]);

  return ScrollBehavior;
}();

var GSAPScrollBehavior = exports.GSAPScrollBehavior = function (_ScrollBehavior) {
  _inherits(GSAPScrollBehavior, _ScrollBehavior);

  function GSAPScrollBehavior(controller, options) {
    _classCallCheck(this, GSAPScrollBehavior);

    var _this8 = _possibleConstructorReturn(this, (GSAPScrollBehavior.__proto__ || Object.getPrototypeOf(GSAPScrollBehavior)).call(this, controller, options));

    _this8._options = _underscore2.default.defaults(options || {}, {
      tween: { x: null, y: null },
      reverseTween: { x: null, y: null },
      autoProgress: true
    });

    _this8.tween = _this8._options.tween;
    _this8.reverseTween = _this8._options.tween;

    if (_this8._options.autoProgress) {
      _this8.progress$.distinctUntilChanged().pairwise().subscribe(function (v) {
        var p = v[1];
        var prev = v[0];

        _this8.applyProgress(p, prev);
      });
    }
    return _this8;
  }

  _createClass(GSAPScrollBehavior, [{
    key: 'applyProgress',
    value: function applyProgress(p, prev) {
      var direction = { x: DIRECTION_FORWARD, y: DIRECTION_FORWARD };
      if (prev.x > p.x) {
        direction.x = DIRECTION_BACKWARD;
      }

      if (prev.y > p.y) {
        direction.y = DIRECTION_BACKWARD;
      }

      if (this._tween.x != null && (direction.x == DIRECTION_FORWARD || this._reverseTween.x == null)) {
        this._tween.x.progress(p.x);
        this._controller.needsUpdate = true;
      } else if (direction.x == DIRECTION_BACKWARD && this._reverseTween.x != null) {
        this._reverseTween.x.progress(1 - p.x);
        this._controller.needsUpdate = true;
      }

      if (this._tween.y != null && (direction.y == DIRECTION_FORWARD || this._reverseTween.y == null)) {
        this._tween.y.progress(p.y);
        // console.log("Progress", p.y)
        this._controller.needsUpdate = true;
      } else if (direction.y == DIRECTION_BACKWARD && this._reverseTween.y != null) {
        this._reverseTween.y.progress(1 - p.y);
        this._controller.needsUpdate = true;
      }
    }
  }, {
    key: 'tween',
    set: function set(newTween) {
      this._tween = newTween;
      this.progress$.onNext(0);
      this.progress$.onNext(this.progress);
    }
  }, {
    key: 'reverseTween',
    set: function set(newTween) {
      this._reverseTween = newTween;
      this.progress$.onNext(0);
      this.progress$.onNext(this.progress);
    }
  }]);

  return GSAPScrollBehavior;
}(ScrollBehavior);

var GetScrollOffset = exports.GetScrollOffset = function GetScrollOffset(el) {
  var scrollTop = el && typeof el.scrollTop === 'number' ? el.scrollTop : window.pageYOffset || 0;
  var scrollLeft = el && typeof el.scrollLeft === 'number' ? el.scrollLeft : window.pageXOffset || 0;
  return { x: scrollLeft, y: scrollTop };
};

var GetViewportRect = exports.GetViewportRect = function GetViewportRect(el, container) {
  var rect = el.getBoundingClientRect();
  return rect;
};

var GetAbsoluteRect = exports.GetAbsoluteRect = function GetAbsoluteRect(el, container) {
  var rect = el.getBoundingClientRect();
  var absRect = {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width
  };

  var rel = container === undefined ? document : container;
  var scrollTop = rel && typeof rel.scrollTop === 'number' ? rel.scrollTop : window.pageYOffset || 0;
  var scrollLeft = rel && typeof rel.scrollLeft === 'number' ? rel.scrollLeft : window.pageXOffset || 0;

  absRect.top += scrollTop;
  absRect.left += scrollLeft;
  absRect.bottom += scrollTop;
  absRect.right += scrollLeft;

  return absRect;
};