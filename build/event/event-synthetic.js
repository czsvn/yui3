YUI.add('event-synthetic', function(Y) {

var DOMMap  = Y.Env.evt.dom_map,
    toArray = Y.Array,
    noop    = function () {};

function SyntheticEvent() {
    this._init.apply(this, arguments);
}

SyntheticEvent.prototype = {
    constructor: SyntheticEvent,

    _init: function () {
        if (!this.publishConfig) {
            this.publishConfig = {};
        }

        if (!('emitFacade' in this.publishConfig)) {
            this.publishConfig.emitFacade = true;
        }
    },

    processArgs: noop,
    //fireFilter : null,
    //allowDups  : false,

    init       : noop,
    on         : noop,
    detach     : noop,
    destroy    : noop,

    initDelegate   : noop,
    onDelegate     : noop,
    detachDelegate : noop,
    destroyDelegate: noop,

    _getEvent: function (node) {
        var ce = node.getEvent(this.type),
            yuid, key;

        if (!ce) {
            yuid = Y.stamp(node._node);
            key  = 'event:' + yuid + this.type;

            ce         = node.publish(this.type, this.publishConfig);
            ce.el      = node._node;
            ce.key     = key;
            ce.domkey  = yuid;
            ce.fn      = noop;
            ce.capture = false;

            ce.monitor('detach', this._unsubscribe, this);

            (DOMMap[yuid] || (DOMMap[yuid] = {}))[key] = ce;
        }
        
        return ce;
    },

    _on: function (args) {
        var handles = [],
            query   = (typeof args[2] === 'string') ? args[2] : null,
            els     = (query) ? Y.Selector.query(query) : toArray(args[2]),
            handle;

        if (!els.length && query) {
            handle = Y.on('available', function () {
                Y.mix(handle, Y.on.apply(Y, args), true);
            }, query);

            return handle;
        }

        Y.each(els, function (el) {
            var node = Y.one(el),
                ce   = this._getEvent(node);

            handle = this._subscribe(ce, args.slice(), node);

            if (handle) {
                handles.push(handle);
            }
        }, this);

        return (handles.length === 1) ?
            handles[0] :
            new Y.EventHandle(handles);
    },

    _subscribe: function (ce, args, node) {
        var extra = this.processArgs(args),
            abort, handle, sub;

        args[2] = node;
        args.shift();

        if (!this.allowDups) {
            abort = this.findDup.apply(this, [ce.subscribers].concat(args));
        }

        if (!abort) {
            handle = ce.on.apply(ce, args);

            sub = handle.sub;
            sub._extra = extra;

            if (this.fireFilter) {
                Y.Do.before(this._fireFilter, sub, '_notify', this, sub);
            }

            if (!ce.initialized) {
                this.init(node, handle.sub, ce);
                ce.initialized = true;
            }

            this.on(node, handle.sub, ce);
        }
        
        return handle;
    },

    findDup: function (subs, fn, context) {
        var id, sub;

        for (id in subs) {
            if (subs.hasOwnProperty(id)) {
                sub = subs[id];
                if ((!fn      || sub.fn === fn) &&
                    (!context || sub.context === context)) {
                    return true;
                }
            }
        }

        return false;
    },

    _fireFilter: function (thisObj, args, ce, sub) {
        if (!this.fireFilter(sub, args, thisObj, ce)) {
            return new Y.Do.Prevent();
        }
    },

    _detach: function (args) {
        var fn  = args[1],
            els = (typeof args[2] === 'string') ?
                    Y.Selector.query(args[2]) :
                    toArray(args[2]);
        
        if (els.length) {
            Y.each(els, function (el) {
                var node = Y.one(el),
                    ce   = node.getEvent(this.type);

                if (ce) {
                    ce.detach(fn, node);
                }
            }, this);
        }
    },

    _unsubscribe: function (e) {
        var ce   = e.ce,
            node = e.sub.context;

        this.detach(node, e.sub, ce);

        if (!ce.hasSubs()) {
            this.destroy(node, e.sub, ce);

            ce.initialized = false;
            ce.detach(this._unsubscribe, this);
        }
    },

    _delegate: function (args) {
        
    }
};

Y.Node.publish = Y.Event.define = function (type, config) {
    if (!config) {
        config = {};
    }

    var eventDef = (Y.Lang.isObject(type)) ?
                        type :
                        Y.merge({ type: type }, config),
        Impl, synth;

    if (!Y.Node.DOM_EVENTS[eventDef.type]) {
        Impl = function () {
            SyntheticEvent.apply(this, arguments);
        };
        Y.extend(Impl, SyntheticEvent, eventDef);
        synth = new Impl();

        type = synth.type;

        Y.Node.DOM_EVENTS[type] = Y.Env.evt.plugins[type] = {
            on: function () {
                return synth._on(toArray(arguments));
            },

            detach: function () {
                return synth._detach(toArray(arguments));
            },

            delegate: function () {
                return synth._delegate(toArray(arguments));
            }
        };

    }
};


}, '@VERSION@' ,{requires:['node-base', 'event-custom']});
