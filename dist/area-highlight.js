
// Polyfills for IE8 for .forEach and .map methods of Array
(function(Array) {
  Array.prototype.forEach||(Array.prototype.forEach=function(c,d){var e,a;if(null==this)throw new TypeError("this is null or not defined");var b=Object(this),g=b.length>>>0;if("[object Function]"!=={}.toString.call(c))throw new TypeError(c+" is not a function");d&&(e=d);for(a=0;a<g;){var f;Object.prototype.hasOwnProperty.call(b,a)&&(f=b[a],c.call(e,f,a,b));a++}});
  Array.prototype.map||(Array.prototype.map=function(c){if(void 0===this||null===this)throw new TypeError;var b=Object(this),d=b.length>>>0;if("function"!==typeof c)throw new TypeError;for(var e=Array(d),f=2<=arguments.length?arguments[1]:void 0,a=0;a<d;a++)a in b&&(e[a]=c.call(f,b[a],a,b));return e});
})(window.Array);

(function(window, undefined) {
  'use strict';

  var document = window.document,
    ahlKeyCode = 32,     // key to trigger event
    longpressTime = 1000,
    isIE = (navigator.userAgent.toLowerCase().indexOf('msie') != -1) ? parseInt(navigator.userAgent.toLowerCase().split('msie')[1]) : false,
    storage = window.sessionStorage ? window.sessionStorage : {};

  // Small helper to extend objects
  function extend(to, from) {
    for(var i in from) {
      if (from.hasOwnProperty(i)) { to[i] = from[i]; }
    }
  }

  // Helpers for cross-browser event handlers
  function bind(element, eventName, handler) {
    if (element.addEventListener) {
      element.addEventListener(eventName, handler, false);
    } else if (element.attachEvent) {
      element.attachEvent('on' + eventName, handler);
    } else {
      element['on' + eventName] = handler;
    }
  }
  function unbind(element, eventName, handler) {
    if (element.addEventListener) {
      element.removeEventListener(eventName, handler, false);
    } else if (element.detachEvent) {
      element.detachEvent('on' + eventName, handler);
    } else {
      element['on' + eventName] = null;
    }
  }

  // Helper to make fade out animation.
  // For IE just hides element in 500ms
  function fadeOut(el, cb) {
    if(isIE) {
      setTimeout(function() {
        addClass(el, 'ahl-hidden');
      }, 500);
      return;
    }
    function onEnd() {
      if(cb) { cb.apply(this, arguments); }
      addClass(el, 'ahl-hidden');
      unbind(el, 'transitionend', onEnd);
    }
    bind(el, 'transitionend', onEnd);
    addClass(el, 'ahl-fadeout');
  }

  // Helpers for manipulating classes
  function addClass(el, className) {
    el.className += " " + className;
  }
  function removeClass(el, className) {
    el.className = el.className.replace( new RegExp('(' + className + ')', 'g') , '' )
  }

  function Overlay(map) {
    this.map = map;
    // detect the map identity based on an id or name attribute
    var mapIden = this.map.id || this.map.name;
    this.img = document.querySelector('img[usemap="#' + mapIden + '"]');
    this.build();
    this.attachEvents();
    if(!this.isVisible()) { this.hide(); }
    this.addToPage();
  }

  extend(Overlay.prototype, {
    // Image MAP to be highlighted
    map: null,
    // Image linked to image MAP
    img: null,
    // Container for highlighting elements
    el: null,
    // Elements to be used for highlighting
    lights: [],

    // Returns array of parsed coords of the AREA.
    getCoords: function (area) {
      var coords = area.getAttribute('coords');
      if (!coords) { return []; }
      coords = coords.split(/(?:,|\s)/);
      return coords.map(function (n) {
        return parseInt(n, 10);
      });
    },

    // Creates and returns element for array of coords. To be used for AREA highlighting
    getLight: function (area) {
      var coords = this.getCoords(area),
        light = document.createElement('a'),
        svg, pcoords;
      switch(area.shape) {
      case 'rect':
        extend(light.style, {
          left: (coords[0]) + 'px',
          top: (coords[1]) + 'px',
          width: (coords[2] - coords[0]) + 'px',
          height: (coords[3] - coords[1]) + 'px'
        });
        break;
      case 'circle':
        extend(light.style, {
          left: (coords[0] - coords[2]) + 'px',
          top: (coords[1] - coords[2]) + 'px',
          width: (coords[2] * 2) + 'px',
          height: (coords[2] * 2) + 'px',
          borderRadius: coords[2] + 'px'
        });
        break;
      case 'poly':
        pcoords = this.getPolyCoords(coords);
        extend(light.style, {
          left: pcoords.left + 'px',
          top: pcoords.top + 'px',
          width: pcoords.width + 'px',
          height: pcoords.height + 'px'
        });
        if(!isIE || (isIE >= 9)) {
          light.appendChild(this.getPolySVG(coords));
          light.style.background = 'transparent';
        }
        break;
      }
      light.href = area.href;
      addClass(light, 'ahl-light-' + area.shape);
      return light;
    },

    // Creates and returns polygon SVG for poly AREA
    getPolySVG: function(coords) {
      var pcoords = this.getPolyCoords(coords),
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"),
        polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon"),
          // Polygon inside SVG should start from 0,0 as SVG is absolutely positioned
        points = coords.map(function(val, i) {
          return (i%2) ? (val - pcoords.top) : (val - pcoords.left);
        }).join(',');
      svg.setAttribute('version', '1.1');
      svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
      svg.setAttribute('width', pcoords.width);
      svg.setAttribute('height', pcoords.height);
      polygon.setAttribute('points', points);
      svg.appendChild(polygon);
      return svg;
    },

    // Returns coordinates for rectangle that wraps SVG
    getPolyCoords: function(coords) {
      var x1, x2, y1, y2;
      coords.forEach(function(val, i) {
        if(i%2) {
          if(!y1 || val < y1) { y1 = val; }
          if(!y2 || val > y2) { y2 = val; }
        } else {
          if(!x1 || val < x1) { x1 = val; }
          if(!x2 || val > x2) { x2 = val; }
        }
      });
      return {
        left: x1,
        top: y1,
        width: x2 - x1,
        height: y2 - y1
      };
    },

    // Creates DIV to be places above IMG with highlighting elements
    build: function() {
      var img = this.img;
      this.overlay = document.createElement('div');
      addClass(this.overlay, isIE ? 'ahl ahl-ie' : 'ahl');
      extend(this.overlay.style, {
        zIndex: (parseInt(img.style.zIndex) || 0) + 1,
        left: img.offsetLeft + 'px',
        top: img.offsetTop + 'px',
        width: img.offsetWidth + 'px',
        height: img.offsetHeight + 'px'
      });

      // Creates array of elements that can be used for highlighting AREAs of input MAP
      var areas = this.map.querySelectorAll('area'),
        me = this;
      Array.prototype.forEach.call(areas, function(area) {
        var light = me.getLight(area);
        if(!light) { return }
        me.lights.push(light);
        me.overlay.appendChild(light);
      });
    },

    // Attaches events to trigger overlay show/hide
    attachEvents: function() {
      var me = this,
        pressTimer;

      bind(document, 'keypress', function(e) {
        var keyCode = e.keyCode || e.charCode;
        if(keyCode === ahlKeyCode) {
          if(me.isVisible()) { me.hide(true); } else { me.show(true); }
          if(e.preventDefault) { e.preventDefault(); } else { e.returnValue = false; }
        }
      });

      bind(this.img, 'click', function() {
        me.showBriefly();
      });

      bind(this.img, 'mouseup', function() {
        clearTimeout(pressTimer);
      });
      bind(this.img, 'mousedown', function(e) {
        var rightclick;
        rightclick = (e.which) ? (e.which == 3) : (e.button && e.button === 2);
        if(rightclick) { return; }
        pressTimer = window.setTimeout(function() {
          me.showBriefly();
        }, longpressTime);
      })
    },

    addToPage: function() {
      document.body.appendChild(this.overlay);
    },

    // Indicates if highlighting is visible.
    // In localStorage false value can be stored as string, so we should check if it doesn't equals "false" string.
    isVisible: function() {
      var ahlvisible = storage.ahlvisible;
      return !!ahlvisible && (ahlvisible !== 'false');
    },
    // Functions to control visibility of overlay
    show: function(remember) {
      hideHint();
      removeClass(this.overlay, 'ahl-hidden');
      if(remember) { storage.ahlvisible = true; }
    },
    hide: function(remember) {
      addClass(this.overlay, 'ahl-hidden');
      removeClass(this.overlay, 'ahl-fadeout');
      if(remember) { storage.ahlvisible = false; }
    },
    fadeout: function(remember) {
      var me = this;
      fadeOut(this.overlay, function() {
        me.hide(remember);
      });
    },
    // Show and then fades out overlay. For IE - shows and hides overlay in a second.
    showBriefly: function() {
      var me = this;
      this.show();
      setTimeout(function() {
        me.fadeout();
      }, 500);
    }
  });

  // Functions to trigger hint
  var hint;
  function showHint() {
    if(storage.ahlhintshown) { return; }
    hint = document.createElement('div');
    addClass(hint, 'ahl-hint');
    hint.innerHTML = 'Press spacebar to show or hide <span>hotspots</span>.';
    bind(hint, 'click', hideHint);
    document.body.appendChild(hint);
  }
  function hideHint() {
    if(!hint) { return; }
    fadeOut(hint);
    storage.ahlhintshown = true;
  }

  window.onload=function(){
    var maps = document.querySelectorAll('map');
    // Calling initialization for each of maps.
    // Using Array.prototype.forEach as 'maps' is not real array, but collection of DOM elements (not a child from Array).
    Array.prototype.forEach.call(maps, function(map) { new Overlay(map); });

    showHint();
  };
})(window);