var tb_app;
(function ($, Backbone, Themify, window, topWindow, document, Common, undefined) {

    'use strict';

    // Check if drag event is not disabled
    if (typeof topWindow.document.ondragstart === 'function') {
        topWindow.document.ondragstart = window.document.ondragstart = null;
    }


    // extend jquery-ui sortable with beforeStart event
    var oldMouseStart = $.ui.sortable.prototype._mouseStart,
            is_fullSection = document.body.classList.contains('full-section-scrolling');
    $.ui.sortable.prototype._mouseStart = function (e, overrideHandle, noActivation) {
        if (e.type === 'mousedown' && e.which === 1) {
            var cl = e.target.classList;
            if (cl.contains('tb_subrow_holder') || cl.contains('tb_grid_drag') || (cl.contains('tb_column_action') && e.target.parentNode.classList.contains('sub_column')) || ((api.ActionBar.type === 'row' || api.ActionBar.type === 'subrow') && !cl.contains('ti-move') && e.target.parentNode.closest('.tb_clicked') !== null)) {
                e.stopImmediatePropagation();
                e.preventDefault();
                return false;
            }
            this._trigger('beforeStart', e, [this, this._uiHash()]);
        }
        oldMouseStart.apply(this, [e, overrideHandle, noActivation]);
    };
    if (!Element.prototype.closest) {

        Element.prototype.closest = function (cl) {
            var is_class = null,
                    is_id = null,
                    is_tag = null,
                    el = this;
            if (cl.indexOf('.') === 0) {
                is_class = true;
                cl = cl.replace('.', '');
            }
            else if (cl.indexOf('#') === 0) {
                is_id = true;
                cl = cl.replace('#', '');
            }
            else {
                is_tag = true;
            }


            var check = function (item) {
                if ((is_class === true && item.classList.contains(cl)) || (is_id === true && item.id === cl) || (is_tag === true && item.nodeName.toLowerCase() === cl)) {
                    return item;
                }
                return null;
            };

            while (true) {
                var item = check(el);
                if (item !== null) {
                    return item;
                }
                el = el.parentElement;
                if (!el) {
                    return null;
                }
            }
        };
    }
    if (!String.prototype.endsWith) {
        Object.defineProperty(String.prototype, 'endsWith', {
            value: function (searchString, position) {
                var subjectString = this.toString(),
                        subLen = subjectString.length;
                if (position === undefined || position > subLen) {
                    position = subLen;
                }
                position -= subLen;
                var lastIndex = subjectString.indexOf(searchString, position);
                return lastIndex !== -1 && lastIndex === position;
            }
        });
    }
    // Serialize Object Function
    if (undefined === $.fn.themifySerializeObject) {
        $.fn.themifySerializeObject = function () {
            var o = {};
            for (var i = this.length - 1; i > -1; --i) {
                var type = this[i].type;
                if (this[i].classList.contains('wp-editor-area') && tinyMCE !== undefined) {
                    var tiny = tinyMCE.get(this[i].id);
                    if (tiny) {
                        this[i].value = tiny.getContent();
                    }
                }
                if (this[i].value !== '' && (type === 'text' || type === 'number' || type === 'radio' || type === 'checkbox' || type === 'textarea' || type === 'select-one' || type === 'hidden' || type === 'email' || type === 'select' || type === 'select-multiple') && (this[i].name || this[i].id)) {
                    var name = this[i].name ? this[i].name : this[i].id,
                            val = this[i].value;
                    //jQuery returns all selected values for select elements with multi option on
                    if (type === 'radio' || type === 'checkbox') {
                        val = this[i].checked && val;
                    }
                    else if (type === 'select-multiple') {
                        val = $(this[i]).val();
                    }
                    if (o[name] !== undefined && type !== 'radio') {
                        !o[name].push && (o[name] = [o[name]]);
                        val && o[name].push(val);
                    } else {
                        val && (o[name] = val);
                    }
                }
            }
            return o;
        };
    }


    var api = tb_app = {
        activeModel: null,
        Models: {},
        Collections: {},
        Mixins: {},
        Views: {Modules: {}, Rows: {}, SubRows: {}, Columns: {}},
        Forms: {},
        Constructor: {},
        Utils: {},
        Instances: {Builder: {}}
    },
    generatedIds = {},
    customCss=null;
    api.builderIndex = 0;
    api.mode = 'default';
    api.autoSaveCid = null;
    api.hasChanged = null;
    api.editing = false;
    api.scrollTo = false;
    api.eventName = false;
    api.beforeEvent = false;
    api.saving = false;
    api.activeBreakPoint = 'desktop';
    api.zoomMeta = {isActive: false, size: 100};
    api.isPreview = false;
    api.clearOnModeChange=null;
    api.Models.Module = Backbone.Model.extend({
        defaults: {
            element_id: null,
            elType: 'module',
            mod_name: '',
            mod_settings: {}
        },
        initialize: function () {
            api.Models.Registry.register(this.cid, this);
            var id = this.get('element_id');
            if (!id || generatedIds[id] === 1) {
                id = api.Utils.generateUniqueID();
                this.set({element_id: id}, {silent: true});
            }
            generatedIds[id] = 1;
        },
        toRenderData: function () {
            return {
                slug: this.get('mod_name'),
                name: themifyBuilder.modules[this.get('mod_name')].name,
                excerpt: this.getExcerpt()
            };
        },
        getExcerpt: function (settings) {
            var setting = settings || this.get('mod_settings'),
                    excerpt = setting.content_text || setting.content_box || setting.plain_text || '';
            return this.limitString(excerpt, 100);
        },
        limitString: function (str, limit) {
            var new_str = '';
            if (str !== '') {
                str = this.stripHtml(str).toString(); // strip html tags
                new_str = str.length > limit ? str.substr(0, limit) : str;
            }
            return new_str;
        },
        stripHtml: function (html) {
            var tmp = document.createElement('div');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        },
        setData: function (data) {
            api.Utils.clearElementId([data]);
            var model = api.Views.init_module(data);
            model.model.trigger('custom:change', model);
        },
        backendLivePreview: function () {
            $('.tb_element_cid_' + this.cid).find('.module_excerpt').text(this.getExcerpt());
        },
        // for instant live preview
        getPreviewSettings: function () {
            return _.extend({cid: this.cid}, themifyBuilder.modules[ this.get('mod_name') ].defaults);
        },
        getIDattr: function () {
            return this.get('element_id') ? this.get('element_id') : api.Utils.generateUniqueID();
        }
    });

    api.Models.SubRow = Backbone.Model.extend({
        defaults: {
            element_id: null,
            elType: 'subrow',
            gutter: 'gutter-default',
            column_alignment: is_fullSection ? 'col_align_middle' : 'col_align_top',
            column_h: '',
            desktop_dir: 'ltr',
            tablet_dir: 'ltr',
            tablet_landscape_dir: 'ltr',
            mobile_dir: 'ltr',
            col_mobile: '-auto',
            col_tablet_landscape: '-auto',
            col_tablet: '-auto',
            cols: {},
            styling: {}
        },
        initialize: function () {
            api.Models.Registry.register(this.cid, this);
            var id = this.get('element_id');
            if (!id || generatedIds[id] === 1) {
                id = api.Utils.generateUniqueID();
                this.set({element_id: id}, {silent: true});
            }
            generatedIds[id] = 1;
        },
        setData: function (data) {
            api.Utils.clearElementId([data]);
            var model = api.Views.init_subrow(data);
            model.model.trigger('custom:change', model);
        }
    });

    api.Models.Column = Backbone.Model.extend({
        defaults: {
            element_id: null,
            elType: 'column',
            grid_class: '',
            component_name: 'column',
            modules: {},
            styling: {}
        },
        initialize: function () {
            api.Models.Registry.register(this.cid, this);
            var id = this.get('element_id');
            if (!id || generatedIds[id] === 1) {
                id = api.Utils.generateUniqueID();
                this.set({element_id: id}, {silent: true});
            }
            generatedIds[id] = 1;
        },
        setData: function (data) {
            api.Utils.clearElementId([data]);
            var model = api.Views.init_column(data);
            model.model.trigger('custom:change', model);
        }
    });

    api.Models.Row = Backbone.Model.extend({
        defaults: {
            element_id: null,
            elType: 'row',
            gutter: 'gutter-default',
            column_alignment: is_fullSection ? 'col_align_middle' : 'col_align_top',
            column_h: '',
            desktop_dir: 'ltr',
            tablet_dir: 'ltr',
            tablet_landscape_dir: 'ltr',
            mobile_dir: 'ltr',
            col_mobile: '-auto',
            col_tablet_landscape: '-auto',
            col_tablet: '-auto',
            cols: {},
            styling: {}
        },
        initialize: function () {
            api.Models.Registry.register(this.cid, this);
            var id = this.get('element_id');
            if (!id || generatedIds[id] === 1) {
                id = api.Utils.generateUniqueID();
                this.set({element_id: id}, {silent: true});
            }
            generatedIds[id] = 1;
        },
        setData: function (data) {
            api.Utils.clearElementId([data]);
            var model = api.Views.init_row(data);
            model.model.trigger('custom:change', model);
        }
    });

    api.Collections.Rows = Backbone.Collection.extend({
        model: api.Models.Row
    });

    api.Models.Registry = {
        items: {},
        register: function (id, object) {
            this.items[id] = object;
        },
        lookup: function (id) {
            return this.items[id] || null;
        },
        remove: function (id) {
            this.items[id] = null;
            delete this.items[id];
        },
        destroy: function () {
            for (var i in this.items) {
                this.items[i].destroy();
            }
            this.items = {};
        }
    };

    api.Models.setValue = function (cid, data, silent) {
        silent = silent || false;
        var model = api.Models.Registry.lookup(cid);
        model.set(data, {silent: silent});
    };

    api.vent = _.extend({}, Backbone.Events);

    api.Views.register_module = function (args) {
        if ('default' !== api.mode) {
            this.Modules[ api.mode ] = this.Modules.default.extend(args);
        }
    };

    api.Views.init_module = function (args, is_new) {
        if (themifyBuilder.modules[args.mod_name] === undefined) {
            return false;
        }

        if (is_new === true && args.mod_settings === undefined && themifyBuilder.modules[ args.mod_name ].defaults !== undefined) {
            args.mod_settings = _.extend({}, themifyBuilder.modules[ args.mod_name ].defaults);
        }

        var model = args instanceof api.Models.Module ? args : new api.Models.Module(args),
                callback = this.get_module(),
                view = new callback({model: model, type: api.mode});

        return {
            model: model,
            view: view
        };
    };

    api.Views.get_module = function () {
        return this.Modules[ api.mode ];
    };

    api.Views.unregister_module = function () {
        if ('default' !== api.mode) {
            this.Modules[ api.mode ] = null;
            delete this.Modules[ api.mode ];
        }
    };

    api.Views.module_exists = function () {
        return this.Modules.hasOwnProperty(api.mode);
    };

    // column
    api.Views.register_column = function (args) {
        if ('default' !== api.mode) {
            this.Columns[ api.mode ] = this.Columns.default.extend(args);
        }
    };

    api.Views.init_column = function (args) {
        var model = args instanceof api.Models.Column ? args : new api.Models.Column(args),
                callback = this.get_column(),
                view = new callback({model: model, type: api.mode});

        return {
            model: model,
            view: view
        };
    };

    api.Views.get_column = function () {
        return this.Columns[api.mode];
    };

    api.Views.unregister_column = function () {
        if ('default' !== api.mode) {
            this.Columns[ api.mode ] = null;
            delete this.Columns[ api.mode ];
        }
    };

    api.Views.column_exists = function () {
        return this.Columns.hasOwnProperty(api.mode);
    };

    // sub-row
    api.Views.register_subrow = function (args) {
        if ('default' !== api.mode) {
            this.SubRows[ api.mode ] = this.SubRows.default.extend(args);
        }
    };

    api.Views.init_subrow = function (args) {
        var model = args instanceof api.Models.SubRow ? args : new api.Models.SubRow(args),
                callback = this.get_subrow(),
                view = new callback({model: model, type: api.mode});

        return {
            model: model,
            view: view
        };
    };

    api.Views.get_subrow = function () {
        return this.SubRows[ api.mode ];
    };

    api.Views.unregister_subrow = function () {
        if ('default' !== api.mode) {
            this.SubRows[ api.mode ] = null;
            delete this.SubRows[ api.mode ];
        }
    };

    api.Views.subrow_exists = function () {
        return this.SubRows.hasOwnProperty(api.mode);
    };

    // Row
    api.Views.register_row = function (args) {
        if ('default' !== api.mode) {
            this.Rows[ api.mode ] = this.Rows.default.extend(args);
        }
    };

    api.Views.init_row = function (args) {
        var attr = args.attributes;
        if (attr === undefined || ((attr.cols !== undefined && (Object.keys(attr.cols).length > 0 || attr.cols.length > 0)) || (attr.styling !== undefined && Object.keys(attr.styling).length > 0))) {
            var model = args instanceof api.Models.Row ? args : new api.Models.Row(args),
                    callback = this.get_row(),
                    view = new callback({model: model, type: api.mode});

            return {
                model: model,
                view: view
            };
        }
        else {
            return false;
        }
    };

    api.Views.get_row = function () {
        return this.Rows[ api.mode ];
    };

    api.Views.unregister_row = function () {
        if ('default' !== api.mode) {
            this.Rows[ api.mode ] = null;
            delete this.Rows[ api.mode ];
        }
    };

    api.Views.row_exists = function () {
        return this.Rows.hasOwnProperty(api.mode);
    };

    api.Views.BaseElement = Backbone.View.extend({
        type: 'default',
        initialize: function () {
            this.listenTo(this.model, 'custom:change', this.modelChange);
            this.listenTo(this.model, 'destroy', this.remove);
            this.listenTo(this.model, 'edit', this.edit);
            this.listenTo(this.model, 'duplicate', this.duplicate);
            this.listenTo(this.model, 'save', this.save);
            this.listenTo(this.model, 'importExport', this.importExport);
            this.listenTo(this.model, 'delete', this.delete);
            this.listenTo(this.model, 'copy', this.copy);
            this.listenTo(this.model, 'paste', this.paste);
            this.listenTo(this.model, 'change:view', this.setView);
        },
        setView: function (node) {
            this.setElement(node);
        },
        modelChange: function () {

            this.$el.attr(_.extend({}, _.result(this, 'attributes')));
            var el = this.render(),
                cid = api.beforeEvent.data('cid'),
                item = document.getElementsByClassName('tb_element_cid_' + cid)[0];
                item.parentNode.replaceChild(el.el, item);
            if (api.mode === 'visual') {
                this.model.trigger('visual:change');
            }
            else {
                if (api.eventName === 'row') {
                    cid = this.$el.data('cid');
                }
                api.undoManager.push(cid, api.beforeEvent, this.$el, api.eventName);
                api.Mixins.Builder.update(this.$el);
            }
        },
        remove: function () {
            this.$el.remove();
        },
        copy: function (e, target) {
            var $selected = this.$el,
                    model = this.model;
            var component = model.get('elType');
            if (component === 'column') {
                component = model.get('component_name');
            }
            var data = this.getData($selected, component);
            // Attach used GS to data
            if (Object.keys(api.GS.styles).length) {
                var usedGS = api.GS.findUsedItems(data);
                if (usedGS.length) {
                    data.attached_gs = usedGS;
                }
            }
            api.Utils.clearElementId([data]);
            model = null;
            if (component === 'sub-column') {
                component = 'column';
            }
            Common.Clipboard.set(component, data);
        },
        paste: function (e, target) {
            var $el = this.$el,
                    model = this.model;
            var component = model.get('elType'),
                    mod_name = null;
            if (component === 'column') {
                component = model.get('component_name');
            }
            else if (component === 'module') {
                mod_name = model.get('mod_name');
            }
            if (component === 'sub-column') {
                component = 'column';
            }
            var is_style = target==='style' || (target!==null && target!==undefined && target.classList.contains('tb_paste_style')),
                    data = Common.Clipboard.get(component);
            if (data === false || (is_style === true && component === 'module' && mod_name !== data['mod_name'])) {
                Common.alertWrongPaste();
                return;
            }
            api.eventName = 'row';
            if (is_style === true) {
                var stOptions = ThemifyStyles.getStyleOptions((component === 'module' ? mod_name : component)),
                        k = component === 'module' ? 'mod_settings' : 'styling',
                        res = this.getData($el, (component === 'column' ? model.get('component_name') : component)),
                        checkIsStyle = function (i) {
                            if (i.indexOf('breakpoint_') !== -1 || i.indexOf('_apply_all') !== -1) {
                                return true;
                            }
                            var key = i.indexOf('_color') !== -1 ? 'color' : (i.indexOf('_style') !== -1 ? 'style' : false);
                            if (key !== false) {
                                key = i.replace('_' + key, '_width');
                                if (stOptions[key] !== undefined && stOptions[key].type === 'border') {
                                    return true;
                                }
                            }
                            else if (i.indexOf('_unit') !== -1) {//unit
                                key = i.replace(/_unit$/ig, '', '');
                                if (stOptions[key] !== undefined) {
                                    return true;
                                }
                            }
                            else if (i.indexOf('_w') !== -1) {//weight
                                key = i.replace(/_w$/ig, '', '');
                                if (stOptions[key] !== undefined && stOptions[key].type === 'font_select') {
                                    return true;
                                }
                            }
                            else if (stOptions[i] !== undefined && stOptions[i].type === 'radio') {
                                return true;
                            }
                            return false;
                        };
                if (res[k] === undefined) {
                    res[k] = {};
                }
                for (var i in data[k]) {
                    if (stOptions[i] === undefined && !checkIsStyle(i)) {
                        delete data[k][i];
                    }
                    else {
                        res[k][i] = data[k][i];
                        if (stOptions[i] !== undefined) {
                            if (stOptions[i].isFontColor === true && data[k][stOptions[i].g + '-gradient'] !== undefined) {
                                res[k][stOptions[i].g + '-gradient'] = data[k][stOptions[i].g + '-gradient'];
                            }
                            else {
                                if (stOptions[i].posId !== undefined && data[k][stOptions[i].posId] !== undefined) {
                                    res[k][stOptions[i].posId] = data[k][stOptions[i].posId];
                                }
                                if (stOptions[i].repeatId !== undefined && data[k][stOptions[i].repeatId] !== undefined) {
                                    res[k][stOptions[i].repeatId] = data[k][stOptions[i].repeatId];
                                }
                            }
                        }
                    }
                }
                if (data.used_gs !== undefined) {
                    res['used_gs'] = data.used_gs;
                }
                stOptions = null;
                data = res;
                delete data['element_id'];
            }
            if (component === 'column') {
                data['grid_class'] = api.Utils.filterClass($el.prop('class'));
                if ($el.hasClass('first')) {
                    data['grid_class'] += ' first';
                }
                else if ($el.hasClass('last')) {
                    data['grid_class'] += ' last';
                }
                var width = $el[0].style['width'];
                if (width) {
                    data['grid_width'] = width.replace('%', '');
                }
                else {
                    data['grid_width'] = null;
                }
                data['component_name'] = model.get('component_name');
            }
            if (is_style === false) {
                api.Utils.clearElementId([data]);
            }

            api.hasChanged = true;
            api.beforeEvent = Common.clone($el);
            model.setData(data);
            if (null !== api.activeModel) {
                Common.Lightbox.close();
            }
        },
        importExport: function (e, target) {
            var type = target.classList.contains('ti-import') ? 'import' : 'export',
                    self = this,
                    el = this.$el,
                    model = this.model,
                    component = model.get('elType'),
                    name = component.charAt(0).toUpperCase() + component.slice(1),
                    label = component === 'subrow' ? 'Sub-Row' : (component === 'sub-column' ? 'Sub-Column' : name),
                    options = {
                        contructor: true,
                        loadMethod: 'html',
                        data: {
                            component_form: {
                                name: ThemifyConstructor.label[type + '_tab'].replace('%s', name),
                                options: [
                                    {
                                        id: 'tb_data_field',
                                        type: 'textarea',
                                        label: ThemifyConstructor.label['import_label'].replace('%s', label),
                                        help: ThemifyConstructor.label[type + '_data'].replace('%s', name),
                                        'class': 'fullwidth',
                                        rows: 13
                                    }
                                ]
                            }
                        }
                    };
            if (type === 'import') {
                options.save = {};
            }
            Common.Lightbox.$lightbox[0].style['display'] = 'none';
            Common.Lightbox.open(options, function () {
                topWindow.document.body.classList.add('tb_standalone_lightbox');
            }, function () {
                var $lightbox = this.$lightbox;
                $lightbox.addClass('tb_import_export_lightbox');
                this.setStandAlone(e.clientX, e.clientY);
                if (type === 'import') {
                    $lightbox.find('.builder_save_button').on('click.tb_import', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        var $dataField = $lightbox.find('#tb_data_field'),
                                dataPlainObject = JSON.parse($dataField.val());
                        if ((component === 'column' && dataPlainObject['component_name'] === 'sub-column') || (component === 'sub-column' && dataPlainObject['component_name'] === 'column')) {
                            dataPlainObject['component_name'] = component;
                            dataPlainObject['grid_class'] = el.closest('.module_column').prop('class');
                        }
                        if (dataPlainObject['component_name'] === undefined || dataPlainObject['component_name'] !== component) {
                            Common.alertWrongPaste();
                            return;
                        }
                        var keys = dataPlainObject.hasOwnProperty('used_gs') ? Object.keys(dataPlainObject.used_gs) : [],
                            keys_length = keys.length;
                        if (keys_length>0) {
                            for (var i = keys_length - 1; i > -1; --i) {
                                var gs = api.GS.findBySlug(keys[i]);
                                if (gs) {
                                    delete dataPlainObject.used_gs[keys[i]];
                                }
                                gs = null;
                            }
                            if (keys_length) {
                                api.GS.loadingPosts = true;
                                $.ajax({
                                    type: 'POST',
                                    url: themifyBuilder.ajaxurl,
                                    dataType: 'json',
                                    data: {
                                        action: 'tb_import_gs_posts_ajax',
                                        tb_load_nonce: themifyBuilder.tb_load_nonce,
                                        data: dataPlainObject.used_gs
                                    },
                                    success: function (res) {
                                        var keys = Object.keys(res);
                                        for(var i=keys.length-1;i>-1;--i){
                                            api.GS.styles[res[keys[i]].id] = res[keys[i]];
                                            if ('visual' === api.mode) {
                                                //set live css style
                                                api.liveStylingInstance.setCss(api.GS.styles[res[keys[i]].id].data, undefined, api.GS.styles[res[keys[i]].id].class);
                                                api.GS.styles[res[keys[i]].id].cssLoaded = true;
                                            }
                                        }
                                        api.GS.loadingPosts = false;
                                    }
                                });
                            }
                        }
                        dataPlainObject = api.Utils.clear(dataPlainObject);
                        api.eventName = 'row';
                        api.beforeEvent = Common.clone(el);
                        api.hasChanged = true;
                        model.setData(dataPlainObject);
                        Common.Lightbox.close();
                    });
                }
                else {
                    var data = self.getData(el, component);
                    data['component_name'] = component;
                    var used_gs = api.GS.findUsedItems(data);
                    if (used_gs !== false) {
                        var gsData = {};
                        for(var i=used_gs.length-1;i>-1;--i){
                            var gsPost = api.GS.styles[used_gs[i]],
                                styles;
                            if ('row' === gsPost.type) {
                                styles = gsPost.data[0].styling;
                            } else if ('column' === gsPost.type) {
                                styles = gsPost.data[0].cols[0].styling;
                            } else {
                                styles = gsPost.data[0].cols[0].modules[0].mod_settings;
                            }
                            gsData[gsPost.class] = {};
                            gsData[gsPost.class]['title'] = gsPost.title;
                            gsData[gsPost.class]['class'] = gsPost.class;
                            gsData[gsPost.class]['type'] = gsPost.type;
                            gsData[gsPost.class]['data'] = styles;
                        }
                        if (Object.keys(gsData).length) {
                            data.used_gs = gsData;
                        }
                    }
                    data = JSON.stringify(data);
                    $lightbox.find('#tb_data_field').val(data).on('click', function () {
                        $(this).trigger('focus').trigger('select');
                    });
                }

                Themify.body.one('themify_builder_lightbox_close', function () {
                    $lightbox.removeClass('tb_import_export_lightbox');
                    topWindow.document.body.classList.remove('tb_standalone_lightbox');
                    if (type === 'import') {
                        $lightbox.find('.builder_save_button').off('click.tb_import');
                    }
                });
            });
        },
        getData: function (el, type) {
            var data = {};
            switch (type) {
                case 'row':
                case 'subrow':
                    data = api.Utils._getRowSettings(el.closest('.module_' + type)[0], type);
                    break;
                case 'module':
                    data = api.Models.Registry.lookup(el.closest('.active_module').data('cid')).attributes;
                    break;
                case 'column':
                case 'sub-column':
                    var $selectedCol = el.closest('.module_column'),
                            $selectedRow = $selectedCol.closest('column' === type ? '.module_row' : '.module_subrow'),
                            rowData = api.Utils._getRowSettings($selectedRow[0], 'column' === type ? 'row' : 'subrow');
                    data = rowData.cols[ $selectedCol.index() ];
                    break;
            }
            return api.Utils.clear(data);
        },
        duplicate: function (e, target) {
            var current = this.$el,
                el = Common.clone(current);
            if (api.activeModel!==null && Common.Lightbox.$lightbox.is(':visible')) {
                ThemifyConstructor.saveComponent();
            }
            current.removeClass('tb_element_cid_' + this.model.cid);
            el.hide().insertAfter(current);
            var data = this.getData(el, this.model.get('elType'));
            api.eventName = 'duplicate';
            api.beforeEvent = el;
            api.hasChanged = true;
            this.model.setData(data);
            current.addClass('tb_element_cid_' + this.model.cid);
        },
        edit: function (e, target) {
            if (api.isPreview && undefined === themifyBuilder.globalStyleData) {
                return true;
            }
            if (null !== api.activeModel && !api.GS.isEmpty(api.activeModel.attributes['gs'])) {
                var triggerData = {model:this.model,e:e,target:target};
                api.GS.saveLiveEdit(triggerData);
                return;
            }
            api.hasChanged = false;
            var isStyle = false,
                    isVisible = false,
                lightbox = Common.Lightbox.$lightbox,
                component = this.model.get('elType'),
                afterCallback=false,
                template = component === 'module' ? this.model.get('mod_name') : component;
            if (e !== null) {
                var cl = target.classList,
                    edgeId = cl.contains('tb_dragger')?target.getAttribute('data-id'):null;
                    if(edgeId!==null && target.getAttribute('data-v')===''){
                        return;
                    }
                if(e.type==='dblclick' && this.model.cid !== api.autoSaveCid){
                    api.ActionBar.clear();
                }
                var isStyle = edgeId!==null || cl.contains('tb_styling');
                if (isStyle===true) {
                    this.model.set({styleClicked: true}, {silent: true});
                    if(edgeId!==null){
                        afterCallback =function(lightboxContainer){
                            var type = cl.contains('tb_dragger_padding')?'padding':'margin',
                                origLabel=type==='padding'?'p':'m',
                                label=ThemifyConstructor.label[origLabel],
                                container=undefined;
                            if(component==='module'){
                                var tabId;
                                    container = lightboxContainer.getElementsByClassName('tb_styling_tab_nav')[0];
                                if(container!==undefined){
                                    if(api.EdgeDrag.modules[template]!==undefined && api.EdgeDrag.modules[template][type]!==undefined){
                                        edgeId = edgeId.replace(/_left|_right|_bottom|_top$/ig,'');
                                        if(api.EdgeDrag.modules[template][type][edgeId]!==undefined){
                                            tabId= api.EdgeDrag.getTabId(ThemifyConstructor.data[template]['styling']['options']['options'],edgeId,origLabel);
                                            if(tabId!==null){
                                                var tabsItems = container.getElementsByClassName('tb_tab_wrapper')[0].getElementsByTagName('a');
                                                for(var i=tabsItems.length-1;i>-1;--i){
                                                    if(tabsItems[i].getAttribute('href')==='#tb_1_'+tabId){
                                                        tabsItems[i].click();
                                                        break;
                                                    }
                                                }
                                                tabsItems=null;
                                            }
                                        }
                                    }
                                    tabId = container.getElementsByClassName('current')[0].getElementsByTagName('a')[0].getAttribute('href');
                                    container = lightboxContainer.querySelector(tabId);
                                }
                            }
                            if(container===undefined){
                                container=lightboxContainer;
                            }
                            var expands = container.getElementsByClassName('tb_style_toggle');
                            for(var i=expands.length-1;i>-1;--i){
                                if(expands[i].textContent===label){
                                    if(expands[i].classList.contains('tb_closed')){
                                        expands[i].click();
                                    }
                                    setTimeout(function(){
                                        expands[i].closest('.simplebar-scroll-content').scrollTop= expands[i].offsetTop;
                                        expands=null;
                                    },10);
                                    break;
                                }
                            }
                        };
                    }
                }
                else if (cl.contains('tb_visibility_component')) {
                    isVisible = true;
                    this.model.set({visibileClicked: true}, {silent: true});
                }
                else{
                    var canBeEdit = !cl.contains('tb_swap')?(template === 'layout-part'?true:Themify.body.triggerHandler('tb_edit_'+template, [e,this.el,this.model])):false;
                    if (canBeEdit === true && api.mode === 'visual' &&  !api.Forms.LayoutPart.id && (e.type === 'dblclick' || cl.contains('tb_edit'))) {
                        api.activeModel = this.model;
                        api.Forms.LayoutPart.edit(this.el);
                        return;
                    }
                }
            }
            if (!api.GS.isEmpty(this.model.attributes['gs']) || undefined !== themifyBuilder.globalStyleData) {
                isStyle = true;
                this.model.set({styleClicked: true}, {silent: true});
            }
            if (api.activeModel !== null && api.autoSaveCid !== null && this.model.cid !== api.autoSaveCid) {
                ThemifyConstructor.saveComponent(true);
            }

            api.activeModel = this.model;
            if (api.autoSaveCid === this.model.cid) {
                var clicked = null;
                if (isStyle === true) {
                    clicked = lightbox.find('a[href="#tb_options_styling"]');
                    this.model.unset('styleClicked', {silent: true});
                }
                else if (isVisible === true) {
                    clicked = lightbox.find('a[href="#tb_options_visibility"]');
                    this.model.unset('visibileClicked', {silent: true});
                }
                else if (component === 'module' || component === 'row') {
                    clicked = lightbox.find('a[href="#tb_options_setting"]');
                }
                if (clicked !== null && clicked.length > 0) {
                    clicked[0].click();
                    if(afterCallback!==false && isStyle===true){
                        afterCallback(Common.Lightbox.$lightbox[0].querySelector('#tb_lightbox_container'));
                    }
                }
                return;
            }
            Common.Lightbox.open({loadMethod: 'inline', templateID: template}, false, afterCallback);
            if(template!=='row'){
               Common.Lightbox.$lightbox[0].getElementsByClassName('tb_action_breadcrumb')[0].appendChild(api.ActionBar.getBreadCrumbs(api.Instances.Builder[api.builderIndex].el.getElementsByClassName('tb_element_cid_'+this.model.cid)[0]));
            }
        },
        delete: function (e,target) {
            var item = this.$el,
                    model = this.model,
                    cid = model.cid,
                    component = model.get('elType');
            if (!confirm(themifyBuilder.i18n[component + 'DeleteConfirm'])) {
                return;
            }
            var before = item.closest('.module_row'),
                    type = 'row',
                    after = '',
                    data = {},
                    origCid = cid;
            if (component === 'row') {
                data['pos_cid'] = before.next('.module_row');
                data['pos'] = 'before';
                if (data['pos_cid'].length === 0) {
                    data['pos'] = 'after';
                    data['pos_cid'] = before.prev('.module_row');
                }
                type = 'delete_row';
                data['pos_cid'] = data['pos_cid'].data('cid');
            }
            else {
                cid = before.data('cid');
            }
            before = Common.clone(before);
            if (component !== 'row') {
                var r = item.closest('.module_subrow');
            }
            model.destroy();
            if (component !== 'row' && r.length > 0 && r.find('.active_module').length === 0) {
                r.addClass('tb_row_empty');
            }
            if (component !== 'row') {
                after = $('.tb_element_cid_' + cid);
                var r = after.closest('.module_row');
                if (r.find('.active_module').length === 0) {
                    r.addClass('tb_row_empty');
                }
                r = null;
            }
            api.hasChanged = true;
            api.undoManager.push(cid, before, after, type, data);
            if (api.activeModel !== null && api.activeModel.cid === origCid) {
                Common.Lightbox.$lightbox.find('.tb_close_lightbox')[0].click();
            }
            api.toolbar.pageBreakModule.countModules();
        },
        save: function (e) {
            if (api.activeModel !== null && api.autoSaveCid !== null) {
                ThemifyConstructor.saveComponent(true);
            }
            var component = this.model.get('elType'),
                    options = {
                        contructor: true,
                        loadMethod: 'html',
                        save: {done: 'save'},
                        data: {}
                    },
            cid = this.model.cid;
            options['data']['s' + component] = {
                options: [
                    {
                        id: 'item_title_field',
                        type: 'text',
                        label: ThemifyConstructor.label.title
                    }, {
                        id: 'item_layout_save',
                        type: 'checkbox',
                        label: '',
                        options: [
                            {name: 'layout_part', value: ThemifyConstructor.label.slayout_part}
                        ],
                        new_line: false,
                        after: '',
                        help: 'Any changes made to a Layout Part are saved and reflected everywhere else they are being used (<a href="https://themify.me/docs/builder#layout-parts" target="_blank">learn more</a>)'
                    }
                ]
            };
            Common.Lightbox.$lightbox[0].style['display'] = 'none';
            Common.Lightbox.open(options, function () {
                topWindow.document.body.classList.add('tb_standalone_lightbox');
            }, function (container) {
                var $container = this.$lightbox,
                        saveAsLibraryItem = function (e) {
                            if ('keypress' === e.type && e.keyCode !== 13) {
                                return;
                            }
                            e.preventDefault();
                            e.stopPropagation();
                            Common.showLoader('show');
                            var model = api.Models.Registry.lookup(cid),
                                    settings,
                                    is_layout,
                                    type;
                            switch (component) {
                                case 'row':
                                    type = component;
                                    settings = api.Utils._getRowSettings($('.tb_element_cid_' + cid)[0]);
                                    api.Utils.clearElementId([settings], true);
                                    break;

                                case 'module':
                                    type = model.get('mod_name');
                                    settings = {'mod_name': type, element_id: api.Utils.generateUniqueID(), 'mod_settings': model.get('mod_settings')};
                                    break;
                            }
                            var css = ThemifyStyles.createCss([settings], type);
                            settings = api.Utils.clear(settings);
                            // Check and attach used GS in this post
                            if (Object.keys(api.GS.styles).length) {
                                var used_gs = api.GS.findUsedItems(settings);
                                if (used_gs !== false) {
                                    css = api.GS.attachCSS(css, used_gs);
                                }
                            }
                            var request = $.extend(api.Forms.serialize(container), {
                                action: 'tb_save_custom_item',
                                item: JSON.stringify(settings),
                                css: JSON.stringify(css),
                                tb_load_nonce: themifyBuilder.tb_load_nonce,
                                postid: themifyBuilder.post_ID,
                                type: component
                            });
                            if (used_gs !== undefined && used_gs !== false) {
                                request['usedGS'] = [];
                                for(var i=used_gs.length-1;i>-1;--i){
                                    request['usedGS'].push(api.GS.styles[used_gs[i]].class);
                                }
                            }
                            is_layout = request['item_layout_save'];
                            $.ajax({
                                type: 'POST',
                                url: themifyBuilder.ajaxurl,
                                dataType: 'json',
                                data: request,
                                success: function (data) {

                                    settings = null;
                                    if (data.status === 'success') {
                                        $('#tb_module_panel', topWindow.document).find('.tb_module_panel_search_text').val('');
                                        if (is_layout) {
                                            api.hasChanged = true;
                                            var args = {
                                                'mod_name': 'layout-part',
                                                'mod_settings': {
                                                    'selected_layout_part': data.post_name
                                                }
                                            };
                                            delete data['status'];
                                            if (ThemifyConstructor.layoutPart.data.length > 0) {
                                                ThemifyConstructor.layoutPart.data.push(data);
                                            }
                                            var elm = $('.tb_element_cid_' + cid),
                                                    module,
                                                    after,
                                                    before = Common.clone(elm);
                                            if (component === 'row') {
                                                var row = api.Views.init_row({
                                                    cols: [{
                                                            'grid_class': 'col-full first last',
                                                            'element_id': api.Utils.generateUniqueID(),
                                                            'modules': [args]
                                                        }]
                                                }),
                                                        $Elem = row.view.render();
                                                module = api.Models.Registry.lookup($Elem.$el.find('.active_module').data('cid'));
                                            } else {
                                                module = api.Views.init_module(args),
                                                        $Elem = module.view.render();
                                                module = module.model;
                                            }
                                            elm.replaceWith($Elem.el);
                                            if (api.mode === 'visual') {
                                                $(document).ajaxComplete(function Refresh(e, xhr, args) {
                                                    if (args.data.indexOf('tb_load_module_partial', 3) !== -1) {
                                                        $(this).off('ajaxComplete', Refresh);
                                                        if (component === 'row') {
                                                            after = api.liveStylingInstance.$liveStyledElmt.closest('.module_row');
                                                        }
                                                        else {
                                                            after = api.liveStylingInstance.$liveStyledElmt;
                                                        }
                                                        api.undoManager.push($Elem.$el.data('cid'), before, after, 'row');
                                                    }
                                                });
                                                module.trigger('custom:preview:refresh', module.get('mod_settings'));
                                            }
                                            else {
                                                after = $Elem.el;
                                                api.Mixins.Builder.updateModuleSort($Elem.$el);
                                                api.undoManager.push($Elem.$el.data('cid'), before, after, 'row');
                                            }
                                        }
                                        var libraryItems = $('.tb_library_item_list'),
                                                html = api.toolbar.libraryItems.template([data]);
                                        if (api.mode === 'visual') {
                                            libraryItems = libraryItems.add(api.toolbar.$el.find('.tb_library_item_list'));
                                        }
                                        libraryItems = libraryItems.get();
                                        for (var i = 0, len = libraryItems.length; i < len; ++i) {
                                            var item = libraryItems[i].getElementsByClassName('simplebar-content');
                                            if (item.length > 0) {
                                                item[0].insertAdjacentHTML('afterbegin', html);
                                            } else {
                                                libraryItems[i].insertAdjacentHTML('afterbegin', html);
                                            }
                                            libraryItems[i].previousElementSibling.getElementsByClassName('current')[0].click();
                                        }
                                        api.toolbar.libraryItems.bindEvents(true);
                                        Common.showLoader('hide');
                                        Common.Lightbox.close();
                                    } else {
                                        alert(data.msg);
                                    }
                                }
                            });
                        };
                $container.addClass('tb_save_module_lightbox');
                this.setStandAlone(e.clientX, e.clientY);
                $container.on('click.saveLayout', '.builder_save_button', saveAsLibraryItem)
                        .on('keypress.saveLayout', 'input', saveAsLibraryItem);
                Themify.body.one('themify_builder_lightbox_close', function () {
                    $container.removeClass('tb_save_module_lightbox').off('.saveLayout');
                    topWindow.document.body.classList.remove('tb_standalone_lightbox');
                });
            });
        }

    });

    api.Views.BaseElement.extend = function (child) {
        var self = this,
                view = Backbone.View.extend.apply(this, arguments);
        view.prototype.events = _.extend({}, this.prototype.events, child.events);
        view.prototype.initialize = function () {
            if ('function' === typeof self.prototype.initialize)
                self.prototype.initialize.apply(this, arguments);
            if ('function' === typeof child.initialize)
                child.initialize.apply(this, arguments);
        };
        return view;
    };

    api.Views.Modules['default'] = api.Views.BaseElement.extend({
        tagName: 'div',
        attributes: function () {
            var data = this.model.get('mod_settings'),
                    args = {'data-cid': this.model.cid, 'class': 'active_module module-' + this.model.get('mod_name') + ' tb_' + this.model.get('element_id') + ' tb_element_cid_' + this.model.cid};
            if (api.mode === 'visual') {
                args['class'] += ' tb_module_front';
                if (data['visibility_all'] === 'hide_all' || data['visibility_desktop'] === 'hide' || data['visibility_tablet'] === 'hide' || data['visibility_tablet_landscape'] === 'hide' || data['visibility_mobile'] === 'hide') {
                    args['class'] += ' tb_visibility_hidden';
                }
                // Add GS classes
                var gs = data.hasOwnProperty('global_styles') ? ' ' + data['global_styles'] : '';
                gs = '' == gs && null !== ThemifyConstructor.styles && ThemifyConstructor.styles.hasOwnProperty('global_styles') ? ' ' + ThemifyConstructor.styles['global_styles'] : gs;
                args['class'] += gs;
            }
            else {
                args['class'] += ' tb_module';
            }
            if (data['custom_css_id'] !== undefined && data['custom_css_id'] !== '') {
                args['id'] = data['custom_css_id'];
            }
            return args;
        },
        template: api.mode === 'visual' ? null : wp.template('builder_module_item'),
        initialize: function () {
            this.listenTo(this.model, 'dom:module:unsaved', this.removeUnsaved);
        },
        removeUnsaved: function () {
            this.model.destroy();
        },
        render: function () {
            if (api.mode !== 'visual') {
                this.el.innerHTML = this.template(this.model.toRenderData());
            }
            return this;
        }
    });

    api.Views.Columns['default'] = api.Views.BaseElement.extend({
        tagName: 'div',
        attributes: function () {
            var attr = {
                'class': 'module_column tb-column tb_element_cid_' + this.model.cid + ' tb_' + this.model.get('element_id') + ' ' + this.model.get('grid_class'),
                'data-cid': this.model.cid
            };
            if (this.model.get('grid_width')) {
                attr['style'] = 'width:' + this.model.get('grid_width') + '%';
            }
            if ('column' !== this.model.get('component_name')) {
                attr['class'] += ' sub_column';
            }
            return attr;
        },
        render: function () {
            var component = this.model.get('component_name');
            this.el.innerHTML = Common.templateCache.get('tmpl-builder_column_item');
            var modules = this.model.get('modules');
            // check if it has module
            if (modules) {
                var container = document.createDocumentFragment();
                for (var i in modules) {
                    if (modules[i] !== undefined && modules[i] !== null) {
                        var m = modules[i],
                                moduleView = m.cols === undefined ? api.Views.init_module(m) : api.Views.init_subrow(m);
                        if (moduleView) {
                            container.appendChild(moduleView.view.render().el);
                        }
                    }
                }
                var holder = this.el.getElementsByClassName('tb_holder')[0];
                holder.appendChild(container);
                if (component === 'sub-column') {
                    holder.classList.add('tb_subrow_holder');
                }
            }
            return this;
        }
    });

    // SubRow view share same model as ModuleView
    api.Views.SubRows['default'] = api.Views.BaseElement.extend({
        tagName: 'div',
        attributes: function () {
            return {
                'class': 'themify_builder_sub_row module_subrow active_module clearfix tb_element_cid_' + this.model.cid + ' tb_' + this.model.get('element_id'),
                'data-cid': this.model.cid
            };
        },
        render: function () {
            var cols = this.model.get('cols'),
                    len = Object.keys(cols).length;
            this.el.innerHTML = Common.templateCache.get('tmpl-builder_subrow_item');
            if (len > 0) {
                var container = document.createDocumentFragment(),
                        not_empty = false;
                for (var i = 0; i <= len; ++i) {
                    if (cols[i] !== undefined) {
                        cols[i].component_name = 'sub-column';
                        container.appendChild(api.Views.init_column(cols[i]).view.render().el);
                        if (not_empty === false && cols[i].modules !== undefined && cols[i].modules.length > 0) {
                            not_empty = true;
                        }
                    }
                }
                if (not_empty === false) {
                    this.el.classList.add('tb_row_empty');
                }
                this.el.getElementsByClassName('subrow_inner')[0].appendChild(container);
            }
            api.Utils.selectedGridMenu(this.el, 'subrow');
            return this;
        }
    });

    api.Views.Rows['default'] = api.Views.BaseElement.extend({
        tagName: 'div',
        attributes: function () {
            var data = this.model.get('styling'),
                    attr = {
                        'class': 'themify_builder_row module_row clearfix tb_element_cid_' + this.model.cid + ' tb_' + this.model.get('element_id'),
                        'data-cid': this.model.cid
                    };
            if ( data !== null ) {
                if (data['custom_css_row'] !== undefined && data['custom_css_row'] !== '') {
                    attr['class'] += ' ' + data['custom_css_row'];
                }
                if (data['custom_css_id'] !== undefined && data['custom_css_id'] !== '') {
                    attr['id'] = data['custom_css_id'];
                }
            }
            return attr;
        },
        render: function () {
            var cols = this.model.get('cols'),
                    len = Object.keys(cols).length,
                    not_empty = false;
            this.el.innerHTML = Common.templateCache.get('tmpl-builder_row_item');
            if (len > 0) {
                var container = document.createDocumentFragment();
                for (var i = 0; i <= len; ++i) {
                    if (cols[i] !== undefined) {
                        cols[i].component_name = 'column';
                        container.appendChild(api.Views.init_column(cols[i]).view.render().el);
                        if (not_empty === false && cols[i].modules !== undefined && (cols[i].modules.length > 0 || (typeof cols[i].modules === 'object' && Object.keys(cols[i].modules).length > 0))) {
                            not_empty = true;
                        }
                    }
                }
                this.el.getElementsByClassName('row_inner')[0].appendChild(container);
            } else {
                // Add column
                api.Utils._addNewColumn({
                    newclass: 'col-full',
                    component: 'column'
                }, this.el.getElementsByClassName('row_inner')[0]);
            }

            if (not_empty === false) {
                this.el.classList.add('tb_row_empty');
            }
            api.Utils.selectedGridMenu(this.el, 'row');
            return this;
        }
    });

    api.Views.Builder = Backbone.View.extend({
        type: 'default',
        lastRow: null,
        events: {
            'click .tb_import_layout_button': 'importLayoutButton'
        },
        initialize: function () {
            this.$el.off('tb_init tb_new_row')
                    .on('tb_init', this.init.bind(this))
                    .on('tb_init', this.newRowAvailable.bind(this));
        },
        init: function (e) {
            api.Mixins.Builder.rowSort(this.$el);
            if (api.mode === 'visual') {
                api.Mixins.Builder.updateModuleSort(this.$el);
                setTimeout(function () {
                    api.Utils._onResize(true);
                }, 1500);
            }
            else {
                api.Mixins.Builder.updateModuleSort(this.$el);
                api.Mixins.Builder.initModuleDraggable(api.toolbar.$el.find('.tb_module_panel_modules_wrap').first(), '.tb_module');
                api.Mixins.Builder.initModuleDraggable(api.toolbar.$el, '.tb_row_grid');
            }
            var self = this;
            setTimeout(function () {
                api.ActionBar.init();
                api.Utils.setCompactMode(self.el.getElementsByClassName('module_column'));
                self.insertLayoutButton();
                api.GS.init();
            }, 1000);
            generatedIds = {};
        },
        render: function () {
            var container = document.createDocumentFragment(),
                    rows = this.collection;
            api.Utils.clearLastEmptyRow(rows.models);
            for (var i = 0,len=rows.models.length; i < len; ++i) {
                var rowView = api.Views.init_row(rows.models[i]);
                if (rowView !== false) {
                    container.appendChild(rowView.view.render().el);
                }
            }
            this.el.appendChild(container);
            api.Utils.columnDrag(false, false);
            return this;
        },
        insertLayoutButton: function () {
            this.removeLayoutButton();
            this.lastRowAddBtn();
            var row = this.el.getElementsByClassName('module_row');
            if (row.length < 2 && row[0] !== undefined && row[0].classList.contains('tb_row_empty')) {
                var importBtn = document.createElement('a');
                importBtn.className = 'tb_import_layout_button';
                importBtn.href = '#';
                importBtn.textContent = themifyBuilder.i18n.text_import_layout_button;
                this.el.appendChild(importBtn);
            }

        },
        removeLayoutButton: function () {
            var importBtn = this.el.getElementsByClassName('tb_import_layout_button');
            for (var i = importBtn.length - 1; i > -1; --i) {
                importBtn[i].parentNode.removeChild(importBtn[i]);
            }
        },
        importLayoutButton: function (e) {
            api.Views.Toolbar.prototype.loadLayout(e);
        },
        newRowAvailable: function (col, force) {
            var child = this.el.children,
                    isEmpty = true,
                    len = child.length;
            col = col || 1;
            if (len !== 0 && force !== true) {
                for (var i = len - 1; i > -1; --i) {
                    if (child[i].classList.contains('module_row')) {
                        isEmpty = false;
                        break;
                    }
                }
            }
            if (isEmpty === true) {
                var el = api.Views.init_row(api.Utils.grid(col)[0]).view.render().$el;
                el[0].className += ' tb_new_row';
                this.el.insertBefore(el[0], this.lastRow);
                api.Utils.setCompactMode(el[0].getElementsByClassName('module_column'));
                api.Mixins.Builder.update(el);
                if (api.mode === 'visual' && api.activeBreakPoint !== 'desktop') {
                    $('body', topWindow.document).height(document.body.scrollHeight);
                }
                return el;
            }
        },
        lastRowShowHide: function (show) {
            if (this.lastRow) {
                if (show) {
                    this.lastRow.classList.remove('hide');
                }
                else {
                    this.lastRow.classList.remove('expanded');
                    this.lastRow.classList.add('hide');
                }
            }
        },
        lastRowAddBtn: function () {
            var el = document.getElementById('tb_add_container');
            if (el !== null) {
                el.parentNode.removeChild(el);
            }
            this.lastRow = document.createElement('div');
            var btn = document.createElement('div'),
                    isInit = null;
            this.lastRow.id = 'tb_add_container';
            btn.className = 'tb_last_add_btn';
            btn.textContent = '+';
            this.lastRow.appendChild(btn);
            this.lastRow.addEventListener('click', function (e) {
                e.preventDefault();
                var target = e.target,
                        grid = target.closest('.tb_row_grid');
                if (grid !== null) {
                    this.classList.remove('expanded');
                    api.Mixins.Builder.rowDrop(api.Utils.grid(grid.dataset['col']), $('<div>').insertBefore(this), true, true);
                }
                else if (target.classList.contains('tb_add_blocks')) {
                    this.classList.remove('expanded');
                    api.toolbar.common.show(e, $(this).find('.tb_last_add_btn'));
                    api.toolbar.common.clicked = this.previousElementSibling ? $(this.previousElementSibling) : null;
                    api.toolbar.common.btn[0].querySelector('[data-target="tb_module_panel_rows_wrap"]').click();
                }
                else if (target.classList.contains('tb_last_add_btn')) {
                    if (isInit === null) {
                        isInit = true;
                        var tpl_id = 'tmpl-last_row_add_btn',
                                t = Common.is_template_support ? document.getElementById(tpl_id).content.cloneNode(true) : Common.templateCache.get(tpl_id);
                        Common.is_template_support ? this.appendChild(t) : this.insertAdjacentHTML('beforeend', t);
                    }
                    this.classList.add('expanded');
                }
            });
            btn = null;
            this.el.appendChild(this.lastRow);
        }
    });

    api.Mixins.Builder = {
        before: null,
        zindex: null,
        r: null,
        w: null,
        h: null,
        type: null,
        moduleHolderArgs: null,
        isFullWidth:null,
        update: function (el) {
            if (api.mode === 'visual') {
                var type = api.activeModel !== null ? api.activeModel.get('elType') : api.Models.Registry.lookup(el.data('cid')).get('elType');
                api.Utils.loadContentJs(el, type);
            }
            // api.Mixins.Builder.columnSort(el);
            var row = el.closest('.module_row');
            api.Utils.columnDrag(row.find('.row_inner'), false);
            api.Utils.columnDrag(row.find('.subrow_inner'), false);
            api.Mixins.Builder.updateModuleSort(row);
        },
        dragScroll: function (type, off) {
            var body = $('body', topWindow.document);
            if (api.mode === 'visual') {
                body = body.add(Themify.body);
            }
            if (this.top === undefined) {
                this.top = api.toolbar.$el;
                this.top = this.top.add($('#tb_fixed_bottom_scroll', topWindow.document));
                if (api.mode !== 'visual') {
                    this.top = this.top.add('#wpadminbar');
                }
            }
            if (off === true) {
                this.top.off('mouseenter mouseleave');
                if (type === 'row' && api.mode === 'visual') {
                    api.toolbar.$el.find('.tb_zoom[data-zoom="100"]').trigger('click');
                }
                body.removeClass('tb_drag_start tb_drag_' + type);
                return;
            }
            var scrollEl = null,
                    step = 50,
                    isScrol = null,
                    move = true,
                    k = 1;
            if (api.mode !== 'visual') {
                scrollEl = $('.edit-post-layout__content').first();
                if (scrollEl.length === 0) {
                    scrollEl = null;
                }
                else {
                    step /= 2;
                }
            }
            if (scrollEl === null) {
                scrollEl = api.activeBreakPoint === 'desktop' ? $('body,html') : $('body,html', topWindow.document);
            }
            function onDragScroll(e, id) {
                move = true;
                if (isScrol === null) {
                    isScrol = true;
                    var scrolId = this !== undefined ? this.id : null;
                    if (!scrolId) {
                        scrolId = id;
                    }
                    var scroll = scrolId === 'tb_toolbar' || scrolId === 'wpadminbar' ? '-' : '+';
                    scroll += '=' + step * k + 'px';
                    scrollEl.stop().animate({
                        scrollTop: scroll
                    }, {
                        duration: 500,
                        complete: function () {
                            if (move === true) {
                                if (k < 10) {
                                    ++k;
                                }
                                isScrol = null;
                                onDragScroll(null, scrolId);
                            }
                        }
                    });
                }
            }
            body.addClass('tb_drag_start tb_drag_' + type);
            if (type === 'row' && api.mode === 'visual') {
                api.toolbar.$el.find('.tb_zoom[data-zoom="50"]').trigger('click');
            }
            if (step > 0) {
                this.top.off('mouseenter').on('mouseenter', onDragScroll).off('mouseleave').on('mouseleave', function () {
                    k = 1;
                    isScrol = move = null;
                    scrollEl.stop();
                });
            }
        },
        columnSort: function (el) {
            var before,
                    colums;
            el.find('.row_inner, .subrow_inner').sortable({
                items: '> .module_column',
                handle: '> .tb_column_action .tb_column_dragger',
                axis: 'x',
                placeholder: 'tb_state_highlight',
                tolerance: 'pointer',
                cursorAt: {
                    top: 20,
                    left: 20
                },
                beforeStart: function (e, el, ui) {
                    Themify.body.addClass('tb_drag_start');
                    before = Common.clone(ui.item.closest('.module_row'));
                    colums = ui.item.siblings();
                    colums.css('marginLeft', 0);
                },
                start: function (e, ui) {
                    $('.tb_state_highlight').width(ui.item.width());
                },
                stop: function (e, ui) {
                    Themify.body.removeClass('tb_drag_start');
                    colums.css('marginLeft', '');
                },
                update: function (e, ui) {
                    var inner = ui.item.closest('.ui-sortable'),
                            children = inner.children('.module_column');
                    children.removeClass('first last');
                    if (inner[0].classList.contains('direction-rtl')) {
                        children.last().addClass('first');
                        children.first().addClass('last');
                    }
                    else {
                        children.first().addClass('first');
                        children.last().addClass('last');
                    }
                    api.Utils.columnDrag(inner, false);
                    api.Utils.setCompactMode(children);
                    var row = inner.closest('.module_row');
                    api.undoManager.push(row.data('cid'), before, row, 'row');
                }
            });
        },
        rowSort: function ($el) {
            var self = this,
                    before_next,
                    rowSortable = {
                        items: '>.module_row',
                        handle: '>.tb_row_action',
                        axis: 'y',
                        placeholder: 'tb_state_highlight',
                        containment: api.mode === 'visual' ? 'parent' : 'body',
                        tolerance: 'pointer',
                        forceHelperSize: true,
                        forcePlaceholderSize: true,
                        scroll: false,
                        beforeStart: function (e, el, ui) {
                            if (!self.before) {
                                api.ActionBar.hoverCid=null;
                                api.ActionBar.disable=true;
                                before_next = true;
                                self.before = ui.item.next('.module_row');
                                if (self.before.length === 0) {
                                    self.before = ui.item.prev('.module_row');
                                    before_next = false;
                                }
                                self.before = self.before.data('cid');
                                self.dragScroll('row');
                            }
                        },
                        start: function () {
                            $el.sortable('refreshPositions');
                        },
                        stop: function (e, ui) {
                            api.ActionBar.disable=null;
                            self.before = before_next = null;
                            self.dragScroll('row', true);
                        },
                        update: function (e, ui) {
                            if (api.mode === 'visual' && !ui.item[0].classList.contains('tb_row_grid')) {
                                var body = api.activeBreakPoint === 'desktop' ? $('html,body') : $('body', topWindow.document);
                                body.scrollTop(ui.item.offset().top);
                                body = null;
                            }
                            if (e.type === 'sortupdate' && self.before) {
                                api.hasChanged = true;
                                var after = ui.item.next('.module_row'),
                                        after_next = true;
                                if (after.length === 0) {
                                    after = ui.item.prev('.module_row');
                                    before_next = after_next = false;
                                }
                                after = after.data('cid');
                                api.undoManager.push(ui.item.data('cid'), null, null, 'row_sort', {bnext: before_next, 'before': self.before, 'anext': after_next, 'after': after});
                            }
                            else if (ui.item[0].classList.contains('predesigned_row') || ui.item[0].classList.contains('tb_page_break_module') || ui.item.data('type') === 'row') {
                                if (ui.item.data('type') === 'row') {
                                    api.toolbar.libraryItems.get(ui.item.data('id'), 'row', function ($row) {
                                        if (!Array.isArray($row)) {
                                            $row = new Array($row);
                                        }
                                        self.rowDrop($row, ui.item);
                                    });
                                } else if (ui.item[0].classList.contains('tb_page_break_module')) {
                                    self.rowDrop(api.toolbar.pageBreakModule.get(), ui.item);
                                    api.toolbar.pageBreakModule.countModules();
                                }
                                else {
                                    api.toolbar.preDesignedRows.get(ui.item.data('slug'), function (data) {
                                        self.rowDrop(data, ui.item);
                                    });
                                }
                            }
                            else if (ui.item[0].classList.contains('tb_row_grid')) {
                                self.subRowDrop(ui.item.data('slug'), ui.item);
                            }
                        }
                    };
            if ('visual' === api.mode) {
                rowSortable.helper = function () {
                    return $('<div class="tb_sortable_helper"/>');
                };
            }

            $el.sortable(rowSortable);
            //this.columnSort(this.$el);
        },
        updateModuleSort: function (context, disable) {
            if (undefined !== themifyBuilder.globalStyleData) {
                return;
            }
            var items = $('.tb_holder', context),
                    self = this;
            if (disable) {
                items.sortable(disable);
                return false;
            }
            items.each(function () {
                $(this).data({uiSortable: null, sortable: null});
            });
            this.moduleHolderArgs = {
                placeholder: 'tb_state_highlight',
                items: '>.active_module,>div>.active_module',
                connectWith: '.tb_holder',
                revert: 100,
                scroll: false,
                cancel: '.tb_disable_sorting,.tb_action_wrap:not(.tb_subrow_action)',
                cursorAt: {
                    top: 10,
                    left: 90
                },
                beforeStart: function (e, el, ui) {
                    api.ActionBar.disable=true;
                    api.ActionBar.hoverCid=null;
                    if (!self.before) {
                        self.r = ui.item.closest('.module_row');
                        if (self.r.length > 0) {
                            self.before = Common.clone(self.r);
                            self.zindex = self.r.css('zIndex');
                            if (self.zindex === 'auto') {
                                self.zindex = '';
                            }
                            self.r.css('zIndex', 2);
                        }
                        else {
                            self.r = null;
                        }
                        self.w = ui.item[0].style['width'];
                        self.h = ui.item[0].style['height'];
                        ui.item.css({'width': 180, 'height': 30});
                        self.type = 'module';
                        if (ui.item[0].classList.contains('module_subrow')) {
                            self.type += ' tb_drag_subrow';
                        }
                        else if (ui.item[0].classList.contains('tb_row_grid')) {
                            self.type = 'column';
                        }
                        self.dragScroll(self.type);
                    }
                },
                start: function (e, ui) {
                    if (ui.item[0].classList.contains('module_subrow') || ui.item[0].classList.contains('tb_row_grid')) {
                        $('.tb_subrow_holder').sortable('disable');
                        $('.tb_holder').sortable('refresh');
                    }
                },
                stop: function (e, ui) {
                    api.ActionBar.disable=null;
                    api.ActionBar.clear();
                    if ('visual' === api.mode && ui.helper) {
                        $(ui.helper).remove();
                    }
                    ui.item.css({width: self.w, height: self.h,'display':''});
                    self.dragScroll(self.type, true);
                    if (self.r) {
                        self.r.css('zIndex', self.zindex);
                    }
                    if (ui.item[0].classList.contains('module_subrow') || ui.item[0].classList.contains('tb_row_grid')) {
                        $('.tb_subrow_holder').sortable('enable');
                        $('.tb_holder').sortable('refresh');
                    }
                    self.before = self.w = self.h = self.r = self.zindex = self.type = null;
                },
                update: function (e, ui) {
                    ui.item.css({width: self.w, height: self.h});
                    if (ui.item[0].classList.contains('tb_module_dragging_helper')) {
                        var item = $(ui.item.clone(false));
                        if (ui.item.data('id')) {
                            var r = ui.item.closest('.module_row');
                            if (r.length > 0) {
                                self.before = Common.clone(r);
                                self.before.find('.tb_module_dragging_helper').remove();
                            }
                            r = null;
                        }
                        ui.item.after(item);
                        self.moduleDrop(item, null, self.before);
                    }
                    else {
                        if (ui.sender) {
                            var row = ui.sender.closest('.module_row');
                            ui.sender.closest('.module_row').toggleClass('tb_row_empty', row.find('.active_module').length === 0);
                            row = null;
                            var sub = ui.sender.closest('.module_subrow');
                            if (sub.length > 0) {
                                sub.toggleClass('tb_row_empty', sub.find('.active_module').length === 0);
                            }
                            sub = null;
                            // Make sub_row only can nested one level
                            if (ui.item[0].classList.contains('module_subrow') && ui.item.parent().closest('.module_subrow').length > 0) {
                                items.sortable('cancel');
                                return;
                            }
                        }
                        if (self.before) {
                            api.hasChanged = true;
                            if (!ui.item[0].classList.contains('module_subrow')) {
                                ui.item.closest('.module_subrow').removeClass('tb_row_empty');
                            }
                            var moved_row = ui.item.closest('.module_row');
                            moved_row.removeClass('tb_row_empty');
                            api.undoManager.push(ui.item.data('cid'), self.before, moved_row, 'sort', {'before': self.before.data('cid'), 'after': moved_row.data('cid')});
                            self.before = null;
                            Themify.body.triggerHandler('tb_' + self.type + '_sort', [ui.item]);
                        }
                    }

                }
            };
            if ('visual' === api.mode) {
                this.moduleHolderArgs.helper = function () {
                    return $('<div class="tb_sortable_helper"/>');
                };
            }
            items.sortable(this.moduleHolderArgs);
        },
        initModuleDraggable: function (parent, cl) {
            var self = this,
                    args = $.extend(true, {}, this.moduleHolderArgs);
            args['update'] = false;
            args['appendTo'] = document.body;
            args['items'] = cl;
            if (cl === '.tb_row_grid') {
                args['connectWith'] = [args['connectWith'], (api.mode === 'visual' ? '#themify_builder_content-' + themifyBuilder.post_ID : '#tb_row_wrapper')];
            }
            args['stop'] = function (e, ui) {
                $(this).sortable('cancel');
                ui.item.removeClass('tb_sortable_helper tb_module_dragging_helper');
                self.moduleHolderArgs.stop(e, ui);
                if (ui.item[0].classList.contains('tb_row_grid')) {
                    parent.sortable('refresh');
                }
            };
            args['start'] = function (e, ui) {
                ui.item.addClass('tb_sortable_helper tb_module_dragging_helper');
                self.moduleHolderArgs.start(e, ui);
                if (ui.item[0].classList.contains('tb_row_grid')) {
                    parent.sortable('refresh');
                }
            };
            args['helper'] = function (e, ui) {
                return $('<div class="tb_sortable_helper tb_module_dragging_helper">' + ui.text() + '</div>');
            };
            parent.sortable(args);
        },
        initRowDraggable: function (parent, cl) {
            var self = this;
            parent.find(cl).draggable({
                appendTo: Themify.body,
                helper: 'clone',
                revert: 'invalid',
                connectToSortable: api.mode === 'visual' ? '#themify_builder_content-' + themifyBuilder.post_ID : '#tb_row_wrapper',
                cursorAt: {
                    top: 10,
                    left: 40
                },
                start: function (e, ui) {
                    self.dragScroll('row');
                    ui.helper.addClass('tb_module_dragging_helper tb_sortable_helper').find('.tb_predesigned_rows_image').remove();
                },
                stop: function (e, ui) {
                    self.dragScroll('row', true);
                }
            });
        },
        initModuleVisualDrag: function (cl) {
            var self = this;
            api.toolbar.$el.find(cl).ThemifyDraggable({
                iframe: '#tb_iframe',
                dropitems: '.tb_holder',
                elements: '.active_module',
                type: 'module',
                onDragBefore:function(e,drag){
                    api.ActionBar.disable=true;
                },
                onDragEnd:function(){
                    api.ActionBar.disable=null;
                },
                onDrop: function (e, drag, drop) {
                    self.moduleDrop(drag, false, Common.clone(drop.closest('.module_row')));
                }
            });
        },
        initRowGridVisualDrag: function () {
            var self = this;
            api.toolbar.$el.find('.tb_row_grid').ThemifyDraggable({
                iframe: '#tb_iframe',
                dropitems: ".tb_holder:not('.tb_subrow_holder'),.themify_builder_content:not('.not_editable_builder')>.module_row",
                elements: '.active_module',
                cancel: '.tb_subrow_holder',
                append: false,
                type: 'column',
                onDragBefore:function(e,drag){
                    api.ActionBar.disable=true;
                },
                onDragEnd:function(){
                    api.ActionBar.disable=null;
                },
                onDrop: function (e, drag, drop) {
                    self.subRowDrop(drag.data('slug'), drag);
                }
            });
        },
        initRowVisualDrag: function (cl) {
            var self = this;
            api.toolbar.$el.find(cl).ThemifyDraggable({
                iframe: '#tb_iframe',
                dropitems: ".themify_builder_content:not('.not_editable_builder')>.module_row",
                append: false,
                type: 'row',
                onDragBefore:function(e,drag){
                    api.ActionBar.disable=true;
                    api.toolbar.$el.find('.tb_zoom[data-zoom="50"]').click();
                },
                onDragEnd:function(){
                    api.ActionBar.disable=null;
                },
                onDrop: function (e, drag, drop) {
                    drag.addClass('tb_state_highlight').find('.tb_predesigned_rows_image').remove();
                    drag.show();
                    api.Utils.setCompactMode(drag.offset().top);
                    if (drag.data('type') === 'row') {
                        api.toolbar.libraryItems.get(drag.data('id'), 'row', function ($row) {
                            if (!Array.isArray($row)) {
                                $row = new Array($row);
                                // Attach used GS to data
                                var usedGS = api.GS.findUsedItems($row);
                                if (usedGS.length) {
                                    $row[0].used_gs = usedGS;
                                }
                            }
                            self.rowDrop($row, drag);
                        });
                    } else if (drag[0].classList.contains('tb_page_break_module')) {
                        self.rowDrop(api.toolbar.pageBreakModule.get(), drag);
                        api.toolbar.pageBreakModule.countModules();
                    } else {
                        api.toolbar.preDesignedRows.get(drag.data('slug'), function (data) {
                            self.rowDrop(data, drag);
                        });
                    }
                }
            });
        },
        subRowDrop: function (data, drag) {
            api.ActionBar.clear();
            var is_row = drag.parent('.themify_builder_content,#tb_row_wrapper').length > 0;
            if (is_row || drag.closest('.sub_column').length === 0) {
                data = api.Utils.grid(data);
                var before,
                        type,
                        is_next;
                if (!is_row) {
                    before = Common.clone(drag.closest('.module_row'));
                    before.find('.tb_row_grid').remove();
                    type = 'row';
                }
                var row = is_row ? api.Views.init_row({cols: data[0].cols}) : api.Views.init_subrow({cols: data[0].cols}),
                        el = row.view.render().$el;
                if (is_row || drag[0].parentNode.classList.contains('tb_holder') || drag[0].parentNode.parentNode.classList.contains('tb_holder')) {
                    drag[0].parentNode.replaceChild(el[0], drag[0]);
                    el[0].className += ' tb_element_selected';
                    api.ActionBar.type = 'subrow';
                } else {
                    var holder = drag.next('.tb_holder');
                    if (holder.length > 0) {
                        holder.prepend(el);
                    } else {
                        holder = drag.prev('.tb_holder');
                        holder.append(el);
                    }
                }
                if (is_row) {
                    before = el.next('.module_row');
                    is_next = true;
                    if (before.length === 0) {
                        is_next = false;
                        before = el.prev('.module_row');
                    }
                    before = before.data('cid');
                    type = 'grid_sort';
                }
                api.Utils.setCompactMode(el[0].getElementsByClassName('module_column'));
                api.Mixins.Builder.update(el);
                drag.remove();
                api.hasChanged = true;
                var after = el.closest('.module_row');
                if (!is_row) {
                    after.removeClass('tb_row_empty');
                }
                after.find('.tb_row_grid').remove();
                api.Utils.scrollToDropped(el[0]);
                api.undoManager.push(after.data('cid'), before, after, type, {next: is_next});
            }
            else {
                drag.remove();
            }
        },
        rowDrop: function (data, drag, force, isEmpty) {
            api.ActionBar.clear();
            function callback() {
                var prev_row_id = drag.prev('.module_row'),
                        bid;
                if (prev_row_id.length === 0) {
                    bid = api.mode === 'visual' ? drag.closest('.themify_builder_content').data('postid') : null;
                    prev_row_id = false;
                }
                else {
                    prev_row_id = prev_row_id.data('cid');
                }
                drag[0].innerHTML = '';
                api.ActionBar.type = 'row';
                drag[0].parentNode.replaceChild(fragment, drag[0]);
                api.hasChanged = true;
                api.Instances.Builder[api.builderIndex].removeLayoutButton();
                api.undoManager.push('', '', '', 'predesign', {'prev': prev_row_id, 'rows': rows, 'bid': bid});
                for (var i = 0, len = rows.length; i < len; ++i) {
                    var col = rows[i][0].getElementsByClassName('module_column');
                    if (i === 0) {
                        rows[i][0].classList.add('tb_element_selected');
                    }
                    api.Utils.setCompactMode(col);
                    api.Mixins.Builder.update(rows[i]);
                }
                api.Utils.scrollToDropped(rows[0][0]);
                Common.showLoader('hide');
            }
            var checkEmpty = function (cols) {
                for (var i in cols) {
                    if ((cols[i].styling && Object.keys(cols[i].styling).length > 0) || (cols[i].modules && Object.keys(cols[i].modules).length > 0)) {
                        return true;
                    }
                }
                return false;
            },
                    fragment = document.createDocumentFragment(),
                    rows = [],
                    styles = [];
            if (!isEmpty) {
                api.Utils.clearLastEmptyRow(data);
            }
            for (var i = 0, len = data.length; i < len; ++i) {
                if (force === true || ((data[i].styling && Object.keys(data[i].styling).length > 0) || (data[i].cols && checkEmpty(data[i].cols)))) {
                    var row = api.Views.init_row(data[i]);
                    if (row !== false) {
                        var r = row.view.render();
                        fragment.appendChild(r.el);
                        if (api.mode === 'visual') {
                            var items = r.el.querySelectorAll('[data-cid]');
                            styles[r.el.dataset.cid] = 1;
                            for (var i = 0, len = items.length; i < len; ++i) {
                                styles[items[i].dataset.cid] = 1;
                            }
                        }
                        rows.push(r.$el);
                    }
                }
            }
            if (api.mode === 'visual') {
                api.bootstrap(styles, callback);
                styles = null;
            }
            else {
                callback();
            }
        },
        moduleDrop: function (drag, drop, before) {
            api.ActionBar.clear();
            var self = this;
            if (drag[0].classList.contains('tb_row_grid')) {
                self.subRowDrop(drag.data('slug'), drag);
                return;
            }
            var options = {mod_name: drag.data('module-slug')},
            type = drag.data('type'),
                    is_library = type === 'part' || type === 'module';
            if (is_library) {
                api.toolbar.libraryItems.get(drag.data('id'), type, callback);
            }
            else {
                return callback(options);
            }
            function callback(options) {
                var moduleView = api.Views.init_module(options, true),
                        module = moduleView.view.render();
                function final(new_module) {
                    if (!is_library) {
                        moduleView.model.set({is_new: 1}, {silent: true});
                    }
                    var settings = new_module === true ? moduleView.model.getPreviewSettings() : moduleView.model.get('mod_settings');

                    if (drop) {
                        if (drop.hasClass('tb_module_front')) {
                            drop.after(module.el);
                        } else {
                            drop.append(module.el);
                        }
                    }
                    else {
                        drag.replaceWith(module.el);
                    }
                    if (is_library) {
                        api.activeModel = moduleView.model;
                    }
                    else {
                        moduleView.model.trigger('edit', null);
                    }
                    api.hasChanged = true;
                    var droppedID;
                    if (api.mode === 'visual' && Object.keys(settings).length >=1 && 'layout-part' !== moduleView.model.get('mod_name')) {
                        droppedID = settings.cid;
                        if (type === 'part' || drag.data('type') === 'ajax') {
                            var pComponent_added = true;
                            moduleView.model.trigger('custom:preview:refresh', settings);
                        }
                        else if (type !== 'module') {
                            moduleView.model.trigger('custom:preview:live', settings);
                        }
                        else {
                            api.Utils.loadContentJs(module.$el, 'module');
                        }
                    }
                    if (is_library) {
                        if (pComponent_added) {
                            var pComponent = moduleView.view.$el.find('.tb_preview_component').detach();
                            moduleView.view.$el.prepend(pComponent);
                        }
                        if (before) {
                            var after = module.$el.closest('.module_row');
                            after.removeClass('tb_row_empty').find('.tb_module_dragging_helper').remove();
                            module.$el.closest('.module_subrow').removeClass('tb_row_empty');
                            api.undoManager.push(after.data('cid'), before, after, 'row');
                            droppedID = after.data('cid');
                            api.Instances.Builder[api.builderIndex].removeLayoutButton();
                            api.activeModel = null;
                        }
                    }
                    api.Utils.scrollToDropped(null, droppedID);
                }
                if (api.mode === 'visual' && is_library) {
                    var dataa = new Array();
                    dataa[moduleView.model.cid] = 1;
                    api.bootstrap(dataa, final);
                } else {
                    final(true);
                }
                return module;
            }
            // Add WP editor placeholder
            if (api.mode !== 'visual') {
                $('.themify-wp-editor-holder').addClass('themify-active-holder');
            }

        },
        toJSON: function (el) {
            var option_data = [],
                rows = el.children;
            for (var i = 0, len = rows.length; i < len; ++i) {
                if (rows[i].classList.contains('module_row')) {
                    var data = api.Utils._getRowSettings(rows[i]);
                    if (Object.keys(data).length > 0) {
                        option_data.push(data);
                    }
                }
            }
            return option_data;
        },
        columnHover:function(el){
            var mouseEnter = function(target){
                    var column = target.parentNode.closest('.module_column');
                    if(!column.classList.contains('tb_hover_sub_column')){
                        column.classList.add('tb_hover_sub_column');
                        var action = target.getElementsByClassName('tb_column_action')[0];
                        if(action!==undefined){
                            var box1 = action.getBoundingClientRect(),
                            remove=true,
                            r = box1.left<5?column.closest('.module_row').getElementsByClassName('tb_row_action')[0]:target.closest('.module_subrow').getElementsByClassName('tb_subrow_action')[0];
                            if(r!==undefined){
                                var box2=r.getBoundingClientRect();
                                remove=Math.abs((box1.left-box2.left))<box1.width? Math.abs((box2.top-box1.top))>box1.height:true;
                            }
                            if(remove===true){
                                action.classList.remove('tb_action_overlap');
                            }
                            else{
                                action.classList.add('tb_action_overlap');
                            }
                        }
                    }
                };

                var subColumn=el.closest('.sub_column'),
                    items = api.Instances.Builder[api.builderIndex].el.getElementsByClassName('tb_hover_sub_column');
                for(var i=items.length-1;i>-1;--i){
                    items[i].classList.remove('tb_hover_sub_column');
                }
                items=api.Instances.Builder[api.builderIndex].el.getElementsByClassName('tb_action_overlap');
                for(var i=items.length-1;i>-1;--i){
                    items[i].classList.remove('tb_action_overlap');
                }
                items=null;
                if(subColumn!==null){
                    mouseEnter(subColumn);
                }
                if(this.isFullWidth!==true){
                    var column=subColumn!==null?subColumn.parentNode.closest('.module_column'):el.closest('.module_column'),
                        row;
                    if(this.isFullWidth!==false){
                        row = column!==null?column.closest('.module_row'):el.closest('.module_row');
                        if(row!==null){
                            if(row.offsetWidth<document.body.clientWidth){
                                this.isFullWidth=true;
                                document.body.classList.remove('tb_page_row_fullwidth');
                            }
                            else{
                                this.isFullWidth=false;
                                document.body.classList.add('tb_page_row_fullwidth');
                            }
                            row=null;
                        }
                    }
                    if(column!==null && column.parentNode.parentNode.closest('.fullwidth')!==null){
                        var columnAction=column.getElementsByClassName('tb_column_action')[0];
                        if(columnAction!==undefined && columnAction.getBoundingClientRect().right>=document.body.clientWidth){
                           columnAction.classList.add('tb_action_outside');
                        }
                    }
                }
        }
    };

    api.undoManager = {
        stack: [],
        is_working: false,
        index: -1,
        btnUndo: null,
        btnRedo: null,
        compactBtn: null,
        init: function () {
            this.btnUndo = api.toolbar.el.getElementsByClassName('tb_undo_btn')[0];
            this.btnRedo = api.toolbar.el.getElementsByClassName('tb_redo_btn')[0];
            this.compactBtn = api.toolbar.el.getElementsByClassName('tb_compact_undo')[0];
            api.toolbar.$el.find('.tb_undo_redo').on('click', this.do_change.bind(this));
            if (!themifyBuilder.disableShortcuts) {
                $(topWindow.document).on('keydown', this.keypres.bind(this));
                if (api.mode === 'visual') {
                    $(document).on('keydown', this.keypres.bind(this));
                }
            }
        },
        push: function (cid, before, after, type, data) {
            if (api.hasChanged) {
                api.editing = false;
                if (after) {
                    after = Common.clone(after);
                }
                if (api.mode === 'visual' && (type === 'duplicate' || type === 'sort')) {
                    $(window).triggerHandler('tfsmartresize.tfVideo');
                }
                this.stack.splice(this.index + 1, this.stack.length - this.index);
                this.stack.push({'cid': cid, 'type': type, 'data': data, 'before': before, 'after': after});
                this.index = this.stack.length - 1;
                this.updateUndoBtns();
                if (api.mode === 'visual') {
                    api.Forms.LayoutPart.isSaved = null;
                    Themify.body.triggerHandler('builder_dom_changed', [type])
                }
            }
        },
        set: function (el) {
            var batch = el[0].querySelectorAll('[data-cid]');
            batch = Array.prototype.slice.call(batch);
            batch.unshift(el[0]);
            for (var i = 0, len = batch.length; i < len; ++i) {
                var model = api.Models.Registry.lookup(batch[i].getAttribute('data-cid'));
                if (model) {
                    model.trigger('change:view', batch[i]);
                }
            }
        },
        doScroll: function (el) {
            //todo
            return el;
            var offset = 0,
                    body = api.mode !== 'visual' || api.activeBreakPoint === 'desktop' ? $('html,body') : $('body', topWindow.document);
            if (api.mode === 'visual') {
                var fixed = $('#headerwrap');
                offset = 40;
                if (fixed.length > 0) {
                    offset += fixed.outerHeight();
                }
            }
            body.scrollTop(el.offset().top - offset);
            return el;
        },
        keypres: function (e) {
            // Redo
            if (90 === e.which && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                if ((true === e.ctrlKey && true === e.shiftKey) || (true === e.metaKey && true === e.shiftKey)) {
                    e.preventDefault();
                    if (this.hasRedo()) {
                        this.changes(false);
                    }
                } else if (true === e.ctrlKey || true === e.metaKey) { // UNDO
                    e.preventDefault();
                    if (this.hasUndo()) {
                        this.changes(true);
                    }
                }
            }
        },
        changes: function (is_undo) {
            var index = is_undo ? 0 : 1;
                if(api.activeModel!==null){
                    if(api.hasChanged===true){
                        ThemifyConstructor.saveComponent(false);
                        $(this.btnUndo).triggerHandler('click');
                        return;
                    }
                    else{
                        Common.Lightbox.close();
                    }
                }
            var stack = this.stack[this.index + index];
            if (stack !== undefined) {
                this.is_working = true;

                var el = '',
                        type = stack['type'],
                        item = $('.tb_element_cid_' + stack['cid']),
                        comon = Common,
                        cid = false;
                api.eventName = type;
                if (type === 'row') {
                    if (is_undo) {
                        el = comon.clone(stack.before);
                        cid = stack['cid'];
                    }
                    else {
                        el = comon.clone(stack.after);
                        cid = stack.before.data('cid');
                        item = $('.tb_element_cid_' + cid);
                    }
                    this.doScroll(item);
                    this.set(el);
                    el.toggleClass('tb_row_empty', el.find('.active_module').length === 0);
                    item.replaceWith(el);
                }
                else if (type === 'duplicate') {
                    if (is_undo) {
                        this.doScroll($('.tb_element_cid_' + stack.after.data('cid'))).remove();
                    }
                    else {
                        this.doScroll(item);
                        el = comon.clone(stack.after);
                        cid = stack.before.data('cid');
                        this.set(el);
                        item.after(el);
                    }
                }
                else if (type === 'delete_row') {
                    if (!is_undo) {
                        this.doScroll(item).remove();
                    }
                    else {
                        el = comon.clone(stack.before);
                        cid = stack['cid'];
                        var position = $('.tb_element_cid_' + stack.data.pos_cid);
                        this.doScroll(position);
                        this.set(el);
                        if (stack.data.pos === 'after') {
                            position.after(el);
                        }
                        else {
                            position.before(el);
                        }
                    }

                }
                else if (type === 'sort') {
                    cid = stack['cid'];
                    var before;
                    if (is_undo) {
                        before = stack.data['before'];
                        el = comon.clone(stack.before);
                    }
                    else {
                        before = stack.data['after'];
                        el = comon.clone(stack.after);
                        if (api.mode === 'visual') {
                            el.find('.active_module').css({'display': 'block', 'height': 'auto'});
                        }
                    }
                    this.doScroll(el);
                    this.set(el);
                    var old_el = $('.tb_element_cid_' + cid).closest('.module_row');
                    $('.tb_element_cid_' + cid).remove();
                    old_el.toggleClass('tb_row_empty', old_el.find('.active_module').length === 0);
                    old_el = null;
                    $('.tb_element_cid_' + before).replaceWith(el);
                    var r = el.closest('.module_row');
                    r.toggleClass('tb_row_empty', r.find('.active_module').length === 0);
                    r = null;
                }
                else if (type === 'row_sort') {
                    cid = stack['cid'];
                    var is_next = stack.data[is_undo ? 'bnext' : 'anext'],
                            el2 = $('.tb_element_cid_' + stack.data[is_undo ? 'before' : 'after']),
                            item = $('.tb_element_cid_' + cid);
                    el = comon.clone(item);
                    item.remove();
                    item = null;
                    this.set(el);
                    if (is_next) {
                        el2.before(el);
                    }
                    else {
                        el2.after(el);
                    }
                    this.doScroll(el);
                }
                else if (type === 'save') {
                    var cid = stack['cid'],
                            model = api.Models.Registry.lookup(cid),
                            is_module = model.get('elType') === 'module',
                            k = is_module ? 'mod_settings' : 'styling';
                    if (is_module && stack.data.column) {
                        var r;
                        if (is_undo) {
                            r = $('.tb_element_cid_' + cid).closest('.module_row');
                            cid = false;
                            this.doScroll(item).remove();
                        }
                        else {
                            cid = stack.data.column.data('cid');
                            el = comon.clone(stack.data.column);
                            item = $('.tb_element_cid_' + cid);
                            this.doScroll(item);
                            this.set(el);
                            item.replaceWith(el);
                            r = el.closest('.module_row');
                        }
                        r.toggleClass('tb_row_empty', r.find('.active_module').length === 0);
                        r = null;
                    }
                    else {
                        this.doScroll(item);
                        var settings = {};
                        if (is_undo) {
                            el = comon.clone(stack.before);
                            settings[k] = stack.data.bsettings;
                        }
                        else {
                            el = comon.clone(stack.after);
                            settings[k] = stack.data.asettings;
                        }
                        if (api.mode === 'visual') {
                            var styles = $.extend(true, {}, stack.data.styles);
                            for (var bp in styles) {
                                var stylesheet = ThemifyStyles.getSheet(bp),
                                        rules = stylesheet.cssRules ? stylesheet.cssRules : stylesheet.rules;

                                for (var i in styles[bp]) {
                                    if (rules[i]) {
                                        for (var j in styles[bp][i]) {
                                            var prop = j === 'backgroundClip' || j === 'background-clip' ? 'WebkitBackgroundClip' : j;
                                            rules[i].style[prop] = is_undo ? styles[bp][i][j].b : styles[bp][i][j].a;
                                        }
                                    }
                                }
                            }
                        }
                        model.set(settings, {silent: true});
                        settings = null;
                        this.set(el);
                        item.replaceWith(el);
                    }
                }
                else if (type === 'predesign') {

                    var rows = stack.data.rows;
                    if (is_undo) {
                        this.doScroll($('.tb_element_cid_' + rows[0].data('cid')));
                        for (var i = 0, len = rows.length; i < len; ++i) {
                            $('.tb_element_cid_' + rows[i].data('cid')).remove();
                        }
                    }
                    else {
                        var fragment = document.createDocumentFragment(),
                                el = [];
                        for (var i = 0, len = rows.length; i < len; ++i) {
                            var row = comon.clone(rows[i]);
                            fragment.appendChild(row[0]);
                            el.push(row);
                        }
                        if (stack.data.prev !== false) {
                            this.doScroll($('.tb_element_cid_' + stack.data.prev)).after(fragment);
                        }
                        else {
                            this.doScroll((api.mode === 'visual' ? $('#themify_builder_content-' + stack.data.bid) : $('#tb_row_wrapper'))).prepend(fragment);
                        }
                        for (var i = 0, len = el.length; i < len; ++i) {
                            this.set(el[i]);
                            api.Mixins.Builder.update(el[i]);
                        }
                    }
                }
                else if (type === 'import') {
                    var $builder = $('[data-postid="' + stack.data.bid + '"]'),
                            $elements = is_undo ? stack.data.before : stack.data.after,
                            self = this;
                    $elements = comon.clone($elements);
                    $builder.children().remove();
                    $builder.prepend($elements);
                    $elements.each(function () {
                        self.set($(this));
                    });
                }
                else if (type === 'grid_sort') {
                    if (is_undo) {
                        $('.tb_element_cid_' + stack['cid']).remove();
                    }
                    else {
                        var next = $('.tb_element_cid_' + stack.before),
                                el = comon.clone(stack.after),
                                cid = stack['cid'];
                        if (stack.data.next) {
                            next.before(el);
                        }
                        else {
                            next.after(el);
                        }
                        this.set(el);
                    }
                }
                if (cid) {
                    api.ActionBar.hoverCid=null;
                    api.Mixins.Builder.update($(el));
                }
                if (is_undo) {
                    --this.index;
                }
                else {
                    ++this.index;
                }
                this.is_working = false;
                this.updateUndoBtns();
                api.toolbar.pageBreakModule.countModules();
            }
        },
        hasRedo: function () {
            return this.index < (this.stack.length - 1);
        },
        hasUndo: function () {
            return this.index !== -1;
        },
        disable: function () {
            this.btnUndo.classList.add('tb_disabled');
            this.btnRedo.classList.add('tb_disabled');
            this.compactBtn.classList.add('tb_disabled');
        },
        updateUndoBtns: function () {
            var undo = this.hasUndo(),
                    redo = this.hasRedo();
            if (undo) {
                this.btnUndo.classList.remove('tb_disabled');
            }
            else {
                this.btnUndo.classList.add('tb_disabled');
            }
            if (redo) {
                this.btnRedo.classList.remove('tb_disabled');
            }
            else {
                this.btnRedo.classList.add('tb_disabled');
            }
            if (undo || redo) {
                this.compactBtn.classList.remove('tb_disabled');
            }
            else {
                this.compactBtn.classList.add('tb_disabled');
            }
        },
        reset: function () {
            this.stack = [];
            this.index = -1;
            this.updateUndoBtns();
        },
        do_change: function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (this.is_working === false && !e.currentTarget.classList.contains('tb_disabled')) {
                this.changes(e.currentTarget.classList.contains('tb_undo_btn'));
            }
        }
    };
    api.Views.Toolbar = Backbone.View.extend({
        events: {
            // Import
            'click .tb_import': 'import',
            // Layout
            'click .tb_load_layout': 'loadLayout',
            'click .tb_save_layout': 'saveLayout',
            // Duplicate
            'click .tb_dup_link': 'duplicate',
            'click .tb_toolbar_save': 'save',
            'click .tb_toolbar_backend_edit a': 'save',
            'click .tb_toolbar_close_btn': 'panelClose',
            'click .tb_breakpoint_switcher': 'breakpointSwitcher',
            'click .tb_popular_devices li': 'deviceSwitcher',
            'change .tb_change_mode input':'modChange',
            'click .tb_float_minimize': 'minimize',
            'click .tb_float_close': 'closeFloat',
            'click .tb_toolbar_add_modules': 'openFloat',
            // Custom CSS
            'click .tb_custom_css': 'addCustomCSS',
            // Zoom
            'click .tb_zoom': 'zoom',
            'click .tb_toolbar_zoom_menu_toggle': 'zoom',
            'click .tb_toolbar_builder_preview': 'previewBuilder',
            'click .js-tb_module_panel_acc': 'toggleAccordion'
        },
        lightboxStorageKey: 'tb_module_panel',
        render: function () {
            var that = this,
                    containers = {};
            for (var slug in themifyBuilder.modules) {
                var outer = document.createElement('div'),
                        module = document.createElement('div'),
                        favorite = document.createElement('span'),
                        name = document.createElement('strong'),
                        add = document.createElement('a');
                outer.className = 'tb_module_outer tb-module-' + slug;
                outer.dataset['categories'] = themifyBuilder.modules[slug].category;
                if (themifyBuilder.modules[slug].favorite) {
                    outer.className += ' favorited';
                }
                module.className = 'tb_module tb-module-type-' + slug;
                favorite.className = 'tb_favorite ti-star tb_disable_sorting';
                name.className = 'module_name';
                name.textContent = themifyBuilder.modules[slug].name;
                add.href = '#';
                add.className = 'add_module_btn tb_disable_sorting';
                add.dataset.type = 'module';
                add.title = themifyBuilder.i18n.add_module;
                module.dataset['moduleSlug'] = slug;
                if (themifyBuilder.modules[slug].type) {
                    module.dataset['type'] = themifyBuilder.modules[slug].type;
                }
                module.appendChild(favorite);
                module.appendChild(name);
                module.appendChild(add);
                outer.appendChild(module);
                var categories = themifyBuilder.modules[slug].favorite ? ['favorite'] : themifyBuilder.modules[slug].category;
                for (var k = 0, len = categories.length; k < len; ++k) {
                    if (containers[categories[k]] === undefined) {
                        containers[categories[k]] = document.createDocumentFragment();
                    }
                    containers[categories[k]].appendChild(outer.cloneNode(true));
                }
            }
            categories = this.el.getElementsByClassName('tb_module_category_content');
            for (var i = categories.length - 1; i >-1; --i) {
                var c = categories[i].getAttribute('data-category');
                if(c){
                    if(undefined !== containers[c]){
                        categories[i].appendChild(containers[c]);
                    }else{
                        categories[i].parentNode.style.display = 'none';
                    }
                }
            }
            categories = null;
            if (api.mode === 'visual') {
                topWindow.document.body.appendChild(this.el);
            }
            var callback = function () {
                that.Panel.init();
                api.undoManager.init();
                new SimpleBar(that.el.getElementsByClassName('tb_module_panel_modules_wrap')[0]);
                that.pageBreakModule.init();
                that.preDesignedRows.init();
                that.libraryItems.init();
                that.common.init();
                // Compact toolbar
                setTimeout(function () {
                    that.setMode();
                    that.help.init();
                    setTimeout(function () {
                        that.Revisions.init();
                    }, 1200);
                    if (api.mode === 'visual') {
                        api.Mixins.Builder.initModuleVisualDrag('.tb_module');
                        api.Mixins.Builder.initRowGridVisualDrag();
                    }
                }, 800);
                // Fire Module Favorite Toggle
                if (api.mode === 'visual') {
                    that.$el.on('click', '.tb_favorite', that.toggleFavoriteModule);
                    that.unload();
                }
                Themify.body.on('click', '.tb_favorite', that.toggleFavoriteModule);
                that.draggable();
                if (localStorage.getItem('tb_panel_closed') === 'true') {
                    that.closeFloat();
                }
                else {

                    that.Panel.setFocus();
                }
            };
            if (api.mode === 'visual') {
                topWindow.jQuery('body').one('themify_builder_ready', callback);
            }
            else {
                callback();
            }
        },
        setMode:function(){
            if(!localStorage.getItem('tb_mode')){
                api.ActionBar.isHoverMode=true;
                this.el.getElementsByClassName('tb_change_mode')[0].getElementsByClassName('tb-checkbox')[0].checked=true;
            }
            else{
                api.ActionBar.isHoverMode=null;
            }
            if(api.ActionBar.isInit===true){
                api.ActionBar.changeMode();
            }
        },
        modChange:function(e){
            e.stopPropagation();
            if(e.currentTarget.checked===true){
                localStorage.removeItem('tb_mode');
                api.ActionBar.isHoverMode=true;
            }
            else{
                localStorage.setItem('tb_mode', 1);
                api.ActionBar.isHoverMode=null;
            }
            api.ActionBar.clear();
            api.ActionBar.clearSelected();
            api.ActionBar.changeMode();
        },
        getStorage: function () {
            var lightboxStorage = localStorage.getItem(this.lightboxStorageKey);
            return lightboxStorage ? JSON.parse(lightboxStorage) : null;
        },
        updateStorage: function () {
            var $el = this.$el.find('#tb_module_panel'),
                    pos = $el.position(),
                    h = $el.outerHeight();

            if (h <= 0) {
                var st = this.getStorage();
                h = st ? st['height'] : '';
            }
            var obj = {
                top: pos.top,
                left: pos.left,
                width: $el.outerWidth(),
                height: h
            };
            localStorage.setItem(this.lightboxStorageKey, JSON.stringify(obj));
        },
        getPanelClass: function (w) {
            var cl;
            if (w <= 195) {
                cl = 'tb_float_xsmall';
            }
            else if (w <= 270) {
                cl = 'tb_float_small';
            }
            else if (w <= 400) {
                cl = 'tb_float_medium';
            }
            else {
                cl = 'tb_float_large';
            }
            return cl;
        },
        _setResponsiveTabs: function (cl) {

            var tabs = api.toolbar.el.getElementsByClassName('tb_module_types');
            for (var i = tabs.length - 1; i > -1; --i) {
                if (cl === 'tb_float_xsmall') {
                    tabs[i].classList.add('tb_ui_dropdown_items');
                    tabs[i].parentNode.classList.add('tb_compact_tabs');
                }
                else {
                    tabs[i].classList.remove('tb_ui_dropdown_items');
                    tabs[i].parentNode.classList.remove('tb_compact_tabs');
                }
            }
        },
        resize: function () {
            var el = this.el.getElementsByClassName('tb_modules_panel_wrap')[0],
                    self = this,
                    x,
                    y,
                    height,
                    width,
                    smallW = 120,
                    maxW = 500,
                    items = el.getElementsByClassName('tb_resizable'),
                    activeCl,
                    axis,
                    minHeight = 50,
                    maxHeight = null,
                    _move = function (e) {
                        var w = x + width - e.clientX,
                                left = null;
                        if (axis === 'w' || axis === 'sw' || axis === 'nw') {
                            var old_w = el.style['width'];
                            left = (parseInt(el.style['left']) + parseInt(old_w) - w);
                        }
                        if (axis !== 'w') {
                            if (axis === 'y' || axis === '-y' || axis === 'sw' || axis === 'se' || axis === 'nw' || axis === 'ne') {
                                var h = axis === '-y' || axis === 'ne' || axis === 'nw' ? (y + height - e.clientY) : (height + e.clientY - y);
                                if (h >= minHeight && h <= maxHeight) {

                                    if (axis === '-y' || axis === 'ne' || axis === 'nw') {
                                        el.style['top'] = (parseInt(el.style['top']) + parseInt(el.style['height']) - h) + 'px';
                                    }
                                    el.style['height'] = h + 'px';
                                }

                            }
                            if (axis !== 'sw' && axis !== 'nw') {
                                w = width + e.clientX - x;
                            }
                        }
                        if (axis !== 'y' && axis !== '-y') {
                            if (w > maxW || w < smallW) {
                                old_w = w;
                                w = w < smallW ? smallW : maxW;
                                if (left !== null) {
                                    left = left + old_w - w;
                                }
                            }
                            if (left !== null) {
                                el.style['left'] = left + 'px';
                            }
                            el.style['width'] = w + 'px';
                            var current = self.getPanelClass(w);
                            if (activeCl !== current) {
                                if (activeCl) {
                                    el.classList.remove(activeCl);
                                }
                                el.classList.add(current);
                                activeCl = current;
                                self._setResponsiveTabs(current);
                            }

                        }
                    },
                    _stop = function () {
                        topWindow.document.body.classList.remove('tb_start_animate');
                        topWindow.document.body.classList.remove('tb_panel_resize');
                        topWindow.document.removeEventListener('mousemove', _move, {passive: true});
                        topWindow.document.removeEventListener('mouseup', _stop, {passive: true});
                        x = width = axis = activeCl = null;
                        self.updateStorage();
                    };
            for (var i = items.length - 1; i > -1; --i) {
                items[i].addEventListener('mousedown', function (e) {
                    if (e.which === 1) {
                        topWindow.document.body.classList.add('tb_start_animate');
                        topWindow.document.body.classList.add('tb_panel_resize');
                        axis = this.dataset['axis'];
                        x = e.clientX;
                        y = e.clientY;
                        maxHeight = $(window).height() - 50;
                        height = parseInt($(el).outerHeight(), 10);
                        width = parseInt($(el).outerWidth(), 10);
                        topWindow.document.addEventListener('mousemove', _move, {passive: true});
                        topWindow.document.addEventListener('mouseup', _stop, {passive: true});

                    }
                }, {passive: true});
            }
        },
        setFloat: function () {
            var el = this.Panel.el.find('#tb_module_panel');
            el[0].classList.add('tb_panel_floating');
            var storage = this.getStorage();
            if (storage) {
                el[0].style['width'] = storage['width'] + 'px';
                el[0].style['height'] = storage['height'] + 'px';
            }
            var cl = this.getPanelClass(el.width());
            el[0].classList.add(cl);
            this._setResponsiveTabs(cl);
        },
        removeFloat: function () {
            this.Panel.el.find('#tb_module_panel').css({'top': '', 'width': '', 'height': '', 'left': '', 'right': '', 'bottom': ''}).removeClass('tb_panel_floating tb_float_xsmall tb_float_small tb_float_medium tb_float_large tb_is_minimize');
        },
        draggable: function () {
            var $el = this.$el.find('#tb_module_panel'),
                    self = this;
            if (!Common.Lightbox.dockMode.get()) {
                $el[0].classList.add('tb_panel_floating');
                var storage = this.getStorage(),
                        w = null;
                if (storage) {
                    for (var i in storage) {
                        $el[0].style[i] = storage[i] + 'px';
                    }
                    w = storage['width'];
                }
                else {
                    w = $el.width();
                }
                var cl = this.getPanelClass(w);
                $el[0].classList.add(cl);
                this._setResponsiveTabs(cl);
            }
            $el.draggable({
                handle: '.tb_drag_handle',
                cancel: '.tb_module_types',
                scroll: true,
                start: function (e, ui) {
                    topWindow.document.body.classList.add('tb_panel_drag');
                    self.setFloat();
                    if (Common.Lightbox.dockMode.get()) {
                        Common.Lightbox.dockMode.close();
                        setTimeout(function () {
                            api.Utils._onResize(true);
                        }, 100);
                    }
                },
                drag: function (e, ui) {
                    if (api.mode === 'visual') {
                        Common.Lightbox.dockMode.drag(e, ui);
                    }
                },
                stop: function (e, ui) {
                    topWindow.document.body.classList.remove('tb_panel_drag');
                    Common.Lightbox.dockMode.drag(e, ui);
                    if (Common.Lightbox.dockMode.get()) {
                        self.removeFloat();
                        self._setResponsiveTabs(false);
                    }
                    else {
                        var h = $(topWindow).height() - 30,
                                top = ui.position.top,
                                new_pos = {};
                        if (top < 0) {
                            new_pos.top = 0;
                        }
                        else if (top > h) {
                            new_pos.top = h;
                        }
                        for (var i in new_pos) {
                            ui.helper[0].style[i] = new_pos[i] + 'px';
                        }
                        self.updateStorage();
                    }

                    if (api.mode === 'visual') {
                        $(document).triggerHandler('mouseup');
                    }
                }
            });
            this.resize();
        },
        minimize: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var panel = $(e.currentTarget).closest('#tb_module_panel');
            if (panel.hasClass('tb_is_minimize')) {
                panel.removeClass('tb_is_minimize');
                var storage = this.getStorage();
                panel.css('height', (storage ? storage['height'] : ''));
            }
            else {
                panel.addClass('tb_is_minimize');
            }
            if (api.mode === 'visual') {
                $(document).triggerHandler('mouseup');
            }
        },
        import: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var component = e.currentTarget.getAttribute('data-component'),
                    body = topWindow.document.getElementsByTagName('body')[0],
                    options = {
                        contructor: component !== 'file',
                        dataType: 'json',
                        data: {
                            action: 'builder_import',
                            type: component
                        }
                    };
            if (component !== 'file' || confirm(themifyBuilder.i18n.importFileConfirm)) {
                if (component === 'file') {
                    var el = topWindow.document.getElementById('tb_import_filestb_plupload_browse_button');
                    if (el === null) {
                        el = document.createElement('input');
                        var wrap = document.createElement('div'),
                                nonce = document.createElement('span');
                        wrap.id = 'tb_import_filestb_plupload_upload_ui';
                        wrap.style['display'] = 'none';
                        el.type = 'button';
                        el.id = 'tb_import_filestb_plupload_browse_button';
                        nonce.className = 'ajaxnonceplu';
                        nonce.id = themifyBuilder.import_nonce;
                        wrap.appendChild(el);
                        wrap.appendChild(nonce);
                        body.appendChild(wrap);
                        api.Utils.builderPlupload('', el.parentNode);
                    }
                    else {
                        el.click();
                    }
                }
                else {
                    Common.Lightbox.$lightbox[0].style['display'] = 'none';
                    var el = $(e.currentTarget.closest('ul')),
                            offset = el.offset(),
                            top = offset.top + el.height() - 40;
                    Themify.body.off('themify_builder_lightbox_close.import');
                    el.addClass('tb_current_menu_selected');
                    if (api.Forms.LayoutPart.id !== null) {
                        top -= window.pageYOffset + 60;
                    }

                    Common.Lightbox.open(options, function () {
                        body.classList.add('tb_standalone_lightbox');
                    }, function () {
                        this.$lightbox[0].classList.add('tb_import_post_lightbox');
                        this.setStandAlone(offset.left, top, true);
                        Themify.body.one('themify_builder_lightbox_close.import', function () {
                            body.classList.remove('tb_standalone_lightbox');
                            Common.Lightbox.$lightbox[0].classList.remove('tb_import_post_lightbox');
                            el.removeClass('tb_current_menu_selected');
                            body = null;
                        });
                        $('#tb_submit_import_form', Common.Lightbox.$lightbox).one('click', function (e) {
                            e.preventDefault();
                            var options = {
                                buttons: {
                                    no: {
                                        label: ThemifyConstructor.label.replace_builder,
                                    },
                                    yes: {
                                        label: ThemifyConstructor.label.append_builder
                                    }
                                }
                            };

                            Common.LiteLightbox.confirm(themifyBuilder.i18n.dialog_import_page_post, function (response) {
                                $.ajax({
                                    type: 'POST',
                                    url: themifyBuilder.ajaxurl,
                                    dataType: 'json',
                                    data: {
                                        action: 'builder_import_submit',
                                        nonce: themifyBuilder.tb_load_nonce,
                                        data: api.Forms.serialize('tb_options_import'),
                                        importType: 'no' === response ? 'replace' : 'append',
                                        importTo: themifyBuilder.post_ID
                                    },
                                    beforeSend: function (xhr) {
                                        Common.showLoader('show');
                                    },
                                    success: function (data) {
                                        if (data['builder_data'] !== undefined) {
                                            api.Forms.reLoad(data.builder_data, themifyBuilder.post_ID);
                                        }
                                        else {
                                            Common.showLoader('error');
                                        }
                                        Common.Lightbox.close();
                                    }
                                });

                            }, options);
                        });
                    });
                }
            }

        },
        unload: function () {
            if (api.mode === 'visual') {
                document.head.insertAdjacentHTML('afterbegin', '<base target="_parent">');
            }
            topWindow.onbeforeunload = function () {
                return  !api.editing && (api.hasChanged || api.undoManager.hasUndo()) ? 'Are you sure' : null;
            };
        },
        panelClose: function (e) {
            e.preventDefault();
            topWindow.location.reload(true);
        },
        // Layout actions
        loadLayout: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var self = this,
                    body = topWindow.document.body,
                    el = $(e.currentTarget.closest('ul')),
                    options = self.layoutsList ? {loadMethod: 'html', data: self.layoutsList} : {data: {action: 'tb_load_layout'}};
            Common.Lightbox.$lightbox[0].style['display'] = 'none';
            el.addClass('tb_current_menu_selected');
            Themify.body.off('themify_builder_lightbox_close.loadLayout');
            Common.Lightbox.open(options, function () {
                body.classList.add('tb_load_layout_active');
                body.classList.add('tb_standalone_lightbox');
            },
                    function () {
                        var lightbox = this.$lightbox,
                                container = lightbox.find('#tb_tabs_pre-designed');

                        /* the pre-designed layouts has been disabled */
                        if (container.length === 0) {
                            body.classList.remove('tb_load_layout_active');
                            body.classList.remove('tb_standalone_lightbox');
                            el.removeClass('tb_current_menu_selected');
                            loadLayoutInit();
                            return;
                        }
                        lightbox[0].classList.add('tb_predesigned_lightbox');
                        this.setStandAlone(topWindow.innerWidth / 2, ((topWindow.document.documentElement.clientHeight - lightbox.height()) / 2), true);
                        var filter = container.find('.tb_ui_dropdown_items'),
                                layoutLayoutsList = function (preview_list) {
                                    preview_list.each(function (i) {
                                        if (i % 4 === 0) {
                                            this.classList.add('layout-column-break');
                                        }
                                        else {
                                            this.classList.remove('layout-column-break');
                                        }
                                    });
                                };
                        function loadLayoutInit() {
                            lightbox.on('click.loadLayout', '.layout_preview img', function (e) {

                                e.preventDefault();
                                e.stopPropagation();
                                var $this = $(this).closest('.layout_preview'),
                                        options = {
                                            buttons: {
                                                no: {
                                                    label: ThemifyConstructor.label.layout_replace
                                                },
                                                yes: {
                                                    label: ThemifyConstructor.label.layout_append
                                                }
                                            }
                                        };

                                Common.LiteLightbox.confirm(themifyBuilder.i18n.confirm_template_selected, function (response) {
                                    var group = $this.closest('ul').data('group'),
                                            done = function (data) {
                                                if ('no' !== response) {
                                                    var el = api.mode !== 'visual' ? document.getElementById('tb_row_wrapper') : document.getElementsByClassName('themify_builder_content-' + themifyBuilder.post_ID)[0],
                                                            json = api.Mixins.Builder.toJSON(el),
                                                            res = [];
                                                    for (var i in json) {
                                                        res.push(json[i]);
                                                    }
                                                    json = null;
                                                    for (var i in data) {
                                                        res.push(data[i]);
                                                    }
                                                    data = res;
                                                    res = null;
                                                }
                                                if (self.is_set !== true) {
                                                    $.ajax({
                                                        type: 'POST',
                                                        url: themifyBuilder.ajaxurl,
                                                        data: {
                                                            action: 'set_layout_action',
                                                            nonce: themifyBuilder.tb_load_nonce,
                                                            mode: 'no' !== response ? 1 : 0,
                                                            id: themifyBuilder.post_ID
                                                        },
                                                        success: function () {
                                                            self.is_set = true;
                                                        }
                                                    });
                                                }
                                                api.Forms.reLoad(data, themifyBuilder.post_ID);
                                                Common.Lightbox.close();
                                            };
                                    if (group === 'pre-designed') {
                                        Common.showLoader('show');
                                        var slug = $this.data('slug'),
                                                file = themifyBuilder.paths.layout_template.replace('{SLUG}', slug);
                                        if (!api.layouts_selected) {
                                            api.layouts_selected = {};
                                        }
                                        else if (api.layouts_selected[slug]) {
                                            done(JSON.parse(api.layouts_selected[slug]));
                                            return;
                                        }
                                        $.get(file, null, null, 'text')
                                                .done(function (data) {
                                                    api.layouts_selected[slug] = data;
                                                    done(JSON.parse(data));
                                                })
                                                .fail(function (jqxhr, textStatus, error) {
                                                    Common.LiteLightbox.alert(ThemifyConstructor.label.layout_error.replace('{FILE}', file));
                                                })
                                                .always(function () {
                                                    Common.showLoader();
                                                });
                                    } else {
                                        $.ajax({
                                            type: 'POST',
                                            url: themifyBuilder.ajaxurl,
                                            dataType: 'json',
                                            data: {
                                                action: 'tb_set_layout',
                                                nonce: themifyBuilder.tb_load_nonce,
                                                layout_slug: $this.data('slug'),
                                                layout_group: group,
                                                mode: 'no' !== response ? 1 : 0
                                            },
                                            beforeSend: function () {
                                                if ('visual' === api.mode) {
                                                    Common.showLoader('show');
                                                }
                                            },
                                            success: function (res) {
                                                if (res.data) {
                                                    done(res.data);
                                                    if (res.gs) {
                                                        var keys = Object.keys(res.gs);
                                                        for(var i=keys.length-1;i>-1;--i){
                                                            if (api.GS.styles[keys[i]] == undefined) {
                                                                api.GS.styles[keys[i]] = res.gs[keys[i]];
                                                            }
                                                            if ('visual' === api.mode && api.GS.styles[keys[i]].cssLoaded !== true) {
                                                                //set live css style
                                                                api.liveStylingInstance.setCss(api.GS.styles[keys[i]].data, undefined, api.GS.styles[keys[i]].class);
                                                                api.GS.styles[keys[i]].cssLoaded = true;
                                                            }
                                                        }
                                                    }
                                                    Common.showLoader();
                                                } else {
                                                    Common.showLoader('error');
                                                    alert(res.msg);
                                                    Common.Lightbox.close();
                                                }
                                            }
                                        });
                                    }
                                }, options);
                            })
                        }
                        function reInitJs() {
                            loadLayoutInit();
                            var preview_list = container.find('.layout_preview_list');
                            filter.show().find('li').on('click', function (e) {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!this.classList.contains('current')) {
                                    var matched = preview_list;
                                    if (this.classList.contains('all')) {
                                        matched.show();
                                    } else {
                                        preview_list.hide();
                                        var selector = '' !== themifyBuilder.paths.layouts_index ? '*' : '';
                                        matched = preview_list.filter('[data-category'+ selector + '="' + $(this).text() + '"]');
                                        matched.show();
                                    }
                                    layoutLayoutsList(matched);
                                    $(this).addClass('current').siblings().removeClass('current');
                                    filter.parent().find('.tb_ui_dropdown_label').html($(this).text());
                                }
                                api.Utils.hideOnClick(filter);
                            });
                            filter.find('.tb_selected_cat').click();
                            lightbox.find('#tb_layout_search').on('keyup', function () {
                                var s = $.trim($(this).val()),
                                        matched = preview_list;
                                if (s === '') {
                                    matched.show();
                                } else {
                                    var selected = filter.find('li.all');
                                    if (!selected[0].classList.contains('current')) {
                                        selected.click();
                                    }
                                    preview_list.hide();
                                    matched = preview_list.find('.layout_title:contains(' + s + ')').closest('.layout_preview_list');
                                    matched.show();
                                }
                                layoutLayoutsList(matched);
                            })[0].focus();
                            new SimpleBar(lightbox[0]);
                            new SimpleBar(filter[0]);
                            Themify.body.one('themify_builder_lightbox_close.loadLayout', function () {
                                lightbox.off('click.loadLayout')[0].classList.remove('tb_predesigned_lightbox');
                                container.find('#tb_layout_search').off('keyup');
                                container = lightbox = null;
                                body.classList.remove('tb_load_layout_active');
                                body.classList.remove('tb_standalone_lightbox');
                                el.removeClass('tb_current_menu_selected');
                            });
                        }
                        if (self.layoutsList) {
                            reInitJs();
                            return;
                        }
                        var loadData = function(data,selected){
                            var categories = {},
                                frag1 = document.createDocumentFragment(),
                                frag2 = document.createDocumentFragment();
                            for (var i = 0, len = data.length; i < len; ++i) {
                                var li = document.createElement('li'),
                                    layout = document.createElement('div'),
                                    thumbnail = document.createElement('div'),
                                    img = document.createElement('img'),
                                    action = document.createElement('div'),
                                    title = document.createElement('div'),
                                    a = document.createElement('a'),
                                    icon = document.createElement('i');
                                li.className = 'layout_preview_list';
                                li.dataset.category = data[i].category;

                                layout.className = 'layout_preview';
                                layout.dataset.id = data[i].id;
                                layout.dataset.slug = data[i].slug;

                                thumbnail.className = 'thumbnail';
                                img.src = data[i].thumbnail;
                                img.alt = data[i].title;
                                img.title = data[i].title;
                                action.className = 'layout_action';
                                title.className = 'layout_title';
                                title.textContent = data[i].title;
                                a.className = 'layout-preview-link themify_lightbox';
                                a.href = data[i].url;
                                a.target = '_blank';
                                a.title = themifyBuilder.i18n.preview;
                                icon.className = 'ti-search';
                                a.appendChild(icon);
                                action.appendChild(title);
                                action.appendChild(a);
                                thumbnail.appendChild(img);
                                layout.appendChild(thumbnail);
                                layout.appendChild(action);
                                li.appendChild(layout);
                                frag1.appendChild(li);
                                if (data[i].category) {
                                    var cat = String(data[i].category).split(',');
                                    for (var j = 0, len2 = cat.length; j < len2; ++j) {
                                        if ('' !== cat[j] && categories[cat[j]] !== 1) {
                                            var li2 = document.createElement('li');
                                            li2.textContent = cat[j];
                                            frag2.appendChild(li2);
                                            categories[cat[j]] = 1;
                                            if(cat[j] === selected){
                                                li2.className = 'tb_selected_cat';
                                            }
                                        }
                                    }
                                }
                            }
                            filter[0].appendChild(frag2);
                            container[0].getElementsByClassName('tb_layout_lists')[0].appendChild(frag1);
                            frag1 = frag2 = categories = null;
                            lightbox.find('.tb_tab').each(function () {
                                layoutLayoutsList($(this).find('.layout_preview_list'));
                            });
                            self.layoutsList = lightbox[0].getElementsByClassName('tb_options_tab_wrapper')[0].cloneNode(true);
                            reInitJs();
                        };
                        $.ajax({
                            type: 'POST',
                            url: themifyBuilder.ajaxurl,
                            dataType: 'json',
                            data: {
                                action: 'tb_load_predesigned_layouts',
                                nonce: themifyBuilder.tb_load_nonce,
                                src: themifyBuilder.paths.layouts_index,
                                id: themifyBuilder.post_ID
                            },
                            beforeSend: function () {
                                setTimeout(function(){Common.showLoader('show');},500);
                            },
                            success: function (res) {
                                var items = JSON.parse(res.data);
                                if('' === themifyBuilder.paths.layouts_index){
                                    var keys = Object.keys(items);
                                    api.layouts_selected = {};
                                    for(var i=keys.length-1;i>-1;--i){
                                        api.layouts_selected[items[keys[i]].slug] = items[keys[i]].data;
                                    }
                                }
                                loadData(items,res.selected);
                                Common.showLoader('spinhide');
                            },
                            error: function () {
                                Common.LiteLightbox.alert($('#tb_load_layout_error', container).show().text());
                                Common.showLoader('spinhide');
                            }
                        });
                    });
        },
        saveLayout: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var options = {
                contructor: true,
                loadMethod: 'html',
                save: {},
                data: {
                    'save_as_layout': {
                        options: [
                            {
                                id: 'layout_title_field',
                                type: 'text',
                                label: ThemifyConstructor.label.title
                            },
                            {
                                id: 'layout_img_field',
                                type: 'image',
                                label: ThemifyConstructor.label.image_preview
                            },
                            {
                                id: 'layout_img_field_id',
                                type: 'hidden'
                            },
                            {
                                id: 'postid',
                                type: 'hidden',
                                value: themifyBuilder.post_ID
                            }
                        ]
                    }
                }
            },
            el = $(e.currentTarget.closest('ul'));
            el.addClass('tb_current_menu_selected');
            Common.Lightbox.$lightbox[0].style['display'] = 'none';
            Common.Lightbox.open(options, function () {
                topWindow.document.body.classList.add('tb_standalone_lightbox');
            }, function () {
                var $lightbox = this.$lightbox;
                $lightbox.find('.builder_save_button').one('click', function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    $.ajax({
                        type: 'POST',
                        url: themifyBuilder.ajaxurl,
                        dataType: 'json',
                        data: {
                            action: 'tb_save_custom_layout',
                            nonce: themifyBuilder.tb_load_nonce,
                            form_data: api.Forms.serialize($lightbox[0])
                        },
                        beforeSend: function () {
                            Common.showLoader('show');
                        },
                        success: function (data) {
                            if (data.status === 'success') {
                                Common.showLoader();
                                Common.Lightbox.close();
                            } else {
                                Common.showLoader('error');
                                alert(data.msg);
                            }
                        }
                    });
                });
                $lightbox.addClass('tb_savead_lightbox');
                this.setStandAlone(e.clientX, e.clientY);
                Themify.body.one('themify_builder_lightbox_close', function () {
                    $lightbox.removeClass('tb_savead_lightbox').find('.builder_save_button').off('click');
                    topWindow.document.body.classList.remove('tb_standalone_lightbox');
                    el.removeClass('tb_current_menu_selected');
                });
            });
        },
        // Duplicate actions
        duplicate: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var self = this;
            function duplicatePageAjax() {
                self.Revisions.ajax({action: 'tb_duplicate_page', 'tb_is_admin': 'visual' !== api.mode}, function (url) {
                    url && (topWindow.location.href = $('<div/>').html(url).text());
                });
            }
            if (confirm(themifyBuilder.i18n.confirm_on_duplicate_page)) {
                api.Utils.saveBuilder(duplicatePageAjax);
            }
        },
        //Custom CSS
        addCustomCSS: function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (api.activeModel !== null) {
                ThemifyConstructor.saveComponent(true);
            }
            if(customCss===null){
                customCss=themifyBuilder.custom_css;
                delete themifyBuilder.custom_css;
            }
            if(!customCss){
                customCss='';
            }
            var options = {
                contructor: true,
                loadMethod: 'html',
                save: {},
                data: {
                    'css': {
                        options: [
                            {
                                id: 'custom_css',
                                type: 'textarea',
                                rows: 17,
                                class: 'fullwidth'
                            },
                            {
                                id: 'custom_css_m',
                                type: 'message',
                                label: '',
                                comment: ThemifyConstructor.label.cus_css_m
                            },
                            {
                                id: 'postid',
                                type: 'hidden',
                                value: themifyBuilder.post_ID
                            }
                        ]
                    }
                }
        },
        self=e.currentTarget;
        self.classList.add('tb_tooltip_active');
        Common.Lightbox.$lightbox[0].style['display'] = 'none';
        topWindow.document.body.classList.add('tb_standalone_lightbox');
        Common.Lightbox.open(options, null, function () {
                var $lightbox = this.$lightbox,
                    input = $lightbox[0].querySelector('#custom_css'),
                    close = $lightbox[0].querySelector('.tb_close_lightbox'),
                    save = $lightbox[0].querySelector('.builder_save_button'),
                    tmp;
                    input.value=customCss;
                tmp = customCss;
                input.addEventListener('input', function () {
                    customCss = this.value.trim();
                    if (api.mode === 'visual') {
                        var css_id='tb_custom_css_tmp',
                            el=document.getElementById(css_id);
                            if(el===null){
                                el=document.createElement('style');
                                el.type='text/css';
                                el.id=css_id;
                                document.head.appendChild(el);
                            }
                            el.innerHTML=customCss;
                    }
                });
                close.addEventListener('click', function() {
                    if(tmp !== input.value.trim()) {
                        var style = document.querySelector('#tb_custom_css_tmp');
                        customCss = tmp;
                        input.value = tmp;
                        if (style) {
                            style.innerHTML = tmp;
                        }
                    }
                });
                save.addEventListener('click', function () {
                    tmp = input.value.trim();
                    customCss = input.value.trim();
                });
                $lightbox.addClass('tb_custom_css_lightbox').find('.builder_save_button').one('click', function (e) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    Common.Lightbox.close();
                });
                this.setStandAlone(e.clientX, e.clientY);
                Themify.body.one('themify_builder_lightbox_close', function () {
                    if (!customCss) {
                        self.classList.add('tb_tooltip_active');
                    }
                    self=null;
                    topWindow.document.body.classList.remove('tb_standalone_lightbox');
                });
            });
        },
        Revisions: {
            init: function () {
                api.toolbar.$el.find('.tb_revision').on('click', this.revision.bind(this));

            },
            revision: function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (e.currentTarget.classList.contains('tb_save_revision')) {
                    this.save();
                }
                else {
                    this.load(e);
                }
            },
            load: function (e) {
                var self = this,
                        $body = $('body', topWindow.document),
                        el = $(e.currentTarget.closest('ul')),
                        offset = el.offset();
                el.addClass('tb_current_menu_selected');
                Common.Lightbox.$lightbox[0].style['display'] = 'none';
                Themify.body.off('themify_builder_lightbox_close.revisions');
                self.ajax({action: 'tb_load_revision_lists'}, function (data) {
                    Common.Lightbox.open({
                        contructor: true,
                        loadMethod: 'html',
                        data: {
                            revision: {
                                html: $(data)[0]
                            }
                        }
                    }, function () {
                        $body.addClass('tb_standalone_lightbox');
                    }, function () {
                        this.$lightbox[0].classList.add('tb_revision_lightbox');
                        this.setStandAlone(offset.left, offset.top, true);
                        $body.on('click.revision', '.js-builder-restore-revision-btn', self.restore.bind(self))
                                .on('click.revision', '.js-builder-delete-revision-btn', self.delete.bind(self));
                        Themify.body.one('themify_builder_lightbox_close.revisions', function () {
                            el.removeClass('tb_current_menu_selected');
                            $body.off('.revision').removeClass('tb_standalone_lightbox');
                            Common.Lightbox.$lightbox[0].classList.remove('tb_revision_lightbox');
                            $body = null;
                        });
                    });
                });
            },
            ajax: function (data, callback) {
                var _default = {
                    tb_load_nonce: themifyBuilder.tb_load_nonce,
                    postid: themifyBuilder.post_ID
                };
                data = $.extend({}, data, _default);
                return $.ajax({
                    type: 'POST',
                    url: themifyBuilder.ajaxurl,
                    data: data,
                    beforeSend: function () {
                        Common.showLoader('show');
                    },
                    complete: function () {
                        Common.showLoader('hide');
                    },
                    success: function (data) {
                        if ($.isFunction(callback)) {
                            callback.call(this, data);
                        }
                    }
                });
            },
            save: function (callback) {
                var self = this;
                Common.LiteLightbox.prompt(themifyBuilder.i18n.enterRevComment, function (result) {
                    if (result !== null) {
                        api.Utils.saveBuilder(function () {
                            self.ajax({action: 'tb_save_revision', rev_comment: result}, callback);
                        }, 0, true);
                    }
                });
            },
            restore: function (e) {
                e.preventDefault();
                e.stopPropagation();
                var revID = $(e.currentTarget).data('rev-id'),
                        self = this,
                        restoreIt = function () {
                            self.ajax({action: 'tb_restore_revision_page', revid: revID}, function (data) {
                                if (data.builder_data) {
                                    api.Forms.reLoad(data.builder_data, themifyBuilder.post_ID);
                                    Common.Lightbox.close();
                                } else {
                                    Common.showLoader('error');
                                    alert(data.data);
                                }
                            });
                        };

                Common.LiteLightbox.confirm(themifyBuilder.i18n.confirmRestoreRev, function (response) {
                    if ('yes' === response) {
                        self.save(restoreIt);
                    } else {
                        restoreIt();
                    }
                }, {
                    buttons: {
                        no: {
                            label: ThemifyConstructor.label.save_no
                        },
                        yes: {
                            label: ThemifyConstructor.label.save
                        }
                    }
                });

            },
            delete: function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (!confirm(themifyBuilder.i18n.confirmDeleteRev)) {
                    return;
                }
                var $this = $(e.currentTarget),
                        self = this,
                        revID = $this.data('rev-id');
                self.ajax({action: 'tb_delete_revision', revid: revID}, function (data) {
                    if (!data.success) {
                        Common.showLoader('error');
                        alert(data.data);
                    }
                    else {
                        $this.closest('li').remove();
                    }
                });
            }
        },
        save: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var link = $(e.currentTarget).closest('.tb_toolbar_backend_edit').length > 0 ? $(e.currentTarget).prop('href') : false;
            if (themifyBuilder.is_gutenberg_editor && link !== false) {
                api.undoManager.reset();
                api._backendSwitchFrontend(link);
                return;
            }

            api.Utils.saveBuilder(function (jqXHR, textStatus) {
                if (textStatus !== 'success') {
                    alert(themifyBuilder.i18n.errorSaveBuilder);
                }
                else if (link !== false) {
                    if (api.mode === 'visual') {
                        sessionStorage.setItem('focusBackendEditor', true);
                        topWindow.location.href = link;
                    } else {
                        api.undoManager.reset();
                        api._backendSwitchFrontend(link);
                    }
                }
            });
            // Reopen GS Styling panel
            if (undefined !== themifyBuilder.globalStyleData) {
                api.toolbar.el.getElementsByClassName('tb_toolbar_builder_preview')[0].click();
                api.GS.openStylingPanel();
            }
        },
        libraryItems: {
            items: [],
            is_init: null,
            init: function () {
                $(document).one('tb_panel_tab_tb_module_panel_library_wrap', this.load.bind(this));
            },
            load: function (e, parent) {
                var self = this;
                parent = $(parent).find('.tb_module_panel_library_wrap');
                parent.addClass('tb_busy');
                $.ajax({
                    type: 'POST',
                    url: themifyBuilder.ajaxurl,
                    data: {
                        action: 'tb_get_library_items',
                        nonce: themifyBuilder.tb_load_nonce,
                        part: 'all',
                        pid: themifyBuilder.post_ID
                    },
                    success: function (data) {
                        self.setData(data);
                        parent.removeClass('tb_busy');
                        self.is_init = true;
                    },
                    error: function () {
                        parent.removeClass('tb_busy');
                        Common.showLoader('error');
                        self.init();
                        api.toolbar.$el.find('.tb_library_item_list').html('<h3>Failed to load Library Items.</h3>');
                    }
                });
            },
            get: function (id, type, callback) {
                if (this.items[id] !== undefined) {
                    callback(this.items[id]);
                }
                else {
                    var self = this;
                    $.ajax({
                        type: 'POST',
                        url: themifyBuilder.ajaxurl,
                        dataType: 'json',
                        data: {
                            action: 'tb_get_library_item',
                            nonce: themifyBuilder.tb_load_nonce,
                            type: type,
                            id: id
                        },
                        beforeSend: function (xhr) {
                            Common.showLoader('show');
                        },
                        success: function (data) {
                            if (data.content.gs) {
                                var keys = Object.keys(data.content.gs);
                                for(var i=keys.length-1;i>-1;--i){
                                    if (api.GS.styles[keys[i]] == undefined) {
                                        api.GS.styles[keys[i]] = data.content.gs[keys[i]];
                                    }
                                    if ('visual' === api.mode && api.GS.styles[keys[i]].cssLoaded !== true) {
                                        //set live css style
                                        api.liveStylingInstance.setCss(api.GS.styles[keys[i]].data, undefined, api.GS.styles[keys[i]].class);
                                        api.GS.styles[keys[i]].cssLoaded = true;
                                    }
                                }
                                delete data.content.gs;
                            }
                            Common.showLoader('hide');
                            if (data.status === 'success') {
                                self.items[id] = data.content;
                                callback(data.content);
                            }
                            else {
                                Common.showLoader('error');
                            }
                        },
                        error: function () {
                            Common.showLoader('error');
                        }
                    });
                }
            },
            template: function (data) {
                var html = '';
                for (var i = 0, len = data.length; i < len; ++i) {
                    var type = 'part';
                    if (data[i].post_type.indexOf('_rows', 5) !== -1) {
                        type = 'row';
                    }
                    else if (data[i].post_type.indexOf('_module', 5) !== -1) {
                        type = 'module';
                    }
                    html += '<div class="tb_library_item tb_item_' + type + '" data-type="' + type + '" data-id="' + data[i].id + '">';
                    html += '<div class="tb_library_item_inner"><span>' + data[i].post_title + '</span>';
                    html += '<a href="#" class="remove_item_btn tb_disable_sorting" title="Delete"></a></div></div>';
                }
                return html;
            },
            bindEvents: function (force) {
                if (api.mode === 'visual') {
                    api.Mixins.Builder.initModuleVisualDrag('.tb_item_module,.tb_item_part');
                    api.Mixins.Builder.initRowVisualDrag('.tb_item_row');
                }
                else {
                    api.Mixins.Builder.initRowDraggable(api.toolbar.$el.find('.tb_module_panel_library_wrap').first(), '.tb_item_row');
                    api.Mixins.Builder.initModuleDraggable(api.toolbar.$el.find('.tb_library_item_list').first(), '.tb_item_module,.tb_item_part');
                }
                if (api.toolbar.common.btn || (api.mode === 'visual' && (api.toolbar.common.is_init || force))) {
                    api.Mixins.Builder.initRowDraggable(api.toolbar.common.btn.find('.tb_module_panel_library_wrap').first(), '.tb_item_row');
                    api.Mixins.Builder.initModuleDraggable(api.toolbar.common.btn.find('.tb_library_item_list').first(), '.tb_item_module,.tb_item_part');
                }
            },
            setData: function (data) {
                var html = '<span class="tb_no_content" style="display:none">No library content found.</span>' + this.template(data),
                        libraryItems = $('.tb_library_item_list');
                if (api.mode === 'visual') {
                    libraryItems = libraryItems.add(api.toolbar.$el.find('.tb_library_item_list'));
                }
                data = null;
                libraryItems = libraryItems.get();
                for (var i = libraryItems.length - 1; i > -1; --i) {
                    libraryItems[i].insertAdjacentHTML('afterbegin', html);
                    new SimpleBar(libraryItems[i]);
                    libraryItems[i].previousElementSibling.getElementsByClassName('current')[0].click();
                }
                Themify.body.on('click', '.remove_item_btn', this.delete.bind(this));
                if (api.mode === 'visual') {
                    api.toolbar.$el.on('click', '.remove_item_btn', this.delete.bind(this));
                }
                this.bindEvents();
            },
            delete: function (e) {
                e.preventDefault();
                e.stopPropagation();
                var elem = $(e.currentTarget).closest('.tb_library_item'),
                        type = elem.data('type');
                if (confirm(themifyBuilder.i18n[type + 'LibraryDeleteConfirm'])) {
                    var id = elem.data('id');
                    $.ajax({
                        type: 'POST',
                        url: themifyBuilder.ajaxurl,
                        data: {
                            action: 'tb_remove_library_item',
                            nonce: themifyBuilder.tb_load_nonce,
                            id: id
                        },
                        beforeSend: function (xhr) {
                            Common.showLoader('show');
                        },
                        success: function (slug) {
                            Common.showLoader('hide');
                            if (slug) {
                                var el = elem.closest('#' + api.toolbar.common.btn.prop('id')).length > 0 ?
                                        api.toolbar.$el.find('.tb_item_' + type + '[data-id="' + id + '"]')
                                        : api.toolbar.common.btn.find('.tb_item_' + type + '[data-id="' + id + '"]');
                                elem = elem.add(el);
                                if (type === 'part') {
                                    elem = elem.add($('.themify_builder_content-' + id).closest('.active_module'));
                                    var control = ThemifyConstructor.layoutPart.data;
                                    for (var i = control.length - 1; i > -1; --i) {
                                        if (control[i].post_name === slug) {
                                            ThemifyConstructor.layoutPart.data.splice(i, 1);
                                            break;
                                        }
                                    }
                                    control = null;
                                }
                                var activeTab = elem.parent().siblings('.tb_library_types').find('.current');
                                elem.remove();
                                activeTab.trigger('click');
                                activeTab = null;
                            }
                            else {
                                Common.showLoader('error');
                            }
                        },
                        error: function () {
                            Common.showLoader('error');
                        }
                    });
                }
            }
        },
        preDesignedRows: {
            is_init: null,
            rows: {},
            items: {},
            currentCategory:'All',
            categories: {All:{isLoaded:false}},
            loadingItems:false,
            init: function () {
                setTimeout(function () {
                    //resolve dns and cache predessinged rows
                    var meta = topWindow.document.createElement('meta'),
                            fr = topWindow.document.createDocumentFragment(),
                            items = [
                                {href: '//themify.me', rel: 'dns-prefetch preconnect'},
                                {href: '//fonts.googleapis.com', rel: 'dns-prefetch'},
                                {href: '//maps.googleapis.com', rel: 'dns-prefetch'},
                                {href: themifyBuilder.paths.rows_index, rel: 'prefetch'},
                                {href: themifyBuilder.paths.layouts_index, rel: 'prefetch'}
                            ];
                    meta.content = 'on';
                    meta.setAttribute('http-equiv', 'x-dns-prefetch-control');
                    fr.appendChild(meta);
                    for (var i in items) {
                        var el = topWindow.document.createElement('link');
                        el.setAttribute('crossorigin', true);
                        el.rel = items[i].rel;
                        el.href = items[i].href;
                        fr.appendChild(el);
                    }
                    items = null;
                    topWindow.document.head.appendChild(fr);
                }, 7000);
                $(document).one('tb_panel_tab_tb_module_panel_rows_wrap', this.load.bind(this));
            },
            load: function (e, parent) {
                var self = this;
                parent = $(parent).find('.tb_predesigned_rows_list');
                parent.addClass('tb_busy');
                $.getJSON(themifyBuilder.paths.rows_index)
                        .done(function (data) {
                            self.setData(data, parent);
                        })
                        .fail(function (jqxhr, textStatus, error) {
                            self.setData({}, parent);
                            self.is_init = null;
                            Common.showLoader('error');
                            api.toolbar.$el.find('.tb_predesigned_rows_container').append('<h3>' + ThemifyConstructor.label.rows_fetch_error + '</h3>');
                            $(document).one('tb_panel_tab_tb_module_panel_rows_wrap', self.load.bind(self));
                        });
            },
            masonry:function(el){
                function resizeMasonryItem(item){
                    var rowGap = parseInt(window.top.getComputedStyle(el).getPropertyValue('grid-row-gap')),
                        rowHeight = parseInt(window.top.getComputedStyle(el).getPropertyValue('grid-auto-rows'));
                    if(isNaN(rowGap) || isNaN(rowHeight)){
                        return;
                    }
                    var itemHeight = item.getElementsByClassName('tb_predesigned_rows_image')[0].getBoundingClientRect().height + item.getElementsByClassName('tb_predesigned_rows_title')[0].getBoundingClientRect().height;
                    var rowSpan = Math.ceil((itemHeight+rowGap)/(rowHeight+rowGap));
                    item.style.gridRowEnd = 'span '+rowSpan;
                    if(rowSpan>5){
                        item.dataset['masonry'] = 'done';
                    }
                }
                var allItems = el.querySelectorAll('.predesigned_row:not([data-masonry="done"])'),
                    len = allItems.length;
                for(var i=0;i<len;i++){
                    resizeMasonryItem(allItems[i]);
                }
            },
            loadItems: function (search) {
                this.loadingItems = true;
                var limit = 10,
                    category = this.currentCategory,
                    f = document.createDocumentFragment();
                if( true === this.categories['All'].isLoaded || true === this.categories[category].isLoaded ){
                    this.loadingItems = false;
                    return f;
                }
                var founded = 0,
                    keys = Object.keys(this.items),
                    len = keys.length;
                for(var i=0;i<len;i++){
                    if ( (founded >= limit && undefined == search) ) {
                        break;
                    }
                    var currentItem = this.items[keys[i]];
                    var reg = search !== '' ? new RegExp(search, 'i') : false;
                    if (!reg || !reg.test(currentItem.title)) {
                        continue;
                    }
                    var cats = currentItem.category.split(',');
                    if ( 'All' !== category && -1 === cats.indexOf(category) ) {
                        continue;
                    }
                    delete this.items[keys[i]];
                    var item_cats = '';
                    for (var j = 0, clen = cats.length; j < clen; ++j) {
                        item_cats += this.categories[cats[j]].hash;
                    }
                    var item = document.createElement('div'),
                        figure = document.createElement('figure'),
                        title = document.createElement('div'),
                        img = new Image(),
                        add = document.createElement('a');
                    item.className = 'predesigned_row ' + item_cats;
                    item.setAttribute('data-slug', currentItem.slug);
                    figure.className = 'tb_predesigned_rows_image';
                    title.className = 'tb_predesigned_rows_title';
                    title.textContent = img.alt = img.title = currentItem.title;
                    img.src = currentItem.thumbnail === undefined || currentItem.thumbnail === '' ? 'https://placeholdit.imgix.net/~text?txtsize=24&txt=' + (encodeURI(currentItem.title)) + '&w=181&h=77' : currentItem.thumbnail;
                    img.width = 500;
                    img.height = 300;
                    add.href = '#';
                    add.className = 'add_module_btn tb_disable_sorting';
                    add.dataset.type = 'predesigned';
                    figure.appendChild(img);
                    figure.appendChild(add);
                    item.appendChild(figure);
                    item.appendChild(title);
                    f.appendChild(item);
                    founded++;
                }
                this.categories[category].isLoaded = ( founded < limit && undefined === search ) ;
                return f;
            },
            setData: function (data) {
                this.items = data;
                data = null;
                var cats = [],
                        catF = document.createDocumentFragment();
                for (var i = 0, len = this.items.length; i < len; ++i) {
                    var tmp = this.items[i].category.split(','),
                            item_cats = '';
                    for (var j = 0, clen = tmp.length; j < clen; ++j) {
                        var hash = Themify.hash(tmp[j]);
                        if (cats.indexOf(tmp[j]) === -1) {
                            cats.push(tmp[j]);
                            this.categories[tmp[j]] = {hash:'tb'+hash};
                        }
                        item_cats += ' tb' + hash;
                    }
                }
                cats.sort();
                for (var i = 0, len = cats.length; i < len; ++i) {
                    var item = document.createElement('li');
                    item.setAttribute('data-slug', Themify.hash(cats[i]));
                    item.textContent = cats[i];
                    catF.appendChild(item);
                }
                var filter = $('.tb_module_panel_container .tb_ui_dropdown .tb_ui_dropdown_items'),
                        predesigned = $('.tb_predesigned_rows_container'),
                        self = this;
                if (api.mode === 'visual') {
                    predesigned = predesigned.add(api.toolbar.$el.find('.tb_predesigned_rows_container'));
                    filter = filter.add(api.toolbar.$el.find('.tb_module_panel_container .tb_ui_dropdown .tb_ui_dropdown_items'));
                }
                filter = filter.get();
                predesigned = predesigned.get();
                var f = this.loadItems();
                for (var i = filter.length - 1; i > -1; --i) {
                    filter[i].appendChild(catF.cloneNode(true));
                    predesigned[i].appendChild(f.cloneNode(true));
                    var img = predesigned[i].getElementsByTagName('img');
                    if (img.length > 0) {
                        img = img[img.length - 1];
                        $(img).one('load', function () {
                            self.initCallback($(this).closest('.tb_predesigned_rows_container')[0],true);
                        });
                    } else {
                        self.initCallback(predesigned[i],true);
                    }
                }

                Themify.body.on('click', '.tb_module_panel_container .tb_ui_dropdown_items li', this.filter.bind(this));
                if (api.mode === 'visual') {
                    $('body', topWindow.document).on('click', '.tb_module_panel_container .tb_ui_dropdown_items li', this.filter.bind(this));
                }
            },
            initCallback: function(el,firstTime) {
                if(firstTime){
                    var content = new SimpleBar(el),
                        simpleBarContainer = el.getElementsByClassName('simplebar-content');
                    if (simpleBarContainer.length) {
                        content = content.getScrollElement();
                    }else{
                        content = el;
                    }
                    content.addEventListener('scroll', this.scrollLoadMore.bind(this));
                    this.is_init = true;
                }
                var $el = $(el);
                if (api.mode === 'visual') {
                    api.Mixins.Builder.initRowVisualDrag('.predesigned_row');
                }else {
                    api.Mixins.Builder.initRowDraggable(api.toolbar.$el.find('.tb_predesigned_rows_container').first(), '.predesigned_row');
                }
                if (api.toolbar.common.is_init) {
                    api.Mixins.Builder.initRowDraggable(api.toolbar.common.btn.find('.tb_predesigned_rows_container').first(), '.predesigned_row');
                }
                if(firstTime){
                    new SimpleBar($el.closest('.tb_module_panel_tab').find('.tb_ui_dropdown_items')[0]);
                    $el.closest('.tb_predesigned_rows_list').removeClass('tb_busy').closest('.tb_module_panel_tab').find('.tb_ui_dropdown').css('visibility', 'visible');
                }
                if($(el).parents('#tb_module_panel_dropdown').length){
                    var simpleBarContainer = el.getElementsByClassName('simplebar-content');
                    this.masonry(simpleBarContainer.length ? simpleBarContainer[0] : el);
                }
                this.loadingItems = false;
            },
            get: function (slug, callback) {
                Common.showLoader('show');
                if (this.rows[slug] !== undefined) {
                    if (typeof callback === 'function') {
                        callback(this.rows[slug]);
                    }
                    return;
                }
                var self = this;
                $.getJSON( themifyBuilder.paths.row_template.replace( '{SLUG}', slug ) )
                    .done( function ( data ) {
                        self.rows[slug] = data;
                        if ( typeof callback === 'function' ) {
                            callback( data );
                        }
                        data = JSON.stringify( data );
                        // Import GS
                        if ( data.indexOf( 'global_styles' ) ) {
                            $.getJSON( themifyBuilder.paths.row_template.replace( '{SLUG}', slug + '-gs' ) )
                                .done( function ( data ) {
                                    api.GS.loadingPosts = true;
                                    $.ajax({
                                        type: 'POST',
                                        url: themifyBuilder.ajaxurl,
                                        dataType: 'json',
                                        data: {
                                            action: 'tb_import_gs_posts_ajax',
                                            tb_load_nonce: themifyBuilder.tb_load_nonce,
                                            data: data
                                        },
                                        success: function (res) {
                                            var keys = Object.keys(res);
                                            for(var i=keys.length-1;i>-1;--i){
                                                api.GS.styles[res[keys[i]].id] = res[keys[i]];
                                                if ('visual' === api.mode) {
                                                    //set live css style
                                                    api.liveStylingInstance.setCss(api.GS.styles[res[keys[i]].id].data, undefined, api.GS.styles[res[keys[i]].id].class);
                                                    api.GS.styles[res[keys[i]].id].cssLoaded = true;
                                                }
                                            }
                                            api.GS.loadingPosts = false;
                                        }
                                    });
                                } )
                        }
                    } ).fail( function ( jqxhr, textStatus, error ) {
                        Common.showLoader( 'error' );
                        alert( ThemifyConstructor.label.row_fetch_error );
                    }
                );
            },
            filter: function (e) {
                e.preventDefault();
                e.stopPropagation();
                var el = $(e.currentTarget),
                        slug = el.data('slug'),
                        parent = el.closest('.tb_module_panel_tab'),
                        active = parent.find('.tb_ui_dropdown_label'),
                        rows = parent.find('.predesigned_row'),
                        text = el.text();
                this.currentCategory = text;
                this.addNewItems();
                active.text(text);
                parent.find('.tb_module_panel_search_text').val('');
                var cl = slug ? 'tb' + slug : false;
                active.data('active', cl);
                el.addClass('current').siblings().removeClass('current');
                rows.each(function () {
                    if (!cl || this.classList.contains(cl)) {
                        $(this).show();
                    }
                    else {
                        $(this).hide();
                    }
                }).filter(':visible').each(function (i) {
                    if (((i + 1) % 4) === 0) {
                        $(this).addClass('tb_column_break');
                    }
                    else {
                        $(this).removeClass('tb_column_break');
                    }
                });
                api.Utils.hideOnClick(parent.find('.tb_ui_dropdown_items'));
            },
            addNewItems: function(search){
                this.currentCategory = undefined !== search ? 'All' : this.currentCategory;
                if(this.categories[this.currentCategory].isLoaded){
                    return;
                }
                var self = this,
                    filter = $('.tb_module_panel_container .tb_ui_dropdown .tb_ui_dropdown_items'),
                    predesigned = $('.tb_predesigned_rows_container');
                if (api.mode === 'visual') {
                    predesigned = predesigned.add(api.toolbar.$el.find('.tb_predesigned_rows_container'));
                    filter = filter.add(api.toolbar.$el.find('.tb_module_panel_container .tb_ui_dropdown .tb_ui_dropdown_items'));
                }
                filter = filter.get();
                predesigned = predesigned.get();
                var f = self.loadItems(search);
                for (var i = filter.length - 1; i > -1; --i) {
                    var simpleBarContainer = predesigned[i].getElementsByClassName('simplebar-content');
                    if (simpleBarContainer.length) {
                        predesigned[i] = simpleBarContainer[0];
                    }
                    predesigned[i].appendChild(f.cloneNode(true));
                    var img = predesigned[i].getElementsByTagName('img');
                    if (img.length > 0) {
                        img = img[img.length - 1];
                        $(img).one('load', function () {
                            self.initCallback($(this).closest('.tb_predesigned_rows_container')[0]);
                        });
                    } else {
                        self.initCallback(predesigned[i]);
                    }
                }
            },
            scrollLoadMore: function(e){
                var self = this;
                if (self.loadingItems || true === self.categories[self.currentCategory].isLoaded) {
                    return;
                }
                var target = e.target,
                    distToBottom = Math.max(target.scrollHeight - (target.scrollTop + target.offsetHeight), 0);
                if (distToBottom > 0 && distToBottom <= 200) {
                    this.addNewItems();
                }
            }
        },
        pageBreakModule: {
            init: function () {
                if (api.mode === 'visual') {
                    api.Mixins.Builder.initRowVisualDrag('.tb_page_break_module');
                }
                else {
                    api.Mixins.Builder.initRowDraggable(api.toolbar.$el.find('.tb_module_panel_modules_wrap').first(), '.tb_page_break_module');
                }
            },
            countModules: function () {
                var modules = api.mode === 'visual' ? document.getElementsByClassName('module-page-break') : document.getElementsByClassName('tb-page-break');
                for (var i = modules.length - 1; i > -1; --i) {
                    if (api.mode === 'visual') {
                        modules[i].getElementsByClassName('page-break-order')[0].textContent = i + 1;
                    } else {
                        modules[i].getElementsByClassName('page-break-overlay')[0].textContent = 'PAGE BREAK - ' + (i + 1);
                    }
                }
            },
            get: function () {
                return [{
                        cols: [
                            {
                                grid_class: 'col-full first last',
                                modules: [
                                    {
                                        mod_name: 'page-break'
                                    }
                                ]
                            }
                        ],
                        column_alignment: 'col_align_middle',
                        styling: {
                            custom_css_row: 'tb-page-break'
                        }
                    }
                ];
            }
        },
        common: {
            btn: null,
            is_init: null,
            clicked: null,
            init: function () {
                var btn = document.createElement('div'),
                        wrap = api.toolbar.$el;
                btn.className = 'tb_modules_panel_wrap';
                btn.id = 'tb_module_panel_dropdown';
                this.btn = $(btn);
                btn = null;
                wrap = wrap.add(Common.Lightbox.$lightbox);
                if (api.mode !== 'visual' && document.querySelector('.edit-post-layout__content') !== null) {
                    $('.edit-post-layout__content')[0].appendChild(this.btn[0]);
                } else {
                    Themify.body[0].appendChild(this.btn[0]);
                }
                var self = this;
                if (api.mode === 'visual') {
                    api.toolbar.$el.find('.tb_module_types li').on('click', this.tabs.bind(this));
                }
                Themify.body.on('click', '.tb_module_types li', this.tabs.bind(this)).on('click', '.tb_column_btn_plus', this.show.bind(this));
                wrap.on('click', '.tb_clear_input', this.clear);
                api.toolbar.$el.find('.tb_module_panel_search_text').on('keyup', this.search.bind(this));
                this.btn.on('click', '.add_module_btn,.js-tb_module_panel_acc', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var holder,
                            isEmpty = null,
                            cl = this.classList,
                            type = this.dataset['type'];
                    if (!self.clicked) {
                        self.clicked = api.Instances.Builder[api.builderIndex].newRowAvailable(1, true);
                        isEmpty = true;

                    }
                    if ('module' === type) {
                        holder = self.clicked.hasClass('tb_module_btn_plus') ? self.clicked.parent() : self.clicked.closest('.module_column').find('.tb_holder').last();
                        api.toolbar.Panel.add_module(e, holder);
                    }
                    else if ('row' === type) {
                        holder = self.clicked.hasClass('tb_module_btn_plus') ? self.clicked.parent() : self.clicked.closest('.module_column').find('.tb_holder').first();
                        api.toolbar.Panel.click_add_sub_row(e, holder);
                    }
                    else if (cl.contains('js-tb_module_panel_acc')) {
                        api.toolbar.toggleAccordion(e);
                    }
                    else if ('predesigned' === type || 'page_break' === type) {
                        holder = self.clicked.closest('.module_row');
                        if ('page_break' === type) {
                            api.toolbar.Panel.click_add_page_break(e, holder);
                        }
                        else {
                            api.toolbar.preDesignedRows.get($(e.currentTarget).closest('.predesigned_row').data('slug'), function (data) {
                                api.Mixins.Builder.rowDrop(data, isEmpty ? holder : $('<div>').insertAfter(holder), true);

                            });
                        }
                    }
                    if (!cl.contains('js-tb_module_panel_acc')) {
                        self.hide(true);
                    }
                })
                        .on('keyup', '.tb_module_panel_search_text', this.search.bind(this))
                        .on('click', '.tb_clear_input', this.clear);
            },
            run: function () {
                var markup = api.toolbar.$el.find('#tb_module_panel');
                this.btn[0].insertAdjacentHTML('beforeend', markup[0].innerHTML);
                this.btn.find('.tb_module_outer').show();
                var menu = this.btn.find('.tb_module_types').closest('div')[0];
                menu.parentNode.parentNode.insertBefore(menu, menu.parentNode);
                menu.parentNode.removeChild(menu.nextElementSibling);
                menu = null;
                var dropdown_items = this.btn.find('.tb_compact_tabs').removeClass('tb_compact_tabs').find('.tb_ui_dropdown_items').removeClass('tb_ui_dropdown_items');
                this.btn.find('.tb_module_panel_search_text').val('');
                new SimpleBar(this.btn.find('.tb_module_panel_modules_wrap')[0]);
                if (dropdown_items.find('.simplebar-scroll-content').length) {
                    var el = new SimpleBar(dropdown_items[0]);
                    el.recalculate();
                }
                api.Mixins.Builder.initModuleDraggable(this.btn, '.tb_module');
                api.Mixins.Builder.initModuleDraggable(this.btn.find('.tb_rows_grid').first(), '.tb_row_grid');
                api.Mixins.Builder.initRowDraggable(this.btn, '.tb_page_break_module');
                if (api.toolbar.libraryItems.is_init || api.mode === 'visual') {
                    api.Mixins.Builder.initModuleDraggable(this.btn.find('.tb_library_item_list').first(), '.tb_item_module,.tb_item_part');
                    api.Mixins.Builder.initRowDraggable(this.btn.find('.tb_library_item_list').first(), '.tb_item_row');
                }
                if (api.toolbar.preDesignedRows.is_init || api.mode === 'visual') {
                    api.Mixins.Builder.initRowDraggable(this.btn.find('.tb_predesigned_rows_container').first(), '.predesigned_row');
                }
                this.is_init = true;
                api.Mixins.Builder.initRowDraggable(this.btn.find('.tb_module_panel_rows_wrap').first(), '.tb_page_break_module');
            },
            tabs: function (e) {
                e.preventDefault();
                e.stopPropagation();
                var elm = $(e.currentTarget),
                        p = elm.closest('ul'),
                        target = elm.data('target'),
                        parent = elm.closest('.tb_modules_panel_wrap');
                parent.find('.' + elm.data('hide')).hide();
                var items = parent.find('.' + target),
                        not_found = parent.find('.tb_no_content');
                if (items.length > 0) {
                    not_found.hide();
                    items.show();
                }
                else {
                    not_found.show();
                }
                elm.closest('li').addClass('current').siblings().removeClass('current');
                parent.find('.tb_module_panel_search_text').val('').focus().trigger('keyup');
                $(document).triggerHandler('tb_panel_tab_' + target, parent);
                var dropdown_label = p.parent().find('.tb_ui_dropdown_label');
                if (dropdown_label.length > 0) {
                    dropdown_label.text(elm.text());
                }
                api.Utils.hideOnClick(p);
            },
            show: function (e, holder) {
                e.preventDefault();
                e.stopPropagation();
                if (!api.activeModel && topWindow.document.body.classList.contains('tb_standalone_lightbox')) {
                    Common.Lightbox.close();
                }
                if (this.is_init === null) {
                    this.run();
                }
                if (this.clicked) {
                    this.clicked[0].classList.remove('clicked');
                }
                this.clicked = holder ? holder : $(e.currentTarget);
                var self = this,
                        offset = this.clicked.offset(),
                        $body = Themify.body,
                        left = offset.left + (this.clicked.width() / 2),
                        top = offset.top,
                        $guten_container = api.mode !== 'visual' ? $('.edit-post-layout__content') : false;
                if ($guten_container !== false && $guten_container.length > 0) {
                    top += $guten_container.scrollTop() - 70;
                    left = ($guten_container.width() / 2);
                }
                left = left - (this.btn.outerWidth() / 2);
                if (left < 0) {
                    left = 0;
                }
                if (this.clicked.parents('.sub_column').length) {
                    this.btn[0].classList.add('tb_subrow_open');
                }
                else {
                    this.btn[0].classList.remove('tb_subrow_open');
                }
                this.btn.css({top: top, left: left}).show();
                this.resize();
                var blocksContainer = this.btn[0].getElementsByClassName('tb_predesigned_rows_container')[0];
                if (blocksContainer.getElementsByClassName('simplebar-scroll-content').length) {
                    var el = new SimpleBar(blocksContainer);
                    el.recalculate();
                    blocksContainer = el.getScrollElement();
                }
                blocksContainer.addEventListener('scroll', api.toolbar.preDesignedRows.scrollLoadMore.bind(api.toolbar.preDesignedRows));
                if (api.mode === 'visual') {
                    $body = $body.add($('body', topWindow.document));
                    if (api.activeBreakPoint !== 'desktop') {
                        $('body', topWindow.document).height(document.body.scrollHeight + self.btn.outerHeight(true));
                        Themify.body.css('padding-bottom', 180);
                    }
                }
                $body.addClass('tb_panel_dropdown_openend');
                this.clicked.addClass('clicked');
                if (api.activeBreakPoint === 'desktop') {
                    setTimeout(function () {
                        this.btn.find('.tb_module_panel_search_text').focus();
                    }.bind(this), 50);
                }
                this.hide();
                api.ActionBar.clear();
                if (api.activeModel !== null) {
                    var save = Common.Lightbox.$lightbox[0].getElementsByClassName('builder_save_button')[0];
                    if (save !== undefined) {
                        save.click();
                    }
                }
                var img = blocksContainer.getElementsByTagName('img');
                var simpleBarContainer = blocksContainer.getElementsByClassName('simplebar-content');
                if (img.length > 0) {
                    img = img[img.length - 1];
                    $(img).one('load', function () {
                        api.toolbar.preDesignedRows.masonry(simpleBarContainer.length ? simpleBarContainer[0] : blocksContainer);
                    });
                } else {
                    api.toolbar.preDesignedRows.masonry(simpleBarContainer.length ? simpleBarContainer[0] : blocksContainer);
                }
            },
            resize: function () {
                if (this.btn !== null) {
                    api.Utils.addViewPortClass(this.btn[0]);
                }
            },
            hide: function (force) {
                var self = this;
                function callback() {
                    if (force === true || !self.btn.is(':hover')) {
                        var $body = Themify.body;
                        if (self.btn !== null) {
                            self.btn.hide().css('width', '');
                            if (self.clicked) {
                                self.clicked[0].classList.remove('clicked');
                            }
                            self.clicked = null;
                        }
                        $(document).off('click', callback);
                        $(topWindow.document).off('click', callback);
                        if (api.mode === 'visual') {
                            $body = $body.add($('body', topWindow.document));
                            if (api.activeBreakPoint !== 'desktop') {
                                $('body', topWindow.document).height(document.body.scrollHeight);
                                Themify.body.css('padding-bottom', '');
                            }
                        }
                        $body.removeClass('tb_panel_dropdown_openend');
                    }
                }
                if (force === true) {
                    callback();
                }
                else {
                    if (api.mode === 'visual') {
                        $(topWindow.document).on('click', callback);
                    }
                    $(document).on('click', callback);
                }
            },
            search: function (e) {
                var el = $(e.currentTarget),
                        parent = el.closest('.tb_modules_panel_wrap'),
                        target = parent.find('.tb_module_types .current').first().data('target'),
                        search = false,
                        filter = false,
                        is_module = false,
                        is_library = false,
                        s = $.trim(el.val());
                if (target === 'tb_module_panel_modules_wrap') {
                    search = parent.find('.tb_module_outer');
                    is_module = true;
                }
                else if (target === 'tb_module_panel_rows_wrap' && api.toolbar.preDesignedRows.is_init) {
                    api.toolbar.preDesignedRows.addNewItems(s);
                    filter = parent.find('.tb_ui_dropdown_label').data('active');
                    search = parent.find('.predesigned_row');
                }
                else if (target === 'tb_module_panel_library_wrap') {
                    search = parent.find('.tb_library_item');
                    filter = parent.find('.tb_library_types .current').data('target');
                    is_library = true;
                }
                if (search !== false) {
                    var is_empty = s === '',
                            reg = !is_empty ? new RegExp(s, 'i') : false;
                    search.each(function () {
                        if (filter && !this.classList.contains(filter)) {
                            return true;
                        }
                        var elm = is_module ? $(this).find('.module_name') : (is_library ? $(this).find('.tb_library_item_inner span') : $(this).find('.tb_predesigned_rows_title'));
                        if (is_empty || reg.test(elm.text())) {
                            $(this).show();
                        }else {
                            $(this).hide();
                        }
                    });
                    // hide other accordions
                    if (is_empty) {
                        parent.removeClass('tb_module_panel_searching');
                    } else {
                        parent.addClass('tb_module_panel_searching');
                    }
                    // Hide empty module accordions
                    if(is_module){
                        parent.find('.tb_module_category_content').each(function(){
                            this.parentElement.style.display = 'block';
                            if(!$(this).find('.tb_module_outer:visible').length){
                                this.parentElement.style.display = 'none';
                            }
                        });
                    }
                }
            },
            clear: function (e) {
                e.preventDefault();
                e.stopPropagation();
                var input = $(this).parent().children('input').first();
                if (input.length > 0) {
                    input.val('');
                    if (input[0].hasAttribute("data-search")) {
                        input.trigger('keyup').focus();
                    }
                    else {
                        input.trigger('change');
                        Themify.triggerEvent(input[0], 'change');
                    }
                }

            }
        },
        help: {
            init: function () {
                $('.tb_help_btn', api.toolbar.$el).on('click', this.show.bind(this));
            },
            show: function (e) {
                e.preventDefault();
                e.stopPropagation();
                var self = this;
                Common.showLoader('show');
                return $.ajax({
                    type: 'POST',
                    url: themifyBuilder.ajaxurl,
                    data: {tb_load_nonce: themifyBuilder.tb_load_nonce, action: 'tb_help'},
                    complete: function () {
                        Common.showLoader('spinhide');
                    },
                    success: function (data) {
                        topWindow.document.body.insertAdjacentHTML('beforeend', data);
                        var $wrapper = $('#tb_help_lightbox', topWindow.document.body);
                        $('.tb_help_tab_link', $wrapper).on('click', self.mainTabs.bind(self));
                        $('.tb_player_btn', $wrapper).on('click', self.play.bind(self));
                        $('.tb_help_menu a', $wrapper).on('click', self.tabs.bind(self));
                        $('.tb_close_lightbox', $wrapper).on('click', self.close.bind(self));
                        $wrapper.slideDown();
                    }
                });
            },
            play: function (e) {
                e.preventDefault();
                e.stopPropagation();
                var a = $(e.currentTarget).closest('a'),
                        href = a.prop('href'),
                        iframe = document.createElement('iframe');
                iframe.setAttribute('frameborder', '0');
                iframe.setAttribute('allow', 'autoplay; fullscreen');
                iframe.setAttribute('src', href + '?rel=0&showinfo=0&autoplay=1&enablejsapi=1&html5=1&version=3');
                a.replaceWith(iframe);

            },
            tabs: function (e) {
                e.preventDefault();
                e.stopPropagation();
                var $this = $(e.currentTarget),
                        wrapper = $('.tb_help_video_wrapper', topWindow.document),
                        active = wrapper.find($this.attr('href')),
                        activePlayer = active.find('.tb_player_btn');
                wrapper.find('.tb_player_wrapper').removeClass('current').hide();
                active.addClass('current').show();
                $this.closest('li').addClass('current').siblings().removeClass('current');
                this.stopPlay();
                if (activePlayer.length > 0) {
                    activePlayer.trigger('click');
                }
                else {
                    this.startPlay();
                }
            },
            execute: function (iframe, param) {
                iframe.contentWindow.postMessage('{"event":"command","func":"' + param + '","args":""}', '*');
            },
            stopPlay: function () {
                var self = this;
                $('.tb_player_wrapper', topWindow.document).each(function () {
                    if (!this.classList.contains('current')) {
                        var iframe = $(this).find('iframe');
                        if (iframe.length > 0) {
                            self.execute(iframe[0], 'pauseVideo');
                        }
                    }
                });
            },
            startPlay: function () {
                var iframe = $('.tb_player_wrapper.current', topWindow.document).find('iframe');
                iframe.length > 0 && this.execute(iframe[0], 'playVideo');
            },
            close: function (e, callback) {
                e.preventDefault();
                e.stopPropagation();
                $(e.currentTarget).closest('#tb_help_lightbox').slideUp('normal', function () {
                    $(this).next('.tb_overlay').remove();
                    $(this).empty().remove();
                    if (callback) {
                        callback();
                    }
                });
            },
            mainTabs: function (e) {
                e.preventDefault();
                e.stopPropagation();
                var $this = $(e.currentTarget),
                    wrapper = $('.tb_help_lightbox_inner_wrapper', topWindow.document);
                if($this.hasClass('tb_help_active_tab')){
                    return;
                }
                wrapper.find('.tb_help_active_tab').removeClass('tb_help_active_tab');
                $this.addClass('tb_help_active_tab');
                wrapper.attr('data-active-tab',$this.data('type'))
            },
        },
        deviceSwitcher: function ( e ) {
            var target = e.target,
                breakpoint = target.parentNode.previousElementSibling;
            if ( breakpoint.classList.contains( 'tb_breakpoint_switcher' ) ) {
                e.tb_device = [target.dataset.width, target.dataset.height];
                e.target = breakpoint;
                e.currentTarget = breakpoint;
                this.breakpointSwitcher( e );
            }
        },
        breakpointSwitcher: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var self = this,
                    breakpoint = 'desktop',
                    _this = e.currentTarget,
                    $body = $('body', topWindow.document),
                    is_resizing = api.mode === 'visual' && api.iframe[0].classList.contains('tb_resizing_start'),
                    prevBreakPoint = api.activeBreakPoint,
                    callback = function () {
                        self.responsive_grids(breakpoint, prevBreakPoint);
                        var finish = function () {
                            api.Utils.setCompactMode(document.getElementsByClassName('module_column'));
                            api.toolbar.el.getElementsByClassName('tb_compact_switcher')[0].getElementsByTagName('i')[0].className = _this.getElementsByTagName('i')[0].className;
                            $body.removeClass('tb_start_animate').toggleClass('tb_responsive_mode', breakpoint !== 'desktop').removeClass('builder-breakpoint-' + prevBreakPoint).addClass('builder-breakpoint-' + breakpoint);
                            Themify.body.triggerHandler('themify_builder_change_mode', [prevBreakPoint, breakpoint]);
                            if (api.mode === 'visual') {
                                api.iframe[0].style['willChange'] = '';
                                setTimeout(function () {
                                    topWindow.document.body.style['height'] = breakpoint !== 'desktop' ? document.body.scrollHeight + 'px' : '';
                                    if (!is_resizing && api.scrollTo) {
                                        $(window).add(topWindow.document).scrollTop(api.scrollTo.offset().top);
                                        api.scrollTo = false;
                                    }
                                }, 150);
                            }
                            api.ActionBar.disable=api.clearOnModeChange=null;
                        };
                        if (api.mode === 'visual') {
                            api.Utils._onResize(true, function () {
                                self.iframeScroll(breakpoint !== 'desktop');
                                if (prevBreakPoint === 'desktop' || breakpoint === 'desktop') {
                                    api.Mixins.Builder.updateModuleSort(null, breakpoint === 'desktop' ? 'enable' : 'disable');
                                }
                                api.ActionBar.hoverCid=null;
                                api.EdgeDrag.clearEdges();
                                setTimeout(finish, is_resizing ? 1 : 100);
                            });
                        } else {
                            finish();
                        }
                    };
            if (_this.classList.contains('breakpoint-tablet')) {
                breakpoint = 'tablet';
            } else if (_this.classList.contains('breakpoint-tablet_landscape')) {
                breakpoint = 'tablet_landscape';
            } else if (_this.classList.contains('breakpoint-mobile')) {
                breakpoint = 'mobile';
            }
            if(undefined === e.tb_device && Themify.body[0].classList.contains('builder-breakpoint-'+breakpoint)){
                // Already in this breakpoint, so return
                return;
            }
            var w = breakpoint !== 'desktop' ? ( undefined !== e.tb_device ? 'tablet_landscape' === breakpoint ? e.tb_device[1] : e.tb_device[0] : api.Utils.getBPWidth(breakpoint) - 1 ) : '';
            if ((prevBreakPoint === breakpoint && e.originalEvent !== undefined && ((w ? (w + 'px') : w) === api.iframe[0].style['width']))) {
                return false;
            }
            api.ActionBar.disable=true;
            if(api.mode === 'visual'){
                if(api.clearOnModeChange===null){
                    api.ActionBar.clear();
                }
                //hide the hidden  rows for fast resizing
                if (!is_resizing && !api.isPreview) {
                    var childs = api.Instances.Builder[0].el.children,
                            items = [],
                            clH = window.innerHeight,
                            fillHidden = function (item) {
                                if (item !== null && item !== undefined) {
                                    var off = item.getBoundingClientRect();
                                    if ((off.bottom < 0 && off.top < 0) || off.top > clH) {
                                        item.style['display'] = 'none';
                                        items.push(item);
                                    }
                                }
                            };
                    for (var i = childs.length - 1; i > -1; --i) {
                        fillHidden(childs[i]);
                    }
                    fillHidden(document.getElementById('headerwrap'));
                    fillHidden(document.getElementById('footerwrap'));
                    childs = clH = null;
                }
                $body = $body.add(Themify.body);
            }
            api.activeBreakPoint = breakpoint;
            $body.addClass('tb_start_animate'); //disable all transitions
            if (api.mode === 'visual') {
                api.iframe[0].style['willChange'] = 'width';
                // disable zoom if active
                var zoom_menu = topWindow.document.getElementsByClassName('tb_toolbar_zoom_menu')[0];
                zoom_menu.classList.remove('tb_toolbar_zoom_active');
                zoom_menu.getElementsByClassName('tb_toolbar_zoom_menu_toggle')[0].dataset['zoom'] = 100;
                if ('tablet_landscape' === breakpoint && Common.Lightbox.dockMode.get()) {
                    var wspace = $('.tb_workspace_container', topWindow.document).width();
                    if (wspace < w) {
                        w = wspace; // make preview fit the screen when dock mode active
                    }
                }
                if (api.isPreview) {
                    var h,
                            previewWidth = {
                                'tablet_landscape': [1024, 768],
                                'tablet': [768, 1024],
                                'mobile': [375, 667]
                            };

                    if (previewWidth[breakpoint] !== undefined) {
                        w = undefined == e.tb_device ? previewWidth[breakpoint][0] : 'tablet_landscape' === breakpoint ? e.tb_device[1] : e.tb_device[0];
                        h = undefined == e.tb_device ? previewWidth[breakpoint][1] : 'tablet_landscape' === breakpoint ? e.tb_device[0] : e.tb_device[1];
                    }
                }
                api.iframe[0].parentNode.classList.remove('tb_zoom_bg');
                if (!is_resizing) {
                    topWindow.document.body.offsetHeight;//force reflow
                    api.iframe.one(api.Utils.transitionPrefix(), function () {
                        if (!api.isPreview) {
                            for (var i = items.length - 1; i > -1; --i) {
                                items[i].style['display'] = '';
                            }
                            items = null;
                        }
                        setTimeout(callback, 10);
                    });
                    api.iframe[0].style['width'] = w ? (w + 'px') : w;
                    api.iframe[0].style['height'] = api.isPreview ? (h ? (h + 'px') : h) : '';
                }
                else {
                    callback();
                }
            }
            else {
                callback();
            }
        },
        iframeScroll: function (init) {
            var top = $(topWindow.document);
            top.off('scroll.themifybuilderresponsive');
            if (init) {
                top.on('scroll.themifybuilderresponsive', function () {
                    window.scrollTo(0, $(this).scrollTop());
                });
            }
        },
        responsive_grids: function (type, prev) {
            var rows = document.querySelectorAll('.row_inner,.subrow_inner'),
                    is_desktop = type === 'desktop',
                    set_custom_width = is_desktop || prev === 'desktop';
            for (var i = rows.length - 1; i > -1; --i) {
                var base = rows[i].getAttribute('data-basecol');
                if (base !== null) {
                    var columns = rows[i].children,
                            grid = rows[i].dataset['col_' + type],
                            first = columns[0],
                            last = columns[columns.length - 1];
                    if (!is_desktop) {
                        if (prev !== 'desktop') {
                            rows[i].classList.remove('tb_3col');
                            var prev_class = rows[i].getAttribute('data-col_' + prev);
                            if (prev_class) {
                                rows[i].classList.remove($.trim(prev_class.replace('tb_3col', '').replace('mobile', 'column').replace('tablet', 'column')));
                            }
                        }
                        if (!grid || grid === '-auto' || grid===type+'-auto') {
                            rows[i].classList.remove('tb_grid_classes');
                            rows[i].classList.remove('col-count-' + base);
                        }
                        else {
                            var cl = rows[i].getAttribute('data-col_' + type);
                            if (cl) {
                                rows[i].classList.add('tb_grid_classes');
                                rows[i].classList.add('col-count-' + base);
                                cl = cl.split(' ');
                                for (var k = 0, klen = cl.length; k < klen; ++k) {
                                    rows[i].classList.add($.trim(cl[k].replace('mobile', 'column').replace('tablet', 'column')));
                                }
                            }
                        }
                    }
                    if (set_custom_width) {
                        for (var j = 0, clen = columns.length; j < clen; ++j) {
                            var w = $(columns[j]).data('w');
                            if (w !== undefined) {
                                if (is_desktop) {
                                    columns[j].style['width'] = w + '%';
                                }
                                else {
                                    columns[j].style['width'] = '';
                                }
                            }
                        }
                    }
                    var dir = rows[i].getAttribute('data-' + type + '_dir');
                    if (dir === 'rtl') {
                        first.classList.remove('first');
                        first.classList.add('last');
                        last.classList.remove('last');
                        last.classList.add('first');
                        rows[i].classList.add('direction-rtl');
                    }
                    else {
                        first.classList.remove('last');
                        first.classList.add('first');
                        last.classList.remove('first');
                        last.classList.add('last');
                        rows[i].classList.remove('direction-rtl');
                    }
                }
            }
        },
        Panel: {
            el: null,
            init: function () {
                this.el = api.toolbar.$el.find('.tb_toolbar_add_modules_wrap');
                this.el.on('click', '.add_module_btn', this.initEvents.bind(this));
                this.compactToolbar();
                if (api.mode === 'visual') {
                    Common.Lightbox.dockMode.setDoc();
                }
            },
            initEvents: function (e) {
                e.preventDefault();
                e.stopPropagation();
                var type = e.currentTarget.dataset['type'];
                if ('module' === type) {
                    this.add_module(e);
                } else if ('row' === type) {
                    this.click_add_sub_row(e);
                } else if ('page_break' === type) {
                    this.click_add_page_break(e);
                }
                else if ('predesigned' === type) {
                    api.toolbar.preDesignedRows.get(e.currentTarget.closest('.predesigned_row').dataset['slug'], function (data) {
                        var holder = api.Instances.Builder[api.builderIndex].$el.find('.module_row').last();
                        api.Mixins.Builder.rowDrop(data, $('<div>').insertAfter(holder), true);
                    });
                }
            },
            setFocus: function () {
                api.toolbar.el.getElementsByClassName('tb_module_panel_search_text')[0].focus();
            },
            add_module: function (e, holder) {
                e.preventDefault();
                e.stopPropagation();
                if (!holder || holder.length === 0) {
                    holder = api.Instances.Builder[api.builderIndex].newRowAvailable(1, true).find('.tb_holder').first();
                }
                api.Mixins.Builder.moduleDrop($(e.currentTarget).closest('.tb_module'), holder);
            },
            click_add_sub_row: function (e, holder) {
                e.preventDefault();
                e.stopPropagation();
                var is_sub_row = holder ? true : false;
                holder = holder || api.Instances.Builder[api.builderIndex].$el.find('.module_row').last();
                var data = $(e.currentTarget).closest('.tb_row_grid').data('slug');
                if (is_sub_row) {
                    if (holder.hasClass('tb_module_front')) {
                        api.Mixins.Builder.subRowDrop(data, $('<div>').insertAfter(holder));
                    } else {
                        api.Mixins.Builder.subRowDrop(data, $('<div>').appendTo(holder));
                    }
                } else {
                    api.Mixins.Builder.rowDrop(api.Utils.grid(data), $('<div>').insertAfter(holder), true, true);
                }
            },
            click_add_page_break: function (e, holder) {
                e.preventDefault();
                e.stopPropagation();
                holder = holder || api.Instances.Builder[api.builderIndex].$el.find('.module_row').last();
                api.Mixins.Builder.rowDrop(api.toolbar.pageBreakModule.get(), $('<div>').insertAfter(holder), true);
                api.toolbar.pageBreakModule.countModules();
            },
            compactToolbar: function () {
                var barLimit = api.mode === 'visual' ? 850 : 750;
                function callback() {
                    api.toolbar.$el.outerWidth() < barLimit ? topWindow.document.body.classList.add('tb_compact_toolbar') : topWindow.document.body.classList.remove('tb_compact_toolbar');
                    api.toolbar.common.resize();
                }
                $(topWindow).on('tfsmartresize.compact', callback);
                if (api.mode === 'visual') {
                    topWindow.jQuery('body').one('themify_builder_ready', callback);
                }
                else {
                    callback();
                }
            }
        },
        toggleFavoriteModule: function () {
            var $this = $(this),
                    moduleBox = $this.closest('.tb_module_outer'),
                    slug = $this.parent().data('module-slug');

            $.ajax({
                type: 'POST',
                url: themifyBuilder.ajaxurl,
                dataType: 'json',
                data: {
                    action: 'tb_module_favorite',
                    module_name: slug,
                    module_state: +!moduleBox.hasClass('favorited')
                },
                beforeSend: function (xhr) {
                    var prefix = api.Utils.transitionPrefix();
                    function callback(box, repeat) {

                        function finish() {
                            if( !box.length ){
                                return;
                            }
                            if (repeat) {
                                var p = box.closest('#tb_module_panel_dropdown').length > 0 ? api.toolbar.$el : $('#tb_module_panel_dropdown');
                            }
                            box.removeAttr('style');
                            var categories = box.data('categories').split(','),
                                parent = box.closest('.tb_module_panel_modules_wrap'),
                                fav = parent.find( '.tb_module_category_content[data-category="favorite"]' );
                            if ( box.hasClass( 'favorited' ) ) {
                                for ( var i = categories.length - 1; i >= 0; i-- ) {
                                    var cat = parent.find( '.tb_module_category_content[data-category="' + categories[i] + '"]').parent();
                                    cat.find( '.tb_module_outer.tb-module-'+slug ).css( {
                                        opacity: 0,
                                        transform: 'scale(0.5)'
                                    } ).remove();
                                    if(!cat.find( '.tb_module_outer' ).length){
                                        cat.css({display:'none'});
                                    }
                                }
                                fav.parent().css({display:'block'});
                                box.clone().css( {
                                    opacity: 0,
                                    transform: 'scale(0.5)'
                                } ).appendTo( fav ).css( {
                                    opacity: 1,
                                    transform: 'scale(1)'
                                } );
                            } else {
                                for ( var i = categories.length - 1; i >= 0; i-- ) {
                                    var cat = parent.find( '.tb_module_category_content[data-category="' + categories[i] + '"]' ),
                                        cl = box.clone().css( {
                                        opacity: 0,
                                        transform: 'scale(0.5)'
                                    } ).appendTo( cat );
                                    cat.parent().css({display:'block'});
                                    cl.css( {
                                        opacity: 1,
                                        transform: 'scale(1)'
                                    } );
                                }
                            }
                            if (repeat) {
                                callback(p.find('.tb-module-type-' + slug).closest('.tb_module_outer'), false);
                            }
                            box.remove();
                            if(!fav.find( '.tb_module_outer' ).length){
                                fav.parent().css({display:'none'});
                        }
                        }
                        if (box.length && !box.is(':visible')) {
                            box.toggleClass('favorited');
                            finish();
                            return;
                        }
                        box.css({
                            opacity: 0,
                            transform: 'scale(0.5)'
                        }).one(prefix, function () {
                            box.toggleClass('favorited').one(prefix, finish);
                        });
                    }
                    callback(moduleBox, true);
                }
            });
        },
        zoom: function (e) {
            e.preventDefault();
            if ('desktop' !== api.activeBreakPoint)
                return true;
            function callback() {
                api.Utils._onResize(true);
            }
            var $link,
                    $this = $(e.currentTarget),
                    zoom_size = $this.data('zoom'),
                    $canvas = $('.tb_iframe', topWindow.document),
                    $parentMenu = $this.closest('.tb_toolbar_zoom_menu');

            if ($this.hasClass('tb_toolbar_zoom_menu_toggle')) {
                zoom_size = '100' == zoom_size ? 50 : 100;
                $this.data('zoom', zoom_size);
                $link = $this.next('ul').find('[data-zoom="' + zoom_size + '"]');
            } else {
                $link = $this;
                $parentMenu.find('.tb_toolbar_zoom_menu_toggle').data('zoom', zoom_size);
            }

            $canvas.removeClass('tb_zooming_50 tb_zooming_75');
            $link.parent().addClass('selected-zoom-size').siblings().removeClass('selected-zoom-size');
            if ('50' == zoom_size || '75' == zoom_size) {
                var scale = '50' == zoom_size ? 2 : 1.25;
                $canvas.addClass('tb_zooming_' + zoom_size).one(api.Utils.transitionPrefix(), callback).parent().addClass('tb_zoom_bg')
                        .css('height', Math.max(topWindow.innerHeight * scale, 600));
                $parentMenu.addClass('tb_toolbar_zoom_active');
                api.zoomMeta.isActive = true;
                api.zoomMeta.size = zoom_size;
                Themify.body.addClass('tb_zoom_only');
            }
            else {
                $canvas.addClass('tb_zooming_' + zoom_size).one(api.Utils.transitionPrefix(), callback).parent().css('height', '');
                $parentMenu.removeClass('tb_toolbar_zoom_active');
                api.zoomMeta.isActive = false;
                Themify.body.removeClass('tb_zoom_only');
            }
        },
        previewBuilder: function (e) {
            e.preventDefault();
            function hide_empty_rows() {
                if (api.isPreview) {
                    var row_inner = document.getElementsByClassName('row_inner');
                    for (var i = row_inner.length - 1; i > -1; --i) {
                        if (row_inner[i].classList.contains('col-count-1') && row_inner[i].getElementsByClassName('active_module').length === 0) {
                            var column = row_inner[i].getElementsByClassName('module_column')[0],
                                    mcolumn = api.Models.Registry.lookup(column.getAttribute('data-cid'));
                            if (mcolumn && Object.keys(mcolumn.get('styling')).length === 0) {
                                var row = row_inner[i].closest('.module_row'),
                                        mrow = api.Models.Registry.lookup(row.getAttribute('data-cid'));
                                if (mrow && Object.keys(mrow.get('styling')).length === 0) {
                                    row.classList.add('tb_hide');
                                }
                            }

                        }
                    }
                }
                else {
                    $('.tb_hide.module_row').removeClass('tb_hide');
                }
            }
            $(e.currentTarget).toggleClass('tb_toolbar_preview_active');
            api.isPreview = !api.isPreview;
            if (!api.isPreview) {
                api.iframe[0].style['height'] = '';
            }
            Themify.body.toggleClass('tb_preview_only themify_builder_active');
            $('body', topWindow.document).toggleClass('tb_preview_parent');
            hide_empty_rows();
            if (api.mode === 'visual' && !topWindow.document.body.classList.contains('tb_panel_minimized') && Common.Lightbox.dockMode.get()) {
                api.Utils._onResize(true);
            }
            api.vent.trigger('dom:preview');
        },
        toggleAccordion: function (e) {
            $(e.currentTarget).closest('.tb_module_panel_tab_acc_component').toggleClass('tb_collapsed');
        },
        closeFloat: function (e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
                localStorage.setItem('tb_panel_closed', true);
            }
            topWindow.document.body.classList.add('tb_panel_closed');
        },
        openFloat: function (e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
                localStorage.removeItem('tb_panel_closed');
            }
            topWindow.document.body.classList.remove('tb_panel_closed');
            api.toolbar.common.hide(true);
        }
    });


    api.Forms = {
        Data: {},
        Validators: {},
        parseSettings: function (item, repeat) {
            var value = '',
                    cl = item.classList,
                    option_id;
            if (!cl.contains('tb_row_js_wrapper')) {
                var p = item.closest('.tb_field');
                if (p !== null && !p.classList.contains('_tb_hide_binding') && !(p.style['display'] === 'none' && p.className.indexOf('tb_group_element_') !== -1)) {
                    p = p.parentNode;
                    if (p.classList.contains('tb_multi_fields') && p.parentNode.classList.contains('_tb_hide_binding')) {
                        return false;
                    }
                }
            }
            if (repeat) {
                option_id = item.getAttribute('data-input-id');
            }
            else {
                option_id = item.getAttribute('id');
            }
            if (cl.contains('tb_lb_wp_editor')) {
                if (tinyMCE !== undefined) {
                    var tid = item.id,
                            tiny = tinyMCE.get(tid);
                    value = tiny !== null ? (tiny.hidden === false ? tiny.getContent() : switchEditors.wpautop(tinymce.DOM.get(tid).value)) : item.value;
                } else {
                    value = item.value;
                }
            }
            else if (cl.contains('themify-checkbox')) {
                var cselected = [],
                        chekboxes = item.getElementsByClassName('tb-checkbox'),
                        isSwitch = cl.contains('tb_switcher');
                for (var i = 0, len = chekboxes.length; i < len; ++i) {
                    if ((isSwitch === true || chekboxes[i].checked === true) && chekboxes[i].value !== '') {
                        cselected.push(chekboxes[i].value);
                    }
                }
                value = cselected.length > 0 ? cselected.join('|') : isSwitch ? '' : false;
                cselected = chekboxes = null;
            }
            else if (cl.contains('themify-layout-icon')) {
                value = item.getElementsByClassName('selected')[0];
                value = value !== undefined ? value.id : '';
            }
            else if (cl.contains('tb_search_input')) {
                value = item.getAttribute('data-value');
                if (cl.contains('query_category_single')) {
                    var parent = item.closest('.tb_input'),
                            multiple_cat = parent.getElementsByClassName('query_category_multiple')[0];
                    multiple_cat = multiple_cat === undefined ? '' : multiple_cat.value.trim();
                    if (multiple_cat !== '') {
                        value = multiple_cat + '|' + (multiple_cat.indexOf(',') !== -1 ? 'multiple' : 'single');
                    }
                    else {
                        value += '|single';
                    }
                }

            }
            else if (cl.contains('tb_radio_input_container')) {
                var radios = item.getElementsByTagName('input'),
                    input = null;
                for (var i =radios.length-1; i>-1; --i) {
                    if (radios[i].checked === true) {
                        input = radios[i];
                        break;
                    }
                }
                if (input !== null && (api.activeBreakPoint === 'desktop' || !input.classList.contains('responsive_disable'))) {
                    value = input.value;
                }
                input = radios = null;
            }
            else if (cl.contains('tb_search_container')) {
                value = item.previousElementSibling.dataset['value'];
            }
            else if (cl.contains('tb_row_js_wrapper')) {
                value = [];
                var repeats = item.getElementsByClassName('tb_repeatable_field_content');
                for (var i = 0, len = repeats.length; i < len; ++i) {
                    var childs = repeats[i].getElementsByClassName('tb_lb_option_child');
                    value[i] = {};
                    for (var j = 0, clen = childs.length; j < clen; ++j) {
                        var v = this.parseSettings(childs[j], true);
                        if (v) {
                            value[i][v['id']] = v['v'];
                        }
                    }
                }
                repeats = childs = null;
            }
            else if (cl.contains('module-widget-form-container')) {
                value = $(item).find(':input').themifySerializeObject();
            }
            else if (cl.contains('tb_widget_select')) {
                value = item.getElementsByClassName('selected')[0];
                value = value !== undefined ? value.dataset['value'] : '';
            }
            else if (cl.contains('tb_sort_fields_parent')) {
                var childs = item.children,
                        value = [];
                for (var i = 0, len = childs.length; i < len; ++i) {
                    var type = childs[i].getAttribute('data-type');
                    if (type) {
                        var
                                wrap = childs[i].getElementsByClassName('tb_sort_field_dropdown')[0],
                                v = {
                                    'type': type,
                                    'id': childs[i].getAttribute('data-id')
                                };
                        if (wrap !== undefined) {
                            v['val'] = {};
                            var items = wrap.getElementsByClassName('tb_lb_sort_child');
                            for (var j = items.length - 1; j > -1; --j) {
                                var v2 = this.parseSettings(items[j], true);
                                if (v2) {
                                    v['val'][v2['id']] = v2['v'];
                                }
                            }
                        }
                        else {
                            var hidden = childs[i].getElementsByTagName('input')[0],
                                    temp = hidden.value;
                            if (temp !== '') {
                                v['val'] = JSON.parse(temp);
                            }
                        }
                        value.push(v);
                    }
                }

                if (value.length === 0) {
                    value = '';
                }
            }
            else if (cl.contains('tb_accordion_fields')) {
                var childs = item.children,
                    value = {};
                for (var i = 0, len = childs.length; i < len; ++i) {
                    var id = childs[i].getAttribute('data-id');
                    if (id) {
                        var hidden = childs[i].getElementsByTagName('input')[0],
                            wrap = childs[i].getElementsByClassName('tb_accordion_fields_options')[0],
                            v = {};
                        if (wrap !== undefined) {
                            v['val'] = this.serialize(wrap, null, true);
                        }
                        else {
                            var temp = hidden.value;
                            if (temp !== '') {
                                v['val'] = JSON.parse(temp);
                            }
                        }
                        value[id] = v;
                    }
                }
            }
            else if (cl.contains('tb_toggleable_fields')) {
                var childs = item.children,
                        value = {};
                for (var i = 0, len = childs.length; i < len; ++i) {
                    var id = childs[i].getAttribute('data-id');
                    if (id) {
                        var hidden = childs[i].getElementsByTagName('input')[0],
                                wrap = childs[i].getElementsByClassName('tb_toggleable_fields_options')[0],
                                v = {
                                    'on': childs[i].getElementsByClassName('tb_switcher')[0].getElementsByClassName('toggle_switch')[0].value
                                };
                        if (wrap !== undefined) {
                            v['val'] = this.serialize(wrap, null, true);
                        }
                        else {
                            var temp = hidden.value;
                            if (temp !== '') {
                                v['val'] = JSON.parse(temp);
                            }
                        }
                        value[id] = v;
                    }
                }
            }
            else {
                value = item.value;
                if (value !== '') {
                    var opacity = item.getAttribute('data-opacity');
                    if (opacity !== null && opacity !== '' && opacity != 1 && opacity != '0.99') {
                        value += '_' + opacity;
                    }
                }
            }
            if (value === undefined || value === null) {
                value = '';
            }

            return  {'id': option_id, 'v': value};
        },
        serialize: function (id, empty, repeat) {
            var repeat = repeat || false,
                    result = {},
                    el = typeof id === 'object' ? id : topWindow.document.getElementById(id);
            if (el !== null) {
                var options = el.getElementsByClassName((repeat ? 'tb_lb_option_child' : 'tb_lb_option'));
                for (var i = options.length - 1; i > -1; --i) {
                    var v = this.parseSettings(options[i], repeat);
                    if (v !== false && (empty === true || v['v'] !== '')) {
                        result[v['id']] = v['v'];
                    }
                }
            }
            return result;
        },
        LayoutPart: {
            cache: [],
            undo: null,
            old_id: null,
            isReload: null,
            id: null,
            init: false,
            html: null,
            el: null,
            options: null,
            isSaved: null,
            scrollTo: function (prev, breakpoint) {
                api.scrollTo = api.Forms.LayoutPart.el;
            },
            edit: function (item) {
                api.ActionBar.disable=true;
                Common.showLoader('show');
                document.body.classList.add('tb_layout_part_edit');
                if (api.activeModel !== null) {
                    var save = Common.Lightbox.$lightbox[0].getElementsByClassName('builder_save_button')[0];
                    if (save !== undefined) {
                        save.click();
                    }
                    save = null;
                }
                topWindow.document.body.classList.add('tb_layout_part_edit');
                var self = this,
                        $item = $(item).closest('.active_module'),
                        builder = $item.find('.themify_builder_content'),
                        tpl = Common.templateCache.get('tmpl-small_toolbar');
                this.id = builder.data('postid');
                this.old_id = themifyBuilder.post_ID;
                this.init = true;
                this.isSaved = null;
                function callback(data) {
                    api.ActionBar.clear();
                    document.getElementById('themify_builder_content-' + themifyBuilder.post_ID).insertAdjacentHTML('afterbegin', '<div class="tb_overlay"></div>');
                    $item.addClass('tb_active_layout_part').closest('.row_inner').find('.active_module').each(function () {
                        if (!this.classList.contains('tb_active_layout_part')) {
                            this.insertAdjacentHTML('afterbegin', '<div class="tb_overlay"></div>');
                        }
                    });
                    var id = 'themify_builder_content-' + self.id;
                    self.html = $item[0].innerHTML;
                    themifyBuilder.post_ID = ThemifyStyles.builder_id=self.id;
                    $item[0].insertAdjacentHTML('afterbegin', tpl.replace('#postID#', self.id));
                    $('.' + id).each(function () {
                        $(this).closest('.active_module').find('.themify-builder-generated-css').first().prop('disabled', true);
                    });
                    $item.removeClass('active_module module')
                            .closest('.tb_holder').removeClass('tb_holder').addClass('tb_layout_part_parent')
                            .closest('.module_row').addClass('tb_active_layout_part_row');
                    builder.attr('id', id).removeClass('not_editable_builder').addClass('tb_active_builder').empty();

                    self.el = $item;
                    api.id = self.id;
                    var settings = [],
                            items;
                    api.builderIndex = 1;
                    api.Instances.Builder[api.builderIndex] = new api.Views.Builder({el: builder, collection: new api.Collections.Rows(data), type: api.mode});
                    items = api.Instances.Builder[api.builderIndex].render().el.querySelectorAll('[data-cid]');
                    for (var i = 0, len = items.length; i < len; ++i) {
                        settings[items[i].dataset.cid] = 1;
                    }
                    items = null;
                    api.bootstrap(settings, finish);
                    function finish() {
                        $item.triggerHandler('tb_layout_part_before_init');
                        settings = api.activeModel = null;
                        api.Utils.loadContentJs(builder);
                        api.id = false;
                        Themify.body.on('themify_builder_change_mode', self.scrollTo);
                        api.hasChanged = null;
                        api.Instances.Builder[api.builderIndex].$el.triggerHandler('tb_init');
                        $item.find('.tb_toolbar_save').on('click',self.save.bind(self));
                        $item.find('.tb_toolbar_close_btn').on('click',self.close.bind(self));
                        $item.find('.tb_load_layout').on('click',api.Views.Toolbar.prototype.loadLayout);
                        $item.find('.tb_toolbar_import ul a').on('click',api.Views.Toolbar.prototype.import);
                        Common.showLoader('hide');
                        self.init = false;
                        self.undo = api.undoManager.stack;
                        api.undoManager.btnUndo = $item[0].getElementsByClassName('tb_undo_btn')[0];
                        api.undoManager.btnRedo = $item[0].getElementsByClassName('tb_redo_btn')[0];
                        api.undoManager.reset();
                        $item.find('.tb_undo_redo').on('click',function (e) {
                            api.undoManager.do_change(e);
                        });
                        if (api.activeBreakPoint !== 'desktop') {
                            api.Mixins.Builder.updateModuleSort(null, 'disable');
                        }
                        
                        if (api.mode === 'visual') {
                            setTimeout(function () {
                                api.Utils.checkAllimageSize();
                            }, 500);
                        }
                        api.ActionBar.disable=api.ActionBar.hoverCid=null;
                        $item.triggerHandler('tb_layout_part_after_init');
                    }
                }

                if (this.cache[this.id] !== undefined) {
                    callback(this.cache[this.id]);
                    return;
                }
                $.ajax({
                    type: 'POST',
                    dataType: 'json',
                    url: themifyBuilder.ajaxurl,
                    data: {
                        action: 'tb_layout_part_swap',
                        nonce: themifyBuilder.tb_load_nonce,
                        id: self.id
                    },
                    success: function (res) {
                        if (res.data) {
                            self.cache[self.id] = res.data;
                            if (res.gs) {
                                var keys = Object.keys(res.gs);
                                for(var i=keys.length-1;i>-1;--i){
                                    if (api.GS.styles[keys[i]] === undefined) {
                                        api.GS.styles[keys[i]] = res.gs[keys[i]];
                                    }
                                    if ('visual' === api.mode && api.GS.styles[keys[i]].cssLoaded !== true) {
                                        //set live css style
                                        api.liveStylingInstance.setCss(api.GS.styles[keys[i]].data, undefined, api.GS.styles[keys[i]].class);
                                        api.GS.styles[keys[i]].cssLoaded = true;
                                    }
                                }
                            }
                            callback(res.data);
                        }
                    }

                });
            },
            close: function (e) {
                e.preventDefault();
                e.stopPropagation();
                if ((api.hasChanged || api.undoManager.hasUndo()) && this.isSaved === null && !confirm(themifyBuilder.i18n.layoutEditConfirm)) {
                    return;
                }
                if (api.activeModel !== null) {
                    Common.Lightbox.close();
                }
                var self = this,
                        builder = this.el.find('.themify_builder_content');
                if (this.options !== null) {
                    Common.showLoader('show');
                    var module = api.Models.Registry.lookup(this.el.data('cid'));
                    this.cache[this.id] = this.options;
                    $(document).ajaxComplete(function afterRefresh(e, xhr, settings) {
                        if (settings.data.indexOf('tb_load_module_partial', 3) !== -1) {
                            $(this).off('ajaxComplete', afterRefresh);
                            if (xhr.status === 200) {
                                self.el = api.liveStylingInstance.$liveStyledElmt;
                                builder = self.el.children('.themify_builder_content');
                                var html = builder[0].innerHTML,
                                        link = '';
                                self.el.children('.themify-builder-generated-css').each(function () {
                                    link += this.outerHTML;
                                });
                                $('.themify_builder_content-' + self.id).each(function () {
                                    var p = $(this).closest('.module');
                                    p.children('link.themify-builder-generated-css').remove();
                                    if (link !== '') {
                                        p[0].insertAdjacentHTML('afterbegin', link);
                                    }
                                    this.innerHTML = html;
                                    api.Utils.loadContentJs($(this));
                                });
                                link = html = null;
                                Common.showLoader('hide');
                                callback();
                            }
                            else {
                                Common.showLoader('error');
                            }
                        }
                    });
                    var options = $.extend(true, {}, module.get('mod_settings'));
                    options['unsetKey'] = true;
                    module.trigger('custom:preview:refresh', options);
                    options = null;
                }
                else {
                    this.el[0].innerHTML = self.html;
                    callback();
                    $('.themify_builder_content-' + self.id).each(function () {
                        $(this).closest('.active_module').find('.themify-builder-generated-css').removeAttr('disabled');
                    });
                    api.Utils.loadContentJs(builder);
                }
                function callback() {
                    self.el.removeClass('tb_active_layout_part').addClass('active_module module')
                            .closest('.tb_layout_part_parent').addClass('tb_holder').removeClass('tb_layout_part_parent')
                            .closest('.module_row').removeClass('tb_active_layout_part_row');
                    $('#tb_small_toolbar', self.el).remove();
                    var items = builder[0].querySelectorAll('[data-cid]');
                    for (var i = items.length - 1; i > -1; --i) {
                        var cid = items[i].dataset.cid,
                            m = api.Models.Registry.lookup(cid);
                        if (m) {
                            m.destroy();
                            api.Models.Registry.remove(cid);
                        }
                    }
                    items = null;
                    builder.removeAttr('id').addClass('not_editable_builder').removeClass('tb_active_builder');
                    document.body.classList.remove('tb_layout_part_edit');
                    topWindow.document.body.classList.remove('tb_layout_part_edit');
                    $('.tb_overlay').remove();
                    api.undoManager.stack = self.undo;
                    api.undoManager.index = self.undo.length - 1;
                    api.undoManager.btnUndo = api.toolbar.el.getElementsByClassName('tb_undo_btn')[0];
                    api.undoManager.btnRedo = api.toolbar.el.getElementsByClassName('tb_redo_btn')[0];
                    themifyBuilder.post_ID=ThemifyStyles.builder_id = self.old_id;
                    self.undo = self.isSaved = self.old_id = self.html = self.id = self.options = self.isReload = self.el = api.Instances.Builder[api.builderIndex] = null;
                    delete api.Instances.Builder[api.builderIndex];
                    api.builderIndex = 0;
                    Themify.body.off('themify_builder_change_mode', self.scrollTo);
                    api.Mixins.Builder.updateModuleSort();
                    api.undoManager.updateUndoBtns();
                    if (api.activeBreakPoint !== 'desktop') {
                        api.Mixins.Builder.updateModuleSort(null, 'disable');
                    }
                    api.ActionBar.hoverCid=null;
                    api.ActionBar.clear();
                    api.Instances.Builder[api.builderIndex].lastRowAddBtn();
                }
            },
            save: function (e, close) {
                e.preventDefault();
                e.stopPropagation();
                if (api.activeModel !== null) {
                    var save = Common.Lightbox.$lightbox[0].getElementsByClassName('builder_save_button')[0];
                    if (save !== undefined) {
                        save.click();
                    }
                    save = null;
                }
                if (api.undoManager.hasUndo() || this.isReload !== null || close) {
                    var self = this;
                    this.html = null;
                    this.old_settings = null;
                    Common.showLoader('show');
                    api.Utils.saveBuilder(function (res) {
                        if (res.success) {
                            self.options = res.data.builder_data;
                            api.hasChanged = null;
                            self.isSaved = true;
                            if (close) {
                                self.close(e);
                            }
                        }
                    }, 1);
                }
                else {
                    Common.showLoader('show');
                    setTimeout(function () {
                        Common.showLoader('hide');
                    }, 100);
                }
            }
        },
        reLoad: function (data, id, callback) {

            var is_layout_part = api.Forms.LayoutPart.id !== null,
                    index = api.builderIndex,
                    settings = null,
                    el = '';

            api.Mixins.Builder.updateModuleSort(null, 'destroy');
            if (!is_layout_part) {
                api.Models.Registry.destroy();
                api.Instances.Builder = {};
            }
            if (api.mode === 'visual') {
                el = '#themify_builder_content-' + id;
                api.id = id;
                if (!is_layout_part) {
                    api.liveStylingInstance.reset();
                    api.editing = false;
                    Themify.body.addClass('sidebar-none full_width');
                    $('#sidebar,.page-title').remove();
                }
            }
            else {
                el = '#tb_row_wrapper';
            }
            if (is_layout_part) {
                var items = api.Instances.Builder[index].el.querySelectorAll('[data-cid]');
                api.Forms.LayoutPart.isReload = true;
                for (var i = 0, len = items.length; i < len; ++i) {
                    var cid = items[i].dataset.cid,
                            m = api.Models.Registry.lookup(cid);
                    if (m) {
                        m.destroy();
                        api.Models.Registry.remove(cid);
                    }
                }
                items = null;
                api.Instances.Builder[index].$el.empty();
            }
            api.Instances.Builder[index] = new api.Views.Builder({el: el, collection: new api.Collections.Rows(data), type: api.mode});
            api.Instances.Builder[index].render();
            api.undoManager.reset();
            if (is_layout_part) {
                settings = [];
                items = api.Instances.Builder[index].el.querySelectorAll('[data-cid]');
                for (var i = 0, len = items.length; i < len; ++i) {
                    settings[items[i].dataset.cid] = 1;
                }
                items = null;
            }
            if (api.mode === 'visual') {
                api.bootstrap(settings, finish);
            }
            else {
                finish();
            }

            function finish() {
                if (api.mode === 'visual') {
                    api.liveStylingInstance.setCss(api.Mixins.Builder.toJSON(api.Instances.Builder[index].el));
                    api.Utils.loadContentJs(api.Instances.Builder[index].$el);
                    api.id = false;
                }
                api.Instances.Builder[api.builderIndex].$el.triggerHandler('tb_init');
                Common.showLoader('hide');
                if (api.mode === 'visual' && api.activeBreakPoint !== 'desktop') {
                    $('body', topWindow.document).height(document.body.scrollHeight);
                    setTimeout(function () {
                        $('body', topWindow.document).height(document.body.scrollHeight);
                    }, 2000);
                }
                if (callback) {
                    callback();
                }
                api.hasChanged = true;
                if (api.mode === 'visual') {
                    setTimeout(function () {
                        api.Utils.checkAllimageSize();
                    }, 500);
                }
            }
        },
        isValidate: function (form) {
            var validate = form.getElementsByClassName('tb_must_validate'),
                    len = validate.length;
            if (len === 0) {
                return true;
            }
            var checkValidate = function (rule, value) {
                var validator = api.Forms.get_validator(rule);
                return validator(value);
            },
                    is_error = true;
            for (var i = len - 1; i > -1; --i) {
                var item = validate[i].getElementsByClassName('tb_lb_option')[0];
                if (!checkValidate(validate[i].getAttribute('data-validation'), item.value)) {
                    if (!item.classList.contains('tb_field_error')) {
                        var el = document.createElement('span');
                        el.className = 'tb_field_error_msg';
                        el.textContent = validate[i].getAttribute('data-error-msg');
                        item.classList.add('tb_field_error');
                        var after = item.tagName === 'SELECT' ? item.parentNode : item;
                        after.parentNode.insertBefore(el, after.nextSibling);
                    }
                    is_error = false;
                }
                else {
                    item.classList.remove('tb_field_error');
                    var er = validate[i].getElementsByClassName('tb_field_error_msg');
                    for (var j = er.length - 1; j > -1; --j) {
                        er[j].parentNode.removeChild(er[j]);
                    }
                }
            }
            if (is_error === false) {
                var tab = Common.Lightbox.$lightbox.find('[href="#' + form.getAttribute('id') + '"]')[0];
                if (!tab.parentNode.classList.contains('current')) {
                    tab.click();
                }
            }
            return is_error;
        }
    };

    api.Utils = {
        onResizeEvents: [],
        gridClass: ['col-full', 'col2-1', 'col3-1', 'col4-1', 'col5-1', 'col6-1', 'col4-2', 'col4-3', 'col3-2'],
        _onResize: function (trigger, callback) {
            var events = $._data(window, 'events')['resize'];
            $(topWindow).off('tfsmartresize.tb_visual').on('tfsmartresize.tb_visual', function (e) {
                if (tbLocalScript.fullwidth_support === '') {
                    $(window).triggerHandler('tfsmartresize.tbfullwidth');
                    $(window).triggerHandler('tfsmartresize.tfVideo');
                }
            })
                    .off('tfsmartresize.zoom').on('tfsmartresize.zoom', function () {
                if (api.zoomMeta.isActive) {
                    var scale = '50' == api.zoomMeta.size ? 2 : 1.25;
                    $('.tb_workspace_container', topWindow.document).css('height', Math.max(topWindow.innerHeight * scale, 600));
                }
            });
            if (events !== undefined) {
                for (var i = 0, len = events.length; i < len; ++i) {
                    if (events[i].handler !== undefined) {
                        this.onResizeEvents.push(events[i].handler);
                    }
                }
            }
            $(window).off('resize');
            if (trigger) {
                var e = $.Event('resize', {type: 'resize', isTrigger: false});
                for (var i = 0, len = this.onResizeEvents.length; i < len; ++i) {
                    try {
                        this.onResizeEvents[i].apply(window, [e, $]);
                    }
                    catch (e) {
                    }
                }
                if (typeof callback === 'function') {
                    callback();
                }
            }

        },
        _addNewColumn: function (params, $context) {
            var columnView = api.Views.init_column({grid_class: params.newclass, component_name: params.component});
            $context.appendChild(columnView.view.render().el);
        },
        filterClass: function (str) {
            var n = str.split(' '),
                    new_arr = [];

            for (var i = n.length - 1; i > -1; --i) {
                if (this.gridClass.indexOf(n[i]) !== -1) {
                    new_arr.push(n[i]);
                }
            }
            return new_arr.join(' ');
        },
        _getRowSettings: function (base, type) {
            var cols = {},
                    type = type || 'row',
                    option_data = {},
                    styling,
                    model_r = api.Models.Registry.lookup(base.getAttribute('data-cid'));
            if (model_r) {
                // cols
                var inner = base.getElementsByClassName(type + '_inner')[0],
                        columns = inner.children,
                        that = this,
                        getModules = function (modules) {
                            modules = modules.children;
                            for (var j = 0, clen = modules.length; j < clen; ++j) {
                                if (!modules[j].classList.contains('active_module')) {
                                    getModules(modules[j]);
                                }
                                var module_m = api.Models.Registry.lookup(modules[j].getAttribute('data-cid'));
                                if (module_m) {
                                    styling = module_m.get('mod_settings');
                                    var k = items.push({mod_name: module_m.get('mod_name'), element_id: module_m.get('element_id')}) - 1;
                                    if (styling && Object.keys(styling).length > 0) {
                                        delete styling['cid'];
                                        items[k]['mod_settings'] = styling;
                                    }
                                    // Sub Rows
                                    if (modules[j].classList.contains('module_subrow')) {
                                        items[k] = that._getRowSettings(modules[j], 'subrow');
                                    }
                                }
                            }
                        };
                for (var i = 0, len = columns.length; i < len; ++i) {
                    var modules = {},
                            model_c = api.Models.Registry.lookup(columns[i].getAttribute('data-cid'));
                    if (model_c) {
                        // mods
                        var modules = columns[i].getElementsByClassName('tb_holder')[0],
                                items = [];
                        if (modules !== undefined) {
                            getModules(modules);
                        }
                        cols[i] = {
                            element_id: model_c.get('element_id'),
                            grid_class: this.filterClass(columns[i].className)
                        };
                        if (items && items.length > 0) {
                            cols[i]['modules'] = items;
                        }
                        var custom_w = parseFloat(columns[i].style.width);
                        if (custom_w > 0 && !isNaN(custom_w)) {
                            cols[i]['grid_width'] = custom_w;
                        }
                        styling = model_c.get('styling');
                        if (styling && Object.keys(styling).length > 0) {
                            delete styling['cid'];
                            cols[i]['styling'] = styling;
                        }
                    }
                }

                option_data = {
                    element_id: model_r.get('element_id'),
                    cols: cols,
                    column_alignment: model_r.get('column_alignment'),
                    gutter: model_r.get('gutter'),
                    column_h: model_r.get('column_h')
                };
                var default_data = {
                    gutter: 'gutter-default',
                    column_alignment: is_fullSection ? 'col_align_middle' : 'col_align_top'
                },
                row_opt = {
                    desktop_dir: 'ltr',
                    tablet_dir: 'ltr',
                    tablet_landscape_dir: 'ltr',
                    mobile_dir: 'ltr',
                    col_tablet_landscape: '-auto',
                    col_tablet: '-auto',
                    col_mobile: '-auto'
                };
                for (var i in option_data) {
                    if (option_data[i] === '' || option_data[i] === null || option_data[i] === default_data[i]) {
                        delete option_data[i];
                    }
                }
                styling = model_r.get('styling');
                for (var i in row_opt) {
                    var v = inner.getAttribute('data-' + i);
                    if (v !== null && v !== '' && v !== row_opt[i]) {
                        if(row_opt[i]==='-auto' && v.indexOf('-auto')!==-1){
                            continue;
                        }
                        option_data[i] = v.trim();
                    }
                }
                if (styling && Object.keys(styling).length > 0) {
                    delete styling['cid'];
                    option_data['styling'] = styling;
                }

            }
            return option_data;
        },
        selectedGridMenu: function (row, handle) {
            var points = ThemifyConstructor.breakpointsReverse,
                    model = api.Models.Registry.lookup(row.getAttribute('data-cid')),
                    inner = row.getElementsByClassName(handle + '_inner')[0],
                    gutter = model.get('gutter'),
                    column_aligment = model.get('column_alignment'),
                    column_h = model.get('column_h'),
                    dir = model.get('desktop_dir'),
                    styling = handle === 'row' ? model.get('styling') : null,
                    cl = [],
                    attr = {},
                    columns = inner.children;
            for (var j = 0, clen = columns.length; j < clen; ++j) {
                columns[j].className = columns[j].className.replace(/first|last/ig, '');
                if (clen !== 1) {
                    if (j === 0) {
                        columns[j].className += dir === 'rtl' ? ' last' : ' first';
                    }
                    else if (j === (clen - 1)) {
                        columns[j].className += dir === 'rtl' ? ' first' : ' last';
                    }
                }
            }
            var col = columns.length;
            cl.push('col-count-' + col);
            attr['data-basecol'] = col;

            if (styling !== null && styling['row_anchor'] !== undefined && styling['row_anchor'] !== '') {
                row.getElementsByClassName('tb_row_anchor')[0].textContent = styling['row_anchor'];
            }
            columns = styling = col = null;
            if (gutter !== 'gutter-default') {
                cl.push(gutter);
            }
            if (column_h) {
                cl.push('col_auto_height');
            }
            if (!column_aligment) {
                column_aligment = 'col_align_top';
            }
            cl.push(column_aligment);
            if (dir !== 'ltr') {
                cl.push('direction-rtl');
            }

            for (var i = points.length - 1; i > -1; --i) {
                var dir = model.get(points[i] + '_dir');
                if (dir !== 'ltr' && dir !== '') {
                    attr['data-' + points[i] + '_dir'] = dir;
                }
                if (points[i] !== 'desktop') {
                    var col = model.get('col_' + points[i]);
                    if (col !== '-auto' && col !== '' && col !== undefined) {
                        attr['data-col_' + points[i]] = col;
                    }
                }
            }
            for (var j = cl.length - 1; j > -1; --j) {
                if (cl[j]) {
                    inner.classList.add(cl[j]);
                }
            }
            for (var j in attr) {
                inner.setAttribute(j, attr[j]);
            }
        },
        clear: function (items, is_array, level) {
            if(is_array===undefined){
                is_array=Array.isArray(items);
            }
            var res = is_array===true? [] : {};
            
            for (var i in items) {
                if (Array.isArray(items[i])) {
                    var data = this.clear(items[i], true, 1);
                    if (data.length > 0) {
                        if(is_array===true){
                            res.push(data);
                        }
                        else{
                            res[i] = data;
                        }
                    }
                }
                else if (typeof items[i] === 'object') {
                    var data = this.clear(items[i], false, 1);
                    if (!$.isEmptyObject(data)) {
                        res[i] = data;
                    }
                }
                else if (items[i] !== null && items[i] !== undefined && items[i] !== '' && items[i] !== 'def' && i !== '' && items[i] !== 'pixels' && items[i] !== 'default' && items[i] !== '|') {
                    if ((items[i] === 'show' && i.indexOf('visibility_') === 0) || (i === 'unstick_when_condition' && items[i] === 'hits') || ((i === 'stick_at_pos_val_unit' || i === 'unstick_when_pos_val_unit') && items[i] === 'px')) {
                        continue;
                    }
                    else if (i === 'custom_parallax_scroll_speed' && (!items[i] || items[i] == '0')) {
                        delete res['custom_parallax_scroll_reverse'];
                        delete res['custom_parallax_scroll_fade'];
                        delete res[i];
                        delete items['custom_parallax_scroll_reverse'];
                        delete items['custom_parallax_scroll_fade'];
                        delete items[i];
                        continue;
                    }
                    else if ((i === 'unstick_when_element' && items[i] === 'builder_end') || (i === 'stick_at_check' && items[i] !== 'stick_at_check')) {
                        delete res['unstick_when_el_row_id'];
                        delete res['unstick_when_el_mod_id'];
                        delete res['unstick_when_condition'];
                        delete items['unstick_when_el_row_id'];
                        delete items['unstick_when_el_mod_id'];
                        delete items['unstick_when_condition'];

                        delete res['unstick_when_pos'];
                        delete res['unstick_when_pos_val'];
                        delete res['unstick_when_element'];
                        delete res['unstick_when_pos_val_unit'];
                        delete items['unstick_when_pos'];
                        delete items['unstick_when_pos_val'];
                        delete items['unstick_when_pos_val_unit'];
                        delete items['unstick_when_element'];

                        if (i === 'stick_at_check') {
                            delete items[i];
                            delete res[i];
                            delete items['stick_at_position'];
                            delete res['stick_at_position'];
                        }
                        continue;
                    }
                    else if ((i==='stick_at_position' && items[i]==='top') || (i==='__dc__' && items[i]==='{}')  || i === 'background_gradient-css' || i === 'cover_gradient-css' || i === 'cover_gradient_hover-css' || i === 'background_image-type_image' || i === 'custom_parallax_scroll_reverse_reverse' || items[i] === '|single' || items[i] === '|multiple' || ((i === 'custom_parallax_scroll_reverse' || i === 'custom_parallax_scroll_fade' || i === 'visibility_all' || i === 'sticky_visibility') && !items[i])) {
                        delete items[i];
                        delete res[i];
                        continue;
                    }
                    else if (level === 1) {
                        var opt = [];

                        if (items[i] === 'px' && i.indexOf('_unit', 2) !== -1) {
                            var id = i.replace('_unit', '');
                            if (!items[id]) {
                                opt.push(i);
                            }
                        }
                        else if (i.indexOf('checkbox_') === 0 && i.indexOf('_apply_all', 6) !== -1) {
                            if (!items[i]) {
                                opt.push(i);
                            }
                            else {
                                res[i] = items[i];
                            }
                            var id = i.replace('_apply_all', '').replace('checkbox_', ''),
                                    side = ['top', 'left', 'right', 'bottom'];
                            for (var j = 3; j > -1; --j) {
                                var tmpId = id + '_' + side[j] + '_unit';
                                if (items[tmpId] === 'px') {
                                    opt.push(tmpId);
                                }
                                else if (items[tmpId] !== undefined && items[tmpId] !== null && items[tmpId] !== '') {
                                    res[tmpId] = items[tmpId];
                                }
                            }
                        }
                        else if (i.indexOf('gradient', 3) !== -1) {
                            if (items[i] == '180' || items[i] === 'linear' || items[i] === $.ThemifyGradient.default || (items[i] === false && i.indexOf('-circle-radial', 3) !== -1)) {
                                opt.push(i);
                            }
                        }
                        else if ((i === 'background_zoom' && items[i] === '') || items[i] === 'solid' || (items[i] === false && (i.indexOf('_user_role', 3) !== -1 || i.indexOf('_appearance', 3) !== -1))) {
                            opt.push(i);
                        }
                        if (opt.length > 0) {
                            for (var j = opt.length - 1; j > -1; --j) {
                                delete res[opt[j]];
                                delete items[opt[j]];
                            }
                            opt.length = 0;
                            opt = [];
                            continue;
                        }

                    }
                    if(is_array===true){
                        res.push(items[i]);
                    }
                    else{
                        res[i] = items[i];
                    }
                }

            }
            return res;
        },
        clearElementId: function (data, _new) {
            for (var i in data) {
                if (_new === true) {
                    data[i]['element_id'] = api.Utils.generateUniqueID();
                }
                else {
                    delete data[i]['element_id'];
                }
                var opt = data[i]['styling'] !== undefined ? data[i]['styling'] : data[i]['mod_settings'];
                if (opt !== undefined) {
                    if(opt['custom_css_id'] !== undefined && opt['custom_css_id'] !== ''){
                        var j = 2;
                        while (true) {
                            var id = opt['custom_css_id'] + '-' + j.toString(),
                                    el = document.getElementById(id);
                            if (el === null || el.closest('.module_row') === null) {
                                opt['custom_css_id'] = id;
                                break;
                            }
                            ++j;
                        }
                    }
             
                    if(opt['builder_content']!==undefined){
                        var bulder = JSON.parse(opt['builder_content']);
                        this.clearElementId(bulder, true);
                        opt['builder_content']=JSON.stringify(bulder);
                    }
                }
                if (data[i]['cols'] !== undefined) {
                    this.clearElementId(data[i]['cols'], _new);
                }
                else if (data[i]['modules'] !== undefined) {
                    this.clearElementId(data[i]['modules'], _new);
                }
            }
        },
        clearLastEmptyRow: function (rows) {
            for (var i = rows.length - 1; i > -1; --i) {
                var styles = rows[i]['attributes'] !== undefined ? rows[i]['attributes'] : rows[i];
                if (styles['styling'] === undefined || styles['styling'] === null || Object.keys(styles['styling']).length === 0) {
                    var cols = styles['cols'],
                            isEmpty = true;
                    for (var j in cols) {
                        if ((cols[ j ].modules !== undefined && (cols[ j ].modules.length > 0 || Object.keys(cols[ j ].modules).length > 0)) || (cols[j].styling !== undefined && cols[j].styling !== null && Object.keys(cols[ j ].styling).length > 0)) {
                            isEmpty = false;
                            break;
                        }
                    }
                    if (isEmpty === true) {
                        if (rows[i].cid !== undefined) {
                            api.Models.Registry.remove(rows[i].cid);
                            rows[i].destroy();
                        }
                        rows.splice(i, 1);
                    }
                    else {
                        break;
                    }
                }
                else {
                    break;
                }
            }
        },
        builderPlupload: function (action_text, importBtn) {
            var is_import = importBtn ? true : false,
                    items = is_import ? [importBtn] : Common.Lightbox.$lightbox[0].getElementsByClassName('tb_plupload_upload_uic'),
                    len = items.length;
            if (len > 0) {
                var cl = is_import ? false : (action_text === 'new_elemn' ? '.plupload-clone' : false);
                if (this.pconfig === undefined) {
                    this.pconfig = JSON.parse(JSON.stringify(themify_builder_plupload_init));
                    this.pconfig['multipart_params']['_ajax_nonce'] = themifyBuilder.tb_load_nonce;
                    this.pconfig['multipart_params']['topost'] = themifyBuilder.post_ID;
                }
                for (var i = len - 1; i > -1; --i) {
                    if (!items[i].classList.contains('tb_plupload_init') && (cl === false || items[i].classList.contains(cl))) {
                        var _this = items[i],
                                imgId = _this.getAttribute('id').replace('tb_plupload_upload_ui', ''),
                                config = $.extend(true, {}, this.pconfig),
                                ext = _this.getAttribute('data-extensions'),
                                parts = ['browse_button', 'container', 'drop_element', 'file_data_name'];
                        config['multipart_params']['imgid'] = imgId;
                        for (var j = parts.length - 1; j > -1; --j) {
                            config[parts[j]] = imgId + this.pconfig[parts[j]];
                        }

                        if (ext !== null) {
                            config['filters'][0]['extensions'] = ext;
                        }
                        else {
                            config['filters'][0]['extensions'] = api.activeModel !== null ?
                                    config['filters'][0]['extensions'].replace(/\,zip|\,txt/, '')
                                    : 'zip,txt';
                        }
                        var uploader = new topWindow.plupload.Uploader(config);

                        _this.classList.add('tb_plupload_init');
                        if (is_import) {
                            uploader.bind('init', function (up) {
                                $(up.settings.browse_button).click();
                            });
                        }
                        // a file was added in the queue
                        uploader.bind('FilesAdded', function (up, files) {
                            up.refresh();
                            up.start();
                            Common.showLoader('show');
                        });

                        uploader.bind('Error', function (up, error) {
                            var $promptError = $('.prompt-box .show-error');
                            $('.prompt-box .show-login').hide();
                            $promptError.show();

                            if ($promptError.length > 0) {
                                $promptError.html('<p class="prompt-error">' + error.message + '</p>');
                            }
                            $('.overlay, .prompt-box').fadeIn(500);
                        });

                        // a file was uploaded
                        uploader.bind('FileUploaded', function (up, file, response) {
                            var json = JSON.parse(response['response']),
                                    alertData = $('#tb_alert', topWindow.document),
                                    status = 200 === response['status'] && !json.error ? 'done' : 'error';
                            if (json.error) {
                                Common.showLoader(status);
                                alert(json.error);
                                return;
                            }
                            if (is_import) {
                                var before = $('#tb_row_wrapper').children().clone(true);
                                alertData.promise().done(function () {
                                    api.Forms.reLoad(json.builder_data, themifyBuilder.post_ID);
                                    var after = $('#tb_row_wrapper').children().clone(true);
                                    Common.Lightbox.close();
                                    if ('visual' === api.mode && undefined !== json.gsType) {
                                        themifyBuilder.globalStyleData.type = json.gsType;
                                    }
                                    if (json.used_gs) {
                                        var keys = Object.keys(json.used_gs);
                                        for(var i=keys.length-1;i>-1;--i){
                                            if (api.GS.styles[keys[i]] == undefined) {
                                                api.GS.styles[keys[i]] = json.used_gs[keys[i]];
                                            }
                                            if ('visual' === api.mode && api.GS.styles[keys[i]].cssLoaded !== true) {
                                                //set live css style
                                                api.liveStylingInstance.setCss(api.GS.styles[keys[i]].data, undefined, api.GS.styles[keys[i]].class);
                                                api.GS.styles[keys[i]].cssLoaded = true;
                                            }
                                        }
                                    }
                                    api.undoManager.push('', '', '', 'import', {before: before, after: after, bid: themifyBuilder.post_ID});
                                });
                            }
                            else {
                                Common.showLoader(status);
                                var parent = this.getOption().container.closest('.tb_input'),
                                        input = parent.getElementsByClassName('tb_uploader_input')[0],
                                        placeHolder = parent.getElementsByClassName('thumb_preview')[0];
                                input.value = json.large_url ? json.large_url : json.url;
                                if (placeHolder !== undefined) {
                                    ThemifyConstructor.file.setImage(placeHolder, json.thumb);
                                }

                                Themify.triggerEvent(input, 'change');
                            }
                        });
                        uploader.init();
                        _this.classList.remove('plupload-clone');
                    }
                }
            }
        },
        columnDrag: function ($container, $remove, old_gutter, new_gutter) {
            var self = this;
            if ($remove) {
                var columns = $container ? $container.children('.module_column') : $('.module_column');
                columns.css('width', '');
                self.setCompactMode(columns);
            }
            var _margin = {
                default: 3.2,
                narrow: 1.6,
                none: 0
            };
            if (old_gutter && new_gutter) {
                var cols = $container.children('.module_column'),
                        new_margin = new_gutter === 'gutter-narrow' ? _margin.narrow : (new_gutter === 'gutter-none' ? _margin.none : _margin.default),
                        old_margin = old_gutter === 'gutter-narrow' ? _margin.narrow : (old_gutter === 'gutter-none' ? _margin.none : _margin.default),
                        margin = old_margin - new_margin;
                margin = parseFloat((margin * (cols.length - 1)) / cols.length);
                cols.each(function (i) {
                    if ($(this).prop('style').width) {
                        var w = parseFloat($(this).prop('style').width) + margin;
                        $(this).css('width', w + '%');
                    }
                });
                return;
            }
            var $cdrags = $container ? $container.children('.module_column').find('.tb_grid_drag') : $('.tb_grid_drag'),
                    _cols = {
                        default: {'col6-1': 14, 'col5-1': 17.44, 'col4-1': 22.6, 'col4-2': 48.4, 'col2-1': 48.4, 'col4-3': 74.2, 'col3-1': 31.2, 'col3-2': 65.6},
                        narrow: {'col6-1': 15.33, 'col5-1': 18.72, 'col4-1': 23.8, 'col4-2': 49.2, 'col2-1': 49.2, 'col4-3': 74.539, 'col3-1': 32.266, 'col3-2': 66.05},
                        none: {'col6-1': 16.666, 'col5-1': 20, 'col4-1': 25, 'col4-2': 50, 'col2-1': 50, 'col4-3': 75, 'col3-1': 33.333, 'col3-2': 66.666}
                    },
            min = 5;
            $cdrags.each(function () {

                var $el,
                        $row,
                        $columns,
                        $current,
                        elWidth = 0,
                        dir,
                        cell = false,
                        cell_w = 0,
                        before = false,
                        $helperClass,
                        row_w,
                        dir_rtl,
                        tooltip1 = null,
                        tooltip2 = null,
                        startW;
                $(this).draggable({
                    axis: 'x',
                    cursor: 'col-resize',
                    distance: 0,
                    scroll: false,
                    snap: false,
                    containment: '.row_inner',
                    helper: function (e) {
                        $el = $(e.currentTarget);
                        $row = $el.closest('.subrow_inner');
                        if ($row.length === 0) {
                            $row = $el.closest('.row_inner');
                        }
                        dir = $el[0].classList.contains('tb_drag_right') ? 'w' : 'e';
                        $helperClass = dir === 'w' ? 'tb_grid_drag_right_tooltip' : 'tb_grid_drag_left_tooltip',
                                before = Common.clone($row.closest('.module_row'));

                        $row.addClass('tb_drag_column_start');
                        return $('<div class="ui-widget-header tb_grid_drag_tooltip ' + $helperClass + '"></div><div class="ui-widget-header tb_grid_drag_tooltip"></div>');
                    },
                    start: function (e, ui) {
                        api.ActionBar.disable=true;
                        api.ActionBar.clear();
                        $columns = $row.children('.module_column');
                        $current = $el.closest('.module_column');
                        dir_rtl = $row[0].classList.contains('direction-rtl');
                        if (dir === 'w') {
                            cell = dir_rtl ? $current.prev('.module_column') : $current.next('.module_column');
                            elWidth = $el.outerWidth();
                            startW = $current.outerWidth();
                        }
                        else {
                            cell = dir_rtl ? $current.next('.module_column') : $current.prev('.module_column');
                            elWidth = $current.outerWidth();
                            startW = elWidth;
                        }
                        elWidth = parseInt(elWidth);
                        cell_w = parseInt(cell.outerWidth())-2;
                        row_w = $row.outerWidth();
                        tooltip1 = $current.addClass('tb_drag_column_current').children('.' + $helperClass)[0];
                        tooltip2=$current.children('.tb_grid_drag_tooltip').last()[0];
                    },
                    stop: function (e, ui) {
                        $('.tb_grid_drag_tooltip').remove();
                        $row.removeClass('tb_drag_column_start');
                        var percent = Math.ceil(100 * ($current.outerWidth() / row_w));
                        $current.removeClass('tb_drag_column_current').css('width', percent + '%');
                        var cols = _cols.default,
                                margin = _margin.default;
                        if ($row[0].classList.contains('gutter-narrow')) {
                            cols = _cols.narrow;
                            margin = _margin.narrow;
                        }
                        else if ($row[0].classList.contains('gutter-none')) {
                            cols = _cols.none;
                            margin = _margin.none;
                        }
                        var cellW = margin * ($columns.length - 1);
                        $columns.each(function (i) {
                            if (i !== cell.index()) {
                                var w;
                                if ($(this).prop('style').width) {
                                    w = parseFloat($(this).prop('style').width);
                                }
                                else {
                                    var col = $.trim(self.filterClass($(this).attr('class')).replace('first', '').replace('last', ''));
                                    w = cols[col];
                                }
                                cellW += w;
                            }
                        });
                        cell.css('width', (100 - cellW) + '%');
                        cell = cell.add($current);
                        self.setCompactMode(cell);
                        var after = $row.closest('.module_row'),
                            isChanged = true === api.hasChanged;
                        api.hasChanged = true;
                        api.undoManager.push(after.data('cid'), before, after, 'row');
                        api.hasChanged=isChanged;
                        Themify.body.triggerHandler('tb_grid_changed', [after]);
                        setTimeout(function(){
                            api.ActionBar.disable=null;
                        },5);
                        tooltip1=tooltip2=elWidth=cell_w=row_w=startW=cell=$helperClass=$current=dir=dir_rtl=$row=$columns=null;
                    },
                    drag: function (e, ui) {
                        if (cell && cell.length > 0) {
                            var left = parseInt(ui.position.left),
                                    px = elWidth + (dir === 'e' ? -(left) : left),
                                    width = parseFloat((100 * px) / row_w);
                            if (width >= min && width < 100) {
                                var max = cell_w;
                                max += (dir === 'w' ? -(px - startW) : (startW - px));
                                var max_percent = parseFloat((100 * max) / row_w);
                                if (max_percent > min && max_percent < 100) {
                                    cell.css('width', max + 'px');
                                    $current.css('width', px + 'px');
                                    tooltip1.innerHTML = width.toFixed(2) + '%';
                                    tooltip2.innerHTML = max_percent.toFixed(2) + '%';
                                }
                            }
                        }

                    }

                });
            });
        },
        grid: function (slug) {
            var cols = [];
            slug = parseInt(slug);
            if (slug === 1) {
                cols.push({"grid_class": "col-full"});
            } else {
                for (var i = 0; i < slug; ++i) {
                    cols.push({"grid_class": "col" + slug + "-1"});
                }
            }

            return [{"cols": cols}];
        },
        setCompactMode: function (col) {
            if (col instanceof jQuery) {
                col = col.get();
            }
            for (var i = col.length - 1; i > -1; --i) {
                if (col[i].clientWidth < 185) {
                    col[i].classList.add('compact-mode');
                }
                else {
                    col[i].classList.remove('compact-mode');
                }
            }
        },
        initNewEditor: function (editor_id) {
            // v4 compatibility
            if (parseInt(tinyMCE.majorVersion) > 3) {
                var settings = tinyMCEPreInit.mceInit['tb_lb_hidden_editor'];
                settings['elements'] = editor_id;
                settings['selector'] = '#' + editor_id;
                // Creates a new editor instance
                var ed = new tinyMCE.Editor(editor_id, settings, tinyMCE.EditorManager);
                ed.render();
                return ed;
            }
        },
        initQuickTags: function (editor_id) {
            // add quicktags
            if (typeof topWindow.QTags === 'function') {
                topWindow.quicktags({id: editor_id});
                topWindow.QTags._buttonsInit();
            }
        },
        _getColClass: function (classes) {
            for (var i = 0, len = classes.length; i < len; ++i) {
                if (this.gridClass.indexOf(classes[i]) !== -1) {
                    return classes[i].replace('col', '');
                }
            }
        },
        saveBuilder: function (callback, i, onlyData) {
            i = i || 0;
            if (i === 0) {
                if ( api.activeModel !== null || (Common.Lightbox.$lightbox.length>0 && Common.Lightbox.$lightbox[0].classList.contains( 'tb_custom_css_lightbox' )) ) {
              
                    var save = Common.Lightbox.$lightbox[0].getElementsByClassName('builder_save_button')[0];
                    if (save !== undefined) {
                        save.click();
                    }
                    save = null;
                }
                Common.showLoader('show');
            }
            var len = Object.keys(api.Instances.Builder).length,
                    view = api.Instances.Builder[i],
                    self = this,
                    id = view.$el.data('postid'),
                    data = api.Mixins.Builder.toJSON(view.el);

            function sendData(id, data) {
                var css = ThemifyStyles.createCss(data, null, true);
                data = api.Utils.clear(data);
                // Check and attach used GS in this post
                if (Object.keys(api.GS.styles).length) {
                    var used_gs = api.GS.findUsedItems(data);
                    if (used_gs !== false) {
                        css = api.GS.attachCSS(css, used_gs);
                    }
                }
                var sendData = {
                    action: 'tb_save_data',
                    tb_load_nonce: themifyBuilder.tb_load_nonce,
                    id: id,
                    data: JSON.stringify(data),
                    custom_css: customCss ,
                    sourceEditor: 'visual' === api.mode ? 'frontend' : 'backend'
                };
                if (onlyData) {
                    sendData.only_data = onlyData;
                }
                $.ajax({
                    type: 'POST',
                    url: themifyBuilder.ajaxurl,
                    cache: false,
                    data: {
                        css: JSON.stringify(css),
                        action: 'tb_save_css',
                        custom_css: customCss ,
                        tb_load_nonce: sendData.tb_load_nonce,
                        id: sendData.id
                    }
                });
                css = null;
                return $.ajax({
                    type: 'POST',
                    url: themifyBuilder.ajaxurl,
                    cache: false,
                    data: sendData
                });
            }
            sendData(id, data).always(function (jqXHR, textStatus) {
                ++i;
                if (len === i) {
                    // load callback
                    if ($.isFunction(callback)) {
                        callback.call(self, jqXHR, textStatus);
                    }
                    if (textStatus !== 'success') {
                        Common.showLoader('error');
                    }
                    else {
                        Common.showLoader('hide');
                        api.editing = true;
                        Themify.body.triggerHandler('themify_builder_save_data', [jqXHR, textStatus]);
                    }
                }
                else {
                    setTimeout(function () {
                        self.saveBuilder(callback, i, onlyData);
                    }, 50);
                }
            });
        },
        loadContentJs: function (el, type) {
            ThemifyBuilderModuleJs.loadOnAjax(el, type); // load module js ajax
            // hook
            if (api.saving === false) {
                var mediaelements = $('audio.wp-audio-shortcode, video.wp-video-shortcode', el);
                if (mediaelements.length > 0) {
                    if (themifyBuilder.media_css) {
                        for (var i in themifyBuilder.media_css) {
                            Themify.LoadCss(themifyBuilder.media_css[i]);
                        }
                        themifyBuilder.media_css = null;
                    }
                    mediaelements.each(function () {
                        var p = $(this).closest('.mejs-mediaelement');
                        if (p.length > 0) {
                            this.removeAttribute('style');
                            this.setAttribute('id', this.getAttribute('id').replace('_html5', ''));
                            p.closest('.widget').html(this);
                        }

                    });
                    var settings = typeof topWindow._wpmejsSettings !== 'undefined' ? topWindow._wpmejsSettings : {};
                    mediaelements.mediaelementplayer(settings);
                }
            }
            Themify.body.triggerHandler('builder_load_module_partial', [el, type]);
        },
        createClearBtn: function ($input) {
            $input.siblings('.tb_clear_btn').click(function () {
                $(this).hide();
                $input.val('').trigger('keyup');
            });
        },
        toRGBA: function (color) {
            return ThemifyStyles.toRGBA(color);
        },
        getColor: function (el) {
            var v = el.value;
            if (v !== '') {
                if (el.getAttribute('data-minicolors-initialized') !== null) {
                    v = $(el).minicolors('rgbaString');
                }
                else {
                    var opacity = el.getAttribute('data-opacity');
                    if (opacity !== '' && opacity !== null && opacity != '1' && opacity != '0.99') {
                        v = this.toRGBA(v + '_' + opacity);
                    }
                }
            }
            return v;
        },
        getIcon: function (icon) {
            var cl = icon.split('-')[0].trim();
            if (cl === 'fa' || cl === 'ti') {
                return cl + ' ' + icon;
            } else if (cl === 'fas fa' || cl === 'far fa' || cl === 'fab fa') {
                return icon;
            } else {
                return false;
            }
        },
        // get breakpoint width
        getBPWidth: function (device) {
            var breakpoints = Array.isArray(themifyBuilder.breakpoints[ device ]) ? themifyBuilder.breakpoints[ device ] : themifyBuilder.breakpoints[ device ].toString().split('-');
            return breakpoints[ breakpoints.length - 1 ];

        },
        transitionPrefix: function () {
            if (this.transitionPrefix.pre === undefined) {
                var el = document.createElement('fakeelement'),
                        transitions = {
                            transition: 'transitionend',
                            OTransition: 'oTransitionEnd',
                            MozTransition: 'transitionend',
                            WebkitTransition: 'webkitTransitionEnd'
                        };

                for (var t in transitions) {
                    if (el.style[t] !== undefined) {
                        this.transitionPrefix.pre = transitions[t];
                        break;
                    }
                }
            }
            return this.transitionPrefix.pre;
        },
        generateUniqueID: function () {
            return (Math.random().toString(36).substr(2, 4) + (new Date().getUTCMilliseconds()).toString()).substr(0, 7);
        },
        getUIDList: function (type) {
            type = type || 'row';
            var atts = _.pluck(api.Models.Registry.items, 'attributes');
            return _.where(atts, {elType: type}) || [];
        },
        scrollTo: function (to) {
            var body = api.activeBreakPoint === 'desktop' ? $('html,body') : $('body', topWindow.document);
            body.scrollTop(to);
        },
        scrollToDropped: function (el, cid) {
            if (!el) {
                el = api.Instances.Builder[api.builderIndex].el.getElementsByClassName('tb_element_cid_' + cid)[0];
            }
            if (!el) {
                return;
            }
            if (api.mode === 'visual') {
                this.scrollTo($(el).offset().top - 120);
            } else {
                var content = document.getElementsByClassName('edit-post-layout__content')[0];
                if (content !== undefined) {
                    var top;
                    if (el.classList.contains('module_row')) {
                        top = el.offsetTop;
                    } else {
                        var row = el.closest('.module_row');
                        if (row !== null) {
                            row = $(row);
                            top = (row.offset().top + 200) - row.offsetParent().offset().top;
                        }
                        else {
                            top = el.offsetTop;
                        }
                    }
                    $(content).scrollTop(top);
                }
            }
        },
        addViewPortClass: function (el) {
            this.removeViewPortClass(el);
            var cl = this.isInViewport(el);
            if (cl !== false) {
                cl = cl.split(' ');
                for (var i = cl.length - 1; i > -1; --i) {
                    if (cl[i] !== '') {
                        el.classList.add(cl[i]);
                    }
                }
            }
        },
        removeViewPortClass: function (el) {
            var removeCl = ['top', 'left', 'bottom', 'right'];
            for (var i = 4; i > -1; --i) {
                el.classList.remove('tb_touch_' + removeCl[i]);
            }
        },
        isInViewport: function (el) {
            var offset = el.getBoundingClientRect(),
                    cl = '';
            if (offset.left < 0) {
                cl = 'tb_touch_left';
            }
            else if (offset.right - 1 >= document.documentElement.clientWidth) {
                cl = 'tb_touch_right';
            }
            if (offset.top < 0) {
                cl += ' tb_touch_top';
            }
            else if ((offset.bottom + 1) >= document.documentElement.clientHeight) {
                cl += ' tb_touch_bottom';
            }
            return cl === '' ? false : cl;
        },
        checkImageSize: function (el) {
            var img = el.getElementsByTagName('img')[0],
                    callback = function (w) {
                        if (img.width < w) {
                            el.classList.add('tb_disable_object_fit');
                        }
                        else {
                            el.classList.remove('tb_disable_object_fit');
                        }
                    };
            if (img !== undefined) {
                var w = img.naturalWidth;
                if (!w || !img.complete) {
                    var newImg = new Image();
                    newImg.onload = function () {
                        callback(newImg.width);
                    };
                    newImg.src = img.src;
                }
                else {
                    callback(w);
                }
            }
            else {
                el.classList.remove('tb_disable_object_fit');
            }
        },
        checkAllimageSize: function () {
            var el = api.Instances.Builder[api.builderIndex].el,
                    items = api.Models.Registry.items;
            for (var i in items) {
                if (items[i]['attributes']['mod_name'] === 'image') {
                    var item = el.getElementsByClassName('tb_element_cid_' + items[i].cid)[0];
                    if (item !== undefined) {
                        this.checkImageSize(item);
                    }
                }
            }
        },
        hideOnClick: function (ul) {
            if (ul[0] !== undefined) {
                ul = ul[0];
            }
            if (ul.classList.contains('tb_ui_dropdown_items') || ul.classList.contains('tb_down')) {
                ul.classList.add('tb_hide_option');
                ul.previousElementSibling.blur();
                setTimeout(function () {
                    ul.classList.remove('tb_hide_option');
                }, 500);
            }
        },
        changeOptions: function (item, type) {
            var event = item.tagName === 'INPUT' ? 'keyup' : 'change',
                    self = this;
            if (event === 'keyup') {
                item.setAttribute('data-prev', item.value);
            }
            self.custom_css_id = function (_this, id, el, v) {
                var sel = document.getElementById(v);
                if (sel === null || el[0].getAttribute('id') === v || sel.closest('.module_row') === null) {
                    el[0].setAttribute('id', v);
                    return true;
                }
                return false;
            };
            self.row_anchor = function (_this, id, el, v) {
                if (api.mode === 'visual') {
                    el.removeClass(api.liveStylingInstance.getRowAnchorClass(_this.getAttribute('data-prev')));
                    if (v !== '') {
                        el.addClass(api.liveStylingInstance.getRowAnchorClass(v));
                    }
                    el.data('anchor', v).attr('data-anchor', v);
                }
                api.hasChanged = true;
                el.find('.tb_row_anchor').first().text(v.replace('#', ''));
                return true;
            };
            self.custom_css = function (_this, id, el, v) {
                if (api.mode === 'visual') {
                    el.removeClass(_this.getAttribute('data-prev')).addClass(v);
                }
                return true;
            };
            self.layout = function (_this, id, el, v) {
                if (api.mode === 'visual') {
                    api.liveStylingInstance.bindRowWidthHeight(id, v, el);
                }
                return true;
            };
            item.addEventListener(event, function (e) {
                var v,
                        isSame = api.activeModel !== null && api.ActionBar.cid === api.activeModel.cid,
                        isActionBar = !Common.Lightbox.$lightbox[0].contains(this),
                        id = this.id,
                        hasError = id === 'custom_css_id',
                        save = (hasError === true && (isActionBar === false || isSame === true)) ? Common.Lightbox.$lightbox[0].getElementsByClassName('builder_save_button')[0] : undefined,
                        el;
                if (isActionBar === true && isSame === false) {
                    el = $('.tb_element_cid_' + api.ActionBar.cid);
                }
                else {
                    el = api.mode === 'visual' ? api.liveStylingInstance.$liveStyledElmt : $('.tb_element_cid_' + api.activeModel.cid);
                }
                v = this.value;
                if (event === 'keyup' && type !== 'custom_css') {
                    v = v.trim();
                    if (v) {
                        v = v.replace(/[^a-zA-Z0-9\-\_]+/gi, '');
                    }
                    this.value = v;
                }
                else if (type === 'layout') {
                    v = e.detail.val;
                }
                if (self[type].call(self, this, id, el, v)) {
                    if (hasError) {
                        $(this).next('.tb_field_error_msg').remove();
                        if (save !== undefined) {
                            save.classList.remove('tb_disable_save');
                        }
                    }
                    if (isActionBar === true) {
                        var callback = function () {
                            var value = v;
                            if (event === 'keyup') {
                                this.removeEventListener('change', callback, {passive: true, once: true});
                                this.removeAttribute('data-isInit');
                                value = this.value.trim();
                            }
                            var model = api.Models.Registry.lookup(el.data('cid')),
                                    currentStyle = model.get('styling');
                            if (!currentStyle) {
                                currentStyle = {};
                            }
                            currentStyle[id] = value;
                            model.set({styling: currentStyle}, {silent: true});
                        };
                        if (event === 'keyup') {
                            if (!this.getAttribute('data-isInit')) {
                                this.setAttribute('data-isInit', 1);
                                this.addEventListener('change', callback, {passive: true, once: true});
                            }
                        }
                        else {
                            callback();
                        }
                    }
                    api.hasChanged = true;
                }
                else if (hasError) {
                    var er = document.createElement('span');
                    er.className = 'tb_field_error_msg';
                    er.textContent = ThemifyConstructor.label.errorId;
                    this.parentNode.insertBefore(er, this.nextSibling);
                    if (save !== undefined) {
                        save.classList.add('tb_disable_save');
                    }
                }
                if (isSame === true) {
                    var sameEl = isActionBar ? Common.Lightbox.$lightbox.find('#' + id) : $('#' + api.ActionBar.el.id).find('#' + id);
                    if (event === 'keyup') {
                        sameEl.val(v).attr('data-prev', v);
                    }

                    else if (type === 'layout') {
                        sameEl.find('.selected').removeClass('selected');
                        if (v !== '') {
                            sameEl.find('#' + v).addClass('selected');
                        }
                        else {
                            sameEl.children().first().addClass('selected');
                        }
                    }
                }
                if (event === 'keyup') {
                    this.setAttribute('data-prev', v);
                }
            }, {passive: true});
        }
    };

    api.ActionBar={
        cid:null,
        topH:null,
        type:null,
        disable:null,
        prevExpand:null,
        needClear:true,
        el:null,
        breadCrumbs:null,
        disablePosition:null,
        isInit:null,
        isHoverMode:true,
        hoverCid:null,
        init:function(){
            if(this.isInit===null){
                this.isInit=true;
                this.el = document.createElement('div');
                this.breadCrumbs =  document.createElement('ul');
                this.el.id='tb_component_bar';
                this.breadCrumbs.className='tb_action_breadcrumb';
                this.el.addEventListener('mousedown',this.mouseDown.bind(this));
                this.topH = api.toolbar.$el.height();
                if(api.mode==='visual'){
                    document.body.appendChild(this.el);
                }
                else{
                    api.Instances.Builder[api.builderIndex].el.parentNode.appendChild(this.el);
                }
                document.addEventListener('click',this.click.bind(this));
                document.addEventListener('dblclick',this.click.bind(this));
                api.Instances.Builder[0].el.addEventListener('mouseover',this.enter);
                if(api.mode==='visual'){
                    topWindow.document.addEventListener('click',this.click.bind(this));
                }
                var canvas=api.mode==='visual'?null: document.getElementById('tb_canvas_block');

                if(canvas===null){
                    document.addEventListener('keydown',this.actions.bind(this));
                    topWindow.document.addEventListener('keydown',this.actions.bind(this));
                }
                else{
                    canvas.addEventListener('keydown',this.actions.bind(this));
                }
                this.changeMode();
                }
        },
        changeMode:function(){
            this.hoverCid=null;
            var self=this,
                click = function(e){
                   self.actions(e);
               };
            if(this.isHoverMode===true){
                document.body.classList.remove('tb_click_mode');
                document.body.classList.add('tb_hover_mode');
                this.el.removeEventListener('click',click);
                }
            else{
                document.body.classList.remove('tb_hover_mode');
                document.body.classList.add('tb_click_mode');
                this.el.addEventListener('click',click);
            }

        },
        enter:function(e){
            var self=api.ActionBar;
            api.Mixins.Builder.columnHover(e.target);
            if(self.isHoverMode===true && self.disablePosition===null && self.disable===null){
                e.preventDefault();
                e.stopPropagation();
                var el = e.target,
                    found = null,
                    cl = el.classList,
                    type=null;
                    if(self.prevExpand!==null && self.prevExpand!==undefined){
                        if(!self.prevExpand.contains(el)){
                            var isIn=self.type!=='module';
                            if(isIn===false){
                                if(api.mode!=='visual'){
                                    isIn=el.closest('.active_module');
                                    isIn=isIn!==null?isIn.getAttribute('data-cid')!==self.hoverCid:true;
                                }
                                else{
                                    var dragger = el.closest('.tb_dragger_top');
                                    if(dragger!==null && dragger.classList.contains('tb_dragger_padding')){
                                        api.EdgeDrag.setModulePosition(dragger);
                                    }
                                }
                            }
                            else if(cl.contains('tb_clicked')){
                                return;
                            }
                            if(isIn===true){
                                self.clear();
                            }
                        }
                        else{
                            if(cl.contains('tb_inner_action_more')){
                                var innerDropdown = el.getElementsByTagName('UL');
                                if(innerDropdown.length){
                                    api.Utils.addViewPortClass(innerDropdown[0]);
                                }
                            }
                            var selected = self.prevExpand.getElementsByClassName('tb_row_settings')[0];
                            if(selected!==undefined){
                                var tab = document.getElementById(selected.getAttribute('data-href'));
                                if(!tab.contains(el)){
                                    tab.classList.remove('selected');
                                    selected.classList.remove('selected');
                                }
                                else{
                                    return;
                                }
                            }
                            if(self.type==='module' || self.type==='column'){
                                if(self.type==='column'){
                                    self.hoverCid=el.parentNode.getAttribute('data-cid');
                                }
                                return;
                            }
                            selected=null;
                        }
                    }
                    if(el.closest('.tb_dragger_lightbox')!==null){
                        return;
                    }
                    if(cl.contains('tb_action_wrap')){
                        found=!cl.contains('tb_clicked');
                    }
                    else if(el.nodeName==='LI'  && cl.contains('tb_row_settings') && !cl.contains('selected')){
                        self.actions(e);
                        return;
                    }
                    else if(!cl.contains('tb_grid_drag')){

                        var module =  $(el).closest('[data-cid]')[0];
                        if(module===undefined){
                            return;
                        }
                        var cid = module.getAttribute('data-cid');
                        if(self.hoverCid===cid){
                            return;
                        }
                        self.hoverCid=cid;
                        var model = api.Models.Registry.lookup(cid);
                            type = model.get('elType');
                            if(type==='module'){
                                if(module.classList.contains('tb_element_selected')){
                                    return;
                                }
                                found =true;
                            }
                            else if(api.mode==='visual'){
                                self.clear();
                                api.EdgeDrag.addEdges(type,model,module);
                                return;
                            }
                    }
                    if(found===true){
                        self.click(e);
                    }

            }

        },
        mouseDown: function (e) {
            if (e.which === 1 && (this.type === 'row' || this.type === 'subrow') && e.target.classList.contains('ti-move')) {
                e.preventDefault();
                e.stopPropagation();
                var item = api.Instances.Builder[api.builderIndex].$el.find('.tb_element_cid_'+this.cid);
                if(item.length>0){
                    var el = this.type==='row'?item[0].getElementsByClassName('tb_row_action')[0]:item[0],
                        offset=item.offset(),
                            ev;
                    this.clear();
                    if (typeof (Event) === 'function') {
                        ev = new Event('mousedown', {bubbles: true, cancelable: false});
                    } else {
                        ev = document.createEvent('Event');
                        ev.initEvent('mousedown', true, false);
                    }
                    ev.pageX = offset.left;
                    ev.pageY = offset.top;
                    ev.which = 1;
                    el.dispatchEvent(ev);
                }
            }
        },
        click:function(e){
            if (api.isPreview || this.disable===true) {
                return true;
            }
            var target = e.target,
                tagName=target.tagName,
                lastRow = api.Instances.Builder[api.builderIndex].lastRow,
                el =api.mode==='visual' && target.ownerDocument===topWindow.document?undefined:$(target).closest('[data-cid]')[0],
                event=e.type;
                if(event==='click'){
                    if(topWindow.document.body.classList.contains('tb_standalone_lightbox') && !topWindow.document.body.classList.contains('modal-open')){
                        if(!api.toolbar.el.contains(target) && !Common.Lightbox.$lightbox[0].contains(target)&& !Common.Lightbox.$lightbox[0].classList.contains('tb_predesigned_lightbox')){
                            Common.Lightbox.close();
                        }
                        var selected_menu = topWindow.document.getElementsByClassName('tb_current_menu_selected')[0];
                            if(selected_menu!==undefined){
                                selected_menu.classList.remove('tb_current_menu_selected');
                            }
                        selected_menu=null;
                    }
                    if(lastRow && !lastRow.contains(target)){
                        lastRow.classList.remove('expanded');
                    }
                    if(this.isHoverMode===true  && !Common.Lightbox.$lightbox[0].contains(target)){
                        var selected = api.Instances.Builder[0].el.getElementsByClassName('tb_element_clicked');
                        for(var i=selected.length-1;i>-1;--i){
                            selected[i].classList.remove('tb_element_clicked');
                        }
                        selected=null;
                        if(el!==undefined){
                            el.classList.add('tb_element_clicked');
                        }
                    }
                }
                else if(event==='dblclick' && api.Forms.LayoutPart.id!==null && target.classList.contains('tb_overlay')){
                    api.Forms.LayoutPart.save(e,true);
                    return;
                }
                var isDocked=(event==='click' || event==='dblclick')&& api.mode==='visual' && Common.Lightbox.dockMode.get();
                if(el!==undefined && (event==='dblclick' || (isDocked===true && target.classList.contains('tb_dragger')) || !target.classList.contains('tb_disable_sorting') ) && !el.classList.contains('tb_active_layout_part')){
                if(api.mode==='visual' && (tagName==='A' || target.closest('a')!==null)){
                    e.preventDefault();
                }
                var cid = el.getAttribute('data-cid'),
                        model = api.Models.Registry.lookup(cid),
                        type = model.get('elType'),
                        is_pageBreak = type==='row' && el.classList.contains('tb-page-break');
                if (model) {

                    if(event==='dblclick'){
                        if ( isDocked === true || tagName === 'INPUT' || is_pageBreak === true || target.classList.contains( 'tb_dragger_lightbox' ) || target.closest( '.tb_clicked' ) !== null ) {
                            if('tb_row_options' !== target.id){
                                return;
                            }
                        }
                        e.preventDefault();
                        e.stopPropagation();
                        el.classList.remove('tb_element_selected');
                        if(isDocked===false && this.isHoverMode!==true){
                            el.classList.add('tb_element_selected');
                            Themify.body[0].classList.add('tb_action_active');
                            if(api.mode==='visual'){
                                api.EdgeDrag.addEdges((type==='module'?model.get('mod_name'):type),model,el);
                            }
                        }
                        if(!target.classList.contains('tb_row_settings')){
                            model.trigger('edit',e,target);
                            return;
                        }
                    }
                    else if(event==='click' && isDocked===false && (target.classList.contains('tb_dragger') || target.closest('.tb_dragger_options')!==null)){
                        return;
                    }
                    var isHoverMode=this.isHoverMode===true,
                        isEmpty=isHoverMode!==true && this.cid!==null,
                        is_expand = type!=='module'?target.classList.contains('tb_action_wrap'):isHoverMode===true;
                        this.cid=cid;
                        this.type=type;
                    if(is_pageBreak===true && type==='row'){
                        this.clear();
                        if(target.classList.contains('tb_row_anchor') ){
                            e.preventDefault();
                            e.stopPropagation();
                            model.trigger('delete',e,target);
                        }
                        return;
                    }
                    if((is_expand===false || (type==='module' && isHoverMode===true))&& target.closest('.tb_action_wrap')!==null){
                        if(event==='click'){
                        this.actions(e);
                        }
                        return;
                    }
                    if(isHoverMode===true && event==='click' && this.needClear===true){
                        if(isDocked===true){
                            model.trigger('edit',e,target);
                        }
                        return;
                    }
                    this.clear();
                    if(isEmpty===true  && event==='click' && isDocked===false && this.needClear===true) {
                        Themify.body[0].classList.add('tb_action_active');
                        var self = this,
                            mouseMove=function(){
                                document.removeEventListener('mousemove',mouseMove,{passive:true,once:true});
                                if(self.cid===null){
                                    Themify.body[0].classList.remove('tb_action_active');
                                }
                            };
                        document.removeEventListener('mousemove',mouseMove,{passive:true,once:true});
                        document.addEventListener('mousemove',mouseMove,{passive:true,once:true});
                        return;
                    }
                    this.cid=cid;
                    this.type=type;
                    var tpl_id = 'tmpl-builder_'+type+'_action',
                        t = Common.is_template_support?document.getElementById(tpl_id).content.cloneNode(true):Common.templateCache.get(tpl_id);
                    if(is_expand===true){
                        this.prevExpand =type==='module'?el.getElementsByClassName('tb_module_action')[0]:target;
                        if(this.prevExpand===undefined){
                            this.clear();
                            return;
                        }
                        Common.is_template_support?this.prevExpand.appendChild(t):this.prevExpand.insertAdjacentHTML('beforeend', t);
                        this.prevExpand.setAttribute('id',this.el.id);
                        this.prevExpand.style['top']='';
                        this.prevExpand.closest('.tb_action_wrap').classList.add('tb_clicked');
                        if(isHoverMode===true && type==='module' && api.mode==='visual'){
                            api.EdgeDrag.addEdges(model.get('mod_name'),model,el);
                            if(el.nextElementSibling===null){
                                var col=el.parentNode.nextElementSibling;
                                if(col!==null){
                                    var offset = this.prevExpand.getBoundingClientRect().bottom-col.getBoundingClientRect().top;
                                    if(offset>=0){
                                        this.prevExpand.style['top']=(this.prevExpand.offsetTop-offset)+'px';
                                    }
								}
							}
                        }
                    }
                    else{
                        if(type!=='row'){
                            this.setBreadCrumbs(el);
                        }
                        this.el.className='tb_show_toolbar tb_'+type+'_action';
                        var wrap = document.createElement('div');
                            wrap.className='tb_action_label_wrap';
                        Common.is_template_support?wrap.appendChild(t):wrap.insertAdjacentHTML('beforeend', t);
                        if(api.mode==='visual'){
                            var m;
                            if(type==='module'){
                                m=model.get('mod_name');
                                this.el.className+=' tb_'+m+'_action';
                                m=themifyBuilder.modules[m].name;
                            }
                            else{
                                m=type;
                                if(type==='row'){
                                    var row_anchor = model.get('styling')['row_anchor'];
                                    if(row_anchor!==undefined){
                                        row_anchor = row_anchor.trim();
                                        if(row_anchor!==''){
                                            m+=' #'+row_anchor;
                                        }
                                    }
                                }
                            }
                            var mod_name=document.createElement('div');
                                mod_name.className='tb_data_mod_name';
                                mod_name.textContent=m.charAt(0).toUpperCase() + m.slice(1);
                            wrap.appendChild(mod_name);
                        }
                        this.el.appendChild(wrap);
                    }
                    el.classList.add('tb_element_selected');
                    if(isHoverMode!==true){
                        Themify.body[0].classList.add('tb_action_active');
                        if(api.mode==='visual'){
                            api.EdgeDrag.addEdges((type==='module'?model.get('mod_name'):type),model,el);
                        }
                    }
                    if(isDocked===true){
                        model.trigger('edit',e,target);
                        if ( isHoverMode === true || (this.disablePosition !== null && is_expand !== false && isHoverMode === true) ) {
                            return;
                        }
                    }
                    if(this.disablePosition===null){
                        if(is_expand===false && isHoverMode!==true){
                            var left=e.pageX,
                                top=e.pageY;
                            if(api.mode !== 'visual'){
                                var rect = api.Instances.Builder[0].el.getBoundingClientRect();
                                left = e.clientX - rect.left;
                                top = e.clientY - rect.top+30;
                            }
                            this.setPosition(this.el,{left:left,top:top});
                        }else{
                            api.Utils.addViewPortClass(this.prevExpand);
                        }

                    }

                }else if(isHoverMode!==true){
                    this.clear();
                }
            }
            else if(tagName==='LI' && target.classList.contains('tb_bread')){
                var model=api.Models.Registry.lookup(target.getAttribute('data-id'));
                    if(ThemifyConstructor.clicked!=='setting' && ThemifyConstructor.component==='module'){
                        var currentTab=Common.Lightbox.$lightbox[0].getElementsByClassName('tb_lightbox_top_bar')[0].querySelector('.current a').getAttribute('href');
                        Common.Lightbox.$lightbox
                        .off('themify_opened_lightbox.tb_breadCrumbs')
                        .on('themify_opened_lightbox.tb_breadCrumbs',function(){
                            if(ThemifyConstructor.component==='row'){
                                Common.Lightbox.$lightbox.off('themify_opened_lightbox.tb_breadCrumbs')[0].getElementsByClassName('tb_lightbox_top_bar')[0].querySelector('a[href="'+this+'"]').click();
                            }
                            else if(api.activeModel===null){
                                Common.Lightbox.$lightbox.off('themify_opened_lightbox.tb_breadCrumbs');
                            }
                        }.bind(currentTab));
                        currentTab=null;
                    }
                    model.trigger('edit',null);
            }
            else if(!this.el.contains(target) && (e.type!=='click' || !target.classList.contains('tb_dragger'))){
                this.clear();
            }
        },
        setBreadCrumbs:function(el){
            while (this.breadCrumbs.firstChild!==null) {
                this.breadCrumbs.removeChild(this.breadCrumbs.firstChild);
            }
            this.breadCrumbs.appendChild(this.getBreadCrumbs(el));
            if(this.el.firstChild===null){
                this.el.appendChild(this.breadCrumbs);
            }
            else{
                this.el.insertBefore(this.breadCrumbs, this.el.firstChild);
            }
        },
        getBreadCrumbs:function(item){
            var path = [],
                f = document.createDocumentFragment();
            if(undefined === item){
                return f;
            }
            while(true){
                item = item.parentNode;
                var cid = item.getAttribute('data-cid');
                if(cid){
                    path.push(cid);
                }
                if(item.classList.contains('module_row')){
                    break;
                }
            }
            for(var i=path.length-1;i>-1;--i){
                var li =document.createElement('li'),
                        model = api.Models.Registry.lookup(path[i]),
                        type = model.get('elType');
                    li.textContent = type==='column'?model.get('component_name'):type;
                    li.className='tb_bread tb_bread_'+type;
                    li.setAttribute('data-id',path[i]);
                f.appendChild(li);
            }
            return f;
        },
        actions:function(e){
            var target = e.target,
                tagName= target.tagName;
            if(e.type==='keydown'){
                if(tagName!=='INPUT'  && tagName!=='TEXTAREA' && !themifyBuilder.disableShortcuts && !Common.Lightbox.$lightbox[0].contains(target)){
                    var code = e.keyCode,
                        selectCl=this.isHoverMode===true?'tb_element_clicked':'tb_element_selected',
                        selected = document.getElementsByClassName(selectCl)[0];
                    if(selected!==undefined){
                        e.preventDefault();
                        e.stopPropagation();
                        var act=null,
                            params=null;
                        if(code === 46 || code === 8){
                            act='delete';
                            if(api.mode!=='visual' && themifyBuilder.is_gutenberg_editor){
                                var canvas = document.getElementById('tb_canvas_block');
                                if(canvas!==null && canvas.closest('.wp-block').classList.contains('is-selected')){
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                            }
                        }
                        else{
                            if(e.ctrlKey|| e.metaKey){
                                if(code === 67){
                                    act='copy';
                                }
                                else if(code === 68){
                                    act='duplicate';
                                }
                                else if(code===86){
                                    act='paste';
                                    if(e.shiftKey){
                                        params='style';
                                    }
                                }
                                else if ( 38 === code || 40 === code ) {
                                    var sortable,
                                        action = 38 === e.which ? 'up' : 'down',
                                        sibling = 'up' === action ? selected.previousElementSibling : selected.nextElementSibling;
                                        if(sibling===null){
                                            return;
                                        }
                                    if ( selected.classList.contains( 'module_row' ) ) {
                                        if(!sibling.classList.contains( 'module_row' )){
                                            return;
                                        }
                                        sortable = api.Instances.Builder[api.builderIndex].$el;
                                    } else if ( selected.classList.contains( 'active_module' ) ) {
                                        if(!sibling.classList.contains( 'active_module' )){
                                            return;
                                        }
                                        sortable = $(selected.parentNode.closest( '.tb_holder' ));

                                    } else {
                                        return;
                                    }
                                    if ( sibling ) {
                                        var current = $(selected);
                                        sortable.sortable( 'option', 'beforeStart' )( null, null, { item: current } );
                                        sortable.sortable( 'option', 'start' )( null, { item: current } );
                                        if ( 'up' === action ) {
                                            current.prev().before( current );
                                        } else {
                                            current.next().after( current );
                                        }
                                        sortable.sortable( 'option', 'update' )( { type: 'sortupdate' }, { item: current } );
                                        sortable.sortable( 'option', 'stop' )( null, { item: current, helper: null } );
                                        if(api.ActionBar.isHoverMode!==true){
                                            api.ActionBar.clear();
                                            selected.classList.add('tb_element_selected');
                                        }
                                    }
                                }
                            }
                        }
                        if(act!==null){
                            e.preventDefault();
                            e.stopPropagation();
                            var model = api.Models.Registry.lookup($(selected).closest('[data-cid]')[0].getAttribute('data-cid'));
                            model.trigger(act,e,params);
                            if(act==='delete'){
                                this.clear();
                            }
                        }
                    }
                }
                if(target.classList.contains('tb_range')){
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
                return;
            }
            else{
                e.preventDefault();
                e.stopPropagation();
            }
            if(this.cid!==null && (tagName ==='LI' || tagName ==='SPAN' || tagName==='A')){
                var isBreadCrumb = target.parentNode.classList.contains('tb_action_breadcrumb'),
                    cid = isBreadCrumb?target.getAttribute('data-id'):this.cid,
                    action=null,
                        model = api.Models.Registry.lookup(cid),
                        cl = target.classList;
                    if(model){
                        Themify.body[0].classList.remove('tb_component_menu_active');
                        if(isBreadCrumb===true){
                            this.needClear=null;
                            this.disablePosition=true;
                            document.getElementsByClassName('tb_element_cid_'+cid)[0].click();
                            this.disablePosition=null;
                            if(api.mode==='visual'){
                                var offset = this.el.getBoundingClientRect();
                                if(offset.right>=document.body.clientWidth){
                                    this.setPosition(this.el,{left:offset.left,top:this.el.offsetTop+55});
                                }
                            }
                            this.needClear=true;
                            return;
                        }
                        var tabId = target.getAttribute('data-href');
                        if(tabId){
                            var tabs = target.parentNode.getElementsByTagName('li');
                            for(var i=tabs.length-1;i>-1;--i){
                                var id = tabs[i].getAttribute('data-href'),
                                    el = id?document.getElementById(id):null,
                                        isSelected = tabs[i].classList.contains('selected');
                                tabs[i].classList.remove('selected');
                                if(el!==null){
                                    el.classList.remove('selected');
                                }
                                if(id===tabId && !isSelected){
                                    if(id==='tb_row_options' || id==='tb_rgrids'){
                                        this.gridMenu(el);
                                    }
                                    else if(id==='tb_roptions' && el.children.length===0){
                                        this.setRowOptions(el);
                                    }
                                    el.classList.add('selected');
                                    tabs[i].classList.add('selected');
                                    api.Utils.addViewPortClass(el);
                                    Themify.body[0].classList.add('tb_component_menu_active');
                                }
                            }
                            return;
                        }
                        else if(cl.contains('tb_edit') || cl.contains('tb_styling') || cl.contains('tb_visibility_component') || cl.contains('tb_swap')){
                            action = 'edit';
                        }
                        else if(cl.contains('tb_duplicate')){
                            action='duplicate';
                        }
                        else if(cl.contains('tb_save_component')){
                            action='save';
                        }
                        else if(cl.contains('tb_delete')){
                            action='delete';
                        }
                        else if(cl.contains('ti-import') || cl.contains('ti-export')){
                            action='importExport';
                        }
                        else if(cl.contains('tb_copy_component')){
                            action='copy';
                        }
                        else if(cl.contains('tb_paste_component') || cl.contains('tb_paste_style')){
                            action='paste';
                        }
                        else if(tagName==='LI' || tagName==='SPAN' || cl.contains('tb_action_more')|| cl.contains('tb_inner_action_more')){
                            var li = target.closest('li');
                            if(li===null){
                                return;
                            }
                            var ul = li.parentNode,
                                    ul_cl = ul.classList,
                                is_edit =ul_cl.contains('tb_grid_list') ||  ul_cl.contains('tb_column_alignment') || ul_cl.contains('tb_column_gutter') || ul_cl.contains('tb_column_direction') || ul_cl.contains('tb_column_height') || ul_cl.contains('grid_tabs'),
                                    is_selected = target.classList.contains('selected'),
                                    childs = ul.children;
                                if(is_edit && is_selected){
                                return;
                            }
                                for(var i=childs.length-1;i>-1;--i){
                                childs[i].classList.remove('selected');
                                    if(is_edit===false){
                                    var inner = childs[i].getElementsByClassName('selected');
                                        for(var j=inner.length-1;j>-1;--j){
                                        inner[j].classList.remove('selected');
                                    }
                                }
                            }
                            if(!is_selected){
                                li.classList.add('selected');
                                Themify.body[0].classList.add('tb_component_menu_active');
                            }
                            if(is_edit){
                                if(ul_cl.contains('tb_column_alignment')){
                                    this._columnAlignmentClicked(li);
                                }
                                else if(ul_cl.contains('tb_column_gutter')){
                                    this._gutterChange(li);
                                }
                                else if(ul_cl.contains('tb_column_direction')){
                                    this._columnDirectionClicked(li);
                                }
                                else if(ul_cl.contains('tb_column_height')){
                                    this._columnHeight(li);
                                }
                                else if(ul_cl.contains('grid_tabs')){
                                    this._switchGridTabs(li);
                                }
                                else if(ul_cl.contains('tb_grid_list')){
                                    this._gridClicked(li);
                                }
                            }
                            else{
                                childs=this.prevExpand!==null?this.prevExpand.children:this.el.getElementsByClassName('tb_action_label_wrap')[0].children;
                                for(var i=childs.length-1;i>-1;--i){
                                    childs[i].classList.remove('selected');
                                }
                                if(!is_selected && (this.prevExpand===null || this.type==='column')){
                                    var ul = li.getElementsByTagName('ul')[0];
                                    if(ul!==undefined){
                                        api.Utils.addViewPortClass(ul);
                                    }

                                }
                            }
                            return;
                        }
                        else{
                            return;
                        }
                        if(this.isHoverMode!==true){
                            this.clear();
                        }
                        else{
                            var p = target.closest('.tb_action_more');
                            if(p!==null){
                                p=p.getElementsByTagName('ul')[0];
                                p.style['display']='none';
                                setTimeout(function(){
                                    if(p!==null){
                                        p.style['display']='';
                                    }
                                },100);
                            }
                        }
                        model.trigger(action,e,target);
                }
            }
        },
        _switchGridTabs: function (target) {
            api.ActionBar.disable=api.clearOnModeChange=true;
            api.ActionBar.hoverCid=null;
            api.scrollTo = $(document.getElementsByClassName('tb_element_cid_' + this.cid)[0]);
            ThemifyConstructor.lightboxSwitch(target.getAttribute('data-id'));
        },
        _gridClicked: function (target) {
            var $this = $(target),
                    set = $this.data('grid'),
                    handle = this.type,
                    $base,
                    row = $('.tb_element_cid_' + this.cid).first(),
                    is_sub_row = false,
                    type = api.activeBreakPoint,
                    is_desktop = type === 'desktop',
                    before = Common.clone(row.closest('.module_row'));
            is_sub_row = handle === 'subrow';
            $base = row.find('.' + handle + '_inner').first();
            if (is_desktop) {
                var $both = $base,
                        col = $this.data('col');
                $both = $both.add($('#tb_rgrids'));
                if (col === undefined) {
                    col = 1;
                    $this.data('col', col);
                }
                for (var i = 6; i > 0; --i) {
                    $both.removeClass('col-count-' + i);
                }
                $both.addClass('col-count-' + col);
                $base.attr('data-basecol', col);
                if (is_desktop) {
                    $this.closest('.tb_grid_menu').find('.tb_grid_reposnive .tb_grid_list').each(function () {
                        var selected = $(this).find('.selected'),
                                mode = $(this).data('type'),
                                rcol = selected.data('col');
                        if (rcol !== undefined && (rcol > col || (col === 4 && rcol === 3) || (col >= 4 && rcol >= 4 && col != rcol))) {
                            selected.removeClass('selected');
                            $base.removeClass('tb_grid_classes col-count-' + $base.attr('data-basecol') + ' ' + $base.attr('data-col_' + mode)).attr('data-col_' + mode, '');
                            $(this).closest('.tb_grid_list').find('.' + mode + '-auto').addClass('selected');
                        }
                    });
                }
            }
            else {
                if (set[0] !== '-auto') {
                    var cl = 'column' + set.join('-'),
                            col = $this.data('col');
                    if (col === 3 && $base.attr('data-basecol') > col) {
                        cl += ' tb_3col';
                    }
                    $base.removeClass($base.attr('data-col_tablet') + ' ' + $base.attr('data-col_tablet_landscape') + ' ' + $base.attr('data-col_mobile'))
                            .addClass(cl + ' tb_grid_classes col-count-' + $base.attr('data-basecol')).attr('data-col_' + type, cl);
                }
                else {
                    $base.removeClass('tb_grid_classes tb_3col col-count-' + $base.attr('data-basecol') + ' ' + $base.attr('data-col_' + type)).attr('data-col_' + type, '');
                }
                if (api.mode === 'visual') {
                    $('body', topWindow.document).height(document.body.scrollHeight);
                }
                api.Utils.setCompactMode($base.children('.module_column'));
                return false;
            }

            var cols = $base.children('.module_column'),
                    set_length = set.length,
                    col_cl = 'module_column' + (is_sub_row ? ' sub_column' : '') + ' col';
            for (var i = 0; i < set_length; ++i) {
                var c = cols.eq(i);
                if (c.length > 0) {
                    c.removeClass(api.Utils.gridClass.join(' ')).addClass(col_cl + set[i]);
                } else {
                    // Add column
                    api.Utils._addNewColumn({
                        newclass: col_cl + set[i],
                        component: is_sub_row ? 'sub-column' : 'column'
                    }, $base[0]);
                }
            }

            // remove unused column
            if (set_length < $base.children().length) {
                $base.children('.module_column').eq(set_length - 1).nextAll().each(function () {
                    // relocate active_module
                    var modules = $(this).find('.tb_holder').first();
                    modules.children().appendTo($(this).prev().find('.tb_holder').first());
                    $(this).remove(); // finally remove it
                });
            }
            var $children = $base.children();
            $children.removeClass('first last');
            if ($base.hasClass('direction-rtl')) {
                $children.last().addClass('first');
                $children.first().addClass('last');
            }
            else {
                $children.first().addClass('first');
                $children.last().addClass('last');
            }

            api.Utils.columnDrag($base, true);
            var row = $base.closest('.module_row');
            //api.Mixins.Builder.columnSort(row);
            api.hasChanged = true;
            api.Mixins.Builder.updateModuleSort(row);
            api.undoManager.push(row.data('cid'), before, row, 'row');
            Themify.body.triggerHandler('tb_grid_changed', [row]);
        },
        _columnHeight: function (target) {
            var $this = $(target),
                    val = $this.data('value');
            if (val === undefined) {
                return;
            }
            var $row = $('.tb_element_cid_' + this.cid).first(),
                    el = api.Models.Registry.lookup(this.cid),
                    before = Common.clone($row),
                    inner = $row.find('.' + this.type + '_inner').first();
            if (val === '') {
                inner.removeClass('col_auto_height');
            }
            else {
                inner.addClass('col_auto_height');
            }
            el.set({'column_h': val}, {silent: true});
            api.undoManager.push(this.cid, before, $('.tb_element_cid_' + this.cid).first(), 'row');
        },
        _columnAlignmentClicked: function (target) {
            target = $(target);
            var alignment = target.data('alignment');
            if (!alignment) {
                return;
            }
            var $row = $('.tb_element_cid_' + this.cid).first(),
                    el = api.Models.Registry.lookup(this.cid),
                    before = Common.clone($row);
            $row.find('.' + this.type + '_inner').first().removeClass(el.get('column_alignment')).addClass(alignment);
            el.set({column_alignment: alignment}, {silent: true});
            api.undoManager.push(this.cid, before, $('.tb_element_cid_' + this.cid).first(), 'row');
        },
        _columnDirectionClicked: function (target) {
            target = $(target);
            var dir = target.data('dir');
            if (!dir) {
                return;
            }
            var $row = $('.tb_element_cid_' + this.cid).first(),
                    inner = $row.find('.' + this.type + '_inner').first(),
                    columns = inner.children('.module_column'),
                    first = columns.first(),
                    last = columns.last(),
                    el = api.Models.Registry.lookup(this.cid),
                    data = {};
            data[api.activeBreakPoint + '_dir'] = dir;
            el.set(data, {silent: true});
            if (dir === 'rtl') {
                first.removeClass('first').addClass('last');
                last.removeClass('last').addClass('first');
                inner.addClass('direction-rtl');
            }
            else {
                first.removeClass('last').addClass('first');
                last.removeClass('first').addClass('last');
                inner.removeClass('direction-rtl');
            }

            inner.attr('data-' + api.activeBreakPoint + '_dir', dir);
        },
        _gutterChange: function (target) {
            var $this = $(target),
                    val = $this.data('value');
            if (!val) {
                return;
            }
            var row = $('.tb_element_cid_' + this.cid).first(),
                    model = api.Models.Registry.lookup(this.cid),
                    oldVal = model.get('gutter'),
                    before = Common.clone(row),
                    inner = row.find('.' + this.type + '_inner').first();
            api.Utils.columnDrag(inner, false, oldVal, val);
            inner.removeClass(oldVal).addClass(val);
            model.set({gutter: val}, {silent: true});
            api.undoManager.push(this.cid, before, $('.tb_element_cid_' + this.cid).first(), 'row');
        },
        gridMenu: function (el) {
            var breakpoint = api.activeBreakPoint,
                    isDesktop = breakpoint === 'desktop',
                    model = api.Models.Registry.lookup(this.cid),
                    dir = model.get(breakpoint + '_dir'),
                    column_aligment = model.get('column_alignment'),
                    column_h = model.get('column_h'),
                    gutter = model.get('gutter'),
                    inner = document.getElementsByClassName('tb_element_cid_' + this.cid)[0].getElementsByClassName(this.type + '_inner')[0],
                    col = isDesktop === true ? undefined : inner.getAttribute('data-col_'+breakpoint),
                    columns = inner.children,
                    count = columns.length,
                    grid_base = [];
            for (var i = 0; i < count; ++i) {
                grid_base.push(api.Utils._getColClass(columns[i].className.split(' ')));
            }
            var grid = el.id === 'tb_rgrids' ? el : $(el).find('#tb_rgrids')[0];
            for (var i = 6; i > -1; --i) {
                grid.classList.remove('col-count-' + i);
            }
            grid.classList.add('col-count-' + count);
            columns = grid = null;
            grid_base = 'grid-layout-' + grid_base.join('-');
            var wrap = el.getElementsByClassName('tb_grid_' + breakpoint)[0],
                    items = wrap.getElementsByClassName('tb_grid_list')[0].getElementsByTagName('li');
            col = col !== '-auto' && col? 'grid-layout-' + col.replace(/column|tb_3col/ig, '').trim() : false;

            if (isDesktop === false && (col===false || count === 1)) {
                col = breakpoint + '-auto';
            }
            for (var i = items.length - 1; i > -1; --i) {
                if ((isDesktop === true && items[i].classList.contains(grid_base)) || (isDesktop === false && items[i].classList.contains(col))) {
                    items[i].classList.add('selected');
                }
                else {
                    items[i].classList.remove('selected');
                }
            }
            grid_base = null;
            if (dir !== 'ltr') {
                items = wrap.getElementsByClassName('tb_column_direction')[0].getElementsByTagName('li');
                for (var i = items.length - 1; i > -1; --i) {
                    if (items[i].getAttribute('data-dir') === dir) {
                        items[i].classList.add('selected');
                    }
                    else {
                        items[i].classList.remove('selected');
                    }
                }
            }
            items = null;
            if (isDesktop === true) {
                if (column_aligment !== 'col_align_top' || is_fullSection === true) {
                    var aligments = wrap.getElementsByClassName('tb_column_alignment')[0].getElementsByTagName('li');
                    for (var i = aligments.length - 1; i > -1; --i) {
                        if (aligments[i].getAttribute('data-alignment') === column_aligment) {
                            aligments[i].classList.add('selected');
                        }
                        else {
                            aligments[i].classList.remove('selected');
                        }
                    }
                    aligments = null;
                }
                if (gutter !== 'gutter-default') {
                    var gutterSelect = wrap.getElementsByClassName('tb_column_gutter')[0].getElementsByTagName('li');
                    for (var i = gutterSelect.length - 1; i > -1; --i) {
                        if (gutterSelect[i].getAttribute('data-value') === gutter) {
                            gutterSelect[i].classList.add('selected');
                        }
                        else {
                            gutterSelect[i].classList.remove('selected');
                        }
                    }
                    gutterSelect = null;
                }
                if (column_h) {
                    var columnHeight = wrap.getElementsByClassName('tb_column_height')[0].getElementsByTagName('li');
                    for (var i = columnHeight.length - 1; i > -1; --i) {
                        if (columnHeight[i].getAttribute('data-value') == column_h) {
                            columnHeight[i].classList.add('selected');
                        }
                        else {
                            columnHeight[i].classList.remove('selected');
                        }
                    }
                }
            }

        },
        setRowOptions: function (el) {
            var prevData = null,
                    prevModel = api.activeModel,
                    prevType = ThemifyConstructor.component,
                    model = api.Models.Registry.lookup(this.cid),
                    currentStyle = model.get('styling');
            if (!currentStyle) {
                currentStyle = {};
            }

            if (prevModel !== null) {
                var k = api.activeModel.get('elType') === 'module' ? 'mod_settings' : 'styling';
                prevData = api.activeModel.get(k);
            }
            if (el.children[0] !== undefined) {
                while (el.firstChild) {
                    el.removeChild(el.firstChild);
                }
            }
            ThemifyConstructor.values = currentStyle;
            ThemifyConstructor.component = this.type;
            api.activeModel = model;

            el.appendChild(ThemifyConstructor.create(ThemifyConstructor.data['row'].setting['options'].slice(0, 5)));

            ThemifyConstructor.values = prevData;
            api.activeModel = prevModel;
            ThemifyConstructor.component = prevType;

            prevModel = prevData = model = prevType = null;
        },
        clear: function () {
            if (this.type !== null) {
                this.cid = this.type = null;
                this.el.classList.remove('tb_show_toolbar');
                while (this.el.firstChild) {
                    this.el.removeChild(this.el.firstChild);
                }
                if(this.prevExpand!==null && this.prevExpand!==undefined){
                    while (this.prevExpand.firstChild!==null) {
                        this.prevExpand.removeChild(this.prevExpand.firstChild);
                    }
                    this.prevExpand.removeAttribute('id');
                    this.prevExpand.closest('.tb_action_wrap').classList.remove('tb_clicked');
                    this.prevExpand=null;
                }
                this.clearSelected();
                Themify.body[0].classList.remove('tb_action_active');
                Themify.body[0].classList.remove('tb_component_menu_active');
            }
        },
        clearSelected:function(){
            var selected = api.Instances.Builder[0].el.getElementsByClassName('tb_element_selected');
            for(var i=selected.length-1;i>-1;--i){
                selected[i].classList.remove('tb_element_selected');
            }
            if(api.mode==='visual'){
                api.EdgeDrag.clearEdges();
            }
        },
        setPosition: function (el, from) {
            el.removeAttribute('data-top');
            var pos = {},
                    box = el.getBoundingClientRect(),
                    elW = box.width,
                    elH = box.height + 40,
                    winOffsetY = api.mode === 'visual' ? window.pageYOffset : (api.toolbar.el.offsetTop + this.topH),
                    container = api.mode === 'visual' ? document.body : api.Instances.Builder[0].el,
                    winW = container.clientWidth,
                    top;
            if (from.nodeType !== undefined) {
                pos = $(from).offset();
            }
            else {
                top = from.top;
                pos = from;
            }
            pos['right'] = pos['bottom'] = '';
            pos.left -= parseFloat(elW / 2);
            pos.top -= elH;
            var r = pos.left + elW;
            if (r > winW) {
                pos.left = 'auto';
                pos.right = 10;
            }
            else if (pos.left < 0) {
                pos.left = 30;
            }

            if (pos.top > container.clientHeight) {
                if (api.mode !== 'visual') {
                    pos.top = 'auto';
                    pos.bottom = 50;
                }
            }
            else if (winOffsetY > pos.top) {
                el.dataset['top'] = true;
                pos.top += 2 * elH - 25;
                if (api.mode !== 'visual') {
                    pos.top -= elH / 2;
                }
            }
            for (var i in pos) {
                el.style[i] = pos[i] !== 'auto' && pos[i] !== '' ? pos[i] + 'px' : pos[i];
            }
        }
    };

    // Validators
    api.Forms.register_validator = function (type, fn) {
        this.Validators[ type ] = fn;
    };
    api.Forms.get_validator = function (type) {
        return this.Validators[type] !== undefined ? this.Validators[ type ] : this.Validators.not_empty; // default
    };

    api.Forms.register_validator('email', function (value) {
        var pattern = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                arr = value.split(',');
        for (var i = arr.length - 1; i > -1; --i) {
            if (!pattern.test(arr[i])) {
                return false;
            }
        }
        return true;
    });

    api.Forms.register_validator('not_empty', function (value) {
        return !(!value || '' === value.trim());
    });

    api.GS = {
        styles: {},
        allLoaded: false,
        initContent: false,
        loadingPosts: false,
        el: null,
        dropdown: null,
        field: null,
        currentStyles: null,
        initVars: null,
        previousModel: null,
        // Init Global Style
        init: function () {
            if (undefined === themifyBuilder.globalStyleData) {
                this.styles = this.extend(this.styles, themifyBuilder.globalStyles);
            } else {
                Themify.body[0].className += ' gs_post';
                // Import CLick Event
                api.toolbar.el.getElementsByClassName('tb_import_btn')[0].addEventListener('click',function(e){
                    e.currentTarget.setAttribute('data-component','file');
                    api.toolbar.import(e);
                });
                // Set Export URL
                api.toolbar.el.getElementsByClassName('tb_export_link')[0].setAttribute('href',themifyBuilder.globalStyleData.exportURL);
                // Open Styling panel
                this.openStylingPanel();
            }
        },
        // Merge two object
        extend: function (obj, src) {
            for (var key in src) {
                if (src.hasOwnProperty(key))
                    obj[key] = src[key];
            }
            return obj;
        },
        // Search current styles by slug
        findBySlug: function (slug) {
            var keys = Object.keys(this.styles);
            for (var i = 0; i < keys.length; i++) {
                if (slug === this.styles[keys[i]].class) {
                    return this.styles[keys[i]];
                }
            }
            return false;
        },
        // Check value is not empty
        isEmpty: function (value) {
            return  value === undefined ||
                    value === null ||
                    (typeof value === "object" && Object.keys(value).length === 0) ||
                    (typeof value === "string" && value.trim().length === 0)
        },
        // Open Styling Panel in GS edit post
        openStylingPanel: function () {
            var type = themifyBuilder.globalStyleData.type,
                    prefix = type === 'row' || type === 'column' ? 'module_' : 'module-',
                    model = api.Models.Registry.lookup(api.Instances.Builder[api.builderIndex].el.getElementsByClassName(prefix + type)[0].dataset['cid']);
            model.trigger('edit', null);
            api.toolbar.el.getElementsByClassName('tb_toolbar_builder_preview')[0].click();
        },
        // Attach used GS to passed css
        attachCSS: function (css, used_gs, init) {
            if (init) {
                this.init();
                var keys = Object.keys(this.styles);
                for(var i=keys.length-1;i>-1;--i){
                    used_gs.push(keys[i]);
                }
            }
            var self = this, gsCSS;
            for(var i=used_gs.length-1;i>-1;--i){
                if ( typeof self.styles[ used_gs[i] ] === 'undefined' || typeof self.styles[ used_gs[i] ].data === 'undefined' ) {
                    return;
                }
                if(self.isEmpty(self.styles[used_gs[i]]['css'])){
                    self.styles[used_gs[i]]['css'] = ThemifyStyles.createCss(self.styles[used_gs[i]].data, null, true, self.styles[used_gs[i]].class);
                }
                gsCSS = self.styles[used_gs[i]]['css'];
                var keys = Object.keys(gsCSS);
                for(var k=keys.length-1;k>-1;--k){
                    css[keys[k]] = !css.hasOwnProperty(keys[k]) ? {} : css[keys[k]];
                    css[keys[k]] = self.extend(css[keys[k]], gsCSS[keys[k]]);
                }
            }
            gsCSS = self = null;
            return css;
        },
        // Find used items in builder data
        findUsedItems: function (data) {
            data = JSON.stringify(data);
            var pattern = /"global_styles":"(.*?)"/mg,
                    match,
                    used = '';
            while ((match = pattern.exec(data)) !== null) {
                used += ' ' + match[1].trim();
            }
            match = null;
            used = used.trim();
            if (used !== '') {
                used = $.unique(used.split(' '));
                var usedItems = [];
                for(var i=used.length-1;i>-1;--i){
                    var gs = this.findBySlug(used[i]);
                    if (gs) {
                        usedItems.push(gs.id);
                    }
                    gs = null;
                }
                used = null;
                return usedItems;
            }
            return false;
        },
        // Build require HTML for Global Style fields and controllers to add it in Styling Tab
        globalStylesHTML: function () {
            if (undefined !== themifyBuilder.globalStyleData || !this.isEmpty(api.activeModel.attributes['gs'])) {
                return false;
            }
            var container = document.createElement('div');
            container.className = 'tb_gs_container';
            container.className += !this.isEmpty(ThemifyConstructor.getStyleVal('global_styles')) ? ' tb_gs_not_empty' : '';
            var icon = document.createElement('div');
            icon.className = 'tb_gs_icon ti-brush-alt';
            icon.tabIndex = '-1';
            icon.addEventListener('blur', function (e) {
                api.GS.el.classList.add('tb_gs_dropdown_opened');
                setTimeout(function () {
                    if (api.GS.el.querySelector('[data-action="insert"]') !== window.top.document.activeElement) {
                        api.GS.el.classList.remove('tb_gs_dropdown_opened');
                    }
                }, 300);
            });
            var tooltip = document.createElement('span');
            tooltip.className = 'tb_gs_tooltip';
            tooltip.textContent = themifyBuilder.i18n.gs;
            icon.appendChild(tooltip);
            container.appendChild(icon);
            container.addEventListener('mousedown', this.initClickEvent.bind(this));
            this.el = container;

            this.initVars = false;
            this.initContent = false;
            container = null;
            return this.el;
        },
        // Init HTML on click
        initHTML: function () {
            // Create Selected Styles
            var selectedGS = ThemifyConstructor.getStyleVal('global_styles'),
                    fr = document.createDocumentFragment(),
                    container = document.createElement('div');
            container.className = 'tb_gs_selected_styles';
            selectedGS = selectedGS === undefined ? '' : selectedGS.trim();
            if (selectedGS !== '') {
                var styles = selectedGS.split(" ");
                for(var i=styles.length-1;i>-1;--i){
                    var gs = this.findBySlug(styles[i]);
                    if (gs) {
                        var selectedItem = this.createSelectedItem(gs.id);
                        fr.appendChild(selectedItem);
                        selectedItem = null;
                    }
                    gs = null;
                }
            }
            container.appendChild(fr);
            this.el.appendChild(container);
            selectedGS = styles = fr = container = null;
            // Add GS dropdown
            var tpl_id = 'tmpl-global_styles',
                    tpl = Common.is_template_support ? document.getElementById(tpl_id).content.cloneNode(true) : Common.templateCache.get(tpl_id),
                    icon = this.el.getElementsByClassName('tb_gs_icon')[0];
            Common.is_template_support ? icon.appendChild(tpl) : icon.insertAdjacentHTML('afterbegin', tpl);
            tpl = null;
            var insert = this.el.querySelector('[data-action="insert"]');
            insert.addEventListener("focus", function () {
                this.el.classList.add('tb_gs_dropdown_opened');
                this.el.classList.add('tb_gs_searching');
            }.bind(this));
            insert.addEventListener("blur", function () {
                setTimeout(function () {
                    if (api.GS.el.querySelector('#global-style-search') !== window.top.document.activeElement) {
                        api.GS.el.classList.remove('tb_gs_dropdown_opened');
                        api.GS.el.classList.remove('tb_gs_searching');
                    }
                }, 100);
            }.bind(this));
        },
        // Crete selected GS HTML
        createSelectedItem: function (id) {
            var post = this.styles[id],
                    selectedItem = document.createElement('div');
            selectedItem.className = 'tb_selected_style';
            selectedItem.dataset['css'] = post.class;
            selectedItem.dataset['id'] = id;
            var edit = document.createElement('span');
            edit.className = 'tb_gs_edit ti-pencil';
            selectedItem.appendChild(edit);
            var title = document.createElement('span');
            title.innerText = post.title;
            selectedItem.appendChild(title);
            var deleteIcon = document.createElement('span');
            deleteIcon.className = 'tb_delete_gs ti-close';
            selectedItem.appendChild(deleteIcon);
            return selectedItem;
        },
        // Init current Styles
        initCurrentStyles: function () {
            this.currentStyles = (this.field.value !== '') ? this.field.value.split(" ") : [];
            if (this.currentStyles.length) {
                for(var i=this.currentStyles.length-1;i>-1;--i){
                    var gs = this.findBySlug(this.currentStyles[i]);
                    if (!gs) {
                        this.delete(this.currentStyles[i]);
                    }
                    gs = null;
                }
            }
        },
        // Init Save as global style event
        saveAs: function () {
            var self = this;
            Common.LiteLightbox.prompt(themifyBuilder.i18n.enterGlobalStyleName, function (title) {
                if (title !== null) {
                    if ('' === title) {
                        alert(themifyBuilder.i18n.enterGlobalStyleName);
                        self.saveAs();
                        return false;
                    } else {
                        self.saveAsCallback(title);
                    }
                }
            });
        },
        // Submit save as new global style modal
        saveAsCallback: function (title) {
            ThemifyConstructor.setStylingValues(api.activeBreakPoint);
            var type = api.activeModel.get('elType'),
                    styles = api.Utils.clear(ThemifyConstructor.values);
            type = 'module' === type ? api.activeModel.get('mod_name') : type;
            styles.global_styles = '';
            var self = this;
            $.ajax({
                type: 'POST',
                url: themifyBuilder.ajaxurl,
                dataType: 'json',
                data: {
                    action: 'tb_save_as_new_global_style',
                    tb_load_nonce: themifyBuilder.tb_load_nonce,
                    type: type,
                    styles: styles,
                    title: title
                },
                beforeSend: function () {
                    Common.showLoader('show');
                },
                error: function () {
                    Common.showLoader('error');
                },
                success: function (res) {
                    Common.showLoader('hide');
                    if ('success' === res.status) {
                        self.styles[res.post_data.id] = res.post_data;
                        self.addItemToDropdown(res.post_data.id);
                    }
                    var data = res.post_data.data;
                    data = api.Utils.clear(data);
                    var css = ThemifyStyles.createCss(data, null, true);
                    $.ajax({
                        type: 'POST',
                        url: themifyBuilder.ajaxurl,
                        cache: false,
                        data: {
                            css: JSON.stringify(css),
                            action: 'tb_save_css',
                            tb_load_nonce: themifyBuilder.tb_load_nonce,
                            id: res.post_data.id
                        }
                    });
                    css = null;
                    var options = {
                        buttons: {
                            no: {
                                label: ThemifyConstructor.label.no,
                            },
                            yes: {
                                label: ThemifyConstructor.label.y
                            }
                        }
                    };
                    Common.LiteLightbox.confirm(themifyBuilder.i18n.addSavedGS, function (response) {
                        if ('yes' === response) {
                            // Reset Styles
                            Common.Lightbox.$lightbox[0].getElementsByClassName('reset-styling')[0].click();
                            // Insert GS
                            self.insert(res.post_data.id);
                        }
                    }, options);
                }
            });
        },
        // Delete Global Style from module
        delete: function (cssClass, id) {
            var item = this.el.querySelector('.global_style_item[data-class="' + cssClass + '"]');
            if (item !== null) {
                item.classList.remove('selected');
            }
            // Add CSS class to global style field
            var moduleGlobalStyles = this.field.value.trim();
            moduleGlobalStyles = moduleGlobalStyles.split(" ");
            moduleGlobalStyles.splice(moduleGlobalStyles.indexOf(cssClass), 1);
            this.currentStyles = moduleGlobalStyles;
            if (!this.currentStyles.length) {
                this.el.classList.remove('tb_gs_not_empty');
                var overlay = ThemifyBuilderCommon.Lightbox.$lightbox[0].getElementsByClassName('tb_gs_options_overlay');
                if(overlay.length>0){
                    ThemifyBuilderCommon.Lightbox.$lightbox[0].getElementsByClassName('tb_gs_options_overlay')[0].click();
                }
                overlay = null;
            }
            // Update needed params (Parallax,Zoom scrolling, Frame and Overlay)
            if (id !== undefined) {
                this.updated();
            }
            this.field.value = moduleGlobalStyles.join(' ');
            if ('visual' === api.mode) {
                Themify.triggerEvent(this.field, 'keyup');
                ThemifyConstructor.styles[ 'global_styles' ] = moduleGlobalStyles.join(' ');
            }
            return true;
        },
        // Insert new global style
        insert: function (id) {
            //check if its css loaded or not
            if ('visual' === api.mode && this.styles[id].cssLoaded !== true) {
                //set live css style
                api.liveStylingInstance.setCss(this.styles[id].data, undefined, this.styles[id].class);
                this.styles[id].cssLoaded = true;
            }
            this.insertCallback(id);
        },
        // Insert Global Style into module
        insertCallback: function (id) {
            // Add selected global style HTML and hide it in drop down
            if (null !== this.dropdown) {
                this.dropdown.querySelector('.global_style_item[data-class="' + this.styles[id].class + '"]').classList.add('selected');
            }
            var newNode = this.createSelectedItem(id);
            this.el.getElementsByClassName('tb_gs_selected_styles')[0].appendChild(newNode);
            // Add CSS class to global style field
            var moduleGlobalStyles = this.field.value;
            moduleGlobalStyles = moduleGlobalStyles + ' ' + this.styles[id].class;
            this.field.value = moduleGlobalStyles.trim();
            this.currentStyles = this.field.value.split(" ");
            if (this.currentStyles.length) {
                this.el.classList.add('tb_gs_not_empty');
            }
            // Update needed params (Parallax,Zoom scrolling, Frame and Overlay)
            this.updated();
            if ('visual' === api.mode) {
                Themify.triggerEvent(this.field, 'keyup');
                ThemifyConstructor.styles[ 'global_styles' ] = moduleGlobalStyles.trim();
            }
        },
        // Handle Global Style search
        search: function () {
            var input = this.el.querySelector('#global-style-search');
            input.addEventListener("input", search);
            input.addEventListener("focus", function () {
                this.el.classList.add('tb_gs_dropdown_opened');
                this.el.classList.add('tb_gs_searching');
            }.bind(this));
            input.addEventListener("blur", function () {
                this.el.classList.remove('tb_gs_dropdown_opened');
                this.el.classList.remove('tb_gs_searching');
            }.bind(this));

            function search(e) {
                var filter = e.target.value.toUpperCase(),
                        list = Common.Lightbox.$lightbox.find('.tb_gs_list')[0],
                        items = list.getElementsByClassName("global_style_item");
                for (var i = 0; i < items.length; i++) {
                    var title = items[i].getElementsByClassName("global_style_title")[0];
                    if (title) {
                        if (title.innerHTML.toUpperCase().indexOf(filter) > -1) {
                            items[i].style.display = "";
                        } else {
                            items[i].style.display = "none";
                        }
                    }
                }
            }
        },
        // Add Item to dropdown
        addItemToDropdown: function (key) {
            if (null == this.dropdown) {
                return;
            }
            var post = this.styles[key],
                    container = document.createElement('div');
            container.className = 'global_style_item';
            container.className += this.currentStyles.indexOf(post.class) !== -1 ? ' selected' : '';
            container.dataset.class = post.class;
            container.dataset.styleId = key;
            var titleTag = document.createElement('span');
            titleTag.className = 'global_style_title';
            titleTag.innerText = post.title;
            container.appendChild(titleTag);
            var typeTag = document.createElement('span');
            typeTag.className = 'global_style_type';
            typeTag.innerText = post.type;
            container.appendChild(typeTag);
            this.dropdown.insertBefore(container, this.dropdown.firstChild);
            post = null;
        },
        // Load More Items
        loadMore: function (firstLoad) {
            var loaded = [],
                self = this,
                keys = Object.keys(this.styles);
            for(var i=keys.length-1;i>-1;--i){
                loaded.push(keys[i]);
                if (firstLoad) {
                    this.addItemToDropdown(keys[i]);
                }
            }
            $.ajax({
                type: 'POST',
                url: themifyBuilder.ajaxurl,
                dataType: 'json',
                data: {
                    action: 'tb_get_gs_posts',
                    tb_load_nonce: themifyBuilder.tb_load_nonce,
                    loaded: loaded
                },
                success: function (res) {
                    self.styles = self.extend(self.styles, res);
                    var keys = Object.keys(res);
                    if (keys.length < 10) {
                        self.allLoaded = true;
                    }
                    for(var i=keys.length-1;i>-1;--i){
                        self.addItemToDropdown(keys[i]);
                    }
                    if (self.dropdown.querySelectorAll('.global_style_item:not(.selected)').length === 0) {
                        self.dropdown.getElementsByClassName('tb_no_gs_item')[0].style.display = 'block';
                    }
                    self.loadingPosts = false;
                }
            });
        },
        // Init Drop Down Items
        initDropdown: function () {
            this.dropdown = this.el.getElementsByClassName('tb_gs_list')[0];
            this.search();
            var itemCount = Object.keys(this.styles).length;
            if (itemCount > 10 || this.allLoaded) {
                var keys = Object.keys(this.styles);
                for (var i = keys.length - 1; i > -1; --i) {
                    this.addItemToDropdown(keys[i]);
                }
                if (this.dropdown.querySelectorAll('.global_style_item:not(.selected)').length === 0) {
                    this.dropdown.getElementsByClassName('tb_no_gs_item')[0].style.display = 'block';
                }
            } else {
                this.loadMore(true);
            }
            var el = new SimpleBar(this.dropdown),
                    simpleBarContainer = this.dropdown.getElementsByClassName('simplebar-content'),
                    dropdown = this.dropdown;
            if (simpleBarContainer.length) {
                this.dropdown = simpleBarContainer[0];
                dropdown = el.getScrollElement();
            }
            dropdown.addEventListener('scroll', this.scrollLoadMore.bind(this));
        },
        // Init Click events on GS container
        initClickEvent: function (e) {
            if (this.initVars !== true) {
                this.field = Common.Lightbox.$lightbox[0].querySelector('#global_styles');
                this.initCurrentStyles();
                this.initVars = true;
            }
            if (!this.initContent) {
                this.initHTML();
                this.initContent = true;
            }
            var target = e.target,
                    classList = target.classList;
            if (target.dataset['action'] === 'insert') {
                if (target.nodeName === 'LABEL' || classList.contains('tb_open_gs')) {
                    return true;
                }
                e.preventDefault();
                e.stopImmediatePropagation();
                if (target.dataset['action'] === 'insert') {
                    target.focus();
                    // Init Dropdown
                    if (target.dataset.init === undefined) {
                        this.initDropdown();
                        target.dataset.init = true;
                    } else {
                        var noContent = this.dropdown.getElementsByClassName('tb_no_gs_item')[0];
                        if (this.dropdown.querySelectorAll('.global_style_item:not(.selected)').length === 0) {
                            noContent.style.display = 'block';
                        } else {
                            noContent.style.display = 'none';
                        }
                    }
                }
            } else if (classList.contains('global_style_title')) {
                e.preventDefault();
                this.el.classList.remove('tb_gs_dropdown_opened');
                $(target).parents('.tb_gs_icon').focus();
                this.insert(target.parentElement.dataset.styleId);
                if (this.dropdown.querySelectorAll('.global_style_item:not(.selected)').length === 0) {
                    this.dropdown.getElementsByClassName('tb_no_gs_item')[0].style.display = 'block';
                }
            } else if (classList.contains('tb_delete_gs')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (this.delete(target.parentElement.getAttribute('data-css'), target.parentElement.getAttribute('data-id'))) {
                    target.parentElement.outerHTML = '';
                }
                $(api.GS.el.querySelector('.tb_gs_icon')).focus();
            } else if (target.dataset['action'] === 'save') {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.saveAs();
            } else if (classList.contains('tb_gs_edit')) {
                this.liveEdit(target.parentNode.dataset.id);
            }
        },
        // Init load more by scroll
        scrollLoadMore: function (e) {
            if (this.allLoaded) {
                return;
            }
            var target = e.target,
                    distToBottom = Math.max(target.scrollHeight - (target.scrollTop + target.offsetHeight), 0);
            if (!this.loadingPosts && distToBottom > 0 && distToBottom <= 100) {
                this.loadingPosts = true;
                this.loadMore();
            }
        },
        // Add GS parallax and zoom attributes and classes
        extraClass: function () {
            var parallaxFound = false,
                    parallaxClass = 'builder-parallax-scrolling',
                    zoomFound = false,
                    zoomClass = 'builder-zoom-scrolling',
                    self = this;
            this.currentStyles.some(function (key) {
                if (zoomFound && parallaxFound) {
                    return true;
                }
                var gs = self.findBySlug(key);
                if (gs) {
                    var backgroundRepeat = 'row' === self.styles[gs.id].type ? self.styles[gs.id].data[0].styling.background_repeat : self.styles[gs.id].data[0].cols[0].styling.background_repeat;
                    if (backgroundRepeat === parallaxClass && !parallaxFound) {
                        parallaxFound = true;
                    }
                    if (backgroundRepeat === zoomClass && !zoomFound) {
                        zoomFound = true;
                    }
                }
            });
            var el = document.querySelector('[data-cid="' + api.activeModel.cid + '"]');
            if (parallaxFound) {
                el.classList.add(parallaxClass);
            } else if (ThemifyConstructor.values.background_repeat !== parallaxClass) {
                el.classList.remove(parallaxClass);
            }
            if (zoomFound) {
                el.classList.add(zoomClass);
            } else if (ThemifyConstructor.values.background_repeat !== zoomClass) {
                el.classList.remove(zoomClass);
            }
            self = null;
        },
        // Trigger required functions on add/delete a GS
        updated: function () {
            if ('visual' !== api.mode) {
                return false;
            }
            var type = api.activeModel.get('elType');
            type = 'subrow' === type ? 'row' : type;
            if ('row' === type || 'column' === type) {
                // Check for adding Parallax and Zoom scrolling class
                this.extraClass();
                // Check for adding overlay
                this.addOverlay();
                if ('row' === type) {
                    // Check for adding frames
                    this.addFrame();
                }
            }
        },
        // Add overlay if needed
        addOverlay: function () {
            var type = api.activeModel.get('elType');
            type = 'subrow' === type ? 'row' : type;
            var overlayElmt = api.liveStylingInstance.getComponentBgOverlay();
            if (!overlayElmt.length) {
                var add = false,
                        self = this,
                        value,
                        overlayType;
                this.currentStyles.some(function (key) {
                    if (add) {
                        return true;
                    }
                    var gs = self.findBySlug(key);
                    if (gs) {
                        var styling = 'row' === type ? gs.data[0].styling : gs.data[0].cols[0].styling;
                        overlayType = undefined !== styling['cover_color-type'] || 'color' === styling['cover_color-type'] ? 'color' : 'gradient',
                                value = overlayType === 'color' ? styling['cover_color'] : styling['cover_gradient-gradient'];
                        if (self.isEmpty(value)) {
                            overlayType = undefined !== styling['cover_color_hover'] || 'hover_color' === styling['cover_color_hover-type'] ? 'color' : 'gradient';
                            value = overlayType === 'color' ? styling['cover_color_hover'] : styling['cover_gradient_hover-gradient'];
                        }
                        if (!self.isEmpty(value)) {
                            add = true;
                        }
                    }
                });
                if (add) {
                    api.liveStylingInstance.addOrRemoveComponentOverlay(overlayType, 'cover_color', value);
                }
            }
        },
        // Add row frame if needed
        addFrame: function () {
            if (this.initVars !== true) {
                this.field = Common.Lightbox.$lightbox[0].querySelector('#global_styles');
                this.initCurrentStyles();
                this.initVars = true;
            }
            var sides = ['top', 'bottom', 'left', 'right'],
                    add = [],
                    self = this;
            for (var i = sides.length - 1; i > -1; --i) {
                var $frame = api.liveStylingInstance.$liveStyledElmt.children('.tb_row_frame_' + sides[i]);
                if ($frame.length) {
                    sides.splice(i, 1);
                }
                $frame = null;
            }
            if (sides.length === 0) {
                return true;
            }
            var styling = {};
            this.currentStyles.some(function (key) {
                var gs = self.findBySlug(key);
                if (gs) {
                    styling = gs.data[0].styling;
                    sides.some(function (side) {
                        if (-1 === add.indexOf(side)) {
                            var frameType = side + "-frame_type",
                                    frameLayout = side + "-frame_layout",
                                    frameCustom = side + "-frame_custom";
                            if (undefined !== styling[frameType]) {
                                if ((styling[frameType] === side + '-presets' && (undefined !== styling[frameLayout] && '' !== styling[frameLayout])) || (styling[frameType] === side + '-custom' && (undefined !== styling[frameCustom] && '' !== styling[frameCustom]))) {
                                    add.push(side);
                                }
                            }
                        }
                    });
                }
            });
            for (var i = add.length - 1; i > -1; --i) {
                api.liveStylingInstance.addOrRemoveFrame(add[i], styling[add[i] + '-frame_location']);
            }
        },
        // Live edit GS
        liveEdit: function (id) {
            var gsPost = this.styles[id],
                    args = {gs: id};
            this.previousModel = api.activeModel.cid;
            if ('row' === gsPost.type) {
                args = this.extend(args, gsPost.data[0]);
                var model = tb_app.Views.init_row(args);
            } else if ('column' === gsPost.type) {
                args = this.extend(args, gsPost.data[0]['cols'][0]);
                var model = tb_app.Views.init_column(args);
            } else {
                args = this.extend(args, gsPost.data[0]['cols'][0]['modules'][0]);
                var model = tb_app.Views.init_module(args);
            }
            model.model.trigger('edit', null);
        },
        // Hide all tabs except styling tab in module panel
        modulePanel: function (gs) {
            if (gs) {
                Common.Lightbox.$lightbox[0].className += ' gs_post';
            } else {
                Common.Lightbox.$lightbox[0].classList.remove('gs_post');
            }
        },
        // Save GS module panel in Live edit mode
        saveLiveEdit: function (triggerData) {
            api.saving = true;
            var gsPost = this.styles[api.activeModel.attributes['gs']];
            gsPost.css = null;
            delete ThemifyConstructor.values['cid'];
            ThemifyConstructor.setStylingValues(api.activeBreakPoint);
            var data = api.Utils.clear(ThemifyConstructor.values);
            if ('row' === gsPost.type) {
                gsPost.data[0]['styling'] = data;
            } else if ('column' === gsPost.type) {
                gsPost.data[0]['cols'][0]['styling'] = data;
            } else {
                gsPost.data[0]['cols'][0]['modules'][0]['mod_settings'] = data;
            }
            var $elem = $('.' + gsPost.class);
            $elem.removeClass('tb_visual_hover');

            // Open previous Panel
            var self = this;
            $.ajax({
                type: 'POST',
                url: themifyBuilder.ajaxurl,
                dataType: 'json',
                data: {
                    action: 'tb_update_global_style',
                    tb_load_nonce: themifyBuilder.tb_load_nonce,
                    data: gsPost.data,
                    id: gsPost.id
                },
                beforeSend: function () {
                    Common.showLoader('show');
                },
                error: function () {
                    Common.showLoader('error');
                    Common.Lightbox.close();
                },
                success: function () {
                    self.styles[gsPost.id].data = gsPost.data;
                    Common.Lightbox.close();
                    self.reopenPreviousPanel(triggerData);
                    Common.showLoader('hide');
                    api.saving = false;
                }
            });
        },
        // Open prevous module panel
        reopenPreviousPanel: function (triggerData) {
            if(undefined !== triggerData){
                triggerData.model.trigger('edit',triggerData.e, triggerData.target);
                return;
            }else if (null === this.previousModel || !Common.Lightbox.$lightbox[0].classList.contains('gs_post')) {
                return;
            }
            this.modulePanel(false);
            var model = api.Models.Registry.lookup(this.previousModel);
            model.trigger('edit', null);
            this.previousModel = null;
        },
        // Add styling overlay
        stylingOverlay: function (  ) {
            var o = document.createElement('div');
            o.className = 'tb_gs_options_overlay';
            var t = document.createElement('p');
            t.textContent = themifyBuilder.i18n.has_gs;
            o.appendChild(t);
            o.addEventListener('click',function () {
                this.parentNode.removeChild(this);
            },{once:true});
            return o;
        }
    };

})(jQuery, Backbone, Themify, window, window.top, document, ThemifyBuilderCommon, undefined);
