/*
*	mapContourEditor plugin v1.0
*	bossevaldy@gmail.com
*/
(function($) {
	//default settings
	var defaults = {
		contour:{},				//points array x,y,x1,y1,...,xn,yn
		tolerance:20,			//color tolerance for 'magic wand' mode
		cback:'rgba(120,0,0,0.3)',	//contour background color
		cborder:'rgba(255,0,0,0.3)',	//contour border color
		msize:2,				//marker size
		mback:'rgba(255,255,255,0.5)',	//marker background color
		mborder:'rgba(255,0,0,0.5)',	//marker border color
		magicStick:1			//"magic stick" tool mode 0/1
	};
	var activePoint,draw,mousedown,rightclick,stopdrag,dotLineLength,move;
	
	var methods = {
		init:function(params) {
			//actual settings
			var options = $.extend({}, defaults, params);
			
			var numCount=0;
			//init once
			return this.each(function(){
				var data = $(this).data('uid');
				//If not initialized yet
				if ( ! data ) {
					//Predefine inner variables
					
					//get width/height of donor
					options['width']=$(this).width();
					options['height']=$(this).height();
					
					//generate random id for each object
					var $rnd = new Date();
					options['uid']=$rnd.getTime().toString()+numCount.toString();
					numCount++;
					
					var inOffset=$(this).offset();
					
					$('body').append('<div id="d'+options['uid']+'" style="position:absolute;z-index:9999;top:'+inOffset.top+'px;left:'+inOffset.left+'px;width:'+options['width']+'px;height:'+options['height']+'px;display:block;margin:0;padding:0;"><canvas id="c'+options['uid']+'" style="width:'+options['width']+'px;height:'+options['height']+'px;"></canvas></div>');
					
					options['ctx'] = $('#c'+options['uid'])[0].getContext('2d');
					options['ctx'].canvas.width=options['width'];
					options['ctx'].canvas.height=options['height'];
					
					options['src']=$(this).attr('src');
					options['sourceObject']=$(this);
					
					$('#c'+options['uid']).data(options);
					$(this).data({'uid':options['uid']});
					
					draw(options);
					
					//Set up inner methods
					$('#c'+options['uid']).bind("mousedown.mapContourEditor",mousedown);
					$('#c'+options['uid']).bind("contextmenu.mapContourEditor",rightclick);
					$('#c'+options['uid']).bind("mouseup.mapContourEditor",stopdrag);
					//return this;
				}
			});
		},
		
		getData:function(parData) {
			//get variables
			//WARNING! In this version module will return data only for one item!!!
			//todo: fix it
			if (typeof $('#c'+$(this).data('uid')).data(parData)!="undefined"){
				return $('#c'+$(this).data('uid')).data(parData);
			}
		},
		
		setData:function(parData) {
			//set variables
			return this.each(function(){
				$('#c'+$(this).data('uid')).data(parData);
			});
		},
		
		destroy:function() {
			//destroy plugin, remove saved data and created elements
			return this.each(function(){
				var $this = $(this);
				$('#d'+$this.data('uid')).remove();
				$this.removeData();
				$(this).unbind("mapContourEditor");
       		});
		}
	};
	
	//Basic things
	$.fn.mapContourEditor = function(method){
		if($(this).is("img")) {
			if ( methods[method] ) {
				return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
			} else if ( typeof method === 'object' || ! method ) {
				return methods.init.apply( this, arguments );
			} else {
				$.error( 'Method "' +  method + '" not found in jQuery.mapContourEditor' );
			}
		} else {
			$.error( 'jQuery.mapContourEditor can be applied to IMG elements only!' );
		}
	};
	
	//Line length calculation
	dotLineLength = function(x, y, x0, y0, x1, y1, o) {
		function lineLength(x, y, x0, y0){
			return Math.sqrt((x -= x0) * x + (y -= y0) * y);
		}
		if(o && !(o = function(x, y, x0, y0, x1, y1){
			if(!(x1 - x0)) return {x: x0, y: y};
		else if(!(y1 - y0)) return {x: x, y: y0};
			var left, tg = -1 / ((y1 - y0) / (x1 - x0));
			return {x: left = (x1 * (x * tg - y + y0) + x0 * (x * - tg + y - y1)) / (tg * (x1 - x0) + y0 - y1), y: tg * left - tg * x + y};
		}(x, y, x0, y0, x1, y1), o.x >= Math.min(x0, x1) && o.x <= Math.max(x0, x1) && o.y >= Math.min(y0, y1) && o.y <= Math.max(y0, y1))){
			var l1 = lineLength(x, y, x0, y0), l2 = lineLength(x, y, x1, y1);
			return l1 > l2 ? l2 : l1;
		} else {
			var a = y0 - y1, b = x1 - x0, c = x0 * y1 - y0 * x1;
			return Math.abs(a * x + b * y + c) / Math.sqrt(a * a + b * b);
		}
	};
	
	//Draw current contour
	draw = function(options) {
		var ctx = options.ctx;
		ctx.canvas.width = ctx.canvas.width;
		if (options.contour.length < 2) {
			return false;
      	}
		ctx.globalCompositeOperation = 'destination-over';
		ctx.fillStyle = options.mback;
		ctx.strokeStyle = options.mborder;
		ctx.lineWidth = 1;

		ctx.beginPath();
		ctx.moveTo(options.contour[0], options.contour[1]);
		for (var i = 0; i < options.contour.length; i+=2) {
			ctx.fillRect(options.contour[i]-options.msize, options.contour[i+1]-options.msize, 2*options.msize, 2*options.msize);
			ctx.strokeRect(options.contour[i]-options.msize, options.contour[i+1]-options.msize, 2*options.msize, 2*options.msize);
			if (options.contour.length > 2 && i > 1) {
				ctx.lineTo(options.contour[i], options.contour[i+1]);
			}
		}
		ctx.closePath();
		ctx.fillStyle = options.cback;
		ctx.strokeStyle = options.cborder;
		ctx.fill();
		ctx.stroke();
	};
	
	move = function(e) {
		options=$(this).data();
		if(!e.offsetX) {
			e.offsetX = (e.pageX - $(e.target).offset().left);
			e.offsetY = (e.pageY - $(e.target).offset().top);
		}
		options.contour[activePoint] = Math.round(e.offsetX);
		options.contour[activePoint+1] = Math.round(e.offsetY);
		draw(options);
	};

	stopdrag = function() {
		//options=$(this).data();
		$(this).unbind('mousemove');
		activePoint = null;
	};

	rightclick = function(e) {
		options=$(this).data();
		e.preventDefault();
		if(!e.offsetX) {
			e.offsetX = (e.pageX - $(e.target).offset().left);
			e.offsetY = (e.pageY - $(e.target).offset().top);
		}
		var x = e.offsetX, y = e.offsetY;
		for (var i = 0; i < options.contour.length; i+=2) {
			dis = Math.sqrt(Math.pow(x - options.contour[i], 2) + Math.pow(y - options.contour[i+1], 2));
			if ( dis < 6 ) {
				options.contour.splice(i, 2);
				draw(options);
				return false;
			}
		}
		return false;
	};

	mousedown = function(e) {
		options=$(this).data();
		var x, y, dis, lineDis, insertAt = options.contour.length;
		
		if (e.which === 3) {
			return false;
		}

		e.preventDefault();
		if(!e.offsetX) {
			e.offsetX = (e.pageX - $(e.target).offset().left);
			e.offsetY = (e.pageY - $(e.target).offset().top);
		}
		x = e.offsetX; y = e.offsetY;
		if(options.magicStick==1) {
			//Create new contour with "magic stick" tool
			
			//create temporary canvas element in memory
			var canvas = document.createElement('canvas');
			var context = canvas.getContext('2d');
			context.canvas.width=options['width'];
			context.canvas.height=options['height'];
			
			var img=new Image();
			img.src=options.src;
			
			//draw image
			context.drawImage(img,0,0,options.width,options.height);
			//get image data
			var theData = context.getImageData(0, 0, options.width, options.height);
			
			//make start contour
			var poly = contour(theData.data, parseInt(options.width), parseInt(options.height), x, y,options);
			//clear start contour and get nomal one
			poly = simplifyDP(poly, 1);

			points = [];

			for (i = 0; i < poly.length-1; i++) {
				points.push(poly[i][0], poly[i][1]);
			}
			options.contour=points;
			$(this).data({contour:points,magicStick:0});
			$(this).data('sourceObject').trigger('magicStickChange');
		} else {
			//Work with current contour
			for (var i = 0; i < options.contour.length; i+=2) {
				dis = Math.sqrt(Math.pow(x - options.contour[i], 2) + Math.pow(y - options.contour[i+1], 2));
				if ( dis < 6 ) {
					activePoint = i;
					$(this).bind('mousemove', move);
					return false;
				}
			}
	
			for (var i = 0; i < options.contour.length; i+=2) {
				if (i > 1) {
					lineDis = dotLineLength(
						x, y,
						options.contour[i], options.contour[i+1],
						options.contour[i-2], options.contour[i-1],
						true
					);
					if (lineDis < 6) {
						insertAt = i;
					}
				}
			}
	
			options.contour.splice(insertAt, 0, Math.round(x), Math.round(y));
			activePoint = insertAt;
			$(this).bind('mousemove', move);
		}
		
		draw(options);

		return false;
	};
	
	function contour(image_data, width, height, x, y,options) {
		var components = 4; //rgba
		// get color to match 
		var colorStep=options.tolerance;
		var pixel_pos = (y * width + x) * components;
		var color = [image_data[pixel_pos],
			image_data[pixel_pos + 1],
			image_data[pixel_pos + 2]];

    // helper 
    function match_color(x, y) {
        if (x < 0 || x >= width || y < 0 || y >= height)
            return false;

        var pixel_pos = (y * width + x) * components;
        if (color[0] >= (image_data[pixel_pos] - colorStep) && color[0] <= (image_data[pixel_pos] + colorStep) &&
                color[1] >= (image_data[pixel_pos + 1] - colorStep) && color[1] <= (image_data[pixel_pos + 1] + colorStep) &&
                color[2] >= (image_data[pixel_pos + 2] - colorStep) && color[2] <= (image_data[pixel_pos + 2] + colorStep)) {
            return true;
        } else {
            return false;
        }
    }

    var poly = [];

    // first find the starting point
    var lower_y = y;
    while (match_color(x, ++lower_y)) {
    }
    --lower_y;
    var start_point = [x, lower_y];

    // start with moore-neightbor
    var moore = new MooreNeighbour(start_point);
    var point;
    do {
        point = moore.next(match_color);
        if (point == undefined) {
            break;
        }
        poly.push(point);
    } while (!(start_point[0] == point[0] && start_point[1] == point[1]));
    return poly;
}
function MooreNeighbour(start_point) {
    //clockwise order
    var positions = [[0, 1],
        [-1, 1],
        [-1, 0],
        [-1, -1],
        [0, -1],
        [1, -1],
        [1, 0],
        [1, 1]];

    var x = start_point[0];
    var y = start_point[1];
    var old_cell = [x, y + 1];

    // based on diff return the next position clockwise
    function clockwise_next(diff) {
        for (var i = 0; i < 8; ++i) {
            var d = positions[i];
            if (d[0] == diff[0] && d[1] == diff[1])
                return positions[(i + 1) % 8];
        }
    }

    // with current cell and old_cell return new cell to test
    function next_cell(cell, old_cell) {
        var dx = cell[0] - old_cell[0];
        var dy = cell[1] - old_cell[1];
        var i = clockwise_next([-dx, -dy]);
        return [cell[0] + i[0], cell[1] + i[1]];
    }

    // return next contour cell, undefined if no new cell
    this.next = function(inside) {
        var c = 8; // max 8 positions to test
        while (c--) {
            var n = next_cell([x, y], old_cell);
            if (inside(n[0], n[1])) {
                x = n[0];
                y = n[1];
                return [x, y];
            }
            old_cell = n;
        }
    }
}

/*https://github.com/mourner/simplify-js*/
function getSqSegDist(p, p1, p2) {
    var x = p1[0],
            y = p1[1],
            dx = p2[0] - x,
            dy = p2[1] - y;

    if (dx !== 0 || dy !== 0) {
        var t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
            x = p2[0];
            y = p2[1];
        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = p[0] - x;
    dy = p[1] - y;

    return dx * dx + dy * dy;
}

function simplifyDP(points, sqTolerance) {
    var len = points.length,
            MarkerArray = Array,
            markers = new MarkerArray(len),
            first = 0,
            last = len - 1,
            stack = [],
            newPoints = [],
            i, maxSqDist, sqDist, index;

    markers[first] = markers[last] = 1;

    while (last) {
        maxSqDist = 0;
        for (i = first + 1; i < last; i++) {
            sqDist = getSqSegDist(points[i], points[first], points[last]);
            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (maxSqDist > sqTolerance) {
            markers[index] = 1;
            stack.push(first, index, index, last);
        }

        last = stack.pop();
        first = stack.pop();
    }

    for (i = 0; i < len; i++) {
        if (markers[i])
            newPoints.push(points[i]);
    }

    return newPoints;
}

	
})(jQuery);

