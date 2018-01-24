VC = {
    install: function(Vue, options){

        const debug = options.debug;

        Vue.vc = {

            _beforeExec: function (details) {
                return new Promise(function(resolve, reject) {
                    let _vc = details._vc;
                    if(_vc.beforeExec){
                        details.event = 'result_' + Math.round(Math.random() * 1e6);
                        _vc.vm.$once(details.event, function (response) {
                            response ? resolve(response) : reject(new Error('Canceled By User'));
                        });
                        _modal(details, 'beforeExec');
                    } else {
                        resolve(details);
                    }
                });
            },

            _execExternal: function (details) {
                return new Promise(function(resolve, reject) {
                    let r = new XMLHttpRequest(),
                        _vc = details._vc;
                    r.open(details.method, details.url);
                    if(details.method === 'POST'){
                        r.setRequestHeader('Content-Type', 'application/json');
                        details.data = JSON.stringify(details.data);
                    }
                    r.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                    r.onload = function() {
                        if (r.status === 200) {
                            let result = r.responseText;
                            _vc ? resolve({result, _vc}) : resolve(result);
                        } else {
                            let error = new Error(r.statusText);
                            error.code = r.status;
                            reject({error, _vc});
                        }
                    };
                    r.onerror = function() {
                        reject({error: new Error('Network Error'), _vc});
                    };
                    r.send(details.data);
                });
            },

            _execLocal: function (details) {
                return new Promise(function(resolve, reject) {
                    let _vc = details._vc,
                        url = (details.url.split('//')[1]).split('/'),
                        data = localStorage.getItem(url[0]),
                        prm = url[1],
                        result = data ? JSON.parse(data) : {},
                        isArray = Array.isArray(result);
                    switch (details.method){
                        case 'INIT':
                            result = data ? result : _vc.storage[_vc.property];
                            break;
                        case 'CREATE':
                            if(isArray){
                                result.push(details.data);
                            } else {
                                result[prm] = details.data;
                            }
                            break;
                        case 'UPDATE':
                            result[prm] = details.data;
                            break;
                        case 'DELETE':
                            if(isArray){
                                result.splice(+prm, 1);
                            } else {
                                delete result[prm];
                            }
                            break;
                        default:
                            reject({error: new Error('execLocal unsupported method Error'), _vc});
                    }
                    isArray && _vc.sort && result.sort(_vc.sort);
                    localStorage.setItem(url[0], JSON.stringify(result));
                    _vc ? resolve({result, _vc}) : resolve(result);
                });
            },

            _parseJSON: function(details) {
                return new Promise(function(resolve, reject) {
                    let _vc = details._vc,
                        str = _vc ? details.result : details;
                    try {
                        let result = JSON.parse(str);
                        _vc ? resolve({result, _vc}) : resolve(result);
                    } catch (e) {
                        reject({error: new Error('JSON Parse Error'), _vc});
                    }
                });
            },

            _parseVC: function(details) {
                return new Promise(function(resolve, reject) {
                    try {
                        let result = eval((details.match(/(?:<script>)([\s\S]*)(?=<\/script>)/m))[1]);
                        result.template = result.template || (details.match(/(?:<template>)([\s\S]*)(?=<\/template>)/m))[1];
                        resolve(result);
                    } catch (e) {
                        reject(new Error('Vue Component Parse Error'));
                    }
                });
            },

            _onGet: function(details){
                return new Promise(function(resolve, reject) {
                    let _vc = details._vc;
                    if(_vc.storage && _vc.property){
                        _vc.storage[_vc.property] = details.result;
                        resolve(details);
                    } else {
                        reject(new Error('Store Result Error'));
                    }
                });
            },

            _afterExec: function (details) {
                let _vc = details._vc;
                if(_vc.afterExec){
                    details.route = _vc.afterExec.route;
                    details.data = _vc.afterExec.data;
                    _route(details);
                }
            },

            _catch: function(e) {
                debug && console.log('Vue.vc', e);
            },

            upExternal: function (details) {
                this._beforeExec(details).then(this._execExternal).then(this._parseJSON).then(this._onGet).then(this._afterExec).catch(this._catch);
            },

            upLocal: function (details) {
                this._beforeExec(details).then(this._execLocal).then(this._onGet).then(this._afterExec).catch(this._catch);
            }

        };

        let vc = options.vc || [],
            base, routes, track,
            view = {
                content: 'none',
                modal: 'none'
            },
            modal = {};

        function _update(details){
            if(!details.url){
                _modal(details);
            } else {
                let upPattern = (~details.url.indexOf('local://') ? 'upLocal' : 'upExternal');
                details._vc.vm = this.$root;
                Vue.vc[upPattern](details);
            }
        }

        function _response(details) {
            view.modal = 'none';
            details.event && details._vc.vm.$emit(details.event, details);
        }

        function _modal(details, stage) {
            let prm = stage ? details._vc[stage] : details;
            details.ui = details.ui || prm.ui;
            modal = details;
            view.modal = prm.vc;
        }

        Vue.mixin({
            data: function () {
                return {
                    vc: {
                        view: view,
                        modal: modal
                    }
                }
            },
            methods: {
                update: _update,
                response: _response
            }
        });

        if(options.hasOwnProperty('routes')){

            if(options.routes.callback){
                track = function (details) {
                    try{
                        options.routes.callback(details);
                    } catch(e) {
                        debug && console.log(e);
                    }
                }
            }

            base = '//' + (location.href.split('?')[0]).split('/')[2] + (options.routes.base || '');
            routes = {list: [], map: {}};

            _parseRoutes(options.routes.items);
            routes.nav = routes.list.filter((el) => !!el.nav).sort((a, b) => a.ind - b.ind);
            routes.current = _detectRoute();

            function _route(details) {
                let route = JSON.parse(JSON.stringify(routes.list[routes.map[details.route.name]]));
                document.title = route.title || (details.data && details.data.title) || document.title;
                route.details = details.route;
                route.title = document.title;
                if(details.data){
                    route.path = route.prm ? _parsePath(route.origin, details.route.prm) : route.origin;
                    history.pushState(route, null, route.path);
                    track && track(route);
                }
                routes.current = details.route;
                view.content = route.vc;
            }

            function _parseRoutes(list, parent) {
                let i, tmp;
                for(i = 0; i < list.length; i++){
                    tmp = _convertRoute(list[i], parent);
                    routes.map[tmp.name] = routes.list.length;
                    routes.list.push(tmp);
                    vc.push(tmp.vc);
                    list[i].items && _parseRoutes(list[i].items, list[i].name);
                }

            }

            function _convertRoute(prm, parent) {
                let tmp = {
                    name: prm.name,
                    origin: base + prm.path,
                    vc: prm.vc,
                    title: prm.title
                };
                tmp.path = tmp.origin.replace(/\[([a-zA-Z0-9_]+)]/g, function () {
                    tmp.prm = tmp.prm || [];
                    tmp.prm.push(arguments[1]);
                    return '([a-zA-Z0-9_]+)'
                });
                if(parent){
                    tmp.parent = parent;
                }
                if(prm.nav){
                    tmp.nav = prm.nav.name || prm.name;
                    tmp.ind = prm.nav.ind;
                }
                return tmp;
            }

            function _detectRoute() {
                let i, reg, res = {name: routes.list[0].name}, item,
                    route = '//' + window.location.host + window.location.pathname;
                for(i = 0; i < routes.list.length; i++){
                    item = routes.list[i];
                    if(!item.parent || item.parent === res.name){
                        reg = new RegExp('^' + item.path + '(?![^\/])', 'g');
                        route.replace(reg, function () {
                            if(arguments.length < 4){
                                delete res.prm;
                            } else {
                                res.prm = {};
                                for(let j = 1; j < arguments.length - 2; j++){
                                    res.prm[item.prm[j - 1]] = arguments[j];
                                }
                            }
                            res.name = item.name;
                            return ''
                        });
                    }
                }
                return res;
            }

            function _parsePath(str, prm) {
                if(!prm) return str;
                let pr, reg;
                for(pr in prm){
                    if(prm.hasOwnProperty(pr)){
                        reg = new RegExp('\\\[' + pr + ']');
                        str = str.replace(reg, prm[pr]);
                    }
                }
                return str;
            }

            Vue.component('vc-link', {
                name: 'vc-link',
                props: ['to', 'prm'],
                render: function(createElement) {
                    let self = this,
                        route = routes.list[routes.map[self.to]],
                        href = route.origin;
                    if(self.prm){
                        href = _parsePath(href, JSON.parse(self.prm));
                    }
                    return createElement('a', {
                        attrs: {
                            href: href
                        },
                        on: {
                            click: function (e) {
                                e.preventDefault();
                                self.route({
                                    route: {
                                        name: self.to,
                                        prm: self.prm ? JSON.parse(self.prm) : {}
                                    },
                                    data: {}
                                });
                            }
                        }
                    }, this.$slots.default)
                }
            });

            window.addEventListener('popstate', function(e){
                if(e.state){
                    _route({route: (routes.current = e.state.details)});
                    track && track(e.state);
                }
            }, false);

            Vue.mixin({
                data: function () {
                    return {
                        vc: {
                            routes: routes
                        }
                    }
                },
                methods: {
                    route: _route
                }
            });
        }

        Vue.component('none', {
            name: 'none',
            render: function(createElement) {
                return createElement('div', {}, this.$slots.default)
            }
        });

        if(options.hasOwnProperty('url')){
            let prefix = options.url.prefix || '',
                postfix = options.url.postfix || '';
            for(let i = 0; i < vc.length; i++){
                Vue.component(vc[i], function(resolve, reject){
                    Vue.vc._execExternal({method: 'GET', url: prefix + vc[i] + postfix}).then(Vue.vc._parseVC).then(resolve, reject);
                });
            }
            if(options.hasOwnProperty('app')){
                let app = options.app;
                Vue.vc._execExternal({method: 'GET', url: prefix + app + postfix}).then(Vue.vc._parseVC).then(function (details){
                    new Vue(details).$mount(app);
                });
            }
        }


    }
};
