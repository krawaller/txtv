(function(){
var xhrs = {};
Ti.App.addEventListener('xhr_app', function(e){
    var xid = e.xid, args = e.args, xhr;
    if (e.action != 'create') {
        xhr = xhrs[xid];
        if (!xhr) {
            throw ["xhr with xid", xid, "doesn't exist anymore!"].join(" ");
        }
    }
    try {
        switch (e.action) {
            case 'create':
                xhr = xhrs[xid] = Titanium.Network.createHTTPClient();
                xhr.xid = xid;
                xhr.tries = 0;
                xhr.onload = function(){
                    Ti.App.fireEvent('xhr_web', {
                        action: 'onload',
                        xid: this.xid,
                        args: {
                            responseText: window.xhrProcessor ? window.xhrProcessor(this.responseText) : this.responseText
                        }
                    });
                };
                xhr.onerror = function(e){
                    if(xhr.tries <= 3){                   
                        xhr.tries += 1;
                        xhr.open(xhr.type, xhr.url);
                        xhr.send(xhr.mess);
                    } else {
                        var alert = Ti.UI.createAlertDialog({
                            title: 'Kommunikationsproblem',
                            message: "Du verkar ha tappat din uppkoppling. \nFixa den och försök sedan igen.",
                            buttonNames: ['OK','Försök igen'],
                            cancel: 0
                        });
                        alert.show();
                        alert.addEventListener('click', function(e){
                           if(e.index == 1){
                               xhr.open(xhr.type, xhr.url);
                               xhr.send(xhr.mess);
                           } 
                        });
                        
                        Ti.App.fireEvent('xhr_web', {
                            action: 'error',
                            xid: this.xid,
                            args: {
                                e: {
                                    message: e.message
                                }
                            }
                        });
                    }
                }
                break;
                
            case 'open':
                xhr.url = args.url;
                xhr.type = args.type;
                if(!/app:\/\//.test(args.url)){
                    xhr.open(args.type, args.url);
                }
                break;
                
            case 'send':
                xhr.mess = args.mess;
                if (!/app:\/\//.test(xhr.url)) {
                    xhr.send(args.mess);
                }
                else {
                    Ti.App.fireEvent('xhr_web', {
                        action: 'onload',
                        xid: xid,
                        args: {
                            responseText: Ti.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, xhr.url.replace(/app.*\.app\//, '')).read().text
                        }
                    });
                }
                break;
                
            case 'abort':
                xhr.abort();
                break;
        }
    } catch(e){
        console.log('errooor', e);
    }
});
})();