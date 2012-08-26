/**
 * Provides requestAnimationFrame in a cross browser way.
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */
if ( !window.requestAnimationFrame ) {

	window.requestAnimationFrame = (function(){
	  return  window.requestAnimationFrame       || 
	          window.webkitRequestAnimationFrame || 
	          window.mozRequestAnimationFrame    || 
	          window.oRequestAnimationFrame      || 
	          window.msRequestAnimationFrame     || 
	          function( callback, element) { window.setTimeout(callback, 1000 / 60); };
	})();
}

;(function ( $, window, document, undefined ) {

	var pluginName = "animOnScroll",
		defaults = {
			'smoothing': true,
			'from': {},
			'to': {},
			'scrollbarPosition': 0,
			'smoothScrollbarPosition': 0,
			'realScrollbarPosition': 0,
			'scrolling': true,
			'scrollerTimeout': 0,
			'supportsTransform': false,
			'vendorPrefix': {},
			'useTransforms': true,
			'speed': .6,
			'animations': [],
			'alwaysShow': false
		};

		function animOnScroll(element, options){
			this.element = $(element);
			this.parent = $(element).parent();
			this._config = ( typeof options !== 'undefined' ) ? $.extend({},defaults,options) : defaults;

			var vendors = ['webkit','Moz','o','ms',''],
				d = document.createElement("div");

			for ( var i = 0; i < vendors.length; i++ ) {
				if ( typeof d.style[ vendors[i] + 'Transform'] !== 'undefined' ) {
					this._config.vendorPrefix = { 'css': '-' + vendors[i] + '-', 'event': vendors[i] };
					this._config.supportsTransform = true;
					break;
				} 
			}

			if (navigator.userAgent.match(/MSIE/gi)){ //ie9 transforms are unreliable
				this._config.supportsTransform = false;
				this._config.useTransforms = false;
			}

			this.init();
		}

		animOnScroll.prototype.init = function(){
			for ( var i = 0; i < this._config.animations.length; i++ ) {
				this._config.animations[ i ] = this.prepareAnimation( this._config.animations[ i ] );
			}
			this.self = this.element,
			this._globals = {
				'currentState': {},
				'targetState': {},
				'css': {},
				'transitionComplete': false,
				'supports3D': ('WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix()),
				'currentAnimation': {},
				'animationIndex': -1,
				'isAnimating': true
			};

			if ( !window.animOnScroll_broadcaster ) {
				window.animOnScroll_broadcaster = new animOnScroll_broadcaster().init();
			}

			//if transforms are supported offload easing to CSS transition
			this.initTransition();
			if ( this._config.animations.length > 0 ) { this._globals.currentAnimation = this._config.animations[0]; }
			$(window).bind('scroll', bindHandler(this, function( e ) { this._config.scrolling = true; }));
			this.anim();
		}

		animOnScroll.prototype.initTransition = function(){
			if ( this._config.supportsTransform && this._config.useTransforms ) {
				this._config.smoothing = false;
				this.element.css( this.applyVendorPrefixes({
					'transition': 'all ' + this._config.speed + 's cubic-bezier(0,0,.2,1)',
					'transform-style': 'preserve-3d',
					'backface-visibility': 'hidden'
				}));
			}
		}

		animOnScroll.prototype.applyVendorPrefixes = function( css ) {
			var prefixed = {};
			for ( var p in css ) {
				if ( p.match(/(transform|transition|animation|backface\-visibility)/gi)) {
					prefixed[ this._config.vendorPrefix.css + p] = css[p];
				} else {
					prefixed[p] = css[p];
				}
			}
			return prefixed;
		}

		animOnScroll.prototype.prepareAnimation = function(animation){
			if ( typeof animation !== 'undefined' ) {

				if ( typeof animation.from === 'undefined' ) { animation['from'] = {}; }

				if ( emptyObject( animation.from ) ) {

					if ( !emptyObject( animation.to ) ) {

						for ( var p in animation.to ) {
							if ( animation.to.hasOwnProperty(p) ) {
								if ( p == 'rotate' ) { 
									if ( this._config.supportsTransform && this._config.useTransforms ) { animation.from[ p ] = 0; }	
								} else if ( p == 'scale' ) { 
									if ( this._config.supportsTransform && this._config.useTransforms ) { animation.from[ p ] = 1; }
								} else if ( p == 'left' ) {
									if ( this._config.supportsTransform && this._config.useTransforms ) {
										animation['from'][ p ] = 0;
									} else {
										animation['from'][ p ] = this.getStyle(this.element[0], p);
										animation['to'][p] += animation['from'][ p ];
									}
								} else if ( p == 'top' ) { 
									if ( this._config.supportsTransform && this._config.useTransforms ) {
										animation['from'][ p ] = 0; 
									} else {
										animation['from'][ p ] = this.getStyle(this.element[0], p);
										animation['to'][p] += animation['from'][ p ];
									}
								} else if ( p == 'bottom' ) { 
									if ( this._config.supportsTransform && this._config.useTransforms ) {
										animation['from'][ p ] = 0; 
									} else {
										animation['from'][ p ] = this.getStyle(this.element[0], p);
										animation['to'][p] -= animation['from'][ p ];
									}
								}
								else { animation.from[ p ] = this.getStyle(this.element[0], p); }
							}
						}
					}
				}
			} 
			return animation;
		}
			

		animOnScroll.prototype.getStyle = function(el, cssprop){
			if (el.currentStyle) //IE
				return parseInt( el.currentStyle[cssprop] );
			else if (document.defaultView && document.defaultView.getComputedStyle) //Firefox
				return parseInt( document.defaultView.getComputedStyle(el, "")[cssprop] );
			else //try and get inline style
				return parseInt( el.style[cssprop] );
		}

		animOnScroll.prototype.selectAnimation = function() {
			var a = this._config.animations,
				len = a.length;
			while ( len-- ) {
				if ( this.inAnimateZone( a[ len ] ) && this._globals.animationIndex != len ) {
					this._globals.animationIndex = len;
					this._globals.currentAnimation = a[ len ];
				} else if ( this.inBeforeAnimateZone( a[ len ] ) && this._globals.animationIndex != len ) {
					this._globals.animationIndex = len;
					this._globals.currentAnimation = a[ len ];
				}
			}
			if ( a.length == 0 ) { this._globals.currentAnimation = { startOn: _config.startOn, endOn: _config.endOn, to: _config.to, from: _config.from }; }
		}

		animOnScroll.prototype.notAnimating = function(){
			var a = this._config.animations;
			if ( a[ a.length -1 ].endOn - this._config.scrollbarPosition <= -(window.innerHeight*5) || a[0].startOn - this._config.scrollbarPosition >= (window.innerHeight*3) ) {
				return true;
			}
			return false;
		}

		animOnScroll.prototype.anim = function() {

			if ( this._config.scrolling ) {

				if ( this._config.smoothing ) {
					this._config.scrollbarPosition += (window.animOnScroll_realScrollbarPosition - this._config.scrollbarPosition) * .08;
					if ( Math.abs(this._config.scrollbarPosition - window.animOnScroll_realScrollbarPosition ) < .1) {
						this._config.scrollbarPosition = window.animOnScroll_realScrollbarPosition;
					}
				} else {
					this._config.scrollbarPosition = window.animOnScroll_realScrollbarPosition;
				}

				if ( !this._config.alwaysShow ){
					if ( this.notAnimating() ) {
						this.element.css('display','none');
						this._globals.isAnimating = false;
					} else {
						this.element.css('display','block');
						this._globals.isAnimating = true;
					}
				}
				
				if ( this._globals.isAnimating ) {

					this.selectAnimation();

					if ( this.inBeforeAnimateZone(this._globals.currentAnimation) ) {

						for ( var p in this._globals.currentAnimation.from ) { this._globals.currentState[ p ] = this._globals.currentAnimation.from[ p ]; }

					} else if ( this.inAnimateZone(this._globals.currentAnimation) ) {

						var d = this._config.scrollbarPosition - this._globals.currentAnimation.startOn,
							percent = (d / ( this._globals.currentAnimation.endOn -  this._globals.currentAnimation.startOn )).toFixed(4);

						for ( var p in this._globals.currentAnimation.to ) {

							var originalDelta = parseInt(this._globals.currentAnimation.to[ p ]) - parseInt( this._globals.currentAnimation.from[ p ]),
								val = ( (p == 'top' || p == 'left' || p == 'bottom') && this._config.supportsTransform ) ? this._globals.currentAnimation.from[ p ] + originalDelta * percent : parseInt( this._globals.currentAnimation.from[ p ]) + originalDelta * percent;
							this._globals.currentState[ p ] = val;
						}

					} else {

						for ( var p in this._globals.currentAnimation.to ) { this._globals.currentState[ p ] = this._globals.currentAnimation.to[ p ]; }
					}

					this.element.css( this.getCSS() );
				}
				this._config.scrolling = window.animOnScroll_realScrollbarPosition != this._config.scrollbarPosition;
			}

			requestAnimationFrame( bindHandler(this, this.anim), 1000/60);
			
		}

		animOnScroll.prototype.getCSS = function() {
			var transform = '',
				translate = '';

			for ( var p in this._globals.currentState ) {
				switch ( p ) {
					case 'rotate':
						transform += ' rotate(' + this._globals.currentState[ p ].toFixed(4) + 'deg)';
						break;
					case 'scale':
						transform += ' scale(' + this._globals.currentState[ p ] + ')';
						break;
					case 'opacity':
						this._globals.css[ p ] = this._globals.currentState[ p ];
						break;
					case 'top':
						if ( this._config.supportsTransform ) {
							translate += ' translateY(' + this._globals.currentState[ p ].toFixed(2) + 'px)';
						} else {
							this._globals.css[ p ] = this._globals.currentState[ p ] + 'px';
						}
						break;
					case 'bottom':
						if ( this._config.supportsTransform ) {
							translate += ' translateY(' + this._globals.currentState[ p ].toFixed(2) + 'px)';
						} else {
							this._globals.css[ p ] = this._globals.currentState[ p ] + 'px';
						}
						break;
					case 'left':
						if ( this._config.supportsTransform ) {
							translate += ' translateX(' + this._globals.currentState[ p ].toFixed(2) + 'px)';
						} else {
							this._globals.css[ p ] = this._globals.currentState[ p ] + 'px';
						}
						break;
					default:
						this._globals.css[ p ] = this._globals.currentState[ p ] + 'px';
				}
			}

			if ( transform != '' || translate != '' ) {
				if ( this._globals.supports3D ) { translate += ' translateZ(0px)'; }
				transform = translate + transform;
				this._globals.css[ this._config.vendorPrefix.css + 'transform'] = transform;
			}

			return this._globals.css;
		}

		animOnScroll.prototype.inAnimateZone = function( animation ) {
			if ( typeof animation !== 'undefined' ) {
				return this._config.scrollbarPosition > animation.startOn && this._config.scrollbarPosition < animation.endOn;
			}
			return this._config.scrollbarPosition > this._config.startOn && this._config.scrollbarPosition < this._config.endOn;
		}

		animOnScroll.prototype.inBeforeAnimateZone = function( animation ) {
			if ( typeof animation !== 'undefined' ) {
				return this._config.scrollbarPosition <= animation.startOn;
			}
			return this._config.scrollbarPosition <= this._config.startOn;
		}

		animOnScroll.prototype.inAfterAnimateZone = function( animation) {
			if ( typeof animation !== 'undefined' ) {
				return this._config.scrollbarPosition > animation.endOn;
			}
			return this._config.scrollbarPosition > this._config.endOn;
		}


		//utility functions
		function emptyObject( o ) {
			for ( var p in o ) { return false; }
			return true;
		}

		function normalizeCSS( css ) {
			var newCSS = {};
			for ( var p in css ) {
				newCSS[ p ] = parseInt(css[ p ]);
			}
			return newCSS;
		}

		function bindHandler( scope, func ) {
			return function() { func.apply(scope, arguments); }
		}

		function animOnScroll_broadcaster(){
			this.init = function(){
				if (!window.animOnScroll_realScrollbarPosition && !window.animOnScroll_isScrolling) {
					window.animOnScroll_realScrollbarPosition = 0;
					window.animOnScroll_isScrolling = false;
				}
				$(window).bind('scroll',function(e){
					window.animOnScroll_realScrollbarPosition = $(this).scrollTop();
					window.animOnScroll_isScrolling = true;
				});
				return this;
			}
		}

		$.fn[pluginName] = function ( options ) {
	        return this.each(function () {
	            if (!$.data(this, 'plugin_' + pluginName)) {
	                $.data(this, 'plugin_' + pluginName,
	                new animOnScroll( this, options ));
	            }
	        });
	    }

})( jQuery, window, document );