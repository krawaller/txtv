// What events to use?
touchstart = 'ontouchstart' in document.documentElement ? 'touchstart' : 'mousedown';
touchmove = 'ontouchmove' in document.documentElement ? 'touchmove' : 'mousemove';
touchend = 'ontouchend' in document.documentElement ? 'touchend' : 'mouseup';

(function(){
    var slice = Array.prototype.slice,
        expando = 'xui' + new Date().getTime(),
        uuid = 0,
        cache = {};
        
    window.$ = window.xui;
    xui.fn.show = function(){ return this.css({display: 'block'}); };
    xui.fn.hide = function(){ return this.css({display: 'none'}); };
    xui.fn.data = function(prop, val){
        var el = this[0],
            id = el[expando];
            
        if(!id){
            el[expando] = id = ++uuid;
            el.setAttribute('data-_expanded', 1);
        }
        if(!cache[id]){
            cache[id] = {};
        }
        return typeof val != 'undefined' ? ((cache[id][prop] = val) && this || this) : cache[id][prop];
    };
    xui.fn.children = function(){
        var els = [];
        this.each(function(el){
            els = els.concat(slice.call(el.childNodes) || []);
        });
        return xui().set(els).filter(function(el){ return this.nodeType != 3; });
    };
    
    xui.fn.empty = function(){
        for (var i = 0, elem; (elem = this[i]) != null; i++) {
            var dirty = elem.querySelectorAll('[data-_expanded]');
            for(var j = 0, len = dirty.length; j < len; j++){
                delete cache[dirty[j][expando]];
            }
            while (elem.firstChild) {
                elem.removeChild(elem.firstChild);
            }
        }
        return this;
    };
    
    xui.fn.appendTo = function(to){
        return this.each(function(el){
            to[0].appendChild(el);
        });
    };
    
    xui.fn.wrap = function(str){
        return this.each(function(el){
            el.parentNode.appendChild(xui(str)[0]).appendChild(el);
        });
    };
    
    xui.fn.remove = function(){
        return this.html("remove");
    };
})();

if(!('Ti' in window)){
    var xhrProcessor = function(data){ 
        var previousPage = data.match(/nextPage = "(\d+).html"/)[1],
            nextPage = data.match(/previousPage = "(\d+).html"/)[1],
            rawString = data
                .substring(data.indexOf('<pre'), data.lastIndexOf('</pre>') + 6) // Extract all pages
                .replace(/<a class="preclass".*<\/a>/g, "")
                .replace(/background: url.*?\.gif\)/g, '') // Remove ugly background images
                .replace(/href="(\d{3}).html"/g, function(all, sub){ 
                    return 'href="#" rel="'+sub+'"';
                });
        
        return {
            data: rawString,
            prev: previousPage,
            next: nextPage
        };
    };
}

