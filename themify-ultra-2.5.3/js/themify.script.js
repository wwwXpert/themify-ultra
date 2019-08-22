/* Themify Theme Scripts - https://themify.me/ */

// Declar object literals and variables
var FixedHeader = {}, LayoutAndFilter = {}, themifyScript, ThemifySlider, ThemifyMediaElement, qp_max_pages;

// debouncedresize event
(function ($) {
    var $event = $.event, $special, resizeTimeout;
    $special = $event.special.debouncedresize = {setup: function () {
            $(this).on("resize", $special.handler);
        }, teardown: function () {
            $(this).off("resize", $special.handler);
        }, handler: function (event, execAsap) {
            var context = this, args = arguments, dispatch = function () {
                event.type = "debouncedresize";
                $event.dispatch.apply(context, args);
            };
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            execAsap ? dispatch() : resizeTimeout = setTimeout(dispatch, $special.threshold);
        }, threshold: 150};
})(jQuery);

(function ($) {
    $(document).ready(function () {
        var $sections = $('.type-section'),
                usesRows = !$sections.length,
                isFullPageScroll = !Themify.is_builder_active && themifyScript.fullPageScroll && Themify.body[0].classList.contains('full-section-scrolling'),
                sectionClass = '.section-post:not(.section-post-slide)',
                is_horizontal_scrolling = isFullPageScroll && Themify.body[0].classList.contains('full-section-scrolling-horizontal'),
                slideClass = '.module_row_slide',
                sectionsWrapper = 'div:not(.module-layout-part) > #loops-wrapper',
                fixedHeader = Themify.body[0].classList.contains('fixed-header'),
                wowInit2;

        // Setup variables if it uses Builder rows instead of section post type
        if (isFullPageScroll) {
            if (usesRows) {
                isFullPageScroll = $('.themify_builder').length > 0;
                sectionClass = '.module_row:not('+slideClass+')';
                sectionsWrapper = 'div:not(.module-layout-part) > .themify_builder_content:not(.not_editable_builder)';
            }
            isFullPageScroll && updateFullPage();
        }

        // Remove non visible rows
        function updateFullPage() {
            var rows = usesRows?$(sectionsWrapper+'>.module_row') : $(sectionsWrapper + '>' + sectionClass),
                    bp = themifyScript.responsiveBreakpoints || {},
                    winWidth = window.innerWidth,
                    bpRange = {
                        desktop: winWidth >= bp.tablet_landscape,
                        tablet: winWidth < bp.tablet_landscape && winWidth >= bp.mobile,
                        mobile: winWidth <= bp.mobile
                    };

            rows.each(function () {
                var $el = $(this),
                        cl = this.classList;

                if ($el.is(':hidden')) {
                    $el.remove();
                } else if (cl.contains('hide-desktop') || cl.contains('hide-tablet') || cl.contains('hide-mobile')) {
                    for (var key in bpRange) {
                        bpRange[key] === true && cl.contains('hide-' + key) && $el.remove();
                    }
                }
            });
            // Set default row column alignment
            window.top._rowColAlign = 'col_align_middle';
        }

        function loadIsotop(condition, callback) {
            if (condition) {
                if (typeof $.fn.isotope !== 'function') {
                    Themify.LoadAsync(themifyScript.themeURI + '/js/jquery.isotope.min.js', function () {
                        callback();
                    },
                            null,
                            null,
                            function () {
                                return ('undefined' !== typeof $.fn.isotope);
                            });
                } else {
                    callback();
                }
            }
        }

        // Fixed Header /////////////////////////
        FixedHeader = {
            headerHeight: 0,
            hasHeaderSlider: false,
            headerSlider: false,
            $pageWrap: $('#pagewrap'),
            $headerWrap: $('#headerwrap'),
            $window: $(window),
            stickyHeader: themifyScript.sticky_header,
            init: function () {
                if (!Themify.is_builder_active) {
                    var _this = this;

                    _this.calculateHeaderHeight();

                    if (Themify.body.hasClass('revealing-header') && 'undefined' !== typeof _this.$headerWrap[0]) {
                        this.headerRevealing();
                    }
                    if (fixedHeader) {
                        if (isFullPageScroll) {
                            Themify.body.on('themify_onepage_afterload', function (event, $section, section_id) {
                                var $is_scroll = $(slideClass + '.active', $('.section-container.active')).closest('.section-container').index() > 0;
                                _this.activate($is_scroll);

                                if ($is_scroll) {
                                    var $height = _this.headerHeight;

                                    _this.calculateHeaderHeight();
                                    $height != _this.headerHeight && _this.updatePageOffset()
                                }
                            });
                        } else {
                            _this.activate(false);
                            this.$window.on('scroll touchstart.touchScroll touchmove.touchScroll', function (e) {
                                _this.activate(false);
                            });
                        }

                        this.$window
                                .load(function () {
                                    _this.calculateHeaderHeight();
                                    _this.updatePageOffset();

                                    // Fix async custom styles
                                    setTimeout(function () {
                                        _this.calculateHeaderHeight();
                                        _this.updatePageOffset();
                                    }, 400);
                                })
                                .on('debouncedresize', function (e) {
                                    if (e.originalEvent && e.originalEvent.isTrusted) {
                                        setTimeout(function () {
                                            _this.calculateHeaderHeight();
                                            _this.updatePageOffset();
                                        }, 400);
                                    }
                                });

                        if ($('#gallery-controller').length > 0)
                            _this.hasHeaderSlider = true;

                        if (_this.stickyHeader) {
                            var img = '<img id="sticky_header_logo" src="' + _this.stickyHeader.src + '"';
                            img += '/>';
                            $('#site-logo a').prepend(img);
                        }

                        Themify.body.on('announcement_bar_position announcement_bar_scroll_on_after announcementBarUpdate', _this.calculateHeaderHeight.bind(_this));
                    }
                }
            },
            headerRevealing: function () {
                var direction = 'down',
                        previousY = 0,
                        _this = this,
                        onScroll = function () {
                            if(previousY === this.scrollY){
                                return;
                            }
                            direction = previousY < this.scrollY ? 'down' : 'up';
                            previousY = this.scrollY;
                            if ('up' === direction || 0 === previousY) {
                                if (_this.$headerWrap.hasClass('hidden')) {
                                    _this.$headerWrap.css('top', '').removeClass('hidden');
                                }
                            } else if (0 < previousY && !_this.$headerWrap.hasClass('hidden')) {
                                _this.$headerWrap.css('top', -_this.$headerWrap.outerHeight()).addClass('hidden');
                            }
                        };
                this.$window.on('scroll touchstart.touchScroll touchmove.touchScroll', onScroll);
                onScroll();
            },
            activate: function ($hard) {
				if( $hard || this.$window.scrollTop() >= this.headerHeight ) {
						! this.$headerWrap.hasClass( 'fixed-header' ) && this.scrollEnabled();
				} else if ( this.$headerWrap.hasClass( 'fixed-header' ) ) {
						this.scrollDisabled();
				}
            },
            scrollDisabled: function () {
                this.$headerWrap.removeClass('fixed-header');
                $('#header').removeClass('header-on-scroll');
                Themify.body.removeClass('fixed-header-on');

                /**
                 * force redraw the header
                 * required in order to calculate header height properly after removing fixed-header classes
                 */
                this.$headerWrap.hide();
                this.$headerWrap[0].offsetHeight;
                this.$headerWrap.show();
                this.calculateHeaderHeight();
                this.updatePageOffset();
                this.triggerHeaderSlider();


            },
            scrollEnabled: function () {
                this.$headerWrap.addClass('fixed-header');
                $('#header').addClass('header-on-scroll');
                Themify.body.addClass('fixed-header-on');
                this.triggerHeaderSlider();

                this.updatePageOffset();
            },
            triggerHeaderSlider: function () {
                if (this.hasHeaderSlider && 'object' === typeof this.$headerWrap.data('backstretch')) {
                    this.$headerWrap.data('backstretch').resize();
                    $('#gallery-controller .slides').trigger('next');
                }
            },
            calculateHeaderHeight: function () {
                var offset = this.$headerWrap.css('position') === 'fixed' ? $('body').offset().top : '';
                this.headerHeight = this.$headerWrap.outerHeight(true) - (offset ? parseInt(offset) : 0);
                this.$headerWrap.css('margin-top', offset);
            },
            updatePageOffset: function () {
                if(!is_horizontal_scrolling) {
                this.$pageWrap.css('paddingTop', Math.floor(this.headerHeight));
            }
            }
        };
        FixedHeader.init();

        // Initialize carousels //////////////////////////////
        ThemifySlider = {
            recalcHeight: function (items, $obj) {
                var heights = [], height;
                $.each(items, function () {
                    heights.push($(this).outerHeight(true));
                });
                height = Math.max.apply(Math, heights);
                $obj.closest('.carousel-wrap').find('.caroufredsel_wrapper, .slideshow').each(function () {
                    $(this).outerHeight(height);
                });
            },
            didResize: false,
            createCarousel: function (obj) {
                var self = this;
                obj.each(function () {
                    var $this = $(this),
                        id=$this.data('id');
                    $this.carouFredSel({
                        responsive: true,
                        prev: '#' + id + ' .carousel-prev',
                        next: '#' + id + ' .carousel-next',
                        pagination: {
                            container: '#' + id + ' .carousel-pager'
                        },
                        circular: true,
                        infinite: true,
                        swipe: true,
                        scroll: {
                            items: $this.data('scroll'),
                            fx: 'scroll',
                            duration: parseInt($this.data('speed'))
                        },
                        auto: {
                            play: ('off' !== $this.data('autoplay')),
                            timeoutDuration: 'off' !== $this.data('autoplay') ? parseInt($this.data('autoplay')) : 0
                        },
                        items: {
                            visible: {
                                min: 1,
                                max: $this.data('visible') ? parseInt($this.data('visible')) : 1
                            },
                            width: 222
                        },
                        onCreate: function (items) {
                            var $slideWrap = $this.closest('.slideshow-wrap');
                            $slideWrap.css({
                                'visibility': 'visible',
                                'height': 'auto'
                            });


                            $(window).on('tfsmartresize', function () {
                                self.recalcHeight(items.items, $this);
                            }).resize();

                            setTimeout(function () {
                                $slideWrap.find('.carousel-nav-wrap').css('width', (parseInt($slideWrap.find('.carousel-pager').find('a').length) * 18) + 'px');
                            }, 200);
                        }
                    });
                });
            }
        };

        // Test if this is a touch device /////////
        function is_touch_device() {
            return Themify.body[0].classList.contains('touch');
        }

        // Scroll to Element //////////////////////////////
        function themeScrollTo(offset) {
            var timeoutCb;
            $('body,html').animate({scrollTop: offset}, {
                duration: 800,
                start: function () {
                    if ('undefined' !== typeof Rellax && 'function' === typeof Rellax.disableCheckPosition) {
                        Rellax.disableCheckPosition();
                    }
                },
                complete: function () {
                    if ('undefined' !== typeof Rellax && 'function' === typeof Rellax.enableCheckPosition) {
                        clearTimeout(timeoutCb);
                        timeoutCb = setTimeout(Rellax.enableCheckPosition, 1000);
                    }
                }
            });
        }
        // Get builder rows anchor class to ID //////////////////////////////
        function getClassToId($section) {
            var classes = $section.prop('class').split(' '),
                    expr = new RegExp('^tb_section-', 'i'),
                    spanClass = null;
            for (var i = 0, len = classes.length; i < len; ++i) {
                if (expr.test(classes[i])) {
                    spanClass = classes[i];
                }
            }

            return spanClass === null?'':spanClass.replace('tb_section-', '');
        }
        // Create fullpage scrolling //////////////////////////////
        function createFullScrolling() {

            var $body = Themify.body,
                    initFullPage = false,
                    $wrapper = $(sectionsWrapper),
                    autoScrolling = !(!usesRows && '' != themifyScript.hash.replace('#', '')),
                    currentHash = themifyScript.hash.replace('#', ''),
                    scrollingStyle = !$body[0].classList.contains('full-section-scrolling-single'),
                    isParralax = $body[0].classList.contains('section-scrolling-parallax-enabled'),
                    rows = document.getElementsByClassName('module_row')[0],
                    $sectionClass = null,
                    slideCl = slideClass.replace('.', ''),
                    sectionAnchors = [],
                    items = null;

            if (rows !== undefined) {
                    var temp = document.getElementsByClassName(slideCl)[0];//don't remove this will break horizontal scrolling
                    if (temp !== undefined) {
                        temp.classList.remove(slideCl);
                    }
                    temp = null;
                    var $sectionClass = $(sectionsWrapper + '>' + sectionClass);
                    $sectionClass.each(function () {
                        var $current = $(this),
                            f = document.createDocumentFragment(),
                            wrap = document.createElement('div'),
                            cl = this.classList,
                            section_anchor ='';
                            for(var i=cl.length-1;i>-1;--i){
                                if(cl[i].indexOf('tb_section-')===0){
                                    section_anchor = getClassToId($current);
                                    break;
                                }
                            }
                            sectionAnchors.push(section_anchor);
                        while (true) {
                            var next = $current.next()[0];
                            if (next !== undefined && next.classList.contains(slideCl)) {
                                f.appendChild(next);
                            } else {
                                break;
                            }
                        }
                        wrap.className = 'section-container';
                        for (var i = cl.length - 1; i > -1; --i) {
                            if (cl[i] !== 'fullwidth' && cl[i] !== 'fullcover' && cl[i].indexOf('module_row_') !== 0 && cl[i].indexOf('tb_') !== 0) {
                                wrap.className += ' ' + cl[i];
                            }
                        }
                        cl.add(slideCl);
                        this.parentNode.insertBefore(wrap, this);
                        wrap.appendChild(this);
                        wrap.appendChild(f);
                        wrap.style['display'] = 'block';
                    });

                items = document.getElementsByClassName(slideCl);
                for (var i = items.length - 1; i > -1; --i) {
                    items[i].parentNode.style['display'] = 'none';
                    var inner = items[i].getElementsByClassName('row_inner'),
                            $this = $(items[i]),
                            paddingTop = $this.css('padding-top').replace(/%/g, 'vh'),
                            paddingBottom = $this.css('padding-bottom').replace(/%/g, 'vh');
                    for (var j = inner.length - 1; j > -1; --j) {
                        inner[j].style['paddingTop'] = paddingTop;
                        inner[j].style['paddingBottom'] = paddingBottom;
                    }
                    items[i].style['paddingTop'] = items[i].style['paddingBottom'] = 0;
                    items[i].parentNode.style['display'] = '';
                }
                    }
            var menu=document.getElementById('main-nav'),
                $menu=$(menu);
            if ( usesRows && items!==null && menu!==null) {
                for(var i=items.length-1;i>-1;--i){
                    var slide_id=null,
                        cl = items[i].classList,
                        $this=$(items[i]);
                    for(var j=cl.length-1;j>-1;--j){
                        if(cl[j].indexOf('tb_section-')===0){
                            slide_id = getClassToId($this);
                            break;
                        }
                    }
                    if(slide_id===null){
                        slide_id=items[i].id;
                    }
                    if(slide_id){
                        var $aSectionHref = menu.querySelector('a[href$="#' + slide_id + '"]');
                        if ($aSectionHref!==null) {
                            var section_id = $this.closest('.module_row').data('anchor');
                            if(section_id){
                                $($aSectionHref).attr('href', '#' + section_id + '/' + slide_id).closest('li').attr('data-menuanchor', section_id + '/' + slide_id);
                            }
                        }
                    }
                }
            }
            $wrapper.fullpage({
                resize: false,
                sectionSelector: '.section-container',
                slideSelector: slideClass,
                anchors: sectionAnchors,
                scrollOverflow: true,
                navigation: true,
                lockAnchors: true,
                verticalCentered: true,
                autoScrolling: autoScrolling,
                menu: menu!==null?'#'+menu.id:'',
                scrollHorizontally: scrollingStyle,
                scrollHorizontallyKey: 'QU5ZX1UycmMyTnliMnhzU0c5eWFYcHZiblJoYkd4NWhLbA==',
                slidesNavigation: true,
                parallax: isParralax,
                parallaxKey: 'QU5ZX0FodGNHRnlZV3hzWVhnPXY1bA==',
                parallaxOptions: {
                    type: 'reveal',
                    percentage: 62,
                    property: 'translate'
                },
                scrollOverflowOptions: {
                    hideScrollbars: true,
                    preventDefault: false
                },
                afterRender: function () {
                    if (!autoScrolling) { // hack deep linking not working when use section row
                        $.fn.fullpage.setAutoScrolling(true);
                    }
                    var $section = $(slideClass + '.active, .section', $('.section-container.active')),
                            section_id = usesRows && $section.is('[class*="tb_section-"]') ? getClassToId($section) : $section.prop('id'),
                            $aSectionHref = $menu.find('a[href$="#' + section_id + '"]');


                    if ('undefined' !== typeof ThemifyBuilderModuleJs && 'undefined' !== typeof wowInit2 && null !== ThemifyBuilderModuleJs.wow) {
                        if (is_horizontal_scrolling) {
                            ThemifyBuilderModuleJs.wow.stop();
                            $body.triggerHandler('themify_onepage_afterload');
                        }
                    }

                    if (usesRows) {
                        var extraEmptyRow = $('#fp-nav').find('li').get($('.module_row').length);
                        if ('undefined' !== typeof extraEmptyRow) {
                            extraEmptyRow.hide();
                        }
                    }

                    if ($aSectionHref.length > 0) {
                        $aSectionHref.closest('li').addClass('current_page_item').siblings().removeClass('current_page_item current-menu-item');
                    } else {
                        $menu.find('li').removeClass('current_page_item current-menu-item');
                    }

                    $body.on({
                        mouseenter: function () {
                            var t = $(this).find('a').attr('href').replace('#', '');
                            if (t.length>0) {
                                $('<div class="multiscroll-tooltip">' + t + "</div>").hide().appendTo($(this)).fadeIn(200);
                            }
                        },
                        mouseleave: function () {
                            $(this).find(".multiscroll-tooltip").fadeOut(200, function () {
                                $(this).remove();
                            });
                        }
                    }, "#fp-nav li");

                    var coverSelectors = '.builder_row_cover, .row-slider, .column-slider, .subrow-slider',
                            rowCovers = $(sectionClass).find('.fp-tableCell, .fp-scrollable, .fp-scroller').children(coverSelectors);

                    if (rowCovers.length) {
                        rowCovers.each(function () {
                            var row = $(this).closest('.module_row');
                            !row.is(coverSelectors) && row.prepend(this);
                        });
                    }

                    $body.triggerHandler('themify_onepage_after_render', [$section, section_id]);

                    function backgroundImage() {
                        $(slideClass).each(function () {
                            var $fpBackground = $('<div>');
                            $fpBackground.addClass('fp-bg')
                                    .css({
                                        'background-image': $(this).css('background-image'),
                                        /**
                                         * Note: Builder row overlay and background video are at z-index 0
                                         */
                                        'z-index': 0,
                                    });
                            $(this).css('background-image', 'none').prepend($fpBackground);
                        });
                    }

                    if (isParralax) {
                        if (document.querySelector(slideClass+'[data-fullwidthvideo]') !== null) {
                            $body.one('tb_bigvideojs_loaded', backgroundImage);
                        } else {
                            backgroundImage();
                        }
                    }


                },
                afterLoad: function (anchorLink, index) {
				  

                    var $section = $(sectionClass + '.active', $(sectionsWrapper)),
                        section_id = usesRows && $section.is('[class*="tb_section-"]') ? getClassToId($section) : $section.prop('id');
                        if(!section_id){
                           section_id = $section.data('anchor');
                        }
                        var $aSectionHref = $menu.find('a[href$="#' + section_id + '"]');
                        if($aSectionHref.length===0){
                            $aSectionHref = $menu.find('a[href$="#' + section_id + '/' + $section.find(slideClass + '.active').data('anchor') + '"]');
                        }

                    if ('undefined' !== typeof ThemifyBuilderModuleJs && 'undefined' !== typeof wowInit2 && null !== ThemifyBuilderModuleJs.wow) {
                        ThemifyBuilderModuleJs.wow.stop();
                    }

                    if ($aSectionHref.length > 0) {
                        $aSectionHref.closest('li').addClass('current_page_item').siblings().removeClass('current_page_item current-menu-item');
                    } else {
                        $menu.find('li').removeClass('current_page_item current-menu-item');
                    }
                    if (history.pushState && section_id) {
                            var new_hash = is_horizontal_scrolling ? 'main/' + section_id : section_id;
                            if (initFullPage && currentHash !== section_id) {
                                    history.pushState(null, null, '#' + new_hash);
                            } else {
                               history.replaceState(null, null, '#' + new_hash);
                            }
                    } else {
                            history.replaceState(null, null, location.pathname);
                    }

                    initFullPage = true;

                    $body.triggerHandler('themify_onepage_afterload', [$section, section_id]);

                    if (fixedHeader && index != 1) {
                        !FixedHeader.$headerWrap.hasClass('fixed-header') && FixedHeader.scrollEnabled();
                    }

                    /* resume the row video background if it exists */
					$section.find('.tf-video').each(function () {
						if (typeof this.play === 'function') {
							this.play();
						}
					});
                },
                onLeave: function (index, nextIndex, direction) {

                    $body.removeClass('fullpagescroll-up fullpagescroll-down').addClass('fullpagescroll-' + direction);

                    // when lightbox is active, prevent scrolling the page
                    if ($body.find('> .mfp-wrap').length > 0) {
                        return false;
                    }

                    var $rows = usesRows ? $(sectionsWrapper).children('.section-container') : $(sectionsWrapper).find(sectionClass);
                    if ($rows.length > 0) {

                        if (index > 0 && nextIndex > 0) {
                            var sectionIndex = index;
                            if ('up' === direction) {
                                for (sectionIndex = index; sectionIndex >= nextIndex; sectionIndex--) {
                                    $rows.eq(sectionIndex - 1).find('.module_row').css('visibility', 'visible');
                                }
                            } else {
                                for (sectionIndex = index; sectionIndex <= nextIndex; sectionIndex++) {
                                    $rows.eq(sectionIndex - 1).find('.module_row').css('visibility', 'visible');
                                }
                            }

                        }
                    }
                },
                afterSlideLoad: function (section, origin, destination, direction) {
                    var $aSectionHref = $menu.find('a[href$="#' + section + '/' + destination + '"]');
                    if ($aSectionHref.length===0) {
                        $aSectionHref = $menu.find('a[href$="#' + destination + '/' + destination + '"]');
                        if ($aSectionHref.length===0) {
                             $aSectionHref = $menu.find('a[href$="#' + destination + '"]');
                        }
                    }
                    if ($aSectionHref.length > 0) {
                        $aSectionHref.closest('li').addClass('current_page_item').siblings().removeClass('current_page_item current-menu-item');
                    } else {
                        $menu.find('li').removeClass('current_page_item current-menu-item');
                    }
                    if (typeof destination === 'string') {
                        history.replaceState(null, null, '#' + (section !== '' ? (section + '/' + destination) : destination));
                    } else {
                        history.replaceState(null, null, location.pathname);
                    }
                    /* resume the row video background if it exists */
                    var $section = $(sectionClass + '.active', $(sectionsWrapper));
                        $section.find('.tf-video').each(function () {
                            if (typeof this.play === 'function') {
                                this.play();
                            }
                    });
                    $body.triggerHandler('themify_onepage_afterload', [$section]);
                },
                onSlideLeave: function (anchorLink, index, slideIndex, direction, nextSlideIndex, nextSlide) {
                    var $slides = $('.section-container').find(slideClass);
                    $body.triggerHandler('themify_onepage_slide_onleave', [$slides.eq(nextSlideIndex)]);

                    var i = slideIndex;
                    if ('left' === direction) {
                        for (i = slideIndex; i > nextSlideIndex; --i) {
                            $slides.eq(i - 1).css('visibility', 'visible');
                        }
                    } else if ('right' === direction) {
                        for (i = slideIndex; i < nextSlideIndex; ++i) {
                            $slides.eq(i + 1).css('visibility', 'visible');
                        }
                    }
                }
            });

        }



        // Infinite Scroll ///////////////////////////////
        function doInfinite($container, selector) {

            if ('undefined' !== typeof $.fn.infinitescroll) {

                // Get max pages for regular category pages and home
                var scrollMaxPages = parseInt(themifyScript.maxPages);

                // Get max pages for Query Category pages
                if (typeof qp_max_pages !== 'undefined') {
                    scrollMaxPages = qp_max_pages;
                }

                // infinite scroll
                $container.infinitescroll({
                    navSelector: '#load-more a:last', // selector for the paged navigation
                    nextSelector: '#load-more a:last', // selector for the NEXT link (to page 2)
                    itemSelector: selector, // selector for all items you'll retrieve
                    loadingText: '',
                    donetext: '',
                    loading: {img: themifyScript.loadingImg},
                    maxPage: scrollMaxPages,
                    behavior: 'auto' !== themifyScript.autoInfinite ? 'twitter' : '',
                    pathParse: function (path) {
                        return path.match(/^(.*?)\b\d+\b(?!.*\b\d+\b)(.*?$)/).slice(1);
                    },
                    bufferPx: parseInt(themifyScript.bufferPx),
                    pixelsFromNavToBottom: $('#footerwrap').height(),
                    state: {
                        currPage: themifyScript.currentPage && Number.isInteger(+themifyScript.currentPage)
                                ? +themifyScript.currentPage : 1
                    }
                }, function (newElements, instance, url) {
                    // call Isotope for new elements
                    var $newElems = $(newElements);

                    // Mark new items: remove newItems from already loaded items and add it to loaded items
                    $('.newItems').removeClass('newItems');
                    $newElems.addClass('newItems');

                    if ('reset' === themifyScript.resetFilterOnLoad) {
                        // Make filtered elements visible again
                        LayoutAndFilter.reset();
                    }

                    $newElems.hide().imagesLoaded(function () {

                        $newElems.fadeIn();

                        $('.wp-audio-shortcode, .wp-video-shortcode').not('div').each(function () {
                            var $self = $(this);
                            if ($self.closest('.mejs-audio').length === 0) {
                                ThemifyMediaElement.init($self);
                            }
                        });

                        if (history.pushState && !+themifyScript.infiniteURL) {
                            history.pushState(null, null, url);
                        }

                        // redirect to corresponding page
                        $('.post').contents().find("a:not([class='comment-reply-link'], [id='cancel-comment-reply-link'], .themify_lightbox, .post-content a[href$='jpg'], .post-content a[href$='gif'], .post-content a[href$='png'], .post-content a[href$='JPG'], .post-content a[href$='GIF'], .post-content a[href$='PNG'], .post-content a[target='_new'], .post-content a[target='_blank'])").click(function () {
                            var href = $(this).attr('href');
                            window.parent.location.assign(href);
                            return false;
                        });
                        if ($container.hasClass('auto_tiles') && Themify.body.hasClass('tile_enable')) {
                            $container.trigger('infiniteloaded.themify', [$newElems]);
                        }

                        // Apply lightbox/fullscreen gallery to new items
                        Themify.InitGallery();
                        loadIsotop('object' === typeof $container.data('isotope'), function () {
                            $container.isotope('appended', $newElems);
                        });
                        if (LayoutAndFilter.filterActive) {
                            // If new elements with new categories were added enable them in filter bar
                            LayoutAndFilter.enableFilters();

                            if ('scroll' === themifyScript.scrollToNewOnLoad) {
                                LayoutAndFilter.restore();
                            }
                        }

                        $('#infscr-loading').fadeOut('normal');
                        if (1 === scrollMaxPages) {
                            $('#load-more, #infscr-loading').remove();
                        }

                        /**
                         * Fires event after the elements and its images are loaded.
                         *
                         * @event infiniteloaded.themify
                         * @param {object} $newElems The elements that were loaded.
                         */
                        Themify.body.trigger('infiniteloaded.themify', [$newElems]);

                        $(window).trigger('resize');
                    });

                    scrollMaxPages = scrollMaxPages - 1;
                    if (1 < scrollMaxPages && 'auto' !== themifyScript.autoInfinite) {
                        $('.load-more-button').show();
                    }
                });

                // disable auto infinite scroll based on user selection
                if ('auto' === themifyScript.autoInfinite) {
                    $('#load-more, #load-more a').hide();
                }
            }
        }

        // Entry Filter /////////////////////////
        LayoutAndFilter = {
            filterActive: false,
            init: function (el) {
                var items = $('.post-filter+.loops-wrapper:not(.auto_tiles),.masonry:not(.list-post):not(.auto_tiles), .post-filter+.loops-wrapper .ptb_loops_wrapper', el);
                items.each(function(){
                        if($(this).find('.grid-sizer').length===0){
                            $(this).prepend('<div class="grid-sizer"></div><div class="gutter-sizer"></div>');
                        }
                });
                if (!Themify.is_builder_active) {
                    this.enableFilters();
                    this.filterActive = true;
                }
                this.filter(el);
            },
            enableFilters: function (el) {
                var $filter = $('.post-filter',el);
                if ('undefined' !== typeof $.fn.isotope && $filter.find('a').length > 0) {
                    $filter.find('li').each(function () {
                        var $li = $(this),
                                $entries = $li.parent().next(),
                                cat = $li.attr('class').replace(/(current-cat)|(cat-item)|(-)|(active)/g, '').replace(' ', '');
                        if ($entries.find('.post.cat-' + cat).length === 0) {
                            $li.hide();
                        } else {
                            $li.show();
                        }
                    });
                }
            },
            filter: function (el) {
                var $filter = $('.post-filter', el),
                    is_left = !Themify.body.hasClass('rtl');

                initFilter = function () {
                    $filter.each(function () {
                        var f = $(this),
                            isotopeArgs = {
                                isOriginLeft: is_left,
                                percentPosition: true
                            },
                        $entries = f.next();

                        // PTB isotope fix
                        if ($entries.has('.ptb_loops_wrapper').length) {
                            $entries.find('.grid-sizer, gutter-sizer').remove();
                            $entries = $entries.find('.ptb_loops_wrapper');
                        }

                        isotopeArgs['masonry'] = {
                            columnWidth: $entries.children('.grid-sizer').length ? '.grid-sizer' : null,
                            gutter: $entries.children('.gutter-sizer').length ? '.gutter-sizer' : null
                        };

                        if (!$entries.hasClass('masonry')) {
                            $entries.imagesLoaded(function () {
                                isotopeArgs['itemSelector'] = '.post';
                                isotopeArgs['layoutMode'] = 'fitRows';
                                isotopeArgs['fitRows'] = {
                                    gutter: $entries.children('.gutter-sizer').length ? '.gutter-sizer' : null
                                };
                                $entries.addClass('masonry-done').isotope(isotopeArgs);
                            });
                        }

                        f.addClass('filter-visible').on('click', 'a', function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            var $li = $(this).parent(),
                                cat = false,
                                auto =$entries.hasClass('auto_tiles') && Themify.body.hasClass('tile_enable') ;

                            if ($li.hasClass('active')) {
                                $li.removeClass('active');
                                !auto && (isotopeArgs['filter'] = '.post');
                            } else {
                                $li.addClass('active').siblings().removeClass('active');
                                cat = $li.attr('class').replace(/(current-cat)|(cat-item)|(-)|(active)/g, '').replace(' ', '');
                                !auto && (isotopeArgs['filter'] = '.cat-' + cat);
                            }
                            if (auto && $entries.data('themify_tiles')) {
                                if(!e.isTrigger ){
                                    var $post = $entries.children('.post');
                                    $post.show();
                                    cat && $post.not('.cat-' + cat).hide();
                                    $entries.data('themify_tiles').update();

                                    setTimeout(function () {
                                            $.themify_tiles.resizeParent($entries);
                                            f.removeClass('filter-disable');
                                    }, Math.round(parseFloat($entries.css('transition-duration')) * 1000) + 100);
                                }
                            } else {
                                $entries.addClass('masonry-done').imagesLoaded(function () {
                                    $entries.isotope(isotopeArgs);
                                    f.removeClass('filter-disable');
                                });
                            }

                        });
                    });
                };
                loadIsotop($filter.find('a').length > 0, initFilter);
            },
            scrolling: false,
            reset: function () {
                $('.post-filter').find('li.active').find('a').addClass('previous-active').trigger('click');
                this.scrolling = true;
            },
            restore: function () {
                //$('.previous-active').removeClass('previous-active').trigger('click');
                var $first = $('.newItems').first(),
                        self = this,
                        to = $first.offset().top - ($first.outerHeight(true) / 2),
                        speed = 800;

                if (to >= 800) {
                    speed = 800 + Math.abs((to / 1000) * 100);
                }
                $('html,body').stop().animate({
                    scrollTop: to
                }, speed, function () {
                    self.scrolling = false;
                });
            },
            layout: function (el) {
                var posts = $('.loops-wrapper.masonry:not(.list-post,.products)', el);
                if (posts.length > 0) {
                    var last = posts.children('.loops-wrapper > article').last();
                    function callback() {
                        posts.imagesLoaded().always(function () {
                            posts.addClass('masonry-done')
                                    .isotope({
                                        masonry: {
                                            columnWidth: '.grid-sizer',
                                            gutter: '.gutter-sizer'
                                        },
                                        itemSelector: '.loops-wrapper > article',
                                        isOriginLeft: !$('body').hasClass('rtl')
                                    })
                                    .isotope('once', 'layoutComplete', function () {
                                        $(window).trigger('resize');
                                    });
                        });
                    }
                    if (last.hasClass('wow')) {
                        last.one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function () {
                            setTimeout(callback, 1000);
                        });
                    }
                    else {
                        callback();
                    }
                }
                if (themifyScript.shop_masonry === 'yes') {
                    var $products = $('.woocommerce.archive', el).find('#content').find('ul.products');
                    $products = undefined == el ? $products.add($('.woocommerce.module').find('ul.products')) : $products.add($('ul.products',el)) ;
                        if ($products.length>0) {
                                $products.each(function(){
                                    if($(this).find('.grid-sizer').length===0){
                                            $(this).prepend('<div class="grid-sizer"></div><div class="gutter-sizer"></div>');
                                    }
                                    $(this).imagesLoaded().always(function (e) {
                                            $(e.elements[0]).addClass('masonry-done').isotope({
                                                masonry: {
                                                                columnWidth: '.grid-sizer',
                                                                gutter: '.gutter-sizer'
                                                },
                                                itemSelector: '.product',
                                                isOriginLeft: !Themify.body.hasClass('rtl')
                                            });
                                    });
                            });
                        }
                }
           
                var $gallery = $('.gallery-wrapper.packery-gallery', el);
                if ($gallery.length > 0) {
                    $gallery.imagesLoaded(function () {
                        $gallery.isotope({
                            layoutMode: 'packery',
                            itemSelector: '.item'
                        });
                    });
                }
            },
            reLayout: function () {
                $('.masonry').not('.list-post').each(function () {
                    var $loopsWrapper = $(this);
                    if ('object' === typeof $loopsWrapper.data('isotope')) {
                        $loopsWrapper.isotope('layout');
                    }
                });
                var $gallery = $('.gallery-wrapper.packery-gallery');
                if ($gallery.length > 0 && 'object' === typeof $gallery.data('isotope')) {
                    $gallery.isotope('layout');
                }
                if (themifyScript.shop_masonry === 'yes') {
                    var $products = $('.woocommerce.archive').find('#content').find('ul.products');
                    if ($products.length && 'object' === typeof $products.data('isotope')) {
                        $products.isotope('layout');
                    }
                }
            },
            destroy: function (el) {
                el.removeClass('masonry masonry-done');
                if('object' === typeof el.data('isotope')){
                    el.isotope('destroy');
                }
            }
        };

        var $body = Themify.body,
                $header = $('#header'),
                $header_icons = $('.header-icons'),
                $menu_icon = $('#menu-icon'),
                $cart_icon = $('#cart-icon'),
                $icon = $('.cart-icon'),
                $iconClone = $icon.clone(),
                moveCartIcon = function () {
                    if ($icon.length) {
                        var iconContainer = null;

                        if ($body.is('.header-leftpane, .header-rightpane')) {
                            iconContainer = $('.social-widget');
                        } else if ($header_icons.is(':visible')) {
                            iconContainer = $header_icons;
                        }

                        if (iconContainer && !$iconClone.data('icon-moved')) {
                            $iconClone.themifySideMenu({
                                panel: '#slide-cart',
                                close: '#cart-icon-close'
                            });
                            $iconClone.data('icon-moved', 1).appendTo(iconContainer);
                        }

                        $iconClone.toggle(!!iconContainer);
                        $icon.toggle(!iconContainer);
                    }
                };

        // Move cart icon
        moveCartIcon();
        $(window).on('tfsmartresize', function () {
            moveCartIcon();
        });

        ///// Header Top Widget 
        var header_top_widget_content = $('.header-top-widgets .header-widget').wrap('</p>').parent().html();
        if (header_top_widget_content != undefined) {
            $('.header-top-widgets #headerwrap').prepend("<div class='header-widget-full clearfix'><div class='header-widget-inner'>" + header_top_widget_content + "</div></div>");
        }
        header_top_widget_content=null;
		
        /////////////////////////////////////////////
        // Initialize Packery Layout and Filter
        /////////////////////////////////////////////
        function LayoutAndFilterCallback() {
            var condition = $('.post-filter+.loops-wrapper,.masonry:not(.list-post)').length > 0
                    || (themifyScript.shop_masonry === 'yes' && $('.woocommerce.archive').find('#content').find('ul.products').length > 0)
                    || $('.gallery-wrapper.packery-gallery').length > 0;
			
		
            loadIsotop(condition, function () {
                LayoutAndFilter.init();
                $body.imagesLoaded().always(function () {
                    LayoutAndFilter.layout();
                });
            });
        }

        if (Themify.is_builder_active) {
            $body.one('builder_load_module_partial', function (e, el, type) {
                if (!el) {
                    LayoutAndFilterCallback();
                }
            });
        }
        else {
            LayoutAndFilterCallback();
        }
        /////////////////////////////////////////////
        // Scroll to top
        /////////////////////////////////////////////
        var $back_top = $('.back-top');
        if ($back_top.length > 0) {
            if (!isFullPageScroll && $back_top.hasClass('back-top-float')) {
                $(window).on("scroll touchstart.touchScroll touchmove.touchScroll", function () {
                    if (window.scrollY < 10) {
                        $back_top.addClass('back-top-hide');
                    } else {
                        $back_top.removeClass('back-top-hide');
                    }
                });

            }
            $back_top.on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (isFullPageScroll) {
                    $('#footerwrap').toggleClass('expanded');
                }
                else {
                    themeScrollTo(0);
                }
            });
        }
        function toggleMobileSidebar() {
            var item = $('.toggle-sticky-sidebar'),
                sidebar = $("#sidebar");
            item.on('click', function () {
                if (item.hasClass('open-toggle-sticky-sidebar')) {
                    item.removeClass('open-toggle-sticky-sidebar').addClass('close-toggle-sticky-sidebar');
                    sidebar.addClass('open-mobile-sticky-sidebar');
                } else {
                    item.removeClass('close-toggle-sticky-sidebar').addClass('open-toggle-sticky-sidebar');
                    sidebar.removeClass('open-mobile-sticky-sidebar');
                }
            });
        }
        toggleMobileSidebar();
       
        /////////////////////////////////////////////
        // Toggle main nav on mobile
        /////////////////////////////////////////////
        if (is_touch_device() && typeof $.fn.themifyDropdown != 'function') {
            Themify.LoadAsync(themify_vars.url + '/js/themify.dropdown.js', function () {
                $('#main-nav').themifyDropdown();
            });
        }

        if ($body.hasClass('header-minbar') || $body.hasClass('header-leftpane')) {
            /////////////////////////////////////////////
            // Side Menu for header-minbar and header-leftpane
            /////////////////////////////////////////////
            $menu_icon.themifySideMenu({
                close: '#menu-icon-close',
                side: 'left'
            });
            /////////////////////////////////////////////
            // NiceScroll only for header-minbar and header-leftpane
            /////////////////////////////////////////////
            var headerNicescroll = function () {
                if ('undefined' !== typeof $.fn.niceScroll && !is_touch_device()) {
                    var $niceScrollTarget = $header;
                    if ($body.hasClass('header-minbar')) {
                        $niceScrollTarget = $('#mobile-menu');
                    }
                    $niceScrollTarget.niceScroll();
                    $body.on('sidemenushow.themify', function () {
                        setTimeout(function () {
                            $niceScrollTarget.getNiceScroll().resize();
                        }, 200);
                    });
                }
            };

            if ($header.length) {
                if (typeof $.fn.niceScroll !== 'function') {
                    Themify.LoadAsync(themifyScript.themeURI + '/js/jquery.nicescroll.min.js', headerNicescroll, null, null, function () {
                        return ('undefined' !== typeof $.fn.niceScroll);
                    });
                } else {
                    headerNicescroll();
                }
            }
        }
        else if ($body.hasClass('header-slide-out') || $body.hasClass('header-rightpane')) {
            $menu_icon.themifySideMenu({
                close: '#menu-icon-close',
                side: 'right'
            });

            var nicescrollMenu = function () {
                if ('undefined' !== typeof $.fn.niceScroll && !is_touch_device()) {
                    var $niceScrollTarget = $header;
                    if ($body.hasClass('header-slide-out')) {
                        $niceScrollTarget = $('#mobile-menu');
                    }
                    $niceScrollTarget.niceScroll();
                    $body.on('sidemenushow.themify', function () {
                        setTimeout(function () {
                            $niceScrollTarget.getNiceScroll().resize();
                        }, 200);
                    });
                }
            };

            if ($header.length || $body.hasClass('header-slide-out')) {
                if (typeof $.fn.niceScroll !== 'function') {
                    Themify.LoadAsync(themifyScript.themeURI + '/js/jquery.nicescroll.min.js', nicescrollMenu, null, null, function () {
                        return ('undefined' !== typeof $.fn.niceScroll);
                    });
                } else {
                    nicescrollMenu();
                }
            }
        }
        else {
            /////////////////////////////////////////////
            // Side Menu for all other header designs
            /////////////////////////////////////////////
            $menu_icon.themifySideMenu({
                close: '#menu-icon-close'
            });

            var $overlay = $('<div class="body-overlay">');
            $body.append($overlay).on('sidemenushow.themify', function () {
                $overlay.addClass('body-overlay-on');
            }).on('sidemenuhide.themify', function () {
                $overlay.removeClass('body-overlay-on');
            }).on('click.themify touchend.themify', '.body-overlay', function () {
                $menu_icon.themifySideMenu('hide');
                $cart_icon.themifySideMenu('hide');
            });
            $(window).on('tfsmartresize',function () {
                if ($('#mobile-menu').hasClass('sidemenu-on') && $menu_icon.is(':visible')) {
                    $overlay.addClass('body-overlay-on');
                } else {
                    $overlay.removeClass('body-overlay-on');
                }
            });
        }


        if (!$body.hasClass('header-overlay')) {

            $("#main-nav li.menu-item-has-children > a, #main-nav li.page_item_has_children > a").after(
                    "<span class='child-arrow'></span>"
                    );
            $('#main-nav .child-arrow,#main-nav a').click(function (e) {
                var toggle = true,
                        item = $(this);
                if (this.tagName === 'A') {
                    if (item.attr('href') === '#' && item.next('.child-arrow').length > 0) {
                        item = item.next('.child-arrow');
                    }
                    else {
                        toggle = false;
                    }
                }
                if (toggle) {
                    e.preventDefault();
                    item.toggleClass('toggle-on');
                }
            });

        }
		
		
        if(isFullPageScroll && $body.hasClass('query-section')){
                $body.one('themify_fullpage_afterload', function () {
                        $body.on('click', 'a[href*="#"]:not([href="#"])', function (e) {
                                var $mainNav = $('#main-nav'),

                                cleanupURL = function (url) {
                                        return url.replace(/#.*$/, '').replace(/\/$/, '');
                                },
                                slide_id = $(this).prop('hash'),
                                slideNoHashWithSlash = slide_id.replace(/#/, '' ).split('/'),
                                slideNoHash = slideNoHashWithSlash[slideNoHashWithSlash.length-1],
                                sectionEl = usesRows ? '.tb_section-' + slideNoHash + ':not(' + sectionClass + ')' : slide_id,
                                $sectionEl= $(sectionEl);
                                if ($sectionEl.length) {
                                        e.preventDefault();
                                        var slide_index = $sectionEl.index();
                                                $.fn.fullpage.moveTo($sectionEl.closest('.section-container').index()+1, slide_index)
                                                $sectionEl.css('visibility', 'visible');
                                }
                        });
                });
        }
        if ($body.hasClass('header-bottom')) {
            $("#footer").after("<a class='footer-tab' href='#'></a>");
            $(".footer-tab").click(function (e) {
                e.preventDefault();
                $('#footerwrap').toggleClass('expanded');
            });
            $("#footer .back-top").detach().appendTo('#pagewrap');
        }
        if ($body.hasClass('header-leftpane') || $body.hasClass('header-rightpane')) {
            var $overlay = $('<div class="body-overlay">');
            $body.append($overlay).on('sidemenushow.themify', function () {
                $overlay.addClass('body-overlay-on');
            }).on('sidemenuhide.themify', function () {
                $overlay.removeClass('body-overlay-on');
            }).on('click.themify touchend.themify', '.body-overlay', function () {
                $menu_icon.themifySideMenu('hide');
                $cart_icon.themifySideMenu('hide');
            });
            $(window).on('tfsmartresize',function () {
                if ($('#mobile-menu').hasClass('sidemenu-on') && $menu_icon.is(':visible')) {
                    $overlay.addClass('body-overlay-on');
                } else {
                    $overlay.removeClass('body-overlay-on');
                }
            });
        }
        /////////////////////////////////////////////
        // Slide cart icon
        /////////////////////////////////////////////
        $('a[href="#slide-cart"]').themifySideMenu({
            panel: '#slide-cart',
            close: '#cart-icon-close'
        });

        /////////////////////////////////////////////
        // Add class "first" to first elements
        /////////////////////////////////////////////
        $('.highlight-post:odd').addClass('odd');

        var nicescrollHeaderStuff = function () {
            if ('undefined' !== typeof $.fn.niceScroll && !is_touch_device()) {
                // NiceScroll Initialized Default
                if ($(window).width() > 1200) {
                    $(".header-horizontal .header-widget, .header-top-bar .header-widget, .boxed-compact .header-widget, .header-stripe .header-widget").niceScroll();
                }
            }
        };

        if ($(".header-horizontal .header-widget, .header-top-bar .header-widget, .boxed-compact .header-widget, .header-stripe .header-widget").length) {
            if (typeof $.fn.niceScroll !== 'function') {
                Themify.LoadAsync(themifyScript.themeURI + '/js/jquery.nicescroll.min.js', nicescrollHeaderStuff, null, null, function () {
                    return ('undefined' !== typeof $.fn.niceScroll);
                });
            } else {
                nicescrollHeaderStuff();
            }
        }

        var $headerWidgets = $('.header-horizontal, .header-top-bar, .boxed-compact, .header-stripe').find('.header-widget');
        if ($headerWidgets.length > 0) {
            // Header Horizontal, Header Topbar, Boxed Compact Add pull down wrapper
            $('.header-horizontal #main-nav, .header-top-bar #main-nav, .boxed-compact #main-nav, .header-stripe #main-nav').after($('<a href="#" class="pull-down">'));

            // Pull Down onclick Header Horizontal, Header Topbar, Boxed Compact Only
            $('.pull-down').on('click', function (e) {
                if (!is_touch_device()) {
                    if (typeof $.fn.niceScroll !== 'function') {
                        Themify.LoadAsync(themifyScript.themeURI + '/js/jquery.nicescroll.min.js', function () {
                            $headerWidgets.getNiceScroll().resize();
                        }, null, null, function () {
                            return ('undefined' !== typeof $.fn.niceScroll);
                        });
                    } else {
                        $headerWidgets.getNiceScroll().resize();
                    }
                }

                $('#header').toggleClass('pull-down-close');
                $headerWidgets.slideToggle('fast', function () {
                    $('#pagewrap').css('paddingTop', $('#headerwrap').outerHeight(true));
                });
                e.preventDefault();
            });
        }

        // Reset NiceScroll Resize
        $(window).on('tfsmartresize',function () {
            if ($(window).width() < 1200) {
                var nicescrollItems = $(".header-horizontal .header-widget, .header-top-bar .header-widget, .boxed-compact .header-widget, .header-stripe .header-widget");
                if (nicescrollItems.length && !is_touch_device()) {
                    if (typeof $.fn.niceScroll !== 'function') {
                        Themify.LoadAsync(themifyScript.themeURI + '/js/jquery.nicescroll.min.js', function () {
                            nicescrollItems.getNiceScroll().remove();
                        }, null, null, function () {
                            return ('undefined' !== typeof $.fn.niceScroll);
                        });
                    } else {
                        nicescrollItems.getNiceScroll().remove();
                    }
                }
                nicescrollItems.attr("style", "");
            }
        });

        /////////////////////////////////////////////
        // Make overlay clickable
        /////////////////////////////////////////////
        $body.on('click', '.loops-wrapper.grid4.polaroid .post-image + .post-content, .loops-wrapper.grid3.polaroid .post-image + .post-content, .loops-wrapper.grid2.polaroid .post-image + .post-content, .loops-wrapper.grid4.overlay .post-image + .post-content, .loops-wrapper.grid3.overlay .post-image + .post-content, .loops-wrapper.grid2.overlay .post-image + .post-content, .loops-wrapper.grid4.flip .post-image + .post-content, .loops-wrapper.grid3.flip .post-image + .post-content, .loops-wrapper.grid2.flip .post-image + .post-content', function () {
            var $link = $(this).closest('.post').find('a[data-post-permalink]');
            if ($link.attr('href') && !$link.hasClass('themify_lightbox')) {
                window.location = $link.attr('href');
            }
        });

        /////////////////////////////////////////////
        // Carousel initialization
        /////////////////////////////////////////////

        
        $('.loops-wrapper.slider').each(function (i) {
            var $self = $(this),
                dataID = $self.prop('id');
            if (!dataID) {
                dataID = 'loops-wrapper-' + i;
                // If this doesn't have an id, set dummy id
                $self.attr('id', dataID);
            }
            var slideShow=$self.addClass('slideshow-wrap').find('.slideshow');
            if (slideShow.length === 0) {
                $self.wrapInner('<div class="slideshow" data-id="' + dataID + '" data-autoplay="off" data-speed="1000" data-effect="scroll" data-visible="3" />');
            } else {
                slideShow.attr('data-id', dataID);
            }
        });
        var slideShow= $('.slideshow:not(body)');
        if (slideShow.length > 0) {
            if (!$.fn.carouFredSel) {
                Themify.LoadAsync(themify_vars.url + '/js/carousel.min.js', function () {
                    ThemifySlider.createCarousel(slideShow);
                    slideShow=null;
                }, null, null, function () {
                    return typeof $.fn.carouFredSel !== 'undefined';
                });
            }
            else {
                ThemifySlider.createCarousel(slideShow);
                slideShow=null;
            }
        }
        var $headerwrap = $('#headerwrap');
        $body.on('announcement_bar_position announcement_bar_scroll_on_after', function (e, el) {
            $('#pagewrap').css('paddingTop', Math.floor($headerwrap.outerHeight(true)));
        }).on('announcement_bar_position', function (e, el) {
            if ($(this).hasClass('header-minbar')) {
                var w = $headerwrap.width();
                el.css({'left': w - Math.abs(parseInt($headerwrap.css('left'), 10)), 'right': w - Math.abs(parseInt($headerwrap.css('right'), 10))});
            }
        });

        var initResize = 0,
                condition = $body.hasClass('header-top-bar') || $body.hasClass('header-horizontal') || $body.hasClass('header-top-widgets') || $body.hasClass('boxed-compact') || $body.hasClass('header-stripe') || $body.hasClass('header-magazine');
        $(window).on('tfsmartresize',function () {
            /////////////////////////////////////////////
            // Mega menu width
            /////////////////////////////////////////////
            /* Adjust for scroll bar width */
            if (condition) {
                if ($(window).width() > tf_mobile_menu_trigger_point) {
                    $('#main-nav li.has-mega-column > ul, #main-nav li.has-mega-sub-menu > .mega-sub-menu').css(
                            'width', $('#header').width()
                            );
                } else {
                    $('#main-nav li.has-mega-column > ul,#main-nav li.has-mega-sub-menu > .mega-sub-menu').removeAttr("style");
                }
            }
            /////////////////////////////////////////////
            // Nicescroll for mobile menu
            /////////////////////////////////////////////
            if (!initResize && typeof nicescrollMobile === 'function' && $('.mobile_menu_active').length) {
                if (typeof $.fn.niceScroll !== 'function') {
                    Themify.LoadAsync(themifyScript.themeURI + '/js/jquery.nicescroll.min.js', nicescrollMobile, null, null, function () {
                        return ('undefined' !== typeof $.fn.niceScroll);
                    });
                } else {
                    nicescrollMobile();
                }

                initResize = 1;
            }
        });

        /////////////////////////////////////////////
        // Header Overlay toggle-able dropdown
        /////////////////////////////////////////////
        // Set Dropdown Arrow
        $(".header-overlay #main-nav li.menu-item-has-children > a, .header-overlay #main-nav li.page_item_has_children > a").after(
                "<span class='child-arrow'></span>"
                );
        $('.header-overlay #main-nav li.menu-item-has-children > .child-arrow, .header-overlay #main-nav li.page_item_has_children > .child-arrow').click(function () {
            $(this).toggleClass('toggle-on').next('div, ul').toggle('fast');
            return true;
        });

        var nicescrollMobile = function () {
            if ('undefined' !== typeof $.fn.niceScroll && !is_touch_device()) {
                if ($body.hasClass('header-overlay')) {

                    var $niceScrollTarget = $('#mobile-menu');
                    $niceScrollTarget.niceScroll();
                    $body.on('sidemenushow.themify', function () {
                        setTimeout(function () {
                            $niceScrollTarget.getNiceScroll().resize();
                        }, 200);
                    });

                }
            }
        };

        if ($('.mobile_menu_active').length) {
            if (typeof $.fn.niceScroll !== 'function') {
                Themify.LoadAsync(themifyScript.themeURI + '/js/jquery.nicescroll.min.js', nicescrollMobile, null, null, function () {
                    return ('undefined' !== typeof $.fn.niceScroll);
                });
            } else {
                nicescrollMobile();
            }
        }

        if ($body.hasClass('header-overlay')) {
            var $sideMenuWrap = $('#mobile-menu');
            $sideMenuWrap.wrapInner('<div class="overlay-menu-sticky"></div>');

			/* in Overlay header style, when a menu item is clicked, close the overlay */
			$( '#main-nav a' ).click( function() {
				if ( $body.hasClass( 'mobile-menu-visible' ) ) {
					$( '#menu-icon' ).click();
				}
			} );
        }

        /////////////////////////////////////////////
        // One Page Scroll
        /////////////////////////////////////////////
        if (isFullPageScroll && typeof $.fn.fullpage === 'undefined') {
            Themify.LoadAsync(themifyScript.themeURI + "/js/jquery.fullpage.extensions.min.js", function () {
                $body.trigger('themify_fullpage_afterload');
            }, null, null, function () {
                return "undefined" !== typeof $.fn.fullpage
            });
        }
        if (isFullPageScroll && $body.hasClass('query-section')) {
            themifyScript.hash = window.location.hash.replace('#', '').replace('!/', '');
            if ('undefined' !== typeof $.fn.themifyScrollHighlight) {
                $body.on('scrollhighlight.themify', function (e, section) {
                    if ('undefined' != typeof section && '' != section) {
                        $('#fp-nav').find('li').eq($('.tb_section-' + section.replace('#', '')).index()).find('a').trigger('click');
                    }
                });
                $(window).trigger('scroll');
            }
            ;
            // Get rid of wow js animation since animation is managed with fullpage js
            var callbackTimer = setInterval(function () {
                if ('undefined' !== typeof ThemifyBuilderModuleJs) {
                    clearInterval(callbackTimer);
                    wowInit2 = ThemifyBuilderModuleJs.wowInit;
                    ThemifyBuilderModuleJs.wowInit = function () {
                    };
                }
            }, 100);
            $body.one('themify_fullpage_afterload', function () {
                var wowCallbackTimer = setInterval(function () {
                    if ('undefined' !== typeof ThemifyBuilderModuleJs && 'undefined' !== typeof wowInit2 && null !== ThemifyBuilderModuleJs.wow) {
                        clearInterval(wowCallbackTimer);
                        ThemifyBuilderModuleJs.wow.stop();
                        wowInit2();
                        setTimeout(createFullScrolling, 100);
                    } else {
                        clearInterval(wowCallbackTimer);
                        createFullScrolling();
                    }
                }, 100);
                });
           if(Themify.is_builder_active && typeof $.fn.fullpage === 'undefined'){
                    Themify.LoadAsync(themifyScript.themeURI + "/js/jquery.fullpage.extensions.min.js", function () {
                        $body.trigger('themify_fullpage_afterload');
                        $.fn.fullpage.destroy('all');
                    }, null, null, function () {
                    return "undefined" !== typeof $.fn.fullpage;
                    });
                }
            $body.on('themify_onepage_afterload', function (e, $panel) {
                var $slide = $(sectionClass + '.active', $(sectionsWrapper)).find(slideClass + '.active');
                // Trigger wow display for elements in this panel
                if (tbLocalScript && tbLocalScript.animationInviewSelectors && typeof ThemifyBuilderModuleJs !== 'undefined' && ThemifyBuilderModuleJs.wow) {
                    $(tbLocalScript.animationInviewSelectors).each(function (i, selector) {
                        $(selector, $slide).each(function () {
                            ThemifyBuilderModuleJs.wow.show(this);
                        });
                    });
                }
            }).on('themify_onepage_afterload themify_onepage_after_render', function (event, $section, section_id) {
                if ($.fn.waypoint) {
                    Waypoint.refreshAll();
                }
                if ('undefined' !== typeof ThemifyBuilderModuleJs && ThemifyBuilderModuleJs.wow !== null && typeof ThemifyBuilderModuleJs.wow.scrollHandler() === 'boolean') {
                    ThemifyBuilderModuleJs.wow.scrollHandler();
                }

            });
        }
        

        //Fix overlay style regardless the featured image position above/below post title
        $(".loops-wrapper.overlay .post").each(function () {
            $(this).find('.post-image').insertBefore($(this).find('.post-content'));
        });

        /////////////////////////////////////////////
        // Mega Menu
        /////////////////////////////////////////////
        var megaMenuInit = function () {
            if ('undefined' !== typeof $.fn.ThemifyMegaMenu) {
                /* add required wrappers for mega menu items */
                $('.has-mega-sub-menu').each(function () {
                    var $this = $(this);

                    $this.find('> ul').removeAttr('class')
                            .wrap('<div class="mega-sub-menu sub-menu" />')
                            .after('<div class="mega-menu-posts" />')
                            .find('li.menu-item-type-taxonomy') // only taxonomy terms can display mega posts
                            .addClass('mega-link');
                });

                $('.has-mega-sub-menu').ThemifyMegaMenu({
                    events: themifyScript.events
                });
            }
        };
        if ($('.has-mega-sub-menu').length) {
            if (typeof $.fn.ThemifyMegaMenu !== 'function') {
                Themify.LoadAsync(themifyScript.themeURI + '/themify/megamenu/js/themify.mega-menu.js', megaMenuInit);
            } else {
                megaMenuInit();
            }
        }


        // WINDOW RESIZE
        $(window).on('tfsmartresize',function () {

            /////////////////////////////////////////////
            // Swapping logo with Window Resize Function in Header Split Menu Layout
            /////////////////////////////////////////////
            var $body = Themify.body;
            if ($body.hasClass('header-menu-split')) {
                if ($('#menu-icon').is(':visible')) {
                    if ($('.header-bar').find('#site-logo').length == 0) {
                        $('#site-logo').prependTo('.header-bar');
                    }
                } else if ($('.themify-logo-menu-item').find('#site-logo').length === 0) {
                    $('.themify-logo-menu-item').append($('.header-bar').find('#site-logo'));
                }
            }

            var mgviewport = $(window).width();
            if (mgviewport > tf_mobile_menu_trigger_point) {
                if ($body.hasClass('header-magazine')) {
                    $('#headerwrap').css({
                        'paddingBottom': $('.navbar-wrapper').outerHeight()
                    });
                }
                if ($body.hasClass('header-classic')) {
                        $('#headerwrap').css({
                            'paddingBottom': $('.navbar-wrapper').outerHeight()
                        });
                    if ($('.navbar-wrapper').find('.navbar-wrapper-inner').length == 0) {
                        $('.navbar-wrapper').wrapInner('<div class="navbar-wrapper-inner"></div>');
                    }
                }
            }

        }).load(function () {
            var $body = Themify.body;
            ///////////////////////////////////////////
            // Initialize infinite scroll
            ///////////////////////////////////////////
            if (!Themify.is_builder_active) {
                if ($body.hasClass('woocommerce') && $body.hasClass('archive')) {
                    doInfinite($('#content ul.products'), '#content .product');
                } else {
                    doInfinite($('#loops-wrapper'), '.post');
                }
            }

            ///////////////////////////////////////////
            // Header Video
            ///////////////////////////////////////////
            var $header = $('#headerwrap'),
                    $videos = $header.find('[data-fullwidthvideo]');
            if ($header.data('fullwidthvideo')) {
                $videos = $videos.add($header);
            }
            function ThemifyBideo() {
                var init = true,
                        $fixed = $header.hasClass('fixed-header');
                if ($fixed) {
                    $header.removeClass('fixed-header');
                }
                $videos.each(function (i) {
                    var url = $(this).data('fullwidthvideo');
                    if (url) {
                        var options = {
                            url: url,
                            doLoop: true,
                            ambient: true,
                            id: i
                        };
                        if (init && $fixed) {
                            init = false;
                            options['onload'] = function () {
                                $header.addClass('fixed-header');
                            }
                        }
                        $(this).ThemifyBgVideo(options);
                    }
                });
            }
            if ($videos.length > 0 && !is_touch_device()) {
                if (typeof $.fn.ThemifyBgVideo === 'undefined') {
                    Themify.LoadAsync(
                            themify_vars.url + '/js/bigvideo.js',
                            ThemifyBideo,
                            null,
                            null,
                            function () {
                                return ('undefined' !== typeof $.fn.ThemifyBgVideo);
                            }
                    );
                }
                else {
                    ThemifyBideo();
                }
            }

            if (is_touch_device() && $videos.length) {

                $videos.each(function (key) {
                    var videoSrc = $(this).data('fullwidthvideo'),
                            videoEl;

                    if (videoSrc) {

                        if (videoSrc.indexOf('.mp4') >= 0 && videoSrc.indexOf(window.location.hostname) >= 0) {

                            $(this).addClass('themify-responsive-video-background');
                            videoEl = $('<div class="header-video-wrap">'
                                    + '<video class="responsive-video header-video video-' + key + '" muted="true" autoplay="true" loop="true" playsinline="true" >' +
                                    '<source src="' + videoSrc + '" type="video/mp4">' +
                                    '</video></div>')
                            videoEl.prependTo($(this));
                        }
                    }
                });


            }

            /////////////////////////////////////////////
            // Entry Filter Layout
            /////////////////////////////////////////////
            function reLayoutCallback() {
                loadIsotop($('.masonry:not(.list-post), .gallery-wrapper.packery-gallery').length > 0 || (themifyScript.shop_masonry === 'yes' && $('.woocommerce.archive #content ul.products').length > 0), function () {
                    $body.imagesLoaded(function () {
                        if (!Themify.is_builder_active) {
                            $(window).resize();
                        }
                        LayoutAndFilter.reLayout();
                    });
                });
            }
            if (Themify.is_builder_active) {
                $body.on('builder_load_module_partial', function (e, el, type) {
                    if (!el) {
                        reLayoutCallback();
                    }
					loadIsotop($('.post-filter', el).find('a').length > 0, function(){
						LayoutAndFilter.enableFilters(el);
					});
                });
            }
            else {
                reLayoutCallback();
            }

            // Edge menu
            $(function ($) {
                $('#main-nav li:has(ul), #footer-nav li:has(ul)').on('mouseenter dropdown_open', function (e) {
                    /* prevent "edge" classname being removed by mouseleave event when flipping through menu items really fast */
                    window.clearTimeout($(this).data('edge_menu_t'));

                    var elm = $('ul:first', this),
                            l = elm.offset().left,
                            w = elm.width(),
                            docW = $(window).width(),
                            isEntirelyVisible = (l + w <= docW);

                    if (!isEntirelyVisible) {
                        $(this).addClass('edge');
                    }
                })
                        .on('mouseleave dropdown_close', function () {
                            var $this = $(this),
                                    t = setTimeout(function () {
                                        $this.removeClass('edge');
                                    }, 300);
                            $this.data('edge_menu_t', t);
                        });
            });

            if (isFullPageScroll && $body.hasClass('query-section')) {
                // Hack Chrome browser doesn't autoplay the video background
                $body.on('themify_onepage_after_render', function () {
                    $.each(tbLocalScript.animationInviewSelectors, function (index, selector) {
                        $(selector).css('visibility', 'hidden');
                    });

                    // Section deep linking
                    if (window.location.hash) {
                        setTimeout(function () {
                            var hashSection = themifyScript.hash;
                            hashSection = hashSection.indexOf('/') != -1 ? hashSection.substring(0, hashSection.indexOf('/')) : hashSection;
                            if ('' != hashSection && '#' != hashSection) {
                                var $sectionEl = usesRows ? $('.tb_section-' + hashSection) : $('#' + hashSection);
                                if ($sectionEl.length > 0) {
                                    $.fn.fullpage.moveTo($sectionEl.closest('.section-container').index() + 1, $sectionEl.index());
                                    if (typeof ThemifyBuilderModuleJs !== 'undefined' && ThemifyBuilderModuleJs.wow) {
                                        $(tbLocalScript.animationInviewSelectors).each(function (i, selector) {
                                            $(selector, $sectionEl).addBack().each(function () {
                                                ThemifyBuilderModuleJs.wow.show(this);
                                            });
                                        });
                                    }
                                }
                            }
                        }, 1500);
                    }
                });
                // Make row backgrounds visible.
                $('.module_row').css('visibility', 'visible');
            }

            // remove item ajax
            $(document).on('click', '.remove-item-js', function (e) {
                e.preventDefault();
                // AJAX add to cart request
                var $thisbutton = $(this),
                        data = {
                            action: 'theme_delete_cart',
                            remove_item: $thisbutton.attr('data-product-key')
                        },
                $addedButton = $body.find('.ajax_add_to_cart '),
                        removedURL = $thisbutton.parent().find('.product-title a').attr('href');

                // Ajax action
                $.post(woocommerce_params.ajax_url, data, function (response) {
                    var fragments = response.fragments,
                            cart_hash = response.cart_hash;

                    // Changes button classes
                    if ($thisbutton.parent().find('.added_to_cart').length === 0)
                        $thisbutton.addClass('added');

                    // Replace fragments
                    if (fragments) {
                        $.each(fragments, function (key, value) {
                            $(key).addClass('updating').replaceWith(value);
                        });
                        if (!$(fragments['#shopdock-ultra']).find('.cart-total').length) {
                            $('#cart-icon-close').trigger('click');
                        }
                    }
                    if ($addedButton.length) {
                        $addedButton.each(function () {
                            if ($(this).hasClass('added') && $(this).closest('.post-content').find('[href="' + removedURL + '"]').length) {
                                $(this).removeClass('added').siblings('.added_to_cart').remove();
                            }
                        });
                    }
                    // Trigger event so themes can refresh other areas
                    $body.trigger('removed_from_cart', [fragments, cart_hash]);

                });
            });
            var isInit=Themify.is_builder_active?true:null;
            function AjaxThemifyTiles() {
                if(isInit===null){
                    isInit=true;
                    var callback = function (e, request, settings) {
                        if (settings.type === 'POST' && settings.url.indexOf('wpf_search')) {
                            callThemifyTiles($('.loops-wrapper'));
                        }
                    };
                    $(document).off('ajaxComplete',callback).ajaxComplete(callback);
                }
            }
            function callThemifyTiles(el) {
                var container = $('.auto_tiles',el);
                    if(el && el.hasClass('auto_tiles')){
                            container = container.add(el);
                    }
                    var ThemifyTiles = function () {
                            if (themifyScript) {
                                    var dummy = $('<div class="post-tiled tiled-square-small" style="visibility: hidden !important; opacity: 0;" />').appendTo(container.first()),
                                        $gutter = themifyScript.tiledata['padding'],
                                        $small = parseFloat(dummy.width());
                                dummy.remove();
                                container.each(function () {
                                    var $this = $(this),
                                        imgLoad = imagesLoaded( $this ),
                                        onLoad = function () {
                                                imgLoad.off( 'always', onLoad );
                                                 $this.children('.product').addClass('post');
                                                var $post = $this.children('.post');
                                                themifyScript.tiledata['padding'] = $this.hasClass('no-gutter') ? 0 : $gutter;
                                                $this.themify_tiles(themifyScript.tiledata, $small);
                                                setClasses($post, $small);
                                        };
                                        imgLoad.once( 'always', onLoad);
                                });
                            }
                    };
                if (container.length > 0 && $body.hasClass('tile_enable')) {
                    if ('undefined' === typeof Tiles) {
                        Themify.LoadAsync(themifyScript.themeURI + '/js/tiles.min.js', function () {
                            if (!$.fn.themify_tiles) {
                                if ('undefined' === typeof $.fn.backstretch) {
                                    Themify.LoadAsync(themify_vars.url + '/js/backstretch.min.js', function () {
                                        Themify.LoadAsync(themifyScript.themeURI + '/js/themify-tiles.js', function () {
                                            ThemifyTiles();
                                            AjaxThemifyTiles();
                                        },
                                                null,
                                                null,
                                                function () {
                                                    return ('undefined' !== typeof $.fn.themify_tiles);
                                                });
                                    },
                                            null,
                                            null,
                                            function () {
                                                return ('undefined' !== typeof $.fn.backstretch);
                                            });
                                }
                                else {
                                    Themify.LoadAsync(themifyScript.themeURI + '/js/themify-tiles.js', function () {
                                        ThemifyTiles();
                                        AjaxThemifyTiles();
                                    },
                                            null,
                                            null,
                                            function () {
                                                return ('undefined' !== typeof $.fn.themify_tiles);
                                            });
                                }
                            }
                            else {
                                ThemifyTiles();
                                AjaxThemifyTiles();
                            }
                        }
                        , null,
                                null,
                                function () {
                                    return ('undefined' !== typeof Tiles);
                                });
                    }
                    else {
                        ThemifyTiles();
                        AjaxThemifyTiles();
                    }

                }
            }
            if (Themify.is_builder_active) {
                    $body.on('builder_load_module_partial', function (e, el, type) {
                        if (el !== undefined) {
                            var wrap=el.find('.builder-posts-wrap,.wc-products').first(),
                                isMasonry = wrap.hasClass('masonry');
                            if(!wrap.length){
                                return;
                            }
                            wrap.css('height','').removeClass('loading-finish');
                            LayoutAndFilter.destroy(wrap);
                            var classList = wrap[0].classList;
                            if ( isMasonry && (classList.contains( 'grid2' ) || classList.contains( 'grid3' ) || classList.contains( 'grid4' )) ) {
                                wrap.addClass('masonry');
                                loadIsotop(true, function () {
                                        LayoutAndFilter.init(el);
                                        var imgLoad = imagesLoaded( el ),
                                        onLoad = function () {
                                            imgLoad.off( 'always', onLoad );
                                            LayoutAndFilter.layout(el);
                                        };
                                        imgLoad.once( 'always', onLoad);
                                    }, true);
                            }
                            else if (wrap.hasClass('auto_tiles')) {
                                    callThemifyTiles(wrap);
                            }
                            else if(wrap.data('themify_tiles')){
                                    wrap.data('themify_tiles').destroy();
                            }
                        }

                    });
                    if(Themify.is_builder_loaded){
                            callThemifyTiles();
                    }
                    else{
                        window.top.jQuery('body').one('themify_builder_ready', function () {
                                callThemifyTiles();
                        });
                    }
            }
            else{
                    callThemifyTiles();
            }
        });

        // Revealing footer
        var revealingFooter = function () {
            var currentColor, contentParents, isSticky,
                    $footer = $('#footerwrap'),
                    $footerInner = $footer.find('#footer'),
                    footerHeight = $footer.innerHeight(),
                    $content = $('#body'),
                    resizeCallback = function () {
                        footerHeight = $footer.innerHeight();
                        !isSticky && $footer.parent().css('padding-bottom', footerHeight);
                    },
                    scrollCallback = function () {
                        var contentPosition = $content.get(0).getBoundingClientRect(),
                                footerVisibility = window.innerHeight - contentPosition.bottom;

                        $footer.toggleClass('active-revealing', contentPosition.top < 0);

                        if (footerVisibility >= 0 && footerVisibility <= footerHeight) {
                            $footerInner.css('opacity', footerVisibility / footerHeight + 0.2);
                        } else if (footerVisibility > footerHeight) {
                            $footerInner.css('opacity', 1);
                        }
                    };

            if (!$footer.length && !$content.length)
                return;

            // Check for content background
            contentParents = $content.parents();

            if (contentParents.length) {
                $content.add(contentParents).each(function () {
                    if (!currentColor) {
                        var elColor = $(this).css('background-color');
                        if (elColor && elColor !== 'transparent' && elColor !== 'rgba(0, 0, 0, 0)') {
                            currentColor = elColor;
                        }
                    }
                });
            }

            $content.css('background-color', currentColor || '#ffffff');

            // Sticky Check
            isSticky = $footer.css('position') === 'sticky';
            Themify.body.toggleClass('no-css-sticky', !isSticky);

            resizeCallback();
            scrollCallback();
            $(window).on('tfsmartresize', resizeCallback).on('scroll', scrollCallback);
        };

        if (Themify.body.hasClass('revealing-footer')) {

            var backToTopButton = $('.back-top.back-top-float');
            revealingFooter();

            if (backToTopButton.length) {

                $('#footerwrap').before(backToTopButton);
            }
        }

        /* COMMENT FORM ANIMATION */
        $('input, textarea').focus(function () {
            $(this).parents('#commentform p').addClass('focused');
        }).blur(function () {
            var inputValue = $(this).val();
            if (inputValue == "") {
                $(this).removeClass('filled');
                $(this).parents('#commentform p').removeClass('focused');
            } else {
                $(this).addClass('filled');
            }
        });

        $body.on('added_to_cart', function (e) {

            var cartButton = $('.cart-icon');
            if (cartButton.hasClass('empty-cart')) {
                cartButton.removeClass('empty-cart');
            }

        })
                .on('removed_from_cart', function (e) {

                    var cartButton = $('.cart-icon');
                    if (!cartButton.hasClass('empty-cart') && parseInt($('#cart-icon span').text()) <= 0) {
                        cartButton.addClass('empty-cart');
                    }
                });

    });

    $(window).load(function () {

        if ('1' === themifyScript.pageLoaderEffect || Themify.body.hasClass('full-section-scrolling')) {

            Themify.body.addClass('ready-view').removeClass('hidden-view');

            $('.section_loader').fadeOut(500, function () {
                if ('undefined' !== typeof ThemifyBuilderModuleJs && 'undefined' !== typeof ThemifyBuilderModuleJs.wowInit) {
                    ThemifyBuilderModuleJs.wowInit();
                }
            });
        }

        /**
         * Called when user navigates away of the current view.
         * Publicly accessible through themifyScript.onBrowseAway
         */
        themifyScript.onBrowseAway = function (e) {

            if (e.target.activeElement.tagName == 'BODY'
                    || ($(e.target.activeElement).attr('id') == "tb_toolbar")
                    || $(e.target.activeElement).closest('#tb_toolbar').length)
                return;

            if (Themify.body.hasClass('ready-view')) {
                Themify.body.addClass('hidden-view').removeClass('ready-view');
            } else {
                Themify.body.addClass('hidden-view');
            }
        };

        if ('1' === themifyScript.pageLoaderEffect || Themify.body.hasClass('full-section-scrolling')) {
            window.addEventListener('beforeunload', themifyScript.onBrowseAway);
        }

    });

    /////////////////////////////////////////////
    // Search Form							
    /////////////////////////////////////////////
    var $search = $('#search-lightbox-wrap');
    if ($search.length > 0) {
        var cache = [],
                xhr,
                $input = $search.find('#searchform input'),
                $result_wrapper = $search.find('.search-results-wrap');
        $('.search-button, #close-search-box').on('click', function (e) {
            e.preventDefault();
            if ($input.val().length) {
                $search.addClass('search-active');
            } else {
                $search.removeClass('search-active')
            }
            if ($(this).hasClass('search-button')) {
                $search.fadeIn(function () {
                    $input.focus();
                    Themify.body.css('overflow-y', 'hidden');
                });
                Themify.body.addClass('searchform-slidedown');
            }
            else {
                if (xhr) {
                    xhr.abort();
                }
                $search.fadeOut();
                Themify.body.css('overflow-y', 'visible').removeClass('searchform-slidedown');
            }
        });

        $result_wrapper.on('click', '.search-option-tab a', function (e) {
            e.preventDefault();
            var $href = $(this).attr('href').replace('#', '');
            if ($href === 'all') {
                $href = 'item';
            }
            else {
                $result_wrapper.find('.result-item').stop().fadeOut();
            }
            if ($('#result-link-' + $href).length > 0) {
                $('.view-all-button').hide();
                $('#result-link-' + $href).show();
            }
            $result_wrapper.find('.result-' + $href).stop().fadeIn();
            $(this).closest('li').addClass('active').siblings('li').removeClass('active');
        });
        $input.prop('autocomplete', 'off').on('keyup', function (e) {
            if ($input.val().length > 0) {
                $search.addClass('search-active');
            } else {
                $search.removeClass('search-active');
            }
            function set_active_tab(index) {
                if (index < 0) {
                    index = 0;
                }
                $result_wrapper.find('.search-option-tab li').eq(index).children('a').trigger('click');
                $result_wrapper.show();
            }
            if ((e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 65 && e.keyCode <= 90) || e.keyCode === 8 || e.keyCode === 229) {
                var $v = $.trim($(this).val());
                if ($v) {
                    if (cache[$v]) {
                        var $tab = $result_wrapper.find('.search-option-tab li.active').index();
                        $result_wrapper.hide().html(cache[$v]);
                        set_active_tab($tab);
                        return;
                    }
                    setTimeout(function () {
                        $v = $.trim($input.val());
                        if (xhr) {
                            xhr.abort();
                        }
                        if (!$v) {
                            $result_wrapper.html('');
                            return;
                        }

                        xhr = $.ajax({
                            url: themifyScript.ajax_url,
                            type: 'POST',
                            data: {'action': 'themify_search_autocomplete', 'term': $v},
                            beforeSend: function () {
                                $search.addClass('themify-loading');
                                $result_wrapper.html('<span class="themify_spinner"></span>');
                            },
                            complete: function () {
                                $search.removeClass('themify-loading');
                            },
                            success: function (resp) {
                                if (!$v) {
                                    $result_wrapper.html('');
                                }
                                else if (resp) {
                                    var $tab = $result_wrapper.find('.search-option-tab li.active').index();
                                    $result_wrapper.hide().html(resp);
                                    set_active_tab($tab);
                                    $result_wrapper.find('.search-option-tab li.active')
                                    cache[$v] = resp;
                                }
                            }
                        });
                    }, 100);
                }
                else {
                    $result_wrapper.html('');
                }
            }
        });
    }

})(jQuery);
