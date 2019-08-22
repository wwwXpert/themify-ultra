(function ($) {
    // Public methods
    $.themify_tiles = {
        resizeParent: function ($el) {
            var tiles = $el.children('.post'),
                last = tiles.last();
                $el.css('height', last.outerHeight(true) + last.css('position', 'absolute').position().top);
                setTimeout(function () {
                        if(!$el[0].classList.contains('auto_tiles')){
                                if($el.data('themify_tiles')){
                                        $el.destroy();	
                                }
                                return;
                        }
                        tiles.css({'position': 'absolute', 'opacity': 1});
                        $el.css('height', last.outerHeight(true) + last.position().top).addClass('loading-finish').removeClass('tiles_resing').triggerHandler('auto_tiles_ready.themify');
                }, Math.round(parseFloat($el.css('transition-duration')) * 1000) + 300);
        },
        setBackstretch: function (flag, $this) {
            if ('undefined' !== typeof $.fn.backstretch && 'undefined' !== typeof $.fn.imagesLoaded) {
				var imgLoad = imagesLoaded( $this ),
					onLoad = function () {
					imgLoad.off( 'always', onLoad );
                    $this.find('.post:visible').each(function () {
                        var postImage = $(this).find('.post-image'),
                                img = postImage.find('img'),
                                src = img.prop('src');
                        if (src) {
                            postImage.backstretch(src);
                            var a = postImage.find('a'),
                                saveA = a;
                            a.remove();
                            img.remove();
                            postImage.find('img').wrap(saveA);
                        }
                    });
                };
                imgLoad.once( 'always', onLoad);
            }
        }
    };

    setClasses = function (items, small) {
        items.each(function () {
            var item_width = $(this).width(),
			   item_heigth = $(this).height();
            if (item_width - 10 <= small) {
                if (item_width === item_heigth) {
                    this.classList.add('tiled-square-small');
                }
                else if (item_heigth > item_width) {
                    this.classList.add('tiled-portrait');
                }
            }
            else if (item_width > small) {
                if (item_width > item_heigth) {
                    this.classList.add('tiled-landscape');
                }
                else {
                    this.classList.add('tiled-square-large');
                }
            }
        });
    };

    $.fn.extend({
        grids: {},
        grid: false,
        curr_large_template: false,
        small_screen_grid: false,
        opts: {},
        using_small: false,
        SetTemplateByCount: function ($el, grids, count) {
            count = count > 0 ? count : $el.children('.post:visible').length;
            var result = [];
            if (grids[count]) {
                return grids[count];
            }
            if (count > 10) {
                var max =count > 13 ? 13 : 10,
                                residue = count % max,
                                integer = parseInt(count / max);
                if (integer > 0) {
                    var items = grids[max];
                    for (var i = 0; i < integer; ++i) {
                        for (var it in items) {
                            result.push(items[it]);
                        }
                    }
                }
                if (residue > 0) {
                    for (var i in grids[residue]) {
                        result.push(grids[residue][i]);
                    }
                }
            }
            return count > 10 ? result : grids[count];
        },
        destroy:function(){
                var $this = $(this);
                $this.find('.post').each(function(){
                    var backstretch = $(this).removeAttr('style').find('.post-image').first().removeAttr('style').find('.backstretch').first();
                    if(backstretch.length>0){
                        backstretch.find('img').first().removeAttr('style');
                        backstretch[0].parentNode.innerHTML=backstretch[0].innerHTML;
                    }
                }).removeData('themify_tiles');
                this.grid=null;
                this.tiles = [];
        },
        update: function () {
            var $posts = $(this).children('.post:visible');
            this.grid.tiles = [];
            var $template = this.SetTemplateByCount(this, this.opts.grids[this.opts.default_grid], $posts.length);
            this.curr_large_template = Tiles.Template.fromJSON($template);
            this.grid.template = this.get_template();
            this.grid.isDirty = true;
            this.grid.updateTiles($posts);
            this.grid.redraw(this.opts.animate_template, $.themify_tiles.setBackstretch, $(this));
        },
        onresize: function ($flag, $this) {
            $.themify_tiles.resizeParent($this);
            $.themify_tiles.setBackstretch($flag, $this);
        },
        get_template: function () {
            var is_small;
            // First run?
            if (!this.curr_large_template) {
                this.curr_large_template = this.grids[this.opts.default_grid];
            }

            // Setup for responsiveness?
            if (!this.opts.breakpoint) {
                return this.curr_large_template;
            }
            is_small = $(this).width() < this.opts.breakpoint;
            if (is_small && !this.using_small) {
                // Save large template
                this.using_small = true;
                return this.small_screen_grid;

            } else if (!is_small && this.using_small) {
                this.using_small = false;
                return this.curr_large_template;
            }
            return is_small ? this.small_screen_grid : this.curr_large_template;
        },
        themify_tiles: function (opts, $small) {
            var $el = $(this),
                $this = this,
                infinity_template = false;
                if(!$el[0].classList.contains('auto_tiles')){
                        return;
                }
            // Init the grids
            if (opts.breakpoint && opts.small_screen_grid) {
                this.small_screen_grid = Tiles.Template.fromJSON(opts.small_screen_grid);
            }
            // Pass the post tiles into Tiles.js
            var $posts = $el.children('.post');
            this.opts = opts;
            var $g = $.extend(true, {}, opts.grids);
            infinity_template = $g[opts.default_grid] = this.SetTemplateByCount($el, $g[opts.default_grid], $posts.length);
            $.each($g, function (key) {
                $this.grids[key] = Tiles.Template.fromJSON(this);
            });
            // Setup the Tiles grid
            this.grid = $.extend(new Tiles.Grid($el), {
                cellPadding: parseInt($this.opts.padding),
                template: $this.get_template(),
                templateFactory: {
                    get: function (numCols, numTiles) {
                        var template = $this.get_template().copy(),
                            len =  template.rects.length,
                            missingRects = numTiles - len;
                        while (missingRects > 0) {
                            var copyRects = [];
                            if (missingRects <= len) {
                                copyRects = template.rects;
                                missingRects = 0;

                            } else {
                                for (var i = 0; i < len; ++i) {
                                    copyRects.push(template.rects[i].copy());
                                }
                                missingRects -= len;
                            }

                            template.append(new Tiles.Template(copyRects, template.numCols, template.numRows));
                        }

                        return template;
                    }
                },
                resizeColumns: function () {
                    return this.template.numCols;
                },
                createTile: function (data) {
                    var tile = new Tiles.Tile(data.id, data);
                    tile.$el.find('.post-image img').css('opacity', '0');
                    return tile;
                }
            });
            this.grid.updateTiles($posts);
            // Draw!
            this.grid.redraw(this.opts.animate_init, this.onresize, this);

             $el.off('infiniteloaded.themify').on('infiniteloaded.themify', function (e, $newel) {
				$('#infscr-loading').remove()
                if ($newel.closest('.auto_tiles').length > 0) {
                    var old_filter = typeof LayoutAndFilter!=='undefined' ? LayoutAndFilter.filterActive : false;
                    if (old_filter) {
                        LayoutAndFilter.filterActive = false;
                    }

                    var last_item = infinity_template[infinity_template.length - 1],
						template = $this.SetTemplateByCount($el, $this.opts.grids[$this.opts.default_grid], $newel.length);
                    template = $.extend(true, {}, template);
                    if (last_item === template[0]) {
                        var char_length = template[0].length - 1,
							chars_array = {},
							reserved_chars = ['X', 'Y', 'Z', 'V', 'T', 'F', 'K'];
                        for (var j = 0; j < char_length; ++j) {
                            var _char = template[0].charAt(j);
                            if (_char !== '.') {
                                chars_array[_char] = reserved_chars[j];
                            }
                        }
                        for (var k in chars_array) {
                            template[0] = template[0].replace( new RegExp(k, "g"), chars_array[k]);
                        }
                        if (template[1] && template[1] === last_item) {
                            template[1] = template[0];
                        }
                    }
                    for (var i in template) {
                        infinity_template.push(template[i]);
                    }
                    $this.curr_large_template = Tiles.Template.fromJSON(infinity_template);
					var $posts = $el.children('.post');
					$this.grid.tiles = [];
					$this.grid.updateTiles($posts);
                    $this.grid.template = $this.get_template();
                    $this.grid.isDirty = true;
                    $this.grid.redraw($this.opts.animate_template, $this.onresize, $this);
                    if (old_filter) {
                        LayoutAndFilter.filterActive = old_filter;
                    }
                    setClasses($newel, $small);
                }

            }).data('themify_tiles', this);

            // when the window resizes, redraw the grid
            $(window).on('tfsmartresize', function (e) {
                if (!e.isTrigger) {
                    setTimeout( function() {
                            $this.grid.template = $this.get_template();
                            $this.grid.isDirty = true;
                            $this.grid.resize();
                            $this.addClass('tiles_resing');
                            $this.grid.redraw(opts.animate_resize, $this.onresize, $this);
                    }, 100 );
                }
            });
        }
    });
})(jQuery);