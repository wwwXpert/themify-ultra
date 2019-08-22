<?php

if (!defined('ABSPATH'))
    exit; // Exit if accessed directly
/**
 * Module Name: Slider
 * Description: Display slider content
 */

class TB_Slider_Module extends Themify_Builder_Component_Module {

    function __construct() {
	parent::__construct(array(
	    'name' => __('Slider', 'themify'),
	    'slug' => 'slider'
	));

	add_action('init', array($this, 'setup_slider_cpt'), 30);
    }

    public function setup_slider_cpt() {
	if (Themify_Builder_Model::is_cpt_active('slider')) {
	    ///////////////////////////////////////
	    // Load Post Type
	    ///////////////////////////////////////
	    $this->meta_box = $this->set_metabox();
	    $this->initialize_cpt(array(
		'plural' => __('Slides', 'themify'),
		'singular' => __('Slide', 'themify'),
		'supports' => array('title', 'editor', 'author', 'thumbnail', 'custom-fields'),
		'menu_icon' => 'dashicons-slides'
	    ));

	    if (!shortcode_exists('themify_' . $this->slug . '_posts')) {
		add_shortcode('themify_' . $this->slug . '_posts', array($this, 'do_shortcode'));
	    }
	}
    }

    public function get_options() {

	$is_img_enabled = Themify_Builder_Model::is_img_php_disabled();
	
	$display = array(
	    array('value' => 'blog', 'name' => __('Posts', 'themify')),
	    array('value' => 'image', 'name' => __('Images', 'themify')),
	    array('value' => 'video', 'name' => __('Videos', 'themify')),
	    array('value' => 'text', 'name' => __('Text', 'themify')),
	);
	$slider_enabled = Themify_Builder_Model::is_cpt_active('slider');
	$portfolio_enabled = Themify_Builder_Model::is_cpt_active('portfolio');
	$testimonial_enabled = Themify_Builder_Model::is_cpt_active('testimonial');

	if ($slider_enabled) {
	    $display[] =array('value' => 'slider', 'name' => __('Slider Posts', 'themify'));
	}
	if ($portfolio_enabled) {
	    $display[] = array('value' => 'portfolio', 'name' => __('Portfolio', 'themify'));
	}
	if ($testimonial_enabled) {
	    $display[] = array('value' => 'testimonial', 'name' => __('Testimonial', 'themify'));
	}

	$options = array(
	    array(
		'id' => 'mod_title_slider',
		'type' => 'title'
	    ),
	    array(
		'id' => 'layout_display_slider',
		'type' => 'radio',
		'label' => __('Display', 'themify'),
		'options' => $display,
		'option_js' => true,
		    'wrap_class' => 'tb_compact_radios',
	    ),
	    array(
		'type' => 'query_posts',
		'id' => 'post_type',
		'tax_id'=>'taxonomy',
		'term_id'=>'blog_category_slider',
		'description' => sprintf(__('Add more <a href="%s" target="_blank">blog posts</a>', 'themify'), admin_url('post-new.php')),
		'wrap_class' => 'tb_group_element_blog'
	    )
	);
	if ($slider_enabled) {
	    $options[] = array(
		'type' => 'query_posts',
		'term_id' => 'slider_category_slider',
		'taxonomy'=>'slider-category',
		'description' => sprintf(__('Add more <a href="%s" target="_blank">slider posts</a>', 'themify'), admin_url('post-new.php?post_type=slider')),
		'wrap_class' => 'tb_group_element_slider'
	    );
	}
	if ($portfolio_enabled) {
	    $options[] = array(
		'type' => 'query_posts',
		'term_id' => 'portfolio_category_slider',
		'taxonomy'=>'portfolio-category',
		'description' => sprintf(__('Add more <a href="%s" target="_blank">portfolio posts</a>', 'themify'), admin_url('post-new.php?post_type=portfolio')),
		'wrap_class' => 'tb_group_element_portfolio'
	    );
	}
	if ($testimonial_enabled) {
	    $options[] = array(
		'type' => 'query_posts',
		'term_id' => 'testimonial_category_slider',
		'taxonomy'=>'testimonial-category',
		'description' => sprintf(__('Add more <a href="%s" target="_blank">testimonial posts</a>', 'themify'), admin_url('post-new.php?post_type=testimonial')),
		'wrap_class' => 'tb_group_element_testimonial'
	    );
	}
	$options = array_merge($options, array(
	    array(
		'id' => 'posts_per_page_slider',
		'type' => 'number',
		'label' => __('Query', 'themify'),
		'help' => __('number of posts to query', 'themify'),
		'wrap_class' => 'tb_group_element_blog tb_group_element_portfolio tb_group_element_slider tb_group_element_testimonial'
	    ),
	    array(
		'id' => 'offset_slider',
		'type' => 'number',
		'label' => __('Offset', 'themify'),
		'help' => __('number of post to displace or pass over', 'themify'),
		'wrap_class' => 'tb_group_element_blog tb_group_element_portfolio tb_group_element_slider tb_group_element_testimonial'
	    ),
	    array(
		'id' => 'order_slider',
		'type' => 'select',
		'label' => __('Order', 'themify'),
		'help' => __('Sort posts in ascending or descending order.', 'themify'),
		'order' =>true,
		'wrap_class' => 'tb_group_element_blog tb_group_element_slider tb_group_element_portfolio tb_group_element_testimonial'
	    ),
	    array(
		'id' => 'orderby_slider',
		'type' => 'select',
		'label' => __('Order By', 'themify'),
		'orderBy'=>true,
		'binding' => array(
		    'select' => array('hide' => array('meta_key_slider')),
		    'meta_value' => array('show' => array('meta_key_slider')),
		    'meta_value_num' => array('show' => array('meta_key_slider'))
		),
		'wrap_class' => 'tb_group_element_blog tb_group_element_slider tb_group_element_portfolio tb_group_element_testimonial'
	    ),
	    array(
		'id' => 'meta_key_slider',
		'type' => 'text',
		'label' => __('Custom Field Key', 'themify')
	    ),
	    array(
		'id' => 'display_slider',
		'type' => 'select',
		'label' => __('Display', 'themify'),
		'options' => array(
		    'content' => __('Content', 'themify'),
		    'excerpt' => __('Excerpt', 'themify'),
		    'none' => __('None', 'themify')
		),
		'wrap_class' => 'tb_group_element_blog tb_group_element_slider tb_group_element_portfolio tb_group_element_testimonial'
	    ),
	    array(
		'id' => 'hide_post_title_slider',
		'type' => 'toggle_switch',
		'label' => __('Post Title', 'themify'),
		'wrap_class' => 'tb_group_element_blog tb_group_element_slider tb_group_element_portfolio tb_group_element_testimonial'
	    ),
	    array(
		'id' => 'unlink_post_title_slider',
		'type' => 'toggle_switch',
		'label' => __('Unlink Post Title', 'themify'),
		'options' => 'simple',
		'wrap_class' => 'tb_group_element_blog tb_group_element_slider tb_group_element_portfolio'
	    ),
	    array(
		'id' => 'hide_feat_img_slider',
		'type' => 'toggle_switch',
		'label' => __('Featured Image', 'themify'),
		'wrap_class' => 'tb_group_element_blog tb_group_element_slider tb_group_element_portfolio tb_group_element_testimonial'
	    ),
	    array(
		'id' => 'unlink_feat_img_slider',
		'type' => 'toggle_switch',
		'label' => __('Unlink Featured Image', 'themify'),
		'options' => 'simple',
		'wrap_class' => 'tb_group_element_blog tb_group_element_slider tb_group_element_portfolio'
	    ),
	    array(
		'id' => 'open_link_new_tab_slider',
		'type' => 'toggle_switch',
		'label' => __('Open Link In New Tab', 'themify'),
		'options' => 'simple',
		'wrap_class' => 'tb_group_element_blog tb_group_element_slider tb_group_element_portfolio tb_group_element_testimonial'
	    ),
	    ///////////////////////////////////////////
	    // Image post option
	    ///////////////////////////////////////////
	    array(
		'id' => 'img_content_slider',
		'type' => 'builder',
		'options' => array(
		    array(
			'id' => 'img_url_slider',
			'type' => 'image',
			'label' => __('Image URL', 'themify')
		    ),
		    array(
			'id' => 'img_title_slider',
			'type' => 'text',
			'label' => __('Image Title', 'themify'),
			'class' => 'fullwidth'
		    ),
		    array(
			'id' => 'img_link_slider',
			'type' => 'url',
			'label' => __('Image Link', 'themify'),
			'class' => 'fullwidth'
		    ),
		    array(
			'id' => 'img_link_params',
			'type' => 'select',
			'label' => '',
			'options' => array(
			    '' => '',
			    'lightbox' => __('Open link in lightbox', 'themify'),
			    'newtab' => __('Open link in new tab', 'themify')
			)
		    ),
		    array(
			'id' => 'img_caption_slider',
			'type' => 'textarea',
			'label' => __('Image Caption', 'themify'),
			'class' => 'fullwidth',
			'rows' => 6
		    )
		),
		'wrap_class' => 'tb_group_element_image'
	    ),
	    ///////////////////////////////////////////
	    // Video post option
	    ///////////////////////////////////////////
	    array(
		'id' => 'video_content_slider',
		'type' => 'builder',
		'options' => array(
		    array(
			'id' => 'video_url_slider',
			'type' => 'url',
			'label' => __('Video URL', 'themify'),
			'class' => 'xlarge',
			'help' => __("Insert YouTube or Vimeo video URL.", 'themify')
		    ),
		    array(
			'id' => 'video_title_slider',
			'type' => 'text',
			'label' => __('Video Title', 'themify'),
			'class' => 'fullwidth'
		    ),
		    array(
			'id' => 'video_title_link_slider',
			'type' => 'url',
			'label' => __('Video Title Link', 'themify'),
			'class' => 'fullwidth'
		    ),
		    array(
			'id' => 'video_caption_slider',
			'type' => 'textarea',
			'label' => __('Video Caption', 'themify'),
			'rows' => 6
		    ),
		    array(
			'id' => 'video_width_slider',
			'type' => 'number',
			'label' => __('Video Width', 'themify')
		    )
		),
		'wrap_class' => 'tb_group_element_video'
	    ),
	    ///////////////////////////////////////////
	    // Text Slider option
	    ///////////////////////////////////////////
	    array(
		'id' => 'text_content_slider',
		'type' => 'builder',
		'options' => array(
		    array(
			'id' => 'text_caption_slider',
			'type' => 'wp_editor',
			'class' => 'builder-field',
			'rows' => 6
		    )
		),
		'wrap_class' => 'tb_group_element_text'
	    ),
	    array(
		'id' => 'layout_slider',
		'type' => 'layout',
		'label' => __('Slider Layout', 'themify'),
		'separated' => 'top',
		'mode' => 'sprite',
		'options' => array(
		    array('img' => 'slider_default', 'value' => 'slider-default', 'label' => __('Slider Default', 'themify')),
		    array('img' => 'slider_image_top', 'value' => 'slider-overlay', 'label' => __('Slider Overlay', 'themify')),
		    array('img' => 'slider_caption_overlay', 'value' => 'slider-caption-overlay', 'label' => __('Slider Caption Overlay', 'themify')),
		    array('img' => 'slider_agency', 'value' => 'slider-agency', 'label' => __('Agency', 'themify'))
		),
		'control'=>array(
		    'classSelector'=>''
		)
	    ),
	    array(
		'id' => 'image_size_slider',
		'type' => 'select',
		'label' => __('Image Size', 'themify'),
		'hide' => !$is_img_enabled,
		'image_size' => true,
		'wrap_class' => 'tb_group_element_blog tb_group_element_slider tb_group_element_portfolio tb_group_element_image'
	    ),
	    array(
		'id' => 'img_w_slider',
		'type' => 'number',
		'label' => __('Image Width', 'themify'),
		'after' => 'px',
		'wrap_class' => 'tb_group_element_blog tb_group_element_slider tb_group_element_portfolio tb_group_element_image'
	    ),
	    array(
		'id' => 'img_fullwidth_slider',
		'type' => 'checkbox',
		'label' => '',
		'options' => array(
		    array('name' => 'fullwidth', 'value' => __('Auto fullwidth image', 'themify'))
		),
		    'wrap_class' => 'auto_fullwidth'
	    ),
	    array(
		'id' => 'img_h_slider',
		'type' => 'number',
		'label' => __('Image Height', 'themify'),
		'after' => 'px',
		'wrap_class' => 'tb_group_element_blog tb_group_element_slider tb_group_element_portfolio tb_group_element_image'
	    ),
	    array(
				'id' => 'horizontal',
				'type' => 'toggle_switch',
				'label' => __('Horizontal Scroll', 'themify'),
				'options'   => array(
					'on'  => array( 'name' => 'yes', 'value' => 'en' ),
					'off' => array( 'name' => 'no', 'value' => 'dis' ),
				),
				'binding' => array(
					'checked' => array( 'hide' => array( 'slider_opt' ) ),
					'not_checked' => array( 'show' => array( 'slider_opt' ) ),
				)
			),
			array(
				'id'             => 'slider_opt',
		'type' => 'slider',
		'label' => __('Slider Options', 'themify'),
		'slider_options' => true
	    ),
	    array(
		'id' => 'css_slider',
		'type' => 'custom_css'
	    ),
	    array('type' => 'custom_css_id')
	));

	return $options;
    }

