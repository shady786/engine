pc.extend(pc, function () {
    var rawToValue = function(app, args, value, old) {
        // TODO scripts2
        // arrays
        switch(args.type) {
            case 'boolean':
                return !! value;
                break;
            case 'number':
                if (typeof(value) === 'number') {
                    return value;
                } else if (typeof(value) === 'string') {
                    var v = parseInt(value, 10);
                    if (isNaN(v)) return null;
                    return v;
                } else if (typeof(value) === 'boolean') {
                    return 0 + value;
                } else {
                    return null;
                }
                break;
            case 'json':
                if (typeof(value) === 'object') {
                    return value;
                } else {
                    try {
                        return JSON.parse(value);
                    } catch(ex) {
                        return null;
                    }
                }
                break;
            case 'asset':
                if (value instanceof pc.Asset) {
                    return value;
                } else if (typeof(value) === 'number') {
                    return app.assets.get(value) || null;
                } else if (typeof(value) === 'string') {
                    return app.assets.get(parseInt(value, 10)) || null;
                } else {
                    return null;
                }
                break;
            case 'entity':
                if (value instanceof pc.GraphNode) {
                    return value;
                } else if (typeof(value) === 'string') {
                    return app.root.findByGuid(value);
                } else {
                    return null;
                }
                break;
            case 'rgb':
            case 'rgba':
                if (value instanceof pc.Color) {
                    if (old instanceof pc.Color) {
                        old.copy(value);
                        return old;
                    } else {
                        return value;
                    }
                } else if (value instanceof Array && value.length >= 3 && value.length <= 4) {
                    for(var i = 0; i < value.length; i++) {
                        if (typeof(value[i]) !== 'number')
                            return null;
                    }
                    if (! old) old = new pc.Color();

                    for(var i = 0; i < 4; i++)
                        old.data[i] = (i === 4 && value.length === 3) ? 1 : value[i];

                    return old;
                } else if (typeof(value) === 'string' && /#([0-9abcdef]{2}){3,4}/i.test(value)) {
                    if (! old)
                        old = new pc.Color();

                    old.fromString(value);
                    return old;
                } else {
                    return null;
                }
                break;
            case 'vec2':
            case 'vec3':
            case 'vec4':
                var len = parseInt(args.type.slice(3), 10);

                if (value instanceof pc['Vec' + len]) {
                    if (old instanceof pc['Vec' + len]) {
                        old.copy(value);
                        return old;
                    } else {
                        return value;
                    }
                } else if (value instanceof Array && value.length === len) {
                    for(var i = 0; i < value.length; i++) {
                        if (typeof(value[i]) !== 'number')
                            return null;
                    }
                    if (! old) old = new pc['Vec' + len];

                    for(var i = 0; i < len; i++)
                        old.data[i] = value[i];

                    return old;
                } else {
                    return null;
                }
                break;
            case 'curve':
                // TODO scripts2
                // curves
                break;
        }

        return value;
    };


    /**
    * @name pc.ScriptAttributes
    * @class Container of Script Attributes definition
    * @description Implements an interface to add/remove attributes and store their definition for Script Type.
    * Note: Instance of pc.ScriptAttributes is created automatically by each Script Type
    * @param {ScriptType} scriptType Script Type that attributes relate to.
    */
    var ScriptAttributes = function(scriptType) {
        this.scriptType = scriptType;
        this.index = { };
    };

    /**
     * @function
     * @name pc.ScriptAttributes#add
     * @description Add Attribute
     * @param {String} name Name of an attribute
     * @param {Object} args Object with Arguments for an attribute
     * @param {String} args.type Type of an attribute value, list of possible types:
     * boolean, number, string, json, asset, entity, rgb, rgba, vec2, vec3, vec4, curve
     * @param {?} [args.default] Default attribute value
     * @param {String} [args.title] Title for Editor's for field UI
     * @param {String} [args.description] Description for Editor's for field UI
     * @param {(String|String[])} [args.placeholder] Placeholder for Editor's for field UI.
     * For multi-field types, such as vec2, vec3, and others use array of strings.
     * @param {Boolean} [args.array] If attribute can hold single or multiple values
     * @param {Number} [args.size] If attribute is array, maximum number of values can be set
     * @param {Number} [args.min] Minimum value for type 'number', if max and min defined, slider will be rendered in Editor's UI
     * @param {Number} [args.max] Maximum value for type 'number', if max and min defined, slider will be rendered in Editor's UI
     * @param {Number} [args.precision] Level of precision for field type 'number' with floating values
     * @param {String} [args.assetType] Name of asset type to be used in 'asset' type attribute picker in Editor's UI, defaults to '*' (all)
     * @param {Strings[]} [args.curves] List of names for Curves for field type 'curve'
     * @param {String} [args.color] String of color channels for Curves for field type 'curve', can be any combination of `rgba` characters.
     * Defining this property will render Gradient in Editor's field UI
     * @param {Object[]} [args.enum] List of fixed choices for field, defined as array of objects, where key in object is a title of an option
     * @example
     * PlayerController.attributes.add('fullName', {
     *     type: 'string',
     * });
     * @example
     * PlayerController.attributes.add('speed', {
     *     type: 'number',
     *     title: 'Speed',
     *     placeholder: 'km/h',
     *     default: 22.2
     * });
     * @example
     * PlayerController.attributes.add('resolution', {
     *     type: 'number',
     *     default: 32,
     *     enum: [
     *        { '32x32': 32 },
     *        { '64x64': 64 },
     *        { '128x128': 128 }
     *     ]
     * });
     */
    ScriptAttributes.prototype.add = function(name, args) {
        if (this.index[name]) {
            console.warn('attribute \'' + name + '\' is already defined for script type \'' + this.scriptType.name + '\'');
            return;
        } else if (pc.createScript.reservedAttributes[name]) {
            console.warn('attribute \'' + name + '\' is a reserved attribute name');
            return;
        }

        this.index[name] = args;

        Object.defineProperty(this.scriptType.prototype, name, {
            get: function() {
                return this.__attributes[name];
            },
            set: function(raw) {
                var old = this.__attributes[name];

                // convert to appropriate type
                this.__attributes[name] = rawToValue(this.app, args, raw, old);

                this.fire('attr', name, this.__attributes[name], old);
                this.fire('attr:' + name, this.__attributes[name], old);
            }
        });
    };

    /**
     * @function
     * @name pc.ScriptAttributes#remove
     * @description Remove Attribute.
     * @param {String} name Name of an attribute
     * @returns {Boolean} True if removed or false if not defined
     * @example
     * PlayerController.attributes.remove('fullName');
     */
    ScriptAttributes.prototype.remove = function(name) {
        if (! this.index[name])
            return false;

        delete this.index[name];
        delete this.scriptType.prototype[name];
        return true;
    };

    /**
     * @function
     * @name pc.ScriptAttributes#has
     * @description Detect if Attribute is added.
     * @param {String} name Name of an attribute
     * @returns {Boolean} True if Attribute is defined
     * @example
     * if (PlayerController.attributes.has('fullName')) {
     *     // attribute `fullName` is defined
     * });
     */
    ScriptAttributes.prototype.has = function(name) {
        return !! this.index[name];
    };

    /**
     * @function
     * @name pc.ScriptAttributes#get
     * @description Get object with attribute arguments.
     * Note: Changing argument properties will not affect existing Script Instances.
     * @param {String} name Name of an attribute
     * @returns {?Object} Arguments with attribute properties
     * @example
     * // changing default value for an attribute 'fullName'
     * var attr = PlayerController.attributes.get('fullName');
     * if (attr) attr.default = 'Unknown';
     */
    ScriptAttributes.prototype.get = function(name) {
        return this.index[name] || null;
    };


    /**
    * @class createScript
    * @name pc.createScript
    * @description Method to create named {@link ScriptType}.
    * It returns new function (class) "Script Type", which is auto-registered to {@link pc.ScriptRegistry} using it's name.
    * This is main interface to create Script Types, to define custom logic using javascript, that is used to create interaction for entities.
    * @param {String} name unique Name of a Script Type.
    * If Script Type of same name already registered and new one has `swap` method defined in prototype,
    * then it will perform hot swapping of existing Script Instances on entities using this new Script Type.
    * Note: there is a reserved list of names that cannot be used, such as list below as well as some starting from `_` (underscore):
    * system, entity, create, destroy, swap, move, scripts, onEnable, onDisable, onPostStateChange, has, on, off, fire, once, hasEvent
    * @param {pc.Application} [app] Optional application handler, to choose which pc.ScriptRegistry to add a script to.
    * By default it will use `pc.Application.getApplication()` to get current pc.Application.
    * @returns {ScriptType} Function so called {@link ScriptType}, that developer is meant to extend by adding attributes and prototype methods.
    * @example
    * var Turning = pc.createScript('turn');
    *
    * // define `speed` attribute that is available in Editor UI
    * Turning.attributes.add('speed', {
    *     type: 'number',
    *     default: 180,
    *     placeholder: 'deg/s'
    * });
    *
    * // runs every tick
    * Turning.prototype.update = function(dt) {
    *     this.entity.rotate(0, this.speed * dt, 0);
    * };
    */
    var createScript = function(name, app) {
        if (createScript.reservedScripts[name])
            throw new Error('script name: \'' + name + '\' is reserved, please change script name');

        /**
        * @name ScriptType
        * @class Function that is returned by {@link pc.createScript}. Also referred as Script Type.<br />
        * This function is expected to be extended using JavaScript prototype. There is a <strong>list of expected methods</strong>
        * that will be executed by the engine, such as: initialize, postInitialize, update, postUpdate and swap.<br />
        * <strong>initialize</strong> and <strong>postInitialize</strong> - are called if defined when script is about to run for the first time. postInitialize will run after all initialize methods are executed in the same tick or enabling chain of actions.<br />
        * <strong>update</strong> and <strong>postUpdate</strong> - methods are called if defined for enabled (running state) scripts on each tick.<br />
        * <strong>swap</strong> - method will be called when new Script Type of already existing name in registry been defined.
        * If new Script Type defines `swap` method in prototype, then it will be executed to perform code hot-reload in runtime.
        * @description Script Type are the functions (classes) that are created using {@link pc.createScript}.
        * And extended using attributes and prototype to define custom logic.
        * When instanced by engine, the object is referred as {@link ScriptInstance}.
        * Note: this class is created using {@link pc.createScript}.
        * Note: instances of this class are created by the engine when script is added to {@link pc.ScriptComponent}
        */
        var script = function(args) {
            if (! args || ! args.app || ! args.entity)
                console.warn('script \'' + name + '\' has missing arguments in consructor');

            pc.events.attach(this);

            this.app = args.app;
            this.entity = args.entity;
            this._enabled = typeof(args.enabled) === 'boolean' ? args.enabled : true;
            this._enabledOld = this.enabled;
            this.__attributes = { };
            this.__attributesRaw = args.attributes || null;
            this.__scriptType = script;
        };

        /**
         * @private
         * @readonly
         * @static
         * @name ScriptType#__name
         * @type String
         * @description Name of a Script Type.
         */
        script.__name = name;

        /**
         * @readonly
         * @static
         * @name ScriptType#attributes
         * @type {pc.ScriptAttributes}
         * @description The interface to define attributes for Script Types.
         * Refer to {@link pc.ScriptAttributes}
         * @example
         * var PlayerController = pc.createScript('playerController');
         *
         * PlayerController.attributes.add('speed', {
         *     type: 'number',
         *     title: 'Speed',
         *     placeholder: 'km/h',
         *     default: 22.2
         * });
         */
        script.attributes = new ScriptAttributes(script);

        // initialize attributes
        script.prototype.__initializeAttributes = function() {
            if (! this.__attributesRaw)
                return;

            // set attributes values
            for(var key in script.attributes.index) {
                if (this.__attributesRaw && this.__attributesRaw.hasOwnProperty(key)) {
                    this[key] = this.__attributesRaw[key];
                } else if (script.attributes.index[key].hasOwnProperty('default')) {
                    this[key] = script.attributes.index[key].default;
                } else {
                    this[key] = null;
                }
            }

            this.__attributesRaw = null;
        };

        /**
         * @readonly
         * @static
         * @function
         * @name ScriptType#extend
         * @param {Object} methods Object with methods, where key - is name of method, and value - is function.
         * @description Shorthand function to extend Script Type prototype with list of methods.
         * @example
         * var PlayerController = pc.createScript('playerController');
         *
         * PlayerController.extend({
         *     initialize: function() {
         *         // called once on initialize
         *     },
         *     update: function(dt) {
         *         // called each tick
         *     }
         * })
         */
        script.extend = function(methods) {
            for(var key in methods) {
                if (! methods.hasOwnProperty(key))
                    continue;

                script.prototype[key] = methods[key];
            }
        };

        /**
        * @name ScriptInstance
        * @class Instance of {@link ScriptType} which is defined by developer
        * @property {pc.Application} app Pointer to {@link pc.Application} that Script Instance belongs to.
        * @property {pc.Entity} entity Pointer to entity that Script Instance belongs to.
        * @property {Boolean} enabled True if Script Instance is in running state.
        * @description Script Instance is created by engine during script being created for {@link pc.ScriptComponent}
        */

        /**
        * @event
        * @name ScriptInstance#enabled
        * @description Fired when Script Instance becomes enabled
        * @example
        * PlayerController.prototype.initialize = function() {
        *     this.on('enabled', function() {
        *         // Script Instance is now enabled
        *     });
        * };
        */

        /**
        * @event
        * @name ScriptInstance#disabled
        * @description Fired when Script Instance becomes disabled
        * @example
        * PlayerController.prototype.initialize = function() {
        *     this.on('disabled', function() {
        *         // Script Instance is now disabled
        *     });
        * };
        */

        /**
        * @event
        * @name ScriptInstance#state
        * @description Fired when Script Instance changes state to enabled or disabled
        * @param {Boolean} enabled True if now enabled, False if disabled
        * @example
        * PlayerController.prototype.initialize = function() {
        *     this.on('state', function(enabled) {
        *         console.log('Script Instance is now ' + (enabled ? 'enabled' : 'disabled'));
        *     });
        * };
        */

        /**
        * @event
        * @name ScriptInstance#destroy
        * @description Fired when Script Instance is destroyed and removed from component
        * @example
        * PlayerController.prototype.initialize = function() {
        *     this.on('destroy', function() {
        *         // no more part of an entity
        *         // good place to cleanup entity from destroyed script
        *     });
        * };
        */

        /**
        * @event
        * @name ScriptInstance#attr
        * @description Fired when any script attribute been changed
        * @param {String} name Name of attribute changed
        * @param value New value
        * @param valueOld Old value
        * @example
        * PlayerController.prototype.initialize = function() {
        *     this.on('attr', function(name, value, valueOld) {
        *         console.log(name + ' been changed from ' + valueOld + ' to ' + value);
        *     });
        * };
        */

        /**
        * @event
        * @name ScriptInstance#attr:[name]
        * @description Fired when specific script attribute been changed
        * @param value New value
        * @param valueOld Old value
        * @example
        * PlayerController.prototype.initialize = function() {
        *     this.on('attr:speed', function(value, valueOld) {
        *         console.log('speed been changed from ' + valueOld + ' to ' + value);
        *     });
        * };
        */

        /**
        * @event
        * @name ScriptInstance#error
        * @description Fired when Script Instance had an exception.
        * Script Instance will be automatically disabled
        * @param {Error} err Native JS Error object with details of error
        * @param {String} method Script Instance method exception originated from
        * @example
        * PlayerController.prototype.initialize = function() {
        *     this.on('error', function(err, method) {
        *         // caught an exception
        *         console.log(err.stack);
        *     });
        * };
        */

        /**
         * @name ScriptInstance#enabled
         * @type Boolean
         * @description False when script will not be running, due to disabled state of any of: Entity (including any parents), ScriptComponent, ScriptInstance.
         * When disabled will not run any update methods on each tick.
         * initialize and postInitialize methods will run once when Script Instance is in `enabled` state during app tick.
         */
        Object.defineProperty(script.prototype, 'enabled', {
            get: function() {
                return this._enabled && this.entity.script.enabled && this.entity.enabled;
            },
            set: function(value) {
                if (this._enabled !== !! value)
                    this._enabled = !! value;

                if (this.enabled !== this._enabledOld) {
                    this._enabledOld = this.enabled;
                    this.fire(this.enabled ? 'enabled' : 'disabled');
                    this.fire('state', this.enabled);
                }
            }
        });

        // add to scripts registry
        var registry = app ? app.scripts : pc.Application.getApplication().scripts;
        registry.add(script);

        pc.ScriptHandler._push(script);

        return script;
    };

    // reserved scripts
    createScript.reservedScripts = [
        'system', 'entity', 'create', 'destroy', 'swap', 'move',
        'scripts', '_scripts', '_scriptsIndex', '_scriptsData',
        'enabled', '_oldState', 'onEnable', 'onDisable', 'onPostStateChange',
        '_onSetEnabled', '_checkState', '_onBeforeRemove',
        '_onInitializeAttributes', '_onInitialize', '_onPostInitialize',
        '_onUpdate', '_onPostUpdate',
        '_callbacks', 'has', 'on', 'off', 'fire', 'once', 'hasEvent'
    ];
    var reservedScripts = { };
    for(var i = 0; i < createScript.reservedScripts.length; i++)
        reservedScripts[createScript.reservedScripts[i]] = 1;
    createScript.reservedScripts = reservedScripts;


    // reserved script attribute names
    createScript.reservedAttributes = [
        'app', 'entity', 'enabled', '_enabled', '_enabledOld',
        '__attributes', '__attributesRaw', '__scriptType',
        '_callbacks', 'has', 'on', 'off', 'fire', 'once', 'hasEvent'
    ];
    var reservedAttributes = { };
    for(var i = 0; i < createScript.reservedAttributes.length; i++)
        reservedAttributes[createScript.reservedAttributes[i]] = 1;
    createScript.reservedAttributes = reservedAttributes;


    return {
        createScript: createScript
    };
}());
