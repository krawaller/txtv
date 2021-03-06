if('Ti' in this){
(function(){    
window._XMLHttpRequest = window.XMLHttpRequest;
Ti.App.addEventListener('xhr_web', function(e){
    var args = e.args, xid = e.xid, xhr, funcs, i;
     switch(e.action){
         case 'onload':
         xhr = xhrs[xid];
         xhr.responseText = args.responseText;
         funcs = xhr.events.load ||  [];
         if(xhr.onload){
             funcs.push(xhr.onload);
         }
         for(i = 0, len = funcs.length; i < len; i++){
             funcs[i].call(xhr, args.responseText);
         }
         break;
         
         case 'error':
         xhr = xhrs[xid];
         funcs = xhr.events.error ||  [];
         if(xhr.onerror){
             funcs.push(xhr.onerror);
         }
         for(i = 0, len = funcs.length; i < len; i++){
             funcs[i].call(xhr, args.e);
         }
         break;
     }
});

var xhrs = {};
var xid = 0, slice = Array.prototype.slice;
var XMLHttpRequest = function(){
    this.events = {};
    this.xid = xid++;
    xhrs[this.xid] = this;    
    this._fire('create');
};
window.XMLHttpRequest = XMLHttpRequest;

XMLHttpRequest.prototype._fire = function(action, args){
    Ti.App.fireEvent('xhr_app', {
        xid: this.xid,
        action: action,
        args: args
    });  
};

XMLHttpRequest.prototype.open = function(type, url){    
    this._fire('open', {
        type: type,
        url: url
    });
};

XMLHttpRequest.prototype.send = function(mess){
    this._fire('send', { mess: mess });
};

XMLHttpRequest.prototype.abort = function(mess){
    this._fire('abort', {});
};

XMLHttpRequest.prototype.addEventListener = function(name, func, bubbly){
    this.events[name] = this.events[name] ||  [];
    this.events[name].push(func);
};
})();
}