    public function get_default_settings() {
	return array(
	    'posts_per_page_slider' => 4,
	    'display_slider' => 'none',
	    'img_w_slider' => 360,
	    'img_h_slider' => 200,
			'horizontal'             => 'no',
	    'visible_opt_slider' => 3,
	    'pause_on_hover_slider'=>'resume',
	    'show_arrow_slider'=>'yes',
	    'show_nav_slider'=>'yes',
	    'wrap_slider'=>'yes',
	    'auto_scroll_opt_slider'=>'off',
	    'post_type' => 'post'
	);
    }

    public function get_visual_type() {
	return 'ajax';
    }

    public function get_styling() {
	$general = array(
	    // Background
	    self::get_expand('bg', array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			    self::get_color('', 'background_color', 'bg_c', 'background-color')
			)
		    ),
		    'h' => array(
			'options' => array(
			    self::get_color('', 'bg_c', 'bg_c', 'background-color', 'h')
			)
		    )
		))
	    )),
	    // Font
	    self::get_expand('f', array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			    self::get_font_family(' .slide-content'),
			    self::get_color_type(array(' .tb_text_wrap', ' .slide-content a')),
			    self::get_font_size(' .slide-content'),
			    self::get_line_height(' .slide-content'),
			    self::get_letter_spacing(' .slide-content'),
			    self::get_text_align(' .slide-content'),
			    self::get_text_transform(' .slide-content'),
			    self::get_font_style(' .slide-content'),
			    self::get_text_decoration(' .slide-content', 'text_decoration_regular'),
			    self::get_text_shadow(array(' .slide-content', ' .slide-title', ' .slide-title a')),
			)
		    ),
		    'h' => array(
			'options' => array(
			    self::get_font_family(' .slide-content', 'f_f', 'h'),
			    self::get_color_type(array(':hover .tb_text_wrap', ':hover .slide-content a'),'','f_c_t_h',  'f_c_h', 'f_g_c_h'),
			    self::get_font_size(' .slide-content', 'f_s', '', 'h'),
			    self::get_line_height(' .slide-content', 'l_h', 'h'),
			    self::get_letter_spacing(' .slide-content', 'l_s', 'h'),
			    self::get_text_align(' .slide-content', 't_a', 'h'),
			    self::get_text_transform(' .slide-content', 't_t', 'h'),
			    self::get_font_style(' .slide-content', 'f_st', 'f_w', 'h'),
			    self::get_text_decoration(' .slide-content', 't_d_r', 'h'),
			    self::get_text_shadow(array(' .slide-content', ' .slide-title', ' .slide-title a'),'t_sh','h'),
			)
		    )
		))
	    )),
	    // Link
	    self::get_expand('l', array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			    self::get_color('.module a', 'link_color'),
			    self::get_text_decoration(' a')
			)
		    ),
		    'h' => array(
			'options' => array(
			    self::get_color('.module a', 'link_color', null, null, 'hover'),
			    self::get_text_decoration(' a', 't_d', 'h')
			)
		    )
		))
	    )),
	    // Padding
	    self::get_expand('p', array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			    self::get_padding()
			)
		    ),
		    'h' => array(
			'options' => array(
			    self::get_padding('', 'p', 'h')
			)
		    )
		))
	    )),
	    // Margin
	    self::get_expand('m', array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			    self::get_margin()
			)
		    ),
		    'h' => array(
			'options' => array(
			    self::get_margin('', 'm', 'h')
			)
		    )
		))
	    )),
	    // Border
	    self::get_expand('b', array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			    self::get_border()
			)
		    ),
		    'h' => array(
			'options' => array(
			    self::get_border('', 'b', 'h')
			)
		    )
		))
	    )),
		// Filter
		self::get_expand('f_l',
			array(
				self::get_tab(array(
					'n' => array(
						'options' => self::get_blend()

					),
					'h' => array(
						'options' => self::get_blend('', '', 'h')
					)
				))
			)
		),
		// Rounded Corners
		self::get_expand('r_c', array(
				self::get_tab(array(
					'n' => array(
						'options' => array(
							self::get_border_radius()
						)
					),
					'h' => array(
						'options' => array(
							self::get_border_radius('', 'r_c', 'h')
						)
					)
				))
			)
		),
		// Shadow
		self::get_expand('sh', array(
				self::get_tab(array(
					'n' => array(
						'options' => array(
							self::get_box_shadow()
						)
					),
					'h' => array(
						'options' => array(
							self::get_box_shadow('', 'sh', 'h')
						)
					)
				))
			)
		),
	);

	$container = array(
	    // Background
	    self::get_expand('bg', array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			    self::get_color(' .slide-inner-wrap', 'b_c_container', 'bg_c', 'background-color')
			)
		    ),
		    'h' => array(
			'options' => array(
			    self::get_color(' .slide-inner-wrap', 'b_c_c', 'bg_c', 'background-color', 'h')
			)
		    )
		))
	    )),
	    // Padding
	    self::get_expand('p', array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			    self::get_padding(' .slide-inner-wrap', 'p_container')
			)
		    ),
		    'h' => array(
			'options' => array(
			    self::get_padding(' .slide-inner-wrap', 'p_c', 'h')
			)
		    )
		))
	    )),
	    // Margin
	    self::get_expand('m', array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			    self::get_margin(' .slide-inner-wrap', 'm_container'),
			)
		    ),
		    'h' => array(
			'options' => array(
			    self::get_margin(' .slide-inner-wrap', 'm_c', 'h'),
			)
		    )
		))
	    )),
	    // Border
	    self::get_expand('b', array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			    self::get_border(' .slide-inner-wrap', 'b_container')
			)
		    ),
		    'h' => array(
			'options' => array(
			    self::get_border(' .slide-inner-wrap', 'b_c', 'h')
			)
		    )
		))
	    )),
		// Rounded Corners
		self::get_expand('r_c', array(
			self::get_tab(array(
				'n' => array(
					'options' => array(
						self::get_border_radius(' .slide-inner-wrap', 'r_c_sc')
					)
				),
				'h' => array(
					'options' => array(
						self::get_border_radius(' .slide-inner-wrap', 'r_c_sc', 'h')
					)
				)
			))
		)),
		// Shadow
		self::get_expand('sh', array(
			self::get_tab(array(
				'n' => array(
					'options' => array(
						self::get_box_shadow(' .slide-inner-wrap', 'b_sh_sc')
					)
				),
				'h' => array(
					'options' => array(
						self::get_box_shadow(' .slide-inner-wrap', 'b_sh_sc', 'h')
					)
				)
			))
		))
	);

	$title = array(
	    // Font
	    self::get_expand('f', array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			    self::get_font_family(array('.module .slide-title', '.module .slide-title a'), 'font_family_title'),
			    self::get_color(array('.module .slide-content .slide-title', '.module .slide-content .slide-title a'), 'font_color_title'),
			    self::get_font_size('.module .slide-title', 'font_size_title'),
			    self::get_line_height('.module .slide-title', 'line_height_title'),
			    self::get_letter_spacing('.module .slide-title', 'letter_spacing_title'),
			    self::get_text_transform('.module .slide-title', 'text_transform_title'),
			    self::get_font_style('.module .slide-title', 'font_title', 'font_title_bold')
			)
		    ),
		    'h' => array(
			'options' =>array(
			    self::get_font_family(array('.module .slide-title', '.module .slide-title a'), 'f_f_t', 'h'),
			    self::get_color(array('.module .slide-content .slide-title', '.module .slide-content .slide-title a'), 'f_c_t_t',null,null,'h'),
			    self::get_font_size('.module .slide-title', 'f_s_t', '', 'h'),
			    self::get_line_height('.module .slide-title', 'l_h_t', 'h'),
			    self::get_letter_spacing('.module .slide-title', 'l_s_t', 'h'),
			    self::get_text_transform('.module .slide-title', 't_t_t','h'),
			    self::get_font_style('.module .slide-title', 'f_t', 'f_t_b', 'h')
			)
		    )
		))
	    )),
	    self::get_expand('m', array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			    self::get_margin('.module .slide-title', 'm_title'),
			    self::get_text_shadow(array('.module .slide-title', '.module .slide-title a'), 't_sh_t')
			)
		    ),
		    'h' => array(
			'options' =>array(
			   
			    self::get_margin('.module .slide-title', 'm_t', 'h'),
			    self::get_text_shadow(array('.module .slide-content .slide-title', '.module .slide-content .slide-title a'), 't_sh_t','h')
			)
		    )
		))
	    ))
	);

	$image = array(
		// Background
		self::get_expand('bg', array(
			self::get_tab(array(
				'n' => array(
				'options' => array(
					self::get_color(' .slide-image img', 'i_bg_c', 'bg_c', 'background-color')
				)
				),
				'h' => array(
				'options' => array(
					self::get_color(' .slide-image img', 'i_bg_c', 'bg_c', 'background-color', 'h')
				)
				)
			))
		)),
		// Padding
		self::get_expand('p', array(
			self::get_tab(array(
				'n' => array(
				'options' => array(
					self::get_padding(' .slide-image img', 'i_p')
				)
				),
				'h' => array(
				'options' => array(
					self::get_padding(' .slide-image img', 'i_p', 'h')
				)
				)
			))
		)),
		// Margin
		self::get_expand('m', array(
			self::get_tab(array(
				'n' => array(
				'options' => array(
					self::get_margin(' .slide-image img', 'i_m')
				)
				),
				'h' => array(
				'options' => array(
					self::get_margin(' .slide-image img', 'i_m', 'h')
				)
				)
			))
		)),
		// Border
		self::get_expand('b', array(
			self::get_tab(array(
				'n' => array(
				'options' => array(
					self::get_border(' .slide-image img', 'i_b')
				)
				),
				'h' => array(
				'options' => array(
					self::get_border(' .slide-image img', 'i_b', 'h')
				)
				)
			))
		)),
		// Rounded Corners
		self::get_expand('r_c', array(
			self::get_tab(array(
				'n' => array(
					'options' => array(
						self::get_border_radius(' .slide-image img', 'i_r_c')
					)
				),
				'h' => array(
					'options' => array(
						self::get_border_radius(' .slide-image img', 'i_r_c', 'h')
					)
				)
			))
		)),
		// Shadow
		self::get_expand('sh', array(
			self::get_tab(array(
				'n' => array(
					'options' => array(
						self::get_box_shadow(' .slide-image img', 'i_b_sh')
					)
				),
				'h' => array(
					'options' => array(
						self::get_box_shadow(' .slide-image img', 'i_b_sh', 'h')
					)
				)
			))
		))
	
	);

	$content = array(
	    // Font
	    self::get_expand('f', array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			    self::get_font_family('.module .slide-content', 'font_family_content'),
			    self::get_color('.module .slide-content', 'font_color_content'),
			    self::get_font_size('.module .slide-content', 'font_size_content'),
			    self::get_line_height('.module .slide-content', 'line_height_content'),
			    self::get_text_shadow(array('.module .slide-content','.module .slide-title', '.module .slide-title a'), 't_sh_c')
			)
		    ),
		    'h' => array(
			'options' => array(
			    self::get_font_family('.module .slide-content', 'f_f_c', 'h'),
			    self::get_color('.module .slide-content', 'f_c_c', null, null, 'h'),
			    self::get_font_size('.module .slide-content', 'f_s_c', '', 'h'),
			    self::get_line_height('.module .slide-content', 'l_h_c', 'h'),
			    self::get_text_shadow(array('.module .slide-content','.module .slide-title', '.module .slide-title a'), 't_sh_c','h')
			)
		    )
		))
	    )),
	    // Multi columns
	    self::get_expand('col', array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			    self::get_multi_columns_count(' .slide-content')
			)
		    ),
		    'h' => array(
			'options' => array(
			    self::get_multi_columns_count(' .slide-content', 'c', 'h')
			)
		    )
		))
	    )),
	    // padding
	    self::get_expand('p', array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			    
			    self::get_padding(' .slide-content', 'p_content')
			)
		    ),
		    'h' => array(
			'options' => array(
			    self::get_padding(' .slide-content', 'p_c', 'h')
			)
		    )
		))
	    ))
	);

	$controls = array(
	    // Arrows
	    self::get_expand(__('Arrows', 'themify'), array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			   self::get_color(array('.themify_builder_slider_vertical .carousel-prev','.themify_builder_slider_vertical .carousel-next'), 'b_c_arrows_controls', 'bg_c', 'background-color'),
			   self::get_color(array(' .carousel-prev::before',' .carousel-next::before'), 'f_c_arrows_controls')
			)
		    ),
		    'h' => array(
			'options' => array(
			    self::get_color(array('.themify_builder_slider_vertical .carousel-prev','.themify_builder_slider_vertical .carousel-next'), 'b_c_h_arrows_controls', 'bg_c', 'background-color'),
			    self::get_color(array(' .carousel-prev:hover::before',' .carousel-next:hover::before'), 'f_c_ar_c_h')
			)
		    )
		))
	    )),
	    // Pager
	    self::get_expand(__('Pager', 'themify'), array(
		self::get_tab(array(
		    'n' => array(
			'options' => array(
			   self::get_color('.module .carousel-pager a', 'f_c_pager_controls')
			)
		    ),
		    'h' => array(
			'options' => array(
			   self::get_color(array('.module .carousel-pager a:hover','.module .carousel-pager a.selected'), 'f_c_h_pager_controls')
			)
		    )
		))
	    ))
	);

	return array(
	    'type' => 'tabs',
	    'options' => array(
		'g' => array(
		    'options' => $general
		),
		'm_t' => array(
		    'options' => $this->module_title_custom_style()
		),
		'co' => array(
		    'label' => __('Container', 'themify'),
		    'options' => $container
		),
		't' => array(
		    'label' => __('Title', 'themify'),
		    'options' => $title
		),
		'i' => array(
			'label' => __('Image', 'themify'),
			'options' => $image
		),
		'c' => array(
		    'label' => __('Content', 'themify'),
		    'options' => $content
		),
		'a' => array(
		    'label' => __('Controls', 'themify'),
		    'options' => $controls
		)
	    )
	);
    }

    function set_metabox() {

	/** Slider Meta Box Options */
	$meta_box = array(
	    // Featured Image Size
	    Themify_Builder_Model::$featured_image_size,
	    // Image Width
	    Themify_Builder_Model::$image_width,
	    // Image Height
	    Themify_Builder_Model::$image_height,
	    // External Link
	    Themify_Builder_Model::$external_link,
	    // Lightbox Link
	    Themify_Builder_Model::$lightbox_link,
	    array(
		'name' => 'video_url',
		'title' => __('Video URL', 'themify'),
		'description' => __('URL to embed a video instead of featured image', 'themify'),
		'type' => 'textbox',
		'meta' => array()
	    )
	);
	return $meta_box;
    }

    function do_shortcode($atts) {

	extract(shortcode_atts(array(
	    'visible' => '1',
	    'scroll' => '1',
	    'auto' => 0,
	    'pause_hover' => 'no',
	    'wrap' => 'yes',
	    'excerpt_length' => '20',
	    'speed' => 'normal',
	    'slider_nav' => 'yes',
	    'pager' => 'yes',
	    'limit' => 5,
	    'category' => 0,
	    'image' => 'yes',
	    'image_w' => '240px',
	    'image_fullwidth' => '',
	    'image_h' => '180px',
	    'more_text' => __('More...', 'themify'),
	    'title' => 'yes',
	    'display' => 'none',
	    'post_meta' => 'no',
	    'post_date' => 'no',
	    'width' => '',
	    'height' => '',
	    'class' => '',
	    'unlink_title' => 'no',
	    'unlink_image' => 'no',
	    'image_size' => 'thumbnail',
	    'post_type' => 'post',
	    'taxonomy' => 'category',
	    'order' => 'DESC',
	    'orderby' => 'date',
	    'effect' => 'scroll',
	    'style' => 'slider-default'
			), $atts));

	$sync = array(
	    'mod_title_slider' => '',
	    'layout_display_slider' => 'slider',
	    'slider_category_slider' => $category,
	    'posts_per_page_slider' => $limit,
	    'offset_slider' => '',
	    'order_slider' => $order,
	    'orderby_slider' => $orderby,
	    'display_slider' => $display,
	    'hide_post_title_slider' => $title === 'yes' ? 'no' : 'yes',
	    'unlink_post_title_slider' => $unlink_title,
	    'hide_feat_img_slider' => '',
	    'unlink_feat_img_slider' => $unlink_image,
	    'layout_slider' => $style,
	    'image_size_slider' => $image_size,
	    'img_w_slider' => $image_w,
	    'img_fullwidth_slider' => $image_fullwidth,
	    'img_h_slider' => $image_h,
	    'visible_opt_slider' => $visible,
	    'auto_scroll_opt_slider' => $auto,
	    'scroll_opt_slider' => $scroll,
	    'speed_opt_slider' => $speed,
	    'effect_slider' => $effect,
	    'pause_on_hover_slider' => $pause_hover,
	    'wrap_slider' => $wrap,
	    'show_nav_slider' => $pager,
	    'show_arrow_slider' => $slider_nav,
	    'left_margin_slider' => '',
	    'right_margin_slider' => '',
	    'css_slider' => $class
	);
	$module = array(
	    'module_ID' => $this->slug . '-' . rand(0, 10000),
	    'mod_name' => $this->slug,
	    'settings' => $sync
	);

	return self::retrieve_template('template-' . $this->slug . '-' . $this->slug . '.php', $module, '', '', false);
    }

    /**
     * Render plain content for static content.
     * 
     * @param array $module 
     * @return string
     */
    public function get_plain_content($module) {
	$mod_settings = wp_parse_args($module['mod_settings'], array(
	    'layout_display_slider' => 'blog'
	));
	return 'blog' === $mod_settings['layout_display_slider']?'':parent::get_plain_content($module);
    }

}

///////////////////////////////////////
// Module Options
///////////////////////////////////////
Themify_Builder_Model::register_module('TB_Slider_Module');