// The singleton
var txtv = {
    pageChangeSensitivity : 50,
    height: 480, // Lazily hardcoded
    width: 320,
    dom: {
        body: $('body'),
        pages: $('#pages'),
        pagenum: $('#pagenum span')
    },
    init: function(){
        document.preventScroll = true; // Let me handle my own scrolling, please

        // 100 is the start page
        txtv.page.create(100);

        // Kill movements
        document.addEventListener('touchmove', function(e){
            e.preventDefault();
            return false;    
        }, false);
        
        // Bind numpad events
        if ('Ti' in window) {
            Ti.App.addEventListener('numFieldChange', txtv.pagenum.change);
            Ti.App.addEventListener('numFieldBlur', txtv.pagenum.blur);
            Ti.App.addEventListener('numFieldFocus', txtv.pagenum.focus);
            Ti.App.addEventListener('shake', txtv.page.refresh);
        }
        
        document.addEventListener(touchstart, txtv.touch.start, false);
        document.addEventListener(touchmove, txtv.touch.move, false);
        document.addEventListener(touchend, txtv.touch.end, false);
        document.addEventListener('webkitTransitionEnd', txtv.touch.animEnd, false);
        
        var dirs = [{
            name: 'top',
            diffY: 1,
            diffX: 0,
            dir: 'v'
        },
        {
            name: 'right',
            diffY: 0,
            diffX: -1,
            dir: 'h'
        },
        {
            name: 'bottom',
            diffY: -1,
            diffX: 0,
            dir: 'v'
        },
        {
            name: 'left',
            diffY: 0,
            diffX: 1,
            dir: 'h'
        }];
        dirs.forEach(function(dir){
            document.getElementById(dir.name).addEventListener(touchstart, function(opts){
                var vars = txtv.touch.vars;
                vars.touching = true;
                vars.dir = dir.dir;
                vars.at.y = 0;
                vars.at.x = 0;
                txtv.touch.end({ pageY: dir.diffY * txtv.pageChangeSensitivity, pageX: dir.diffX * txtv.pageChangeSensitivity });
            }, false);
        });
    },
    pagenum: {
        focus: function(){
            var num = txtv.touch.vars.activeElem.data('num');
            txtv.dom.pagenum[0].textContent = num;
            txtv.dom.pagenum.show();
        },
        update: function(num){
            num = num + ''; // Needs to be string
            var numArr = num.split("");
            var textNode = txtv.dom.pagenum[0].childNodes[0];
            
            // Fetch the textnode and replace the page number in it with our input
            var cur = textNode.textContent;
            var s = cur.replace(/([\d\-]{3})/, function(all,sub){
                var arr = sub.split("");
                for(var j = 0; j < arr.length; j++){
                    if(numArr[j] !== undefined){
                        arr[j] = numArr[j];
                    } else {
                        arr[j] = '-';
                    }
                }
                return arr.join("");
            });
            textNode.textContent = s;
        },
        change: function(e){
            var num = e.value;
            txtv.pagenum.update(num);
        },
        blur: function(e){          
            // Reset the page number of the page we're on
            var num = e.value;             
            // All page numbers consists of three digits, so move to page if we've got exactly three digits
            if(num.length == 3){
                txtv.page.create(num);
            }
            txtv.dom.pagenum.hide();
        }
    },

    touch: {
        normalize: null,
        vars: {
            h: 0,
            at: {
                x: 0,
                y: 0
            }
        },
        start: function(e){
            //e.preventDefault();
            var t = e.changedTouches ? e.changedTouches[0] : e;    
            var vars = txtv.touch.vars;
            vars.at = {x: t.pageX, y: t.pageY }; // Touchdown!
            vars.touching = true;
        },
        move: function(e){
            if (txtv.touch.vars.touching) {
                var t = e.changedTouches ? e.changedTouches[0] : e;  
                var vars = txtv.touch.vars;
                var at = vars.at;
                var dir = vars.dir;
                
                if (!dir) {
                    if (Math.abs(t.pageY - at.y) > 10) { // Are we scrolling vertically?
                        vars.dir = 'v';
                    } else {
                        if (Math.abs(t.pageX - at.x) > 10) { // Or are we scrolling horizontally?
                            vars.dir = 'h';
                        }
                    }
                } else {
                    if(dir == 'v'){ // Perform vertical scroll
                        var diffY = t.pageY - at.y;
                        vars.prev.css('webkitTransform', 'translate3d(0px, ' + (diffY - txtv.height) + 'px, 0px)');
                        vars.elem.css('webkitTransform', 'translate3d(' + (vars.elem.data('h') || 0) + 'px, ' + (diffY) + 'px, 0px)');
                        vars.next.css('webkitTransform', 'translate3d(0px, ' + (diffY + txtv.height) + 'px, 0px)');
                    } else {
                        if(dir == 'h'){ // Perform horizontal subpage scroll
                            vars.elem.css('webkitTransform', 'translate3d(' + (-vars.h * txtv.width + t.pageX - at.x) + 'px, 0px, 0px)');
                        }
                    }
                    
                }
            }
            return false;
        },
        end: function(e){
            var vars = txtv.touch.vars;
            if (vars.touching) {
                var t = e.changedTouches ? e.changedTouches[0] : e;  
                vars.touching = false;
                
                if(!vars.dir){
                    var link = e.target.nodeName == 'A' ? e.target : (e.target.parentNode.nodeName == 'A' ? e.target.parentNode : false);
                    if(link){
                        txtv.page.create(link.rel);
                    }
                    return; 
                }
                
                if (vars.dir == 'v') {
                    
                    var diffY = t.pageY - vars.at.y;
                    var prevPos, elemPos, nextPos;

                    if(!vars.activeElem.data('loaded')){
                        if (diffY >= txtv.pageChangeSensitivity) {
                            txtv.page.create(vars.activeElem.data('prev'));
                        } else if (diffY <= -txtv.pageChangeSensitivity) {
                            txtv.page.create(vars.activeElem.data('next'));
                        }
                        vars.dir = null;
                        vars.h = 0;
                        return;
                    }
                    
                    if (diffY >= txtv.pageChangeSensitivity) { // Going up
                        prevPos = 0;
                        elemPos = txtv.height;
                        nextPos = txtv.height * 2;
                        vars.activeElem = vars.prev;
                    }
                    else 
                        if (diffY <= -txtv.pageChangeSensitivity) { // Going down
                            prevPos = -txtv.height * 2;
                            elemPos = -txtv.height;
                            nextPos = 0;
                            vars.activeElem = vars.next;
                        }
                        else { // Staying
                            prevPos = -txtv.height;
                            elemPos = 0;
                            nextPos = txtv.height;
                            vars.activeElem = vars.elem;
                        }
                    
                    vars.prev.addClass('anim');
                    vars.elem.addClass('anim');
                    vars.next.addClass('anim');
                    
                    vars.prev.css('webkitTransform', 'translate3d(0px, ' + (prevPos) + 'px, 0px)');
                    vars.elem.css('webkitTransform', 'translate3d(0px, ' + (elemPos) + 'px, 0px)');
                    vars.next.css('webkitTransform', 'translate3d(0px, ' + (nextPos) + 'px, 0px)');
                    
                    // Let the animation start before we prefetch nearby pages - otherwise it might stutter
                    setTimeout(function(){
                        txtv.page.getNearby(vars.activeElem);
                    }, 100);
                    
                    
                    vars.h = 0; // Reset horizontal scroll
                    
                } else if (vars.dir == 'h') {
                    var h = vars.h;
                    var children = txtv.touch.vars.elem.children().length;
                    var diffX = t.pageX - vars.at.x;
    
                    if (diffX < 50 && h + 1 <= children - 1) { // Going right, if possible
                        h++;
                    }
                    else 
                        if (diffX > -50 && h - 1 >= 0) { // Going left, if possible
                            h--;
                        }
                    
                    vars.elem.addClass('anim');
                    var dx = (-h * txtv.width);
                    vars.elem.css('webkitTransform', 'translate3d(' + dx + 'px, 0px, 0px)');
                    vars.elem.data('h', dx);
                    
                    vars.h = h;
                }
                
                vars.dir = null; // Reset direction
            }
        },
        animEnd: function(e){
            $(e.target).removeClass('anim'); // Remove anim class to be able to drag page again
            if(e.target == txtv.touch.vars.elem[0]){
                var active = [txtv.touch.vars.prev[0], txtv.touch.vars.elem[0], txtv.touch.vars.next[0]];
                txtv.dom.pages.children().filter(function(){
                    return active.indexOf(this) == -1;
                }).hide();
            }
        }
    },
	page: {
        refresh: function(){
            var num = txtv.touch.vars.activeElem.data('num');
            $('#page' + num).remove();
            txtv.page.create(num);
        },
		request: function(num, callback, pos){
			// Create container
			num = parseInt(num, 10);
	        var $con = $('<div/>')
	            .attr('id', 'page' + num)
                .data('num', num)
	            .data('loaded', false)
	            .css({ webkitTransform: 'translate3d(0px, ' + (pos) + 'px, 0px)' })
                .data('prev', num - 1)
                .data('next', num + 1);
                
            $con[0].appendChild($('<div class="loader"><span>' + num + '</span></div>')[0]);
	            
            txtv.dom.pages[0].appendChild($con[0]);
            $con.show();
	        
            var xhr = new XMLHttpRequest();
            xhr.onload = function(e){
                var data = this.responseText;
                
                if(!('Ti' in window)){
                    data = xhrProcessor(data);
                }
                
                // SVT:s counting is upside down
                var previousPage = data.prev,
                    nextPage = data.next,
                    rawString = data.data;

                    $(rawString)
                        .filter(function(i,elem){ // Filter pages
                            return this.nodeName == 'PRE';
                        })
                        .appendTo($con.empty())
                        .wrap('<div class="page"/>');

                previousPage = (num == 100 && previousPage == 100 ? 897 : previousPage);
                
                $con
                    .data('loaded', true)
                    .data('prev', previousPage)
                    .data('next', nextPage);
                
                if (callback) {
                    callback($con);
                }
            };
            
            xhr.onerror = function(){
                //$con.remove();
            };
            
            if(!('Ti' in window)){
                xhr.open("GET", 'http://localhost/proxy.php?url=http://svt.se/svttext/web/pages/' + num + '.html');
            } else {
                xhr.open("GET", 'http://svt.se/svttext/web/pages/' + num + '.html');
            }
            xhr.send();
            
            if(!pos){
                txtv.touch.vars.activeElem = $con;
            }
	        return $con;
	    },
		create: function(num, caching, pos){
		    num = num || 100;
		    pos = pos || 0;

		    var page = $('#page' + num).show(); // Try fetching page from DOM
		    if(page.length && !caching){
                txtv.dom.pages.children().hide();        
		    }
		    if (!page.length) { // Didn we not find the node? If not, fetch it!
                return txtv.page.request(num, function(con){ 
		            if (!caching) {
		                txtv.page.getNearby(con); // Prefetching
		            }
		        }, pos);
		    } else {
                page.css('webkitTransform', 'translate3d(0px, ' + (pos) + 'px, 0px)').show();   
		        if (!caching) {
		            txtv.page.getNearby(page); // Prefetching
		        }
		        return page;
		    }
		},
		fetchNearby: function(elem){
	        txtv.touch.vars.prev = txtv.page.create(elem.data('prev'), true, -txtv.height).show();
	        txtv.touch.vars.next = txtv.page.create(elem.data('next'), true, txtv.height).show();
	    },
		getNearby: function(elem){                    
	        txtv.touch.vars.elem = elem;
	        
            // The calling elem needs to be properly loaded to know which its nearby pages are
            if(!elem.data('loaded')){
                elem.one('loaded',function(){
                    txtv.page.fetchNearby(elem);
                });
            } else {
                txtv.page.fetchNearby(elem);
            }
        }
    }
};

txtv.init();

if ('Ti' in window) {
    var widths = {
        portrait: 320,
        landscape: 480
    };
    var heights = {
        portrait: 480,
        landscape: 320
    };
    Ti.App.addEventListener('orientationchange', function(e){
        txtv.width = widths[e.orientation];
        txtv.height = heights[e.orientation];
        document.body.className = e.orientation;
    });
